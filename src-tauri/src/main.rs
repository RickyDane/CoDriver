// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env::{current_dir, set_current_dir}, fs::File};
#[allow(unused_imports)]
use std::{fs::{self, ReadDir}, clone, ffi::OsString};
use rust_search:: SearchBuilder;
use tauri::api::path::{home_dir, picture_dir, download_dir, desktop_dir, video_dir};
use stopwatch::Stopwatch;

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
              go_to_desktop,
              go_to_images,
              go_to_downloads,
              go_to_videos,
              go_to_devices
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(serde::Serialize)]
struct FDir {
    name: String,
    is_dir: i8,
    path: String,
}

#[tauri::command]
async fn list_dirs() -> Vec<FDir> {
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_dir = fs::read_dir(".").unwrap();
    for item in current_dir {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn open_dir(path: String, _name: String) -> Vec<FDir> {
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(&path).unwrap();
    let _ = set_current_dir(path);
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn open_item(path: String) {
    println!("{}", &path);
    let _ = opener::open(path); 
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
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
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
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn go_to_desktop() -> Vec<FDir> {
    let _ = set_current_dir(desktop_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn go_to_images() -> Vec<FDir> {
    let _ = set_current_dir(picture_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn go_to_downloads() -> Vec<FDir> {
    let _ = set_current_dir(download_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn go_to_videos() -> Vec<FDir> {
    let _ = set_current_dir(video_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn go_to_devices() -> Vec<FDir> {
    let _ = set_current_dir(video_dir().unwrap());
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(current_dir().unwrap()).unwrap();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let is_dir_int: i8;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        else {
            is_dir_int = 0;
        }
        dir_list.push(FDir {
            name: String::from(name), 
            is_dir: is_dir_int,
            path: String::from(path)
        });
    }
    return dir_list;
}

#[tauri::command]
async fn search_for(file_name: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let search: Vec<String> = SearchBuilder::default()
        .location(home_dir().unwrap())
        .search_input(file_name)
        .ignore_case()
        .hidden()
        .build()
        .collect();
    println!("Search time: {} ms", sw.elapsed_ms());

    let mut dir_list: Vec<FDir> = Vec::new();
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in search {
        let temp_item = &item.split("/").collect::<Vec<&str>>();
        let name = &temp_item[*&temp_item.len() - 1];
        let path = &item; 
        let temp_file = File::open(&item);
        let is_dir = temp_file.unwrap().metadata().unwrap().is_dir();
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
            path: String::from(path)
        });
    }
    return dir_list;
}
