// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{env::{current_dir, set_current_dir}, fs::{File, copy, remove_dir_all, remove_file}, path::PathBuf, io::BufReader}; 
#[allow(unused_imports)]
use std::{fs::{self, ReadDir}, clone, ffi::OsString};
use rust_search::SearchBuilder;
use serde_json::Value;
use tauri::{api::path::{home_dir, picture_dir, download_dir, desktop_dir, video_dir, audio_dir, document_dir, app_config_dir}, Config};
use stopwatch::Stopwatch;
use unrar::Archive;
use chrono::prelude::{DateTime, Utc, NaiveDateTime};

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
              create_file
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
    last_modified: String
}

#[tauri::command]
async fn check_app_config() -> AppConfig {
    create_folder(app_config_dir(&Config::default()).unwrap().join("rdpFX").to_str().unwrap().to_string()).await;
    let app_config_file = File::open(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json")).unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    return AppConfig {
        view_mode: app_config["view_mode"].to_string(),
        last_modified: app_config["last_modified"].to_string()
    };
}

#[tauri::command]
async fn switch_view(view_mode: String) -> Vec<FDir> {
    let app_config_json = AppConfig {
        view_mode,
        last_modified: chrono::offset::Local::now().to_string()
    };
    let _ = serde_json::to_writer_pretty(File::create(app_config_dir(&Config::default()).unwrap().join("rdpFX/app_config.json").to_str().unwrap().to_string()).unwrap(), &app_config_json);
    return list_dirs().await;
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

#[tauri::command]
async fn open_dir(_path: String, _name: String) -> Vec<FDir> {
    println!("{}", &_path);
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
async fn open_item(path: String) {
    println!("{}", &path);
    let _ = open::that(path); 
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
            .depth(10)
            .build()
            .collect();
    }
    else {
        search = SearchBuilder::default()
            .location(current_dir().unwrap())
            .search_input(file_name)
            .ignore_case()
            .depth(10)
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
        let fname = std::path::Path::new(&from_path);
        let file = fs::File::open(fname).unwrap();

        let mut archive = zip::ZipArchive::new(file).unwrap();

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).unwrap();
            let outpath = match file.enclosed_name() {
                Some(path) => path.to_owned(),
                None => continue,
            };

            {
                let comment = file.comment();
                if !comment.is_empty() {
                    println!("File {i} comment: {comment}");
                }
            }

            if (*file.name()).ends_with('/') {
                fs::create_dir_all(&outpath).unwrap();
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p).unwrap();
                    }
                }
                let mut outfile = fs::File::create(&outpath).unwrap();
                std::io::copy(&mut file, &mut outfile).unwrap();
            }

            // Get and Set permissions
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;

                if let Some(mode) = file.unix_mode() {
                    fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).unwrap();
                }
            }
        }
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
async fn compress_item(from_path: String) -> Vec<FDir> {
    let sw = Stopwatch::start_new();
    let _ = sevenz_rust::compress_to_path(&from_path, from_path.to_string()+".7z").expect("complete");
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

#[allow(unused)]
#[tauri::command]
async fn set_favorite(name: String, path: String) {
    let _ = serde_json::to_writer(File::create("favorites.json").unwrap(), "test");
}
