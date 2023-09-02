// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env::{current_dir, set_current_dir}, fs::{File, copy, remove_dir_all, remove_file, create_dir}, path::PathBuf, io::BufReader, process::Command}; 
#[allow(unused_imports)]
use std::{fs::{self, ReadDir}, clone, ffi::OsString};
use rust_search::SearchBuilder;
use serde_json::Value;
use tauri::{api::path::{home_dir, picture_dir, download_dir, desktop_dir, video_dir, audio_dir, document_dir, app_config_dir, config_dir}, Config};
use stopwatch::Stopwatch;
use unrar::Archive;
use chrono::prelude::{DateTime, Utc, NaiveDateTime};
use zip_extensions::*;
use get_sys_info::{System, Platform};
use dialog::DialogBox;

fn main() {
    tauri::Builder::default()
        .invoke_handler(
            tauri::generate_handler![
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
              list_disks,
              open_in_terminal,
              rename_element,
              save_config_paths,
              switch_to_directory
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
    last_modified: String
}

#[derive(serde::Serialize)]
struct AppConfig {
    view_mode: String,
    last_modified: String,
    configured_path_one: String,
    configured_path_two: String,
    configured_path_three: String
}

#[tauri::command]
async fn check_app_config() -> AppConfig {
    create_folder(config_dir().unwrap().join("rdpFX").to_str().unwrap().to_string()).await;
    if fs::metadata(config_dir().unwrap().join("rdpFX/app_config.json")).is_err() {
        let _ = File::create(config_dir().unwrap().join("rdpFX/app_config.json"));
        let app_config_json = AppConfig {
            view_mode: "".to_string(),
            last_modified: chrono::offset::Local::now().to_string(),
            configured_path_one: "".to_string(), 
            configured_path_two: "".to_string(),
            configured_path_three: "".to_string()
        };
        let _ = serde_json::to_writer_pretty(File::create(config_dir().unwrap().join("rdpFX/app_config.json").to_str().unwrap().to_string()).unwrap(), &app_config_json);
    }
    let app_config_file = File::open(config_dir().unwrap().join("rdpFX/app_config.json")).unwrap();

    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    return AppConfig {
        view_mode: app_config["view_mode"].to_string(),
        last_modified: app_config["last_modified"].to_string(),
        configured_path_one: app_config["configured_path_one"].to_string().replace('"', ""),
        configured_path_two: app_config["configured_path_two"].to_string().replace('"', ""),
        configured_path_three: app_config["configured_path_three"].to_string().replace('"', "")
    };
}

#[derive(serde::Serialize)]
struct DisksInfo {
    name: String,
    format: String,
    path: String,
    load: String,
    capacity: String
}

#[tauri::command]
async fn list_disks() -> Vec<DisksInfo> {
    let mut ls_disks: Vec<DisksInfo> = vec![];
    #[cfg(not(target_os = "macos"))]
    let disk_list = System::new().mounts().unwrap_or_else(|r| {
            println!("get mounts error:{}", r);
            vec![]
        });
    #[cfg(not(target_os = "macos"))]
    #[cfg(not(target_os = "windows"))]
    for disk in disk_list {
        if disk.fs_mounted_from.starts_with("/dev/") || disk.fs_mounted_from.starts_with("/run/") {
            ls_disks.push(DisksInfo {
                name: disk.fs_mounted_on.split("/").last().unwrap_or("/").to_string(),
                format: disk.fs_type,
                path: disk.fs_mounted_on,
                load: disk.avail.to_string(),
                capacity: disk.total.to_string()
            });
        }
    }
    #[cfg(not(target_os = "macos"))]
    #[cfg(target_os = "windows")]
    for disk in disk_list {
        ls_disks.push(DisksInfo {
            name: disk.fs_mounted_from,
            format: disk.fs_type,
            path: disk.fs_mounted_on.replace("\\", "/"),
            load: disk.avail.to_string(),
            capacity: disk.total.to_string()
        });
    }
    return ls_disks;
}

#[tauri::command]
async fn switch_to_directory(current_dir: String) {
    println!("Switching to directory: {}", &current_dir);
    set_current_dir(current_dir).unwrap();
}
#[tauri::command]
async fn switch_view(view_mode: String) -> Vec<FDir> {
    let app_config_file = File::open(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json")).unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    println!("{}", app_config["configured_path_one"].to_string());
    let app_config_json = AppConfig {
        view_mode,
        last_modified: chrono::offset::Local::now().to_string(),
        configured_path_one: app_config["configured_path_one"].to_string().replace('"', "").replace("\\", "/").trim().to_string(),
        configured_path_two: app_config["configured_path_two"].to_string().replace('"', "").replace("\\", "/").trim().to_string(), 
        configured_path_three: app_config["configured_path_three"].to_string().replace('"', "").replace("\\", "/").trim().to_string()
    };
    let _ = serde_json::to_writer_pretty(File::create(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json").to_str().unwrap().to_string()).unwrap(), &app_config_json);
    return list_dirs().await;
}

#[tauri::command]
async fn get_current_dir() -> String {
    return current_dir().unwrap().as_path().to_str().unwrap().to_string().replace("\\", "/");
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
        let path = &temp_item.path().to_str().unwrap().to_string().replace("\\", "/");
        let file_ext = ".".to_string().to_owned()+&path.split(".").nth(&path.split(".").count() - 1).unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path()).unwrap().modified().unwrap().clone().into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
    return dir_list;
}

fn alert_not_found_dir(_x: std::io::Error) -> ReadDir {
    dialog::Message::new("It was no directory found")
    .title("No directory found")
    .show()
    .expect("Error opening dialog");
    return fs::read_dir(current_dir().unwrap()).unwrap();
}

#[tauri::command]
async fn open_dir(_path: String, _name: String) -> Vec<FDir> {
    println!("{}", &_path.contains('"'));
    let sw = Stopwatch::start_new();
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(&_path.replace('"', "")).unwrap_or_else(alert_not_found_dir);
    let _ = set_current_dir(_path);
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let mut is_dir_int: i8 = 0;
        let path = &temp_item.path().to_str().unwrap().to_string().replace("\\", "/");
        let file_ext = ".".to_string().to_owned()+&path.split(".").nth(&path.split(".").count() - 1).unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path()).unwrap().modified().unwrap().clone().into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        dir_list.push(FDir {
            name: name.to_owned(), 
            is_dir: is_dir_int,
            path: path.to_owned(),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
    println!("{} ms", sw.elapsed_ms());
    return dir_list;
}

#[tauri::command]
async fn go_back() -> Vec<FDir> {
    let _ = set_current_dir(current_dir().unwrap().to_str().unwrap().to_owned()+"/../");
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_dir = fs::read_dir(current_dir().unwrap()).unwrap();
    for item in current_dir {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string().replace("\\", "/");
        let file_ext = ".".to_string().to_owned()+&path.split(".").nth(&path.split(".").count() - 1).unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path()).unwrap().modified().unwrap().clone().into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
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
        _ => set_current_dir(current_dir().unwrap()) 
    };
    if wanted_directory.is_err() {
        println!("Not a valid directory");
    }
    else {
        println!("{:?}", current_dir().unwrap());
    }
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string().replace("\\", "/");
        let file_ext = ".".to_string().to_owned()+&path.split(".").nth(&path.split(".").count() - 1).unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path()).unwrap().modified().unwrap().clone().into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
    return dir_list;
}

#[tauri::command]
async fn open_in_terminal() {
    #[cfg(target_os = "linux")]
    // Open the terminal on linux pc
    let _ = Command::new("gnome-terminal").arg(current_dir().unwrap()).spawn();
    #[cfg(target_os = "windows")]
    // Open the terminal on windows pc
    let _ = Command::new("cmd").arg("/c").arg("start").arg(current_dir().unwrap()).spawn();
    #[cfg(target_os = "macos")]
    // Open the terminal on mac
    let _ = Command::new("open").arg(current_dir().unwrap()).spawn();
}

#[tauri::command]
async fn go_home() -> Vec<FDir> {
    let _ = set_current_dir(home_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string().replace("\\", "/");
        let file_ext = ".".to_string().to_owned()+&path.split(".").nth(&path.split(".").count() - 1).unwrap_or("");
        let file_date: DateTime<Utc> = fs::metadata(&temp_item.path()).unwrap().modified().unwrap().clone().into();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path),
            extension: file_ext,
            size: temp_item.metadata().unwrap().len().to_string(),
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
    return dir_list;
}

#[tauri::command]
async fn search_for(file_name: String) -> Vec<FDir> {
    let mut file_ext = ".".to_string().to_owned()+file_name.split(".").nth(file_name.split(".").count() - 1).unwrap_or("");
    println!("Start searching for {} - {}", &file_name.strip_suffix(&file_ext).unwrap_or(&file_name), &file_ext);
    let sw = Stopwatch::start_new();
    let search: Vec<String>;
    if file_ext != ".".to_string().to_owned()+&file_name {
        println!("{}{}", &file_name, &file_ext);
        search = SearchBuilder::default()
            .location(current_dir().unwrap())
            .search_input(file_name.strip_suffix(&file_ext).unwrap())
            .ignore_case( )
            .ext(&file_ext)
            .hidden()
            .build()
            .collect();
    }
    else {
        search = SearchBuilder::default()
            .location(current_dir().unwrap())
            .search_input(file_name)
            .ignore_case()
            .hidden()
            .build()
            .collect();
    }
    let mut dir_list: Vec<FDir> = Vec::new();
    for item in search {
        file_ext = ".".to_string().to_owned()+item.split(".").nth(item.split(".").count() - 1).unwrap_or("");
        let item = item.replace("\\", "/");
        let temp_item = &item.split("/").collect::<Vec<&str>>();
        let name = &temp_item[*&temp_item.len() - 1];
        let path = &item.replace("\\", "/"); 
        let temp_file = fs::metadata(&item);
        let file_size: String;
        let file_date: DateTime<Utc>;
        if &temp_file.is_ok() == &true {
            file_size = String::from(fs::metadata(&item).unwrap().len().to_string());
            file_date = fs::metadata(&item).unwrap().modified().unwrap().clone().into();
        }
        else {
            file_size = "0".to_string();
            file_date = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp_opt(61, 0).unwrap(), Utc);
        }
        let is_dir: bool;
        if &temp_file.is_ok() == &true {
            is_dir = *&temp_file.unwrap().is_dir();
        }
        else {
            is_dir = false;
        }
        let is_dir_int;
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: name.to_string(),
            is_dir: is_dir_int,
            path: path.to_string(),
            extension: String::from(&file_ext),
            size: file_size,
            last_modified: String::from(file_date.to_string().split(".").nth(0).unwrap())
        });
    }
    println!("{} ms", sw.elapsed_ms());
    return dir_list;
}

