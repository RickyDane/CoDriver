use std::collections::HashMap;
use std::sync::Mutex;
use std::fs::File;
use std::io::Cursor;
use std::path::Path;
use suppaftp::FtpStream;
use lazy_static::lazy_static;
use serde::{Serialize, Deserialize};
use crate::FDir;

pub mod ftp_discovery;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FtpConfig {
    pub name: String,
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub remote_path: String,
}

lazy_static! {
    pub static ref FTP_CONNECTIONS: Mutex<HashMap<String, FtpConfig>> = Mutex::new(load_saved_connections());
}

fn get_ftp_connections_file_path() -> Option<std::path::PathBuf> {
    tauri::api::path::app_config_dir(&tauri::Config::default())
        .map(|p| p.join("com.codriver.dev/ftp_connections.json"))
}

pub fn load_saved_connections() -> HashMap<String, FtpConfig> {
    if let Some(path) = get_ftp_connections_file_path() {
        if path.exists() {
            if let Ok(file) = File::open(path) {
                let reader = std::io::BufReader::new(file);
                if let Ok(conns) = serde_json::from_reader(reader) {
                    return conns;
                }
            }
        }
    }
    HashMap::new()
}

pub fn save_connections(conns: &HashMap<String, FtpConfig>) -> Result<(), String> {
    if let Some(path) = get_ftp_connections_file_path() {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let file = File::create(path).map_err(|e| format!("Failed to create connections file: {}", e))?;
        let writer = std::io::BufWriter::new(file);
        serde_json::to_writer_pretty(writer, conns)
            .map_err(|e| format!("Failed to write connections: {}", e))?;
        Ok(())
    } else {
        Err("Could not determine app config directory".to_string())
    }
}

pub fn trigger_local_network_prompt() {
    #[cfg(target_os = "macos")]
    {
        // Bind to any ephemeral port and send a dummy UDP broadcast packet.
        // This forces macOS Sequoia to prompt the user for Local Network Privacy permission.
        if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
            let _ = socket.set_broadcast(true);
            let _ = socket.send_to(b"trigger", "255.255.255.255:9");
        }
    }
}

pub fn get_ftp_client(config: &FtpConfig) -> Result<FtpStream, String> {
    trigger_local_network_prompt();
    let hostname = config.hostname.trim();
    let username = config.username.trim();
    let addr = format!("{}:{}", hostname, config.port);
    
    let mut ftp_stream = None;
    let max_retries = 10;
    let mut last_err = String::new();
    
    for _ in 0..max_retries {
        match FtpStream::connect(&addr) {
            Ok(stream) => {
                ftp_stream = Some(stream);
                break;
            }
            Err(e) => {
                let err_msg = format!("{}", e);
                if err_msg.contains("os error 65") || err_msg.contains("No route to host") {
                    last_err = err_msg;
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                    continue;
                } else {
                    return Err(format!("Failed to connect: {}", e));
                }
            }
        }
    }
    
    let mut ftp_stream = ftp_stream.ok_or_else(|| format!("Failed to connect after retries: {}", last_err))?;
    
    ftp_stream.login(username, &config.password)
        .map_err(|e| format!("Failed to login: {}", e))?;
    
    ftp_stream.set_mode(suppaftp::Mode::Passive);

    Ok(ftp_stream)
}

pub fn to_raw_ftp_path(path: &str) -> &str {
    if path.starts_with("ftp://") {
        let remainder = &path[6..];
        if let Some(slash_idx) = remainder.find('/') {
            &remainder[slash_idx..]
        } else {
            "/"
        }
    } else {
        path
    }
}

