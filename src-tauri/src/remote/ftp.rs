use crate::FDir;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Cursor;
use std::path::Path;
use std::sync::Mutex;
use suppaftp::FtpStream;
use tauri::Emitter;

pub type FtpProgressCallback = dyn Fn(usize, &str) + Send + Sync;

pub struct CallbackReader<R, F: Fn(usize) + ?Sized> {
    pub inner: R,
    pub callback: F,
}

impl<R: std::io::Read, F: Fn(usize) + ?Sized> std::io::Read for CallbackReader<R, F> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if crate::IS_COPY_PASTE_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Interrupted,
                "Copy operation was cancelled",
            ));
        }
        let len = self.inner.read(buf)?;
        if len > 0 {
            (self.callback)(len);
        }
        Ok(len)
    }
}

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
    pub static ref FTP_CONNECTIONS: Mutex<HashMap<String, FtpConfig>> =
        Mutex::new(load_saved_connections());
}

fn get_ftp_connections_file_path() -> Option<std::path::PathBuf> {
    dirs::config_dir()
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

pub fn get_keychain_password(account: &str) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("security")
            .args(&[
                "find-generic-password",
                "-a",
                account,
                "-s",
                "CoDriver-FTP",
                "-w",
            ])
            .output()
            .map_err(|e| format!("Failed to execute security command: {}", e))?;

        if output.status.success() {
            let password = String::from_utf8(output.stdout)
                .map_err(|e| format!("Failed to parse password: {}", e))?;
            Ok(password
                .trim_end_matches('\n')
                .trim_end_matches('\r')
                .to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Keychain lookup failed: {}", stderr))
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = account;
        Err("Keychain not supported on this platform".to_string())
    }
}

pub fn set_keychain_password(account: &str, password: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("security")
            .args(&[
                "add-generic-password",
                "-a",
                account,
                "-s",
                "CoDriver-FTP",
                "-w",
                password,
                "-U",
            ])
            .status()
            .map_err(|e| format!("Failed to execute security command: {}", e))?;

        if status.success() {
            Ok(())
        } else {
            Err("Failed to save password to macOS Keychain".to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = account;
        let _ = password;
        Ok(())
    }
}

pub fn delete_keychain_password(account: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("security")
            .args(&[
                "delete-generic-password",
                "-a",
                account,
                "-s",
                "CoDriver-FTP",
            ])
            .status()
            .map_err(|e| format!("Failed to execute security command: {}", e))?;

        if status.success() {
            Ok(())
        } else {
            Err("Failed to delete password from macOS Keychain".to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = account;
        Ok(())
    }
}

pub fn save_connections(conns: &HashMap<String, FtpConfig>) -> Result<(), String> {
    if let Some(path) = get_ftp_connections_file_path() {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let file =
            File::create(path).map_err(|e| format!("Failed to create connections file: {}", e))?;
        let writer = std::io::BufWriter::new(file);

        #[cfg(target_os = "macos")]
        let conns_to_save: HashMap<String, FtpConfig> = conns
            .iter()
            .map(|(k, v)| {
                let mut v_clone = v.clone();
                if !v.password.is_empty() && v.password != "__keychain__" {
                    if let Err(e) = set_keychain_password(&v.name, &v.password) {
                        eprintln!("Failed to save password to macOS Keychain: {}", e);
                    }
                }
                v_clone.password = "__keychain__".to_string();
                (k.clone(), v_clone)
            })
            .collect();

        #[cfg(not(target_os = "macos"))]
        let conns_to_save = conns;

        serde_json::to_writer_pretty(writer, &conns_to_save)
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

    let mut ftp_stream =
        ftp_stream.ok_or_else(|| format!("Failed to connect after retries: {}", last_err))?;

    let password = if config.password == "__keychain__" {
        get_keychain_password(&config.name).unwrap_or_else(|_| "".to_string())
    } else {
        config.password.clone()
    };

    ftp_stream
        .login(username, &password)
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

pub fn parse_unix_list_line(
    line: &str,
    parent_ftp_path: &str,
    connection_name: &str,
) -> Option<FDir> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() < 9 {
        return None;
    }

    let metadata_char = parts[0].chars().next()?;
    let is_symlink = metadata_char == 'l';
    let is_dir = if metadata_char == 'd' || is_symlink {
        1
    } else {
        0
    };

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
        if ext.is_empty() {
            "".to_string()
        } else {
            format!(".{}", ext)
        }
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
    if trimmed.is_empty() {
        return None;
    }

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
        if ext.is_empty() {
            "".to_string()
        } else {
            format!(".{}", ext)
        }
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

pub fn list_ftp_dir_internal(
    client: &mut FtpStream,
    remote_path: &str,
    connection_name: &str,
) -> Result<Vec<FDir>, String> {
    let raw_path = to_raw_ftp_path(remote_path);
    let raw_lines = client
        .list(Some(raw_path))
        .map_err(|e| format!("Failed to list: {}", e))?;

    let mut list = Vec::new();
    for line in raw_lines {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("type=")
            || lower.contains("type=dir;")
            || lower.contains("type=file;")
            || lower.contains("type=cdir;")
            || lower.contains("type=pdir;")
        {
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
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    list_ftp_dir_internal(&mut client, remote_path, connection_name)
}

pub fn create_ftp_folder(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    client
        .mkdir(raw_path)
        .map_err(|e| format!("Failed to mkdir: {}", e))?;
    Ok(())
}

pub fn create_ftp_file(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    client
        .put_file(raw_path, &mut Cursor::new(vec![]))
        .map_err(|e| format!("Failed to create empty file: {}", e))?;
    Ok(())
}

pub fn rename_ftp_element(
    connection_name: &str,
    from_path: &str,
    to_path: &str,
) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_from = to_raw_ftp_path(from_path);
    let raw_to = to_raw_ftp_path(to_path);
    client
        .rename(raw_from, raw_to)
        .map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(())
}

pub fn list_ftp_dir_cwd(
    client: &mut FtpStream,
    current_dir_path: &str,
    connection_name: &str,
) -> Result<Vec<FDir>, String> {
    // Try to list with '-a' first to get all hidden/dotfiles, fall back to standard list
    let raw_lines = client
        .list(Some("-a"))
        .or_else(|_| client.list(None))
        .map_err(|e| format!("Failed to list current directory: {}", e))?;

    let mut list = Vec::new();
    let raw_path = to_raw_ftp_path(current_dir_path);
    for line in raw_lines {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("type=")
            || lower.contains("type=dir;")
            || lower.contains("type=file;")
            || lower.contains("type=cdir;")
            || lower.contains("type=pdir;")
        {
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

fn delete_ftp_item_recursive_helper(
    client: &mut FtpStream,
    connection_name: &str,
    remote_path: &str,
    is_dir: bool,
) -> Result<(), String> {
    let raw_path = to_raw_ftp_path(remote_path);

    if is_dir {
        // 1. CWD into the folder to list it reliably
        client
            .cwd(raw_path)
            .map_err(|e| format!("Failed to cwd to {}: {}", raw_path, e))?;

        // 2. List the directory content using CWD listing
        let entries = list_ftp_dir_cwd(client, raw_path, connection_name)?;

        // 3. Delete all entries recursively
        for entry in entries {
            delete_ftp_item_recursive_helper(
                client,
                connection_name,
                &entry.path,
                entry.is_dir == 1,
            )?;
        }

        // 4. Change CWD back to root to release directory lock
        client
            .cwd("/")
            .map_err(|e| format!("Failed to cwd back to root: {}", e))?;

        // 5. Remove the empty directory
        client
            .rmdir(raw_path)
            .map_err(|e| format!("Failed to rmdir: {}", e))?;
    } else {
        // It's a file, remove it absolutely
        client
            .rm(raw_path)
            .map_err(|e| format!("Failed to remove file: {}", e))?;
    }
    Ok(())
}

pub fn delete_ftp_item_recursive(connection_name: &str, remote_path: &str) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);

    // Check once at the very top level if the target is a directory
    let is_dir = client.cwd(raw_path).is_ok();
    if is_dir {
        // Immediately step back out to the root directory
        let _ = client.cwd("/");
    }

    delete_ftp_item_recursive_helper(&mut client, connection_name, remote_path, is_dir)
}

pub fn download_ftp_file(
    client: &mut FtpStream,
    remote_path: &str,
    local_dest: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    let raw_path = to_raw_ftp_path(remote_path);
    let reader = client
        .retr_as_stream(raw_path)
        .map_err(|e| format!("Failed to download: {}", e))?;

    if let Some(parent) = Path::new(local_dest).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut local_file = File::create(local_dest)
        .map_err(|e| format!("Failed to create local destination file: {}", e))?;

    if let Some(cb) = progress_callback {
        let mut wrapped_reader = CallbackReader {
            inner: reader,
            callback: |len| cb(len, remote_path),
        };
        std::io::copy(&mut wrapped_reader, &mut local_file)
            .map_err(|e| format!("Failed to write downloaded data: {}", e))?;
        client
            .finalize_retr_stream(wrapped_reader.inner)
            .map_err(|e| format!("Failed to finalize transfer: {}", e))?;
    } else {
        let mut reader = reader;
        std::io::copy(&mut reader, &mut local_file)
            .map_err(|e| format!("Failed to write downloaded data: {}", e))?;
        client
            .finalize_retr_stream(reader)
            .map_err(|e| format!("Failed to finalize transfer: {}", e))?;
    }

    Ok(())
}

pub fn upload_ftp_file(
    connection_name: &str,
    local_src: &Path,
    remote_dest: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut local_file =
        File::open(local_src).map_err(|e| format!("Failed to open local source file: {}", e))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest = to_raw_ftp_path(remote_dest);

    if let Some(cb) = progress_callback {
        let local_src_str = local_src.to_string_lossy().into_owned();
        let mut wrapped_reader = CallbackReader {
            inner: local_file,
            callback: |len| cb(len, &local_src_str),
        };
        client
            .put_file(raw_dest, &mut wrapped_reader)
            .map_err(|e| format!("Failed to upload file to FTP: {}", e))?;
    } else {
        client
            .put_file(raw_dest, &mut local_file)
            .map_err(|e| format!("Failed to upload file to FTP: {}", e))?;
    }

    Ok(())
}

pub fn download_ftp_dir_recursive(
    client: &mut FtpStream,
    connection_name: &str,
    remote_dir: &str,
    local_dest_dir: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    std::fs::create_dir_all(local_dest_dir)
        .map_err(|e| format!("Failed to create local directory: {}", e))?;

    let raw_dir = to_raw_ftp_path(remote_dir);
    let entries = list_ftp_dir_internal(client, raw_dir, connection_name)?;

    for entry in entries {
        if crate::IS_COPY_PASTE_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("Copy operation was cancelled".to_string());
        }
        let entry_name = entry.name;
        let remote_item_path = entry.path;
        let local_item_path = format!("{}/{}", local_dest_dir, entry_name);
        if entry.is_dir == 1 {
            download_ftp_dir_recursive(
                client,
                connection_name,
                &remote_item_path,
                &local_item_path,
                progress_callback,
            )?;
        } else {
            download_ftp_file(
                client,
                &remote_item_path,
                &local_item_path,
                progress_callback,
            )?;
        }
    }
    Ok(())
}

pub fn upload_ftp_dir_recursive(
    connection_name: &str,
    local_dir: &Path,
    remote_dest_dir: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest_dir = to_raw_ftp_path(remote_dest_dir);
    let _ = client.mkdir(raw_dest_dir);

    let local_entries = std::fs::read_dir(local_dir)
        .map_err(|e| format!("Failed to read local directory: {}", e))?;

    for entry in local_entries {
        if crate::IS_COPY_PASTE_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("Copy operation was cancelled".to_string());
        }
        let entry = entry.map_err(|e| format!("Failed to read local entry: {}", e))?;
        let path = entry.path();
        let entry_name = path
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let remote_item_path = format!("{}/{}", raw_dest_dir, entry_name);
        if path.is_dir() {
            upload_ftp_dir_recursive(
                connection_name,
                &path,
                &remote_item_path,
                progress_callback,
            )?;
        } else {
            upload_ftp_file(
                connection_name,
                &path,
                &remote_item_path,
                progress_callback,
            )?;
        }
    }
    Ok(())
}

pub fn copy_ftp_to_ftp(
    connection_name: &str,
    remote_src: &str,
    remote_dest: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    if crate::IS_COPY_PASTE_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
        return Err("Copy operation was cancelled".to_string());
    }
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;

    let temp_dir = std::env::temp_dir();
    let temp_file_path = temp_dir.join(format!("ftp-transfer-{}", uuid::Uuid::new_v4()));
    let temp_file_str = temp_file_path.to_string_lossy().to_string();

    download_ftp_file(
        &mut client,
        remote_src,
        &temp_file_str,
        progress_callback,
    )?;
    let res = upload_ftp_file(
        connection_name,
        &temp_file_path,
        remote_dest,
        progress_callback,
    );
    let _ = std::fs::remove_file(&temp_file_str);
    res
}

pub fn copy_ftp_dir_to_ftp_recursive(
    connection_name: &str,
    remote_src_dir: &str,
    remote_dest_dir: &str,
    progress_callback: Option<&FtpProgressCallback>,
) -> Result<(), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_dest_dir = to_raw_ftp_path(remote_dest_dir);
    let _ = client.mkdir(raw_dest_dir);

    let raw_src_dir = to_raw_ftp_path(remote_src_dir);
    let entries = list_ftp_dir_internal(&mut client, raw_src_dir, connection_name)?;
    for entry in entries {
        if crate::IS_COPY_PASTE_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("Copy operation was cancelled".to_string());
        }
        let entry_name = entry.name;
        let remote_src_item = entry.path;
        let remote_dest_item = format!("{}/{}", raw_dest_dir, entry_name);
        if entry.is_dir == 1 {
            copy_ftp_dir_to_ftp_recursive(
                connection_name,
                &remote_src_item,
                &remote_dest_item,
                progress_callback,
            )?;
        } else {
            copy_ftp_to_ftp(
                connection_name,
                &remote_src_item,
                &remote_dest_item,
                progress_callback,
            )?;
        }
    }
    Ok(())
}

pub fn get_ftp_file_size(connection_name: &str, remote_path: &str) -> Result<u64, String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let raw_path = to_raw_ftp_path(remote_path);
    
    // Try SIZE command first
    if let Ok(size) = client.size(raw_path) {
        return Ok(size as u64);
    }
    
    // Fallback: list parent directory
    let path = Path::new(remote_path);
    let parent = path.parent().ok_or_else(|| "No parent directory".to_string())?;
    let parent_str = parent.to_string_lossy().to_string();
    let filename = path.file_name().ok_or_else(|| "No filename".to_string())?.to_string_lossy().to_string();
    
    let entries = list_ftp_dir_internal(&mut client, &parent_str, connection_name)?;
    for entry in entries {
        if entry.name == filename {
            if entry.is_dir == 1 {
                return Err("Path is a directory".to_string());
            }
            if let Ok(sz) = entry.size.parse::<u64>() {
                return Ok(sz);
            }
        }
    }
    
    Err("File not found in parent directory listing".to_string())
}

pub fn get_ftp_dir_size_and_count(
    connection_name: &str,
    remote_dir: &str,
    update_id: Option<&str>,
) -> Result<(f32, f32), String> {
    let config = {
        let conns = FTP_CONNECTIONS.lock().unwrap();
        conns.get(connection_name).cloned()
    }
    .ok_or_else(|| format!("Connection {} not found", connection_name))?;

    let mut client = get_ftp_client(&config)?;
    let mut total_size = 0.0;
    let mut total_count = 0.0;
    let mut last_emit = std::time::Instant::now();
    get_ftp_dir_size_and_count_helper(
        &mut client,
        remote_dir,
        connection_name,
        &mut total_size,
        &mut total_count,
        update_id,
        &mut last_emit,
    )?;
    Ok((total_size, total_count))
}

fn get_ftp_dir_size_and_count_helper(
    client: &mut FtpStream,
    remote_dir: &str,
    connection_name: &str,
    total_size: &mut f32,
    total_count: &mut f32,
    update_id: Option<&str>,
    last_emit: &mut std::time::Instant,
) -> Result<(), String> {
    let raw_dir = to_raw_ftp_path(remote_dir);
    let entries = list_ftp_dir_internal(client, raw_dir, connection_name)?;
    for entry in entries {
        if crate::IS_SIZE_CALC_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            break;
        }
        if entry.is_dir == 1 {
            get_ftp_dir_size_and_count_helper(
                client,
                &entry.path,
                connection_name,
                total_size,
                total_count,
                update_id,
                last_emit,
            )?;
        } else {
            *total_count += 1.0;
            if let Ok(sz) = entry.size.parse::<f32>() {
                *total_size += sz;
            }
            if let Some(id) = update_id {
                let now = std::time::Instant::now();
                if now.duration_since(*last_emit).as_millis() > 100 {
                    *last_emit = now;
                    if let Some(window) = crate::WINDOW.get() {
                        let _ = window.emit("size-update", (id, *total_size as u64, *total_count as u64));
                    }
                }
            }
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