#[tauri::command]
async fn copy_paste(act_file_name: String, from_path: String) -> Vec<FDir> {
    let is_dir = fs::metadata(&from_path).unwrap().is_dir();
    let sw = Stopwatch::start_new();
    let file_name: String = current_dir().unwrap().join(&act_file_name.replace("/", "")).to_str().unwrap().to_string();
    let temp_file_ext: String;
    let mut file_ext: String;
    let mut temp_filename: String = String::new();

    for i in 0..file_name.split(".").count() - 1 {
        temp_filename += file_name.split(".").nth(i).unwrap();
    }

    temp_file_ext = file_name.split(".").nth(file_name.split(".").count() - 1).unwrap().to_string();
    file_ext = ".".to_string().to_owned()+&temp_file_ext.as_str();

    if temp_file_ext == file_name {
        file_ext = "".to_string();    
    } 

    temp_filename = file_name.strip_suffix(&file_ext).unwrap_or(&file_name).to_string();
    let mut is_file_existing = fs::metadata(&file_name).is_ok();
    let mut counter = 1;
    let mut final_filename: String = format!("{}{}", &temp_filename, file_ext);

    while is_file_existing {
        final_filename = format!("{}_{}{}", &temp_filename, counter, file_ext); 
        is_file_existing = fs::metadata(&final_filename).is_ok();
        counter += 1;
    }

    if is_dir {
        let _ = copy_dir::copy_dir(current_dir().unwrap().join(&from_path.replace("\\", "/")), final_filename.replace("\\", "/"));
    }
    else {
        let _ = copy(current_dir().unwrap().join(&from_path.replace("\\", "/")), final_filename.replace("\\", "/")); 
    }
    println!("Copy-Paste time: {:?}", sw.elapsed());
    return list_dirs().await;
}