pub fn parse_unix_list_line(line: &str, parent_ftp_path: &str, connection_name: &str) -> Option<FDir> {
    let trimmed = line.trim();
    if trimmed.is_empty() { return None; }
    
    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() < 9 { return None; }
    
    let metadata_char = parts[0].chars().next()?;
    let is_symlink = metadata_char == 'l';
    let is_dir = if metadata_char == 'd' || is_symlink { 1 } else { 0 };
    
    let size_str = parts[4];
    let date_str = format!("{} {} {}", parts[5], parts[6], parts[7]);
    
    let mut filename = parts[8..].join(" ");
    if filename == "." || filename == ".." {
        return None;
    }
    if is_symlink {
        if let Some(idx) = filename.find(" -> ") {
            filename = filename[..idx].to_string();
        }
    }
    
    let clean_parent = to_raw_ftp_path(parent_ftp_path).trim_end_matches('/');
    let file_path = format!("ftp://{}{}/{}", connection_name, clean_parent, filename);
    let file_ext = if is_dir == 1 {
        "".to_string()
    } else {
        let ext = Path::new(&filename)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if ext.is_empty() { "".to_string() } else { format!(".{}", ext) }
    };

    Some(FDir {
        name: filename,
        is_dir,
        path: file_path,
        extension: file_ext,
        size: size_str.to_string(),
        last_modified: date_str,
    })
}

pub fn parse_mlsd_line(line: &str, parent_ftp_path: &str, connection_name: &str) -> Option<FDir> {
    let trimmed = line.trim();
    if trimmed.is_empty() { return None; }
    
    let space_idx = trimmed.find(' ')?;
    let (facts_part, name_part) = trimmed.split_at(space_idx);
    let filename = name_part.trim().to_string();
    if filename == "." || filename == ".." {
        return None;
    }
    
    let mut is_dir = 0;
    let mut size_str = "0".to_string();
    let mut modify_str = "Unknown".to_string();
    
    for fact in facts_part.split(';') {
        let kv: Vec<&str> = fact.split('=').collect();
        if kv.len() == 2 {
            match kv[0].to_lowercase().as_str() {
                "type" => {
                    let val = kv[1].to_lowercase();
                    if val == "dir" || val == "cdir" || val == "pdir" {
                        is_dir = 1;
                    }
                }
                "size" => {
                    size_str = kv[1].to_string();
                }
                "modify" => {
                    modify_str = kv[1].to_string();
                }
                _ => {}
            }
        }
    }
    
    let clean_parent = to_raw_ftp_path(parent_ftp_path).trim_end_matches('/');
    let file_path = format!("ftp://{}{}/{}", connection_name, clean_parent, filename);
    let file_ext = if is_dir == 1 {
        "".to_string()
    } else {
        let ext = Path::new(&filename)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if ext.is_empty() { "".to_string() } else { format!(".{}", ext) }
    };
    
    Some(FDir {
        name: filename,
        is_dir,
        path: file_path,
        extension: file_ext,
        size: size_str,
        last_modified: modify_str,
    })
}

pub fn list_ftp_dir_internal(client: &mut FtpStream, remote_path: &str, connection_name: &str) -> Result<Vec<FDir>, String> {
    let raw_path = to_raw_ftp_path(remote_path);
    let raw_lines = client.list(Some(raw_path))
        .map_err(|e| format!("Failed to list: {}", e))?;
    
    let mut list = Vec::new();
    for line in raw_lines {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("type=") || lower.contains("type=dir;") || lower.contains("type=file;") || lower.contains("type=cdir;") || lower.contains("type=pdir;") {
            if let Some(entry) = parse_mlsd_line(&line, raw_path, connection_name) {
                list.push(entry);
            }
        } else {
            if let Some(entry) = parse_unix_list_line(&line, raw_path, connection_name) {
                list.push(entry);
            }
        }
    }
    Ok(list)
}

pub fn list_ftp_dir(connection_name: &str, remote_path: &str) -> Result<Vec<FDir>, String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    list_ftp_dir_internal(&mut client, remote_path, connection_name)
}

pub fn create_ftp_folder(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    client.mkdir(raw_path).map_err(|e| format!("Failed to mkdir: {}", e))?;
    Ok(())
}

pub fn create_ftp_file(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    client.put_file(raw_path, &mut Cursor::new(vec![]))
        .map_err(|e| format!("Failed to create empty file: {}", e))?;
    Ok(())
}

pub fn rename_ftp_element(connection_name: &str, from_path: &str, to_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_from = to_raw_ftp_path(from_path);
    let raw_to = to_raw_ftp_path(to_path);
    client.rename(raw_from, raw_to).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(())
}

