// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env::{current_dir, set_current_dir}, fs::{File, copy, remove_dir_all, remove_file}}; 
#[allow(unused_imports)]
use std::{fs::{self, ReadDir}, clone, ffi::OsString};
use rust_search::SearchBuilder;
use tauri::api::path::{home_dir, picture_dir, download_dir, desktop_dir, video_dir, audio_dir, document_dir};
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
              go_to_dir,
              copy_paste,
              delete_item
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
async fn open_dir(_path: String, _name: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_directory = fs::read_dir(&_path).unwrap();
    let _ = set_current_dir(_path);
    println!("# DEBUG: Current dir: {:?}", current_dir().unwrap());
    for item in current_directory {
        let temp_item = item.unwrap();
        let name = &temp_item.file_name().into_string().unwrap();
        let is_dir = &temp_item.path().is_dir();
        let mut is_dir_int: i8 = 0;
        let path = &temp_item.path().to_str().unwrap().to_string();
        if is_dir.to_owned() {
            is_dir_int = 1;
        }
        dir_list.push(FDir {
            name: name.to_owned(), 
            is_dir: is_dir_int,
            path: path.to_owned()
        });
    }
    println!("{} ms", sw.elapsed_ms());
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
fn go_to_dir(directory: u8) -> Vec<FDir> {
    let wanted_directory = match directory {
        0 => set_current_dir(desktop_dir().unwrap()),
        1 => set_current_dir(download_dir().unwrap()),
        2 => set_current_dir(document_dir().unwrap()),
        3 => set_current_dir(picture_dir().unwrap()),
        4 => set_current_dir(video_dir().unwrap()),
        5 => set_current_dir(audio_dir().unwrap()),
        _ => set_current_dir(current_dir().unwrap()) 
    };
    if wanted_directory.is_err() {
        println!("Not a valid directory");
    }
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
async fn search_for(file_name: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let search: Vec<String> = SearchBuilder::default()
        .location(current_dir().unwrap())
        .search_input(file_name)
        .ignore_case()
        .depth(50)
        .build()
        .collect();
    let mut dir_list: Vec<FDir> = Vec::new();
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
    println!("{} ms", sw.elapsed_ms());
    return dir_list;
}

#[tauri::command]
async fn copy_paste(act_file_name: String, from_path: String) -> Vec<FDir> {
    println!("{} {}", &act_file_name, &from_path);
    let sw = Stopwatch::start_new();
    let file_name: String = current_dir().unwrap().join(&act_file_name.replace("/", "")).to_str().unwrap().to_string();
    let temp_file_ext: String;
    let file_ext: String;
    let mut temp_filename: String = String::new();

    for i in 0..file_name.split(".").count() - 1 {
        temp_filename += file_name.split(".").nth(i).unwrap();
    }

    temp_file_ext = file_name.split(".").nth(file_name.split(".").count() - 1).unwrap().to_string();
    file_ext = ".".to_string().to_owned()+&temp_file_ext.as_str();
    temp_filename = file_name.strip_suffix(&file_ext).unwrap().to_string();

    let mut is_file_existing = File::open(&file_name).is_ok();
    let mut counter = 1;
    let mut final_filename: String = format!("{}{}", &temp_filename, file_ext);
    while is_file_existing {
        final_filename = format!("{}_{}{}", &temp_filename, counter, file_ext); 
        is_file_existing = File::open(&final_filename).is_ok();
        counter += 1;
    }

    let copy_process = copy(current_dir().unwrap().join(&from_path), final_filename); 
    if copy_process.is_ok() {
        println!("Copy-Paste time: {} ms", sw.elapsed_ms());
    }
    else {
        println!("Fehler beim copy-paste");
    }
    return list_dirs().await;
}

#[tauri::command]
async fn delete_item(act_file_name: String) -> Vec<FDir> {
    let is_dir = File::open(&act_file_name).unwrap().metadata().unwrap().is_dir();
    println!("{}", &act_file_name);
    if is_dir {
        let _ = remove_dir_all(act_file_name);
    }
    else {
        let _ = remove_file(act_file_name);
    }
    return list_dirs().await;
}

#[allow(unused)]
#[tauri::command]
async fn set_favorite(name: String, path: String) {
    let _ = serde_json::to_writer(File::create("favorites.json").unwrap(), "test");
}
