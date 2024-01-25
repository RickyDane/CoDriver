// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[allow(unused_imports)]
use async_ftp::types::FileType::{Ascii, Binary, Ebcdic, Image, Local};
#[allow(unused_imports)]
use async_ftp::FtpError;
#[allow(unused_imports)]
use async_ftp::{DataStream, FtpStream};
#[allow(unused_imports)]
use async_std::io::Cursor;
#[allow(unused_imports)]
use chrono::prelude::{DateTime, NaiveDateTime, TimeZone, Utc};
#[allow(unused_imports)]
use dialog::{backends::Dialog, DialogBox};
#[allow(unused_imports)]
use get_sys_info::{Platform, System};
use rust_search::{similarity_sort, SearchBuilder};
use serde_json::Value;
use std::fs::{self, ReadDir};
#[allow(unused_imports)]
use std::io::{BufRead, BufReader, BufWriter, Error, ErrorKind, Read, Write};
use std::{
    env::{current_dir, set_current_dir},
    fmt::format,
    fs::{copy, create_dir, remove_dir_all, remove_file, File},
    path::PathBuf,
    process::Command,
    time::SystemTime,
};
use stopwatch::Stopwatch;
use tauri::{
    api::path::{
        app_config_dir, audio_dir, config_dir, desktop_dir, document_dir, download_dir, home_dir,
        picture_dir, video_dir,
    },
    Config,
};
use unrar::Archive;
use zip_extensions::*;
mod utils;
#[allow(unused_imports)]
use sysinfo::{Components, Disks, Networks};
use utils::{dbg_log, err_log, wng_log};

static mut HOSTNAME: String = String::new();
static mut USERNAME: String = String::new();
static mut PASSWORD: String = String::new();

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_dirs,
            open_dir,
            open_item,
            go_back,
            go_home,
            search_for,
            go_to_dir,
            copy_paste,
            delete_item,
            extract_item,
            compress_item,
            create_folder,
            switch_view,
            check_app_config,
            create_file,
            get_current_dir,
            set_dir,
            list_disks,
            open_in_terminal,
            rename_element,
            save_config,
            switch_to_directory,
            open_fav_ftp,
            open_ftp_dir,
            ftp_go_back,
            copy_from_ftp
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(serde::Serialize)]
struct FDir {
    name: String,
    is_dir: i8,
    path: String,
    extension: String,
    size: String,
    last_modified: String,
    is_ftp: i8,
}

#[derive(serde::Serialize)]
struct AppConfig {
    view_mode: String,
    last_modified: String,
    configured_path_one: String,
    configured_path_two: String,
    configured_path_three: String,
    is_open_in_terminal: String,
    is_dual_pane_enabled: String,
    launch_path: String,
    is_dual_pane_active: String,
    search_depth: i32,
    max_items: i32,
    is_light_mode: String,
    is_image_preview: String,
    is_select_mode: String,
}

#[tauri::command]
async fn check_app_config() -> AppConfig {
    create_folder(
        config_dir()
            .unwrap()
            .join("rdpFX")
            .to_str()
            .unwrap()
            .to_string(),
    )
    .await;

    // If config doesn't exist, create it
    if fs::metadata(config_dir().unwrap().join("rdpFX/app_config.json")).is_err() {
        let _ = File::create(config_dir().unwrap().join("rdpFX/app_config.json"));
        let app_config_json = AppConfig {
            view_mode: "".to_string(),
            last_modified: chrono::offset::Local::now().to_string(),
            configured_path_one: "".to_string(),
            configured_path_two: "".to_string(),
            configured_path_three: "".to_string(),
            is_open_in_terminal: "0".to_string(),
            is_dual_pane_enabled: "0".to_string(),
            launch_path: "".to_string(),
            is_dual_pane_active: "0".to_string(),
            search_depth: 10,
            max_items: 1000,
            is_light_mode: "0".to_string(),
            is_image_preview: "0".to_string(),
            is_select_mode: "1".to_string(),
        };
        let _ = serde_json::to_writer_pretty(
            File::create(
                config_dir()
                    .unwrap()
                    .join("rdpFX/app_config.json")
                    .to_str()
                    .unwrap()
                    .to_string(),
            )
            .unwrap(),
            &app_config_json,
        );
    }

    let app_config_file = File::open(config_dir().unwrap().join("rdpFX/app_config.json")).unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();

    return AppConfig {
        view_mode: app_config["view_mode"].to_string(),
        last_modified: app_config["last_modified"].to_string(),
        configured_path_one: app_config["configured_path_one"]
            .to_string()
            .replace('"', ""),
        configured_path_two: app_config["configured_path_two"]
            .to_string()
            .replace('"', ""),
        configured_path_three: app_config["configured_path_three"]
            .to_string()
            .replace('"', ""),
        is_open_in_terminal: app_config["is_open_in_terminal"].to_string(),
        is_dual_pane_enabled: app_config["is_dual_pane_enabled"].to_string(),
        launch_path: app_config["launch_path"].to_string().replace('"', ""),
        is_dual_pane_active: app_config["is_dual_pane_active"].to_string(),
        search_depth: app_config["search_depth"]
            .to_string()
            .parse::<i32>()
            .unwrap(),
        max_items: app_config["max_items"].to_string().parse::<i32>().unwrap(),
        is_light_mode: app_config["is_light_mode"].to_string(),
        is_image_preview: app_config["is_image_preview"].to_string(),
        is_select_mode: app_config["is_select_mode"].to_string(),
    };
}