pub fn delete_ftp_item_recursive(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    
    let is_dir = client.cwd(raw_path).is_ok();
    if is_dir {
        let entries = list_ftp_dir_internal(&mut client, raw_path, connection_name)?;
        for entry in entries {
            delete_ftp_item_recursive(connection_name, &entry.path)?;
        }
        let mut client = get_ftp_client(&config)?;
        let raw_path = to_raw_ftp_path(remote_path);
        client.rmdir(raw_path).map_err(|e| format!("Failed to rmdir: {}", e))?;
    } else {
        client.rm(raw_path).map_err(|e| format!("Failed to remove file: {}", e))?;
    }
    Ok(())
}

pub fn download_ftp_file(connection_name: &str, remote_path: &str, local_dest: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    let mut reader = client.retr_as_stream(raw_path)
        .map_err(|e| format!("Failed to download: {}", e))?;

    if let Some(parent) = Path::new(local_dest).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut local_file = File::create(local_dest)
        .map_err(|e| format!("Failed to create local destination file: {}", e))?;

    std::io::copy(&mut reader, &mut local_file)
        .map_err(|e| format!("Failed to write downloaded data: {}", e))?;

    client.finalize_retr_stream(reader)
        .map_err(|e| format!("Failed to finalize transfer: {}", e))?;

    Ok(())
}

pub fn upload_ftp_file(connection_name: &str, local_src: &str, remote_dest: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut local_file = File::open(local_src)
        .map_err(|e| format!("Failed to open local source file: {}", e))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest = to_raw_ftp_path(remote_dest);
    client.put_file(raw_dest, &mut local_file)
        .map_err(|e| format!("Failed to upload file to FTP: {}", e))?;

    Ok(())
}

pub fn download_ftp_dir_recursive(connection_name: &str, remote_dir: &str, local_dest_dir: &str) -> Result<(), String> {
    std::fs::create_dir_all(local_dest_dir)
        .map_err(|e| format!("Failed to create local directory: {}", e))?;
    
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;
    
    let mut client = get_ftp_client(&config)?;
    let raw_dir = to_raw_ftp_path(remote_dir);
    let entries = list_ftp_dir_internal(&mut client, raw_dir, connection_name)?;
    
    for entry in entries {
        let entry_name = entry.name;
        let remote_item_path = entry.path;
        let local_item_path = format!("{}/{}", local_dest_dir, entry_name);
        if entry.is_dir == 1 {
            download_ftp_dir_recursive(connection_name, &remote_item_path, &local_item_path)?;
        } else {
            download_ftp_file(connection_name, &remote_item_path, &local_item_path)?;
        }
    }
    Ok(())
}

pub fn upload_ftp_dir_recursive(connection_name: &str, local_dir: &str, remote_dest_dir: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest_dir = to_raw_ftp_path(remote_dest_dir);
    let _ = client.mkdir(raw_dest_dir);

    let local_entries = std::fs::read_dir(local_dir)
        .map_err(|e| format!("Failed to read local directory: {}", e))?;

    for entry in local_entries {
        let entry = entry.map_err(|e| format!("Failed to read local entry: {}", e))?;
        let path = entry.path();
        let entry_name = path.file_name().unwrap().to_string_lossy().to_string();
        let remote_item_path = format!("{}/{}", raw_dest_dir, entry_name);
        if path.is_dir() {
            upload_ftp_dir_recursive(connection_name, path.to_str().unwrap(), &remote_item_path)?;
        } else {
            upload_ftp_file(connection_name, path.to_str().unwrap(), &remote_item_path)?;
        }
    }
    Ok(())
}

pub fn copy_ftp_to_ftp(connection_name: &str, remote_src: &str, remote_dest: &str) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let temp_file_path = temp_dir.join(format!("ftp-transfer-{}", uuid::Uuid::new_v4()));
    let temp_file_str = temp_file_path.to_str().unwrap();

    download_ftp_file(connection_name, remote_src, temp_file_str)?;
    let res = upload_ftp_file(connection_name, temp_file_str, remote_dest);
    let _ = std::fs::remove_file(temp_file_str);
    res
}