#[tauri::command]
async fn delete_item(act_file_name: String) -> Vec<FDir> {
    let is_dir = File::open(&act_file_name).unwrap().metadata().unwrap().is_dir();
    println!("{}", &act_file_name);
    if is_dir {
        let _ = remove_dir_all(act_file_name.replace("\\", "/"));
    }
    else {
        let _ = remove_file(act_file_name.replace("\\", "/"));
    }
    return list_dirs().await;
}

#[tauri::command]
async fn extract_item(from_path: String) -> Vec<FDir> {
    // Check file extension
    let file_ext = ".".to_string().to_owned()+from_path.split(".").nth(from_path.split(".").count() - 1).unwrap_or("");

    println!("{} {}", &file_ext, &from_path);

    // make zip or rar unpack
    let sw = Stopwatch::start_new();
    if file_ext == ".zip" {
        let file = PathBuf::from(&from_path);
        let _ = create_dir(&from_path.strip_suffix(&file_ext).unwrap());
        let new_dir = PathBuf::from(&from_path.strip_suffix(&file_ext).unwrap());
        zip_extract(&file, &new_dir).unwrap();
    }
        else if file_ext == ".rar" {
            let mut archive = Archive::new(&from_path)
                .open_for_processing()
                .unwrap();
            while let Some(header) = archive.read_header().unwrap() {
                println!("{} bytes: {}", header.entry().unpacked_size, header.entry().filename.to_string_lossy());
                archive = if header.entry().is_file() {
                    header.extract().unwrap()
                } else {
                    header.skip().unwrap()
                }
            }
        }
    else if file_ext == ".7z" {
        let _ = sevenz_rust::decompress_file(&from_path, &from_path.strip_suffix(&file_ext).unwrap());
    }
    println!("Unpack time: {} ms", sw.elapsed_ms());
    return list_dirs().await;
}