#[derive(serde::Serialize)]
struct DisksInfo {
    name: String,
    format: String,
    path: String,
    avail: String,
    capacity: String,
}

#[tauri::command]
async fn list_disks() -> Vec<DisksInfo> {
    let mut ls_disks: Vec<DisksInfo> = vec![];
    let disks = Disks::new_with_refreshed_list();
    for disk in &disks {
        dbg_log(format!("{:?}", &disk));
        ls_disks.push(DisksInfo {
            name: format!("{:?}", disk.mount_point())
                .split("/")
                .last()
                .unwrap_or("/")
                .to_string()
                .replace("\"", ""),
            format: format!("{:?}", disk.file_system()),
            path: format!("{:?}", disk.mount_point()),
            avail: format!("{:?}", disk.available_space()),
            capacity: format!("{:?}", disk.total_space()),
        });
    }

    // #[cfg(not(target_os = "macos"))]
    // let disk_list = System::new().mounts().unwrap_or_else(|r| {
    //         dbg_log(format!("Got mounts error: {}", r));
    //         vec![]
    //     });

    // #[cfg(not(target_os = "macos"))]
    // #[cfg(not(target_os = "windows"))]
    // for disk in disk_list {
    //     if disk.fs_mounted_from.starts_with("/dev/sda") || disk.fs_mounted_from.starts_with("/dev/nvme") || disk.fs_mounted_from.starts_with("/mnt"){
    //         dbg_log(format!("Mounted on: {:?} - Mounted from: {:?} - Free: {:?} - FS-Type: {:?}", disk.fs_mounted_on, disk.fs_mounted_from, disk.free, disk.fs_type));
    //         ls_disks.push(DisksInfo {
    //             name: disk.fs_mounted_on.split("/").last().unwrap_or("/").to_string(),
    //             format: disk.fs_type,
    //             path: disk.fs_mounted_on,
    //             avail: disk.avail.to_string(),
    //             capacity: disk.total.to_string()
    //         });
    //     }
    // }

    // #[cfg(not(target_os = "macos"))]
    // #[cfg(target_os = "windows")]
    // for disk in disk_list {
    //     ls_disks.push(DisksInfo {
    //         name: disk.fs_mounted_from,
    //         format: disk.fs_type,
    //         path: disk.fs_mounted_on.replace("\\", "/"),
    //         avail: disk.avail.to_string(),
    //         capacity: disk.total.to_string()
    //     });
    // }

    return ls_disks;
}