pub fn copy_ftp_dir_to_ftp_recursive(connection_name: &str, remote_src_dir: &str, remote_dest_dir: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }.ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest_dir = to_raw_ftp_path(remote_dest_dir);
    let _ = client.mkdir(raw_dest_dir);

    let raw_src_dir = to_raw_ftp_path(remote_src_dir);
    let entries = list_ftp_dir_internal(&mut client, raw_src_dir, connection_name)?;
    for entry in entries {
        let entry_name = entry.name;
        let remote_src_item = entry.path;
        let remote_dest_item = format!("{}/{}", raw_dest_dir, entry_name);
        if entry.is_dir == 1 {
            copy_ftp_dir_to_ftp_recursive(connection_name, &remote_src_item, &remote_dest_item)?;
        } else {
            copy_ftp_to_ftp(connection_name, &remote_src_item, &remote_dest_item)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_unix_list_line() {
        let line = "drwxr-xr-x    2 user     group        4096 May 22 20:00 my_folder";
        let res = parse_unix_list_line(line, "/home", "my-server").unwrap();
        assert_eq!(res.name, "my_folder");
        assert_eq!(res.is_dir, 1);
        assert_eq!(res.path, "ftp://my-server/home/my_folder");
        assert_eq!(res.extension, "");
        assert_eq!(res.size, "4096");
        assert_eq!(res.last_modified, "May 22 20:00");

        let line = "-rw-r--r--    1 user     group        1024 May 22 20:01 document.pdf";
        let res = parse_unix_list_line(line, "/home", "my-server").unwrap();
        assert_eq!(res.name, "document.pdf");
        assert_eq!(res.is_dir, 0);
        assert_eq!(res.path, "ftp://my-server/home/document.pdf");
        assert_eq!(res.extension, ".pdf");
        assert_eq!(res.size, "1024");
        assert_eq!(res.last_modified, "May 22 20:01");
    }

    #[test]
    fn test_parse_unix_list_line_symlink() {
        let line = "lrwxrwxrwx    1 user     group           7 May 22 20:02 lib -> usr/lib";
        let res = parse_unix_list_line(line, "/home", "my-server").unwrap();
        assert_eq!(res.name, "lib");
        assert_eq!(res.is_dir, 1);
        assert_eq!(res.path, "ftp://my-server/home/lib");
        assert_eq!(res.extension, "");
        assert_eq!(res.size, "7");
        assert_eq!(res.last_modified, "May 22 20:02");
    }

    #[test]
    fn test_parse_mlsd_line() {
        let line = "Type=dir;Modify=20260522200000;Size=4096; my_folder";
        let res = parse_mlsd_line(line, "/home", "my-server").unwrap();
        assert_eq!(res.name, "my_folder");
        assert_eq!(res.is_dir, 1);
        assert_eq!(res.path, "ftp://my-server/home/my_folder");
        assert_eq!(res.extension, "");
        assert_eq!(res.size, "4096");
        assert_eq!(res.last_modified, "20260522200000");

        let line = "Type=file;Size=1024;Modify=20260522200100; document.pdf";
        let res = parse_mlsd_line(line, "/home", "my-server").unwrap();
        assert_eq!(res.name, "document.pdf");
        assert_eq!(res.is_dir, 0);
        assert_eq!(res.path, "ftp://my-server/home/document.pdf");
        assert_eq!(res.extension, ".pdf");
        assert_eq!(res.size, "1024");
        assert_eq!(res.last_modified, "20260522200100");
    }

    #[test]
    fn test_ftp_config_serialization() {
        let config = FtpConfig {
            name: "Test Server".to_string(),
            hostname: "127.0.0.1".to_string(),
            port: 21,
            username: "anonymous".to_string(),
            password: "guest".to_string(),
            remote_path: "/pub".to_string(),
        };
        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: FtpConfig = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.name, config.name);
        assert_eq!(deserialized.hostname, config.hostname);
        assert_eq!(deserialized.port, config.port);
        assert_eq!(deserialized.username, config.username);
        assert_eq!(deserialized.password, config.password);
        assert_eq!(deserialized.remote_path, config.remote_path);
    }
}