#[tauri::command]
async fn open_item(path: String) {
    println!("{}", &path);
    let _ = open::that_detached(path); 
}

#[tauri::command]
async fn compress_item(from_path: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let file_ext = ".".to_string().to_owned()+from_path.split(".").nth(from_path.split(".").count() - 1).unwrap_or("");
    // let _ = sevenz_rust::compress_to_path(&from_path, from_path.to_string()+".7z").expect("complete");
    let _ = File::create(from_path.strip_suffix(&file_ext).unwrap_or(&from_path).to_owned()+".zip").unwrap();
    let source: PathBuf;
    let archive = PathBuf::from(from_path.strip_suffix(&file_ext).unwrap_or(&from_path).to_owned()+".zip");
    if fs::metadata(&from_path).unwrap().is_dir() {
        source = PathBuf::from(&from_path);
    }
    else {
        let file_name = &from_path.split("/").nth(&from_path.split("/").count() - 1).unwrap();
        let _ = create_dir("compressed_dir");
        let _ = copy(&from_path, "compressed_dir/".to_string().to_owned()+file_name);
        source = PathBuf::from("compressed_dir");
    }
    let _ = zip_create_from_directory(&archive, &source);
    let _ = remove_dir_all("compressed_dir");
    println!("Pack time: {} ms", sw.elapsed_ms());
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
    let sw = Stopwatch::start_new();
    let _ = fs::rename(current_dir().unwrap().join(&path.replace("\\", "/")), current_dir().unwrap().join(&new_name.replace("\\", "/")));
    println!("Rename time: {} ms", sw.elapsed_ms());
    return list_dirs().await;
}

#[tauri::command]
async fn save_config_paths(configured_path_one: String, configured_path_two: String, configured_path_three: String) {
    let app_config_file = File::open(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json")).unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    let app_config_json = AppConfig {
        view_mode: app_config["view_mode"].to_string().replace('"', ""),
        last_modified: chrono::offset::Local::now().to_string(),
        configured_path_one: configured_path_one.replace("\\", "/"),
        configured_path_two: configured_path_two.replace("\\", "/"), 
        configured_path_three: configured_path_three.replace("\\", "/") 
    };
    let _ = serde_json::to_writer_pretty(File::create(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json").to_str().unwrap().to_string()).unwrap(), &app_config_json);
}