#[tauri::command]
async fn switch_to_directory(current_dir: String) {
    dbg_log(format!("Switching to directory: {}", &current_dir));
    set_current_dir(current_dir).unwrap();
}
#[tauri::command]
async fn switch_view(view_mode: String) -> Vec<FDir> {
    let app_config_file = File::open(
        app_config_dir(&Config::default())
            .unwrap()
            .join("rdpFX/app_config.json"),
    )
    .unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    let app_config_json = AppConfig {
        view_mode,
        last_modified: chrono::offset::Local::now().to_string(),
        configured_path_one: app_config["configured_path_one"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        configured_path_two: app_config["configured_path_two"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        configured_path_three: app_config["configured_path_three"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        is_open_in_terminal: app_config["is_open_in_terminal"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        is_dual_pane_enabled: app_config["is_dual_pane_enabled"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        launch_path: app_config["launch_path"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        is_dual_pane_active: app_config["is_dual_pane_active"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        search_depth: app_config["search_depth"]
            .to_string()
            .parse::<i32>()
            .unwrap(),
        max_items: app_config["max_items"].to_string().parse::<i32>().unwrap(),
        is_light_mode: app_config["is_light_mode"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        is_image_preview: app_config["is_image_preview"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
        is_select_mode: app_config["is_select_mode"]
            .to_string()
            .replace('"', "")
            .replace("\\", "/")
            .trim()
            .to_string(),
    };
    let _ = serde_json::to_writer_pretty(
        File::create(
            app_config_dir(&Config::default())
                .unwrap()
                .join("rdpFX/app_config.json")
                .to_str()
                .unwrap()
                .to_string(),
        )
        .unwrap(),
        &app_config_json,
    );
    return list_dirs().await;
}

#[tauri::command]
async fn get_current_dir() -> String {
    return current_dir()
        .unwrap()
        .as_path()
        .to_str()
        .unwrap()
        .to_string()
        .replace("\\", "/");
}

#[tauri::command]
async fn set_dir(current_dir: String) {
    dbg_log(format!("Current dir: {}", &current_dir));
    let _ = set_current_dir(current_dir);
}

#[tauri::command]
async fn list_dirs() -> Vec<FDir> {
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_dir = fs::read_dir(current_dir().unwrap()).unwrap();
    for item in current_dir {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item
            .path()
            .to_str()
            .unwrap()
            .to_string()
            .replace("\\", "/");
        let file_ext = ".".to_string().to_owned()
            + &path
                .split(".")
                .nth(&path.split(".").count() - 1)
                .unwrap_or("");
        let file_data = fs::metadata(&temp_item.path());
        let file_date: DateTime<Utc>;
        if file_data.is_ok() {
            file_date = file_data.unwrap().modified().unwrap().clone().into();
        } else {
            file_date = Utc::now();
        }
        if is_dir.to_owned() {
            is_dir_int = 1;
        } else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name),
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap()),
            is_ftp: 0,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    return dir_list;
}

#[allow(dead_code)]
fn alert_not_found_dir(_x: std::io::Error) -> ReadDir {
    dialog::Message::new("No directory found or unable to open due to missing permissions")
        .title("No directory found")
        .show()
        .expect("Error opening dialog");
    return fs::read_dir(current_dir().unwrap()).unwrap();
}

#[tauri::command]
async fn open_dir(_path: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(&_path.replace('"', "")).unwrap_or_else(|r| {
        alert_not_found_dir(r);
        panic!()
    });
    let _ = set_current_dir(_path);
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let mut is_dir_int: i8 = 0;
        let path = &temp_item
            .path()
            .to_str()
            .unwrap()
            .to_string()
            .replace("\\", "/");
        let file_ext = ".".to_string().to_owned()
            + &path
                .split(".")
                .nth(&path.split(".").count() - 1)
                .unwrap_or("");
        let file_data = fs::metadata(&temp_item.path());
        let file_date: DateTime<Utc>;
        if file_data.is_ok() {
            file_date = file_data.unwrap().modified().unwrap().clone().into();
        } else {
            file_date = Utc::now();
        }
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        dir_list.push(FDir {
            name: name.to_owned(),
            is_dir: is_dir_int,
            path: path.to_owned(),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap()),
            is_ftp: 0,
        });
    }
    dbg_log(format!(
        "Current dir: {:?} | Time: {:?}",
        current_dir().unwrap(),
        sw.elapsed()
    ));
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    return dir_list;
}

#[tauri::command]
async fn go_back() -> Vec<FDir> {
    let _ = set_current_dir(current_dir().unwrap().to_str().unwrap().to_owned() + "/../");
    dbg_log(format!("Current dir: {:?}", current_dir().unwrap()));
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_dir = fs::read_dir(current_dir().unwrap()).unwrap();
    for item in current_dir {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item
            .path()
            .to_str()
            .unwrap()
            .to_string()
            .replace("\\", "/");
        let file_ext = ".".to_string().to_owned()
            + &path
                .split(".")
                .nth(&path.split(".").count() - 1)
                .unwrap_or("");
        let file_data = fs::metadata(&temp_item.path());
        let file_date: DateTime<Utc>;
        if file_data.is_ok() {
            file_date = file_data.unwrap().modified().unwrap().clone().into();
        } else {
            file_date = Utc::now();
        }
        if is_dir.to_owned() {
            is_dir_int = 1;
        } else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name),
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap()),
            is_ftp: 0,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    return dir_list;
}

#[tauri::command]
fn go_to_dir(directory: u8) -> Vec<FDir> {
    let wanted_directory = match directory {
        0 => set_current_dir(desktop_dir().unwrap_or_default()),
        1 => set_current_dir(download_dir().unwrap_or_default()),
        2 => set_current_dir(document_dir().unwrap_or_default()),
        3 => set_current_dir(picture_dir().unwrap_or_default()),
        4 => set_current_dir(video_dir().unwrap_or_default()),
        5 => set_current_dir(audio_dir().unwrap_or_default()),
        _ => set_current_dir(current_dir().unwrap()),
    };
    if wanted_directory.is_err() {
        err_log("Not a valid directory".into());
    } else {
        dbg_log(format!("Current dir: {:?}", current_dir().unwrap()));
    }
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item
            .path()
            .to_str()
            .unwrap()
            .to_string()
            .replace("\\", "/");
        let file_ext = ".".to_string().to_owned()
            + &path
                .split(".")
                .nth(&path.split(".").count() - 1)
                .unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path())
            .unwrap()
            .modified()
            .unwrap()
            .clone()
            .into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        } else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name),
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap()),
            is_ftp: 0,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    return dir_list;
}

#[tauri::command]
async fn open_fav_ftp(hostname: String, username: String, password: String) -> Vec<FDir> {
    // Initialize ftp arguments
    unsafe {
        USERNAME = username.clone();
        PASSWORD = password.clone();
        HOSTNAME = hostname.clone();
    }
    let mut ftp_stream = FtpStream::connect(hostname).await.unwrap();
    let _ = &ftp_stream
        .login(username.as_str(), password.as_str())
        .await
        .unwrap();
    let ftp_dir = ftp_stream.pwd().await.unwrap();
    let ftp_dir_list = &ftp_stream.nlst(Some(&ftp_dir)).await.unwrap();

    for item in ftp_dir_list {
        dbg_log(format!("{:?}", item.split("/").last().unwrap()));
    }

    // Get the current directory that the client will be reading from and writing to.
    dbg_log(format!("Current dir: {:?}", &ftp_dir));

    let mut dir_list: Vec<FDir> = Vec::new();

    for item in ftp_dir_list {
        let name = &item.split("/").last().unwrap().to_string();
        let mod_date = &ftp_stream.mdtm(&item).await.unwrap_or_default();
        let size = &ftp_stream.size(&item).await.unwrap_or_default();
        let is_dir = is_directory(&mut ftp_stream, item).await;
        dir_list.push(FDir {
            name: name.to_string(),
            is_dir: is_dir,
            path: item.to_string(),
            extension: "".to_string(),
            size: size.unwrap_or_default().to_string(),
            last_modified: mod_date.unwrap_or_default().to_string(),
            is_ftp: 1,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    dir_list
}

#[tauri::command]
async fn open_ftp_dir(path: String) -> Vec<FDir> {
    let mut ftp_stream = get_current_connection().await;
    let _ = ftp_stream.cwd(&path).await.unwrap();
    let ftp_dir = ftp_stream.pwd().await.unwrap();
    let ftp_dir_list = &ftp_stream.nlst(Some(&ftp_dir)).await.unwrap();

    for item in ftp_dir_list {
        dbg_log(format!("{:?}", item));
    }

    // Get the current directory that the client will be reading from and writing to.
    dbg_log(format!("Current dir: {:?}", &ftp_dir));

    let mut dir_list: Vec<FDir> = Vec::new();

    for item in ftp_dir_list {
        let name = &item.split("/").last().unwrap().to_string();
        let mod_date = &ftp_stream.mdtm(&item).await.unwrap_or_default();
        let size = &ftp_stream.size(&item).await.unwrap_or_default();
        let is_dir = is_directory(&mut ftp_stream, item).await;
        dir_list.push(FDir {
            name: name.to_string(),
            is_dir: is_dir,
            path: item.to_string(),
            extension: "".to_string(),
            size: size.unwrap_or_default().to_string(),
            last_modified: mod_date.unwrap_or_default().to_string(),
            is_ftp: 1,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    dir_list
}

#[tauri::command]
async fn copy_from_ftp(path: String) {
    let mut ftp_stream = get_current_connection().await;
    let file = ftp_stream.simple_retr(&path).await.unwrap();
    let mut data = String::new();
    for line in file.lines() {
        data.push_str(&line.unwrap());
    }
    dbg_log(format!("Data: {:?}", data));
}

async fn is_directory(ftp_stream: &mut FtpStream, path: &str) -> i8 {
    match ftp_stream.cwd(path).await {
        Ok(_) => {
            // Zurück zum ursprünglichen Verzeichnis wechseln
            if let Err(_) = ftp_stream.cdup().await {
                err_log("Fehler beim Wechseln zum ursprünglichen Verzeichnis".into());
            }
            1 // Erfolgreich gewechselt, also ist es ein Verzeichnis
        }
        Err(_) => 0, // Fehler beim Wechseln, also ist es kein Verzeichnis
    }
}

#[tauri::command]
async fn ftp_go_back(path: String) -> Vec<FDir> {
    let mut ftp_stream = get_current_connection().await;
    ftp_stream.cwd(&path).await.unwrap();
    ftp_stream.cdup().await.unwrap();
    let ftp_dir = ftp_stream.pwd().await.unwrap();
    let ftp_dir_list = &ftp_stream.nlst(Some(&ftp_dir)).await.unwrap();

    for item in *&ftp_dir_list {
        dbg_log(format!("{:?}", item.split("/").last().unwrap()));
    }

    // Get the current directory that the client will be reading from and writing to.
    dbg_log(format!("Current dir: {:?}", &ftp_dir));

    let mut dir_list: Vec<FDir> = Vec::new();

    for item in ftp_dir_list {
        let name = &item.split("/").last().unwrap().to_string();
        let mod_date = &ftp_stream.mdtm(&item).await.unwrap_or_default();
        let size = &ftp_stream.size(&item).await.unwrap_or_default();
        let is_dir = is_directory(&mut ftp_stream, item).await;
        dir_list.push(FDir {
            name: name.to_string(),
            is_dir: is_dir,
            path: item.to_string(),
            extension: "".to_string(),
            size: size.unwrap_or_default().to_string(),
            last_modified: mod_date.unwrap_or_default().to_string(),
            is_ftp: 1,
        });
    }
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    dir_list
}

async fn get_current_connection() -> FtpStream {
    let host: String;
    let user: String;
    let password: String;
    unsafe {
        host = HOSTNAME.clone();
        user = USERNAME.clone();
        password = PASSWORD.clone();
    }
    let mut ftp_stream = FtpStream::connect(host).await.unwrap();
    let _ = ftp_stream
        .login(user.as_str(), password.as_str())
        .await
        .unwrap();
    ftp_stream
}

#[tauri::command]
async fn open_in_terminal() {
    #[cfg(target_os = "linux")]
    // Open the terminal on linux
    let _ = Command::new("gnome-terminal")
        .arg(current_dir().unwrap())
        .spawn();
    #[cfg(target_os = "windows")]
    // Open the terminal on windows
    let _ = Command::new("cmd")
        .arg("/c")
        .arg("start")
        .arg(current_dir().unwrap())
        .spawn();
    #[cfg(target_os = "macos")]
    // Open the terminal on mac
    let _ = Command::new("terminal").arg(current_dir().unwrap()).spawn();
}

#[tauri::command]
async fn go_home() -> Vec<FDir> {
    let _ = set_current_dir(home_dir().unwrap());
    return open_dir(String::from(current_dir().unwrap().to_string_lossy())).await;
}

#[tauri::command]
async fn search_for(
    file_name: String,
    max_items: i32,
    search_depth: i32,
    file_content: String,
) -> Vec<FDir> {
    dbg_log(format!("Start searching for {}", &file_name));
    let mut file_ext = ".".to_string().to_owned()
        + file_name
            .split(".")
            .nth(file_name.split(".").count() - 1)
            .unwrap_or("");
    println!("");
    // dbg_log(format!(
    //     "Start searching for {} - {}",
    //     &file_name.strip_suffix(&file_ext).unwrap_or(&file_name),
    //     &file_ext
    // ));
    let sw = Stopwatch::start_new();
    let mut search: Vec<String>;
    if file_ext != ".".to_string().to_owned() + &file_name {
        search = SearchBuilder::default()
            .location(current_dir().unwrap())
            .search_input(*&file_name.strip_suffix(&file_ext).unwrap())
            .ignore_case()
            .depth(search_depth.clone() as usize)
            .ext(&file_ext)
            .hidden()
            .limit(max_items as usize)
            .build()
            .collect();
    } else {
        search = SearchBuilder::default()
            .location(current_dir().unwrap())
            .search_input(&file_name)
            .ignore_case()
            .depth(search_depth as usize)
            .hidden()
            .limit(max_items as usize)
            .build()
            .collect();
    }

    // Sorting search results by input
    let sw2 = Stopwatch::start_new();
    similarity_sort(&mut search, &file_name);
    dbg_log(format!("Sorting took: {:?}", sw2.elapsed()));

    let mut dir_list: Vec<FDir> = Vec::new();
    for item in search {
        file_ext = ".".to_string().to_owned()
            + item
                .split(".")
                .nth(item.split(".").count() - 1)
                .unwrap_or("");
        let item = item.replace("\\", "/");
        let temp_item = &item.split("/").collect::<Vec<&str>>();
        let name = &temp_item[*&temp_item.len() - 1];
        let path = &item.replace("\\", "/");
        let temp_file = fs::metadata(&item);
        let file_size: String;
        let file_date: DateTime<Utc>;

        if &temp_file.is_ok() == &true {
            file_size = String::from(fs::metadata(&item).unwrap().len().to_string());
            file_date = fs::metadata(&item)
                .unwrap()
                .modified()
                .unwrap()
                .clone()
                .into();
        } else {
            continue;
        }

        // Check if the item is a directory
        let is_dir_int;
        if &temp_file.is_ok() == &true && *&temp_file.unwrap().is_dir() {
            is_dir_int = 1;
        } else {
            is_dir_int = 0;
        }

        // Don't include the directory searched in
        if path == current_dir().unwrap().to_str().unwrap() {
            continue;
        }

        // Search for file contents
        if &file_content != "" {
            let file = fs::File::open(&path).unwrap();
            let mut reader = BufReader::new(&file);
            let mut contents = String::from("");
            dbg_log(format!("Checking {}", &path));

            if &file.metadata().unwrap().is_dir() == &false {
                reader.read_to_string(&mut contents).unwrap_or_else(|x| {
                    err_log(format!("Error reading: {}", x));
                    0 as usize
                });
                if contents.contains(&file_content) {
                    dir_list.push(FDir {
                        name: name.to_string(),
                        is_dir: is_dir_int,
                        path: path.to_string(),
                        extension: String::from(&file_ext),
                        size: file_size.clone(),
                        last_modified: String::from(
                            file_date.to_string().split(".").nth(0).unwrap(),
                        ),
                        is_ftp: 0,
                    });
                } else {
                    continue;
                }
            }
        } else {
            dir_list.push(FDir {
                name: name.to_string(),
                is_dir: is_dir_int,
                path: path.to_string(),
                extension: String::from(&file_ext),
                size: file_size,
                last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap()),
                is_ftp: 0,
            });
        }
    }
    if dir_list.len() == 0 {
        wng_log("No item found ".into());
    }
    dbg_log(format!("Search took: {:?}", sw.elapsed()));
    dbg_log(format!("{} items found", dir_list.len()));
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    return dir_list;
}

#[tauri::command]
async fn copy_paste(
    act_file_name: String,
    from_path: String,
    is_for_dual_pane: String,
) -> Vec<FDir> {
    dbg_log("Copying starting ...".into());
    let is_dir = fs::metadata(&from_path).unwrap().is_dir();
    let sw = Stopwatch::start_new();
    let file_name: String;
    if is_for_dual_pane == "1" {
        file_name = act_file_name;
    } else {
        file_name = current_dir()
            .unwrap()
            .join(&act_file_name)
            .to_str()
            .unwrap()
            .to_string();
    }
    let temp_file_ext: String;
    let mut file_ext: String;
    let mut temp_filename: String = String::new();

    for i in 0..file_name.split(".").count() - 1 {
        temp_filename += file_name.split(".").nth(i).unwrap();
    }

    temp_file_ext = file_name
        .split(".")
        .nth(file_name.split(".").count() - 1)
        .unwrap()
        .to_string();
    file_ext = ".".to_string().to_owned() + &temp_file_ext.as_str();

    if temp_file_ext == file_name {
        file_ext = "".to_string();
    }

    temp_filename = file_name
        .strip_suffix(&file_ext)
        .unwrap_or(&file_name)
        .to_string();
    let mut is_file_existing = fs::metadata(&file_name).is_ok();
    let mut counter = 1;
    let mut final_filename: String = format!("{}{}", &temp_filename, file_ext);

    while is_file_existing {
        final_filename = format!("{}_{}{}", &temp_filename, counter, file_ext);
        is_file_existing = fs::metadata(&final_filename).is_ok();
        counter += 1;
    }

    if is_dir {
        if is_for_dual_pane == "1" {
            let _ = copy_dir::copy_dir(&from_path, final_filename.replace("\\", "/"));
        } else {
            let _ = copy_dir::copy_dir(
                current_dir().unwrap().join(&from_path.replace("\\", "/")),
                final_filename.replace("\\", "/"),
            );
        }
    } else {
        if is_for_dual_pane == "1" {
            let _ = copy(&from_path, final_filename.replace("\\", "/"));
        } else {
            let _ = copy(
                current_dir().unwrap().join(&from_path.replace("\\", "/")),
                final_filename.replace("\\", "/"),
            );
        }
    }

    /* Copy file byte by byte -> To play around with later ... */

    /*let line_file = File::open(&from_path).unwrap();
    let mut reader = BufReader::new(line_file);

    let mut buffer = Vec::new();
    reader.read_to_end(&mut buffer).expect("Failed to read file");

    let line_count = buffer.iter().len() as f64;

    let file = File::open(&from_path).unwrap();
    let file = BufReader::new(file);
    let new_file = File::create(&final_filename).unwrap();
    let mut new_file = BufWriter::new(new_file);

    let mut counter = 0;
    for (num, &byte) in buffer.iter().enumerate() {
        let progress = num as f64;
        new_file.write(&[byte]).unwrap();
        if counter % 10000000 == 0 {
            let percentage = (100.0/line_count) * progress;
            println!("{} %", &percentage.to_string());
            print!("{}[2J", 27 as char);
        }
        counter += 1;
    }*/

    dbg_log(format!("Copy-Paste time: {:?}", sw.elapsed()));
    return list_dirs().await;
}

#[tauri::command]
async fn delete_item(act_file_name: String) -> Vec<FDir> {
    let is_dir = File::open(&act_file_name)
        .unwrap()
        .metadata()
        .unwrap()
        .is_dir();
    dbg_log(String::from(&act_file_name));
    if is_dir {
        let _ = remove_dir_all(act_file_name.replace("\\", "/"));
    } else {
        let _ = remove_file(act_file_name.replace("\\", "/"));
    }
    return list_dirs().await;
}

#[tauri::command]
async fn extract_item(from_path: String) -> Vec<FDir> {
    // Check file extension
    let file_ext = ".".to_string().to_owned()
        + from_path
            .split(".")
            .nth(from_path.split(".").count() - 1)
            .unwrap_or("");

    dbg_log(format!("Start unpacking {} - {}", &file_ext, &from_path));

    // zip, 7z or rar unpack
    let sw = Stopwatch::start_new();
    if file_ext == ".zip" {
        let file = PathBuf::from(&from_path);
        let _ = create_dir(&from_path.strip_suffix(&file_ext).unwrap());
        let new_dir = PathBuf::from(&from_path.strip_suffix(&file_ext).unwrap());
        zip_extract(&file, &new_dir).unwrap();
    } else if file_ext == ".rar" {
        let mut archive = Archive::new(&from_path).open_for_processing().unwrap();
        while let Some(header) = archive.read_header().unwrap() {
            dbg_log(format!(
                "{} bytes: {}",
                header.entry().unpacked_size,
                header.entry().filename.to_string_lossy()
            ));
            archive = if header.entry().is_file() {
                header.extract().unwrap()
            } else {
                header.skip().unwrap()
            }
        }
    } else if file_ext == ".7z" {
        let _ =
            sevenz_rust::decompress_file(&from_path, &from_path.strip_suffix(&file_ext).unwrap());
    }

    dbg_log(format!("Unpack time: {:?}", sw.elapsed()));
    return list_dirs().await;
}

#[tauri::command]
async fn open_item(path: String) {
    dbg_log(format!("Opening: {}", &path));
    let _ = open::that_detached(path);
}

#[tauri::command]
async fn compress_item(from_path: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let file_ext = ".".to_string().to_owned()
        + from_path
            .split(".")
            .nth(from_path.split(".").count() - 1)
            .unwrap_or("");
    // let _ = sevenz_rust::compress_to_path(&from_path, from_path.to_string()+".7z").expect("complete");
    let _ = File::create(
        from_path
            .strip_suffix(&file_ext)
            .unwrap_or(&from_path)
            .to_owned()
            + ".zip",
    )
    .unwrap();
    let source: PathBuf;
    let archive = PathBuf::from(
        from_path
            .strip_suffix(&file_ext)
            .unwrap_or(&from_path)
            .to_owned()
            + ".zip",
    );
    if fs::metadata(&from_path).unwrap().is_dir() {
        source = PathBuf::from(&from_path);
    } else {
        let file_name = &from_path
            .split("/")
            .nth(&from_path.split("/").count() - 1)
            .unwrap();
        let _ = create_dir("compressed_dir");
        let _ = copy(
            &from_path,
            "compressed_dir/".to_string().to_owned() + file_name,
        );
        source = PathBuf::from("compressed_dir");
    }
    let _ = zip_create_from_directory(&archive, &source);
    let _ = remove_dir_all("compressed_dir");
    dbg_log(format!("Pack time: {:?}", sw.elapsed()));
    return list_dirs().await;
}

#[tauri::command]
async fn create_folder(folder_name: String) {
    let new_folder_path = PathBuf::from(&folder_name);
    let _ = fs::create_dir(current_dir().unwrap().join(new_folder_path));
}

#[tauri::command]
async fn create_file(file_name: String) {
    let new_file_path = PathBuf::from(&file_name);
    let _ = File::create(current_dir().unwrap().join(new_file_path));
}

#[tauri::command]
async fn rename_element(path: String, new_name: String) -> Vec<FDir> {
    let _ = fs::rename(
        current_dir().unwrap().join(&path.replace("\\", "/")),
        current_dir().unwrap().join(&new_name.replace("\\", "/")),
    );
    dbg_log(format!("Renamed from {} to {}", path, new_name));
    return list_dirs().await;
}

#[tauri::command]
async fn save_config(
    configured_path_one: String,
    configured_path_two: String,
    configured_path_three: String,
    is_open_in_terminal: String,
    is_dual_pane_enabled: String,
    launch_path: String,
    is_dual_pane_active: String,
    search_depth: i32,
    max_items: i32,
    is_light_mode: String,
    is_image_preview: String,
    is_select_mode: String,
) {
    let app_config_file = File::open(
        app_config_dir(&Config::default())
            .unwrap()
            .join("rdpFX/app_config.json"),
    )
    .unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    let app_config_json = AppConfig {
        view_mode: app_config["view_mode"].to_string().replace('"', ""),
        last_modified: chrono::offset::Local::now().to_string(),
        configured_path_one: configured_path_one.replace("\\", "/"),
        configured_path_two: configured_path_two.replace("\\", "/"),
        configured_path_three: configured_path_three.replace("\\", "/"),
        is_open_in_terminal: is_open_in_terminal.replace("\\", ""),
        is_dual_pane_enabled: is_dual_pane_enabled.replace("\\", ""),
        launch_path: launch_path.replace("\\", "/"),
        is_dual_pane_active: is_dual_pane_active.replace("\\", ""),
        search_depth: search_depth,
        max_items: max_items,
        is_light_mode: is_light_mode.replace("\\", "/"),
        is_image_preview: is_image_preview.replace("\\", "/"),
        is_select_mode: is_select_mode.replace("\\", "/"),
    };
    let config_dir = app_config_dir(&Config::default())
        .unwrap()
        .join("rdpFX/app_config.json")
        .to_str()
        .unwrap()
        .to_string();
    let _ = serde_json::to_writer_pretty(File::create(&config_dir).unwrap(), &app_config_json);
    dbg_log(format!("app_config was saved to {}", config_dir));
}
