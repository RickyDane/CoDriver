// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use base64::prelude::BASE64_STANDARD;
use base64::Engine;
use chrono::prelude::DateTime;
use chrono::Local;
#[allow(unused)]
use delete::{delete_file, rapid_delete_dir_all};
use flate2::read::GzDecoder;
#[cfg(target_os = "macos")]
use icns::{IconFamily, IconType};
use image::ImageReader;
// use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde::Serialize;
use serde_json::Value;
use std::fs::{self, read_dir, remove_dir, remove_file};
use std::io::Cursor;
#[allow(unused)]
use std::io::Error;
#[allow(unused)]
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, OnceLock};
use std::{
    env::{current_dir, set_current_dir},
    fs::{copy, create_dir, File},
    path::PathBuf,
};
use stopwatch::Stopwatch;
use tauri::api::dialog;
use tauri::async_runtime::Mutex;
use tauri::{
    api::path::{
        app_config_dir, audio_dir, config_dir, desktop_dir, document_dir, download_dir, home_dir,
        picture_dir, video_dir,
    },
    Config,
};
#[allow(unused)]
use tauri::{Manager, Window, WindowEvent};
#[cfg(target_os = "macos")]
use window_vibrancy::apply_vibrancy;
use zip_extensions::*;
mod utils;
use rayon::prelude::*;
use sysinfo::Disks;
use utils::{
    copy_to, count_entries, create_new_action, dbg_log, err_log, format_bytes,
    remove_action, show_progressbar, success_log, unpack_tar, wng_log, DirWalker, DirWalkerEntry,
};
#[cfg(target_os = "macos")]
mod window_tauri_ext;
#[cfg(target_os = "macos")]
use window_tauri_ext::WindowExt;
mod applications;
#[allow(unused)]
use applications::{get_apps, open_file_with};
use lazy_static::lazy_static;
use substring::Substring;

use crate::utils::{
    compress_items, extract_brotli_tar, extract_from_density, extract_tar_bz2, extract_zst_archive,
    get_items_size, human_to_bytes, setup_fs_watcher,
};

// Global variables
lazy_static! {
    static ref COUNT_CALLED_BACK: Mutex<i32> = Mutex::new(0);
    static ref ISCANCELED: Mutex<bool> = Mutex::new(false);
    static ref PATH_HISTORY: Mutex<Vec<String>> = Mutex::new(Vec::new());
    static ref COPY_COUNTER: Mutex<f32> = Mutex::new(0.0);
    static ref TO_COPY_COUNTER: Mutex<f32> = Mutex::new(0.0);
    static ref TOTAL_BYTES_COPIED: Arc<Mutex<f32>> = Arc::new(Mutex::new(0.0));
    static ref IS_SEARCHING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

// static mut IS_SEARCHING: bool = false;

// #[cfg(target_os = "windows")]
// const SLASH: &str = "\\";
#[cfg(target_os = "windows")]
const ASSET_LOCATION: &str = "https://asset.localhost/";

// #[cfg(not(target_os = "windows"))]
// const SLASH: &str = "/";
#[cfg(not(target_os = "windows"))]
const ASSET_LOCATION: &str = "asset://localhost/";

static WINDOW: OnceLock<Window> = OnceLock::new();

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_window("main").unwrap();
            #[cfg(target_os = "macos")]
            win.set_transparent_titlebar(true);
            #[cfg(target_os = "macos")]
            win.position_traffic_lights(25.0, 32.0);
            #[cfg(target_os = "macos")]
            let _ = apply_vibrancy(
                &win,
                window_vibrancy::NSVisualEffectMaterial::HudWindow,
                None,
                None,
            );

            let _ = win.center();

            // #[cfg(not(target_os = "macos"))]
            // let _ = apply_acrylic(&win, Some((18, 18, 18, 125)));
            // #[cfg(not(target_os = "macos"))]
            // let _ = win.set_decorations(false);

            // Set window to be accessible everywhere
            let _ = WINDOW.set(win).unwrap();

            // Listen for file system changes
            std::thread::spawn(|| {
                setup_fs_watcher();
            });

            Ok(())
        })
        .on_window_event(|e| match e.event() {
            #[cfg(target_os = "macos")]
            WindowEvent::Resized { .. } => {
                let win = e.window();
                win.position_traffic_lights(25.0, 32.0);
                std::thread::sleep(std::time::Duration::from_millis(1));
            }
            // Fixes sluggish window resizing on Windows
            // See https://github.com/tauri-apps/tauri/issues/6322#issuecomment-1448141495
            #[cfg(target_os = "windows")]
            WindowEvent::Resized { .. } => {
                std::thread::sleep(std::time::Duration::from_millis(1));
            }
            _ => {}
        })
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
            mount_sshfs,
            rename_elements_with_format,
            add_favorite,
            arr_copy_paste,
            arr_delete_items,
            arr_compress_items,
            get_installed_apps,
            open_with,
            find_duplicates,
            cancel_operation,
            get_df_dir,
            // download_yt_video,
            get_app_icns,
            get_thumbnail,
            get_simple_dir_info,
            get_themes,
            stop_searching,
            get_file_content,
            open_config_location,
            log,
            get_config_location,
            get_sshfs_mounts,
            unmount_network_drive,
            unmount_drive,
            load_item_image,
            get_disk_info,
            get_machine_bytes,
            get_single_item_info
        ])
        .plugin(tauri_plugin_drag::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct FDir {
    name: String,
    is_dir: i8,
    path: String,
    extension: String,
    size: String,
    last_modified: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct Theme {
    name: String,
    primary_color: String,
    secondary_color: String,
    tertiary_color: String,
    text_color: String,
    text_color2: String,
    text_color3: String,
    transparent_color: String,
    transparent_color_active: String,
    site_bar_color: String,
    nav_bar_color: String,
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
    is_image_preview: String,
    is_select_mode: String,
    arr_favorites: Vec<String>,
    current_theme: String,
}

#[tauri::command]
async fn check_app_config() -> AppConfig {
    // Create general config directory for the app
    create_folder(
        config_dir()
            .unwrap()
            .join("com.codriver.dev")
            .to_str()
            .unwrap()
            .to_string(),
    )
    .await;
    // Create directory for saving app thumnails on a mac
    create_folder(
        config_dir()
            .unwrap()
            .join("com.codriver.dev")
            .join("App-Thumbnails")
            .to_str()
            .unwrap()
            .to_string(),
    )
    .await;
    // Create a directory for themes
    create_folder(
        config_dir()
            .unwrap()
            .join("com.codriver.dev")
            .join("Themes")
            .to_str()
            .unwrap()
            .to_string(),
    )
    .await;

    // If config doesn't exist, create it
    if fs::metadata(
        config_dir()
            .unwrap()
            .join("com.codriver.dev/app_config.json"),
    )
    .is_err()
    {
        let _ = File::create(
            config_dir()
                .unwrap()
                .join("com.codriver.dev/app_config.json"),
        );
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
            is_image_preview: "1".to_string(),
            is_select_mode: "1".to_string(),
            arr_favorites: vec![],
            current_theme: "0".to_string(),
        };
        let _ = serde_json::to_writer_pretty(
            File::create(
                config_dir()
                    .unwrap()
                    .join("com.codriver.dev/app_config.json")
                    .to_str()
                    .unwrap(),
            )
            .unwrap(),
            &app_config_json,
        );
    }

    let app_config_file = File::open(
        config_dir()
            .unwrap()
            .join("com.codriver.dev/app_config.json"),
    )
    .unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();

    let default_vec: Vec<Value> = vec![];
    AppConfig {
        view_mode: app_config["view_mode"].to_string().replace('"', ""),
        last_modified: app_config["last_modified"].to_string().replace('"', ""),
        configured_path_one: app_config["configured_path_one"]
            .to_string()
            .replace('"', ""),
        configured_path_two: app_config["configured_path_two"]
            .to_string()
            .replace('"', ""),
        configured_path_three: app_config["configured_path_three"]
            .to_string()
            .replace('"', ""),
        is_open_in_terminal: app_config["is_open_in_terminal"]
            .to_string()
            .replace('"', ""),
        is_dual_pane_enabled: app_config["is_dual_pane_enabled"]
            .to_string()
            .replace('"', ""),
        launch_path: app_config["launch_path"].to_string().replace('"', ""),
        is_dual_pane_active: app_config["is_dual_pane_active"]
            .to_string()
            .replace('"', ""),
        search_depth: app_config["search_depth"]
            .to_string()
            .parse::<i32>()
            .unwrap(),
        max_items: app_config["max_items"].to_string().parse::<i32>().unwrap(),
        is_image_preview: app_config["is_image_preview"].to_string().replace('"', ""),
        is_select_mode: app_config["is_select_mode"].to_string().replace('"', ""),
        arr_favorites: app_config["arr_favorites"]
            .as_array()
            .unwrap_or(&default_vec)
            .iter()
            .map(|x| x.to_string().replace('"', ""))
            .collect(),
        current_theme: app_config["current_theme"].to_string().replace('"', ""),
    }
}

#[tauri::command]
async fn get_themes() -> Vec<Theme> {
    let mut vec_themes: Vec<Theme> = vec![];
    let themes = read_dir(
        config_dir()
            .unwrap()
            .join("com.codriver.dev")
            .join("Themes"),
    );
    for theme_entry in themes.unwrap() {
        let app_config_file = File::open(theme_entry.unwrap().path()).unwrap();
        let app_config_reader = BufReader::new(app_config_file);
        let app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
        vec_themes.push(Theme {
            name: app_config["name"].to_string().replace('"', ""),
            primary_color: app_config["primary_color"].to_string().replace('"', ""),
            secondary_color: app_config["secondary_color"].to_string().replace('"', ""),
            tertiary_color: app_config["tertiary_color"].to_string().replace('"', ""),
            text_color: app_config["text_color"].to_string().replace('"', ""),
            text_color2: app_config["text_color2"].to_string().replace('"', ""),
            text_color3: app_config["text_color3"].to_string().replace('"', ""),
            transparent_color: app_config["transparent_color"].to_string().replace('"', ""),
            transparent_color_active: app_config["transparent_color_active"]
                .to_string()
                .replace('"', ""),
            site_bar_color: app_config["site_bar_color"].to_string().replace('"', ""),
            nav_bar_color: app_config["nav_bar_color"].to_string().replace('"', ""),
        })
    }
    vec_themes
}

#[derive(serde::Serialize)]
struct DisksInfo {
    name: String,
    dev: String,
    format: String,
    path: String,
    avail: String,
    capacity: String,
    is_removable: bool,
}

#[tauri::command]
async fn list_disks() -> Vec<DisksInfo> {
    let mut ls_disks: Vec<DisksInfo> = vec![];
    let disks = Disks::new_with_refreshed_list();
    for disk in &disks {
        if ls_disks
            .iter()
            .find(|&ls_disk| {
                ls_disk.name == disk.name().to_string_lossy().to_string()
                    && ls_disk.avail == format!("{:?}", disk.available_space())
            })
            .is_some()
        {
            continue;
        }
        ls_disks.push(DisksInfo {
            name: disk.name().to_string_lossy().to_string(),
            dev: disk.name().to_string_lossy().to_string(),
            format: disk.file_system().to_string_lossy().to_string(),
            path: format!("{:?}", disk.mount_point()).replace("\"", ""),
            avail: format!("{:?}", disk.available_space()),
            capacity: format!("{:?}", disk.total_space()),
            is_removable: disk.is_removable(),
        });
    }

    let ls_sshfs_mounts = fs::read_dir("/tmp/codriver-sshfs-mount");
    if ls_sshfs_mounts.is_ok() {
        let ls_sshfs_mounts = ls_sshfs_mounts.unwrap();
        for mount in ls_sshfs_mounts {
            let mount = mount.unwrap();
            ls_disks.push(DisksInfo {
                name: format!("{:?}", mount.file_name())
                    .split("/")
                    .last()
                    .unwrap_or("/")
                    .to_string()
                    .replace("\"", ""),
                dev: format!("{:?}", mount.file_name()),
                format: "SSHFS Network-Drive".into(),
                path: format!("{:?}", mount.path()).replace("\"", ""),
                avail: format!("{:?}", mount.metadata().unwrap().len()),
                capacity: format!("{:?}", mount.metadata().unwrap().len()),
                is_removable: true,
            });
        }
    }
    ls_disks
}

#[tauri::command]
async fn get_sshfs_mounts() -> Vec<DisksInfo> {
    let ls_sshfs_mounts = fs::read_dir("/tmp/codriver-sshfs-mount");
    if ls_sshfs_mounts.is_ok() {
        let ls_sshfs_mounts = ls_sshfs_mounts.unwrap();
        let mut ls_disks: Vec<DisksInfo> = vec![];
        for mount in ls_sshfs_mounts {
            let mount = mount.unwrap();
            ls_disks.push(DisksInfo {
                name: format!("{:?}", mount.file_name())
                    .split("/")
                    .last()
                    .unwrap_or("/")
                    .to_string()
                    .replace("\"", ""),
                dev: format!("{:?}", mount.file_name()),
                format: "SSHFS Network-Drive".into(),
                path: mount.path().as_path().to_string_lossy().to_string(),
                avail: format!("{:?}", mount.metadata().unwrap().len()),
                capacity: format!("{:?}", mount.metadata().unwrap().len()),
                is_removable: true,
            });
        }
        return ls_disks;
    }
    vec![]
}

#[tauri::command]
async fn switch_to_directory(current_dir: String) {
    let _ = set_dir(current_dir);
}
#[tauri::command]
async fn switch_view(view_mode: String) -> Vec<FDir> {
    let app_config_file = File::open(
        app_config_dir(&Config::default())
            .unwrap()
            .join("com.codriver.dev/app_config.json"),
    )
    .unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let mut app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    app_config["view_mode"] = Value::from(String::from(&view_mode));
    let _ = serde_json::to_writer_pretty(
        File::create(
            app_config_dir(&Config::default())
                .unwrap()
                .join("com.codriver.dev/app_config.json")
                .to_str()
                .unwrap(),
        )
        .unwrap(),
        &app_config,
    );
    list_dirs().await
}

#[tauri::command]
async fn get_current_dir() -> String {
    current_dir()
        .unwrap()
        .as_path()
        .to_str()
        .unwrap()
        .to_string()
        .replace("\\", "/")
}

#[tauri::command]
fn set_dir(current_dir: String) -> bool {
    dbg_log(format!("Current dir: {}", &current_dir));
    let md = fs::metadata(&current_dir);
    if md.is_err() {
        return false;
    }
    let _ = set_current_dir(&current_dir);
    true
}

#[tauri::command]
async fn list_dirs() -> Vec<FDir> {
    let mut dir_list: Vec<FDir> = Vec::new();
    let current_dir_path = current_dir();
    if current_dir_path.is_err() {
        return vec![];
    }
    let current_dir = fs::read_dir(current_dir_path.unwrap());
    if current_dir.is_err() {
        return vec![];
    }
    for item in current_dir.unwrap() {
        match item {
            Ok(temp_item) => {
                let name = &temp_item.file_name().into_string().unwrap();
                let path = &temp_item
                    .path()
                    .to_str()
                    .unwrap()
                    .to_string()
                    .replace("\\", "/");
                let file_ext = ".".to_string().to_owned()
                    + path
                        .split(".")
                        .nth(&path.split(".").count() - 1)
                        .unwrap_or("");
                let file_data = fs::metadata(temp_item.path());
                let file_date: String;
                let size = temp_item.metadata().unwrap().len();
                match file_data {
                    Ok(file_data) => {
                        let dt: DateTime<Local> = file_data.modified().unwrap().into();
                        file_date = dt.to_string();
                    }
                    Err(_) => file_date = "-".into(),
                }
                let is_dir_int = match temp_item.path().is_dir() {
                    true => 1,
                    false => 0,
                };
                dir_list.push(FDir {
                    name: String::from(name),
                    is_dir: is_dir_int,
                    path: String::from(path),
                    extension: file_ext,
                    size: size.to_string(),
                    last_modified: file_date.split(".").next().unwrap().into(),
                });
            }
            _ => continue,
        }
    }
    // Standard sort them by name
    dir_list.sort_by_key(|a| a.name.to_lowercase());
    dir_list
}

async fn push_history(path: String) {
    let mut history = PATH_HISTORY.lock().await;
    (*history).push(path);
}

async fn pop_history() {
    let mut history = PATH_HISTORY.lock().await;
    (*history).pop();
}

#[tauri::command]
async fn open_dir(path: String) -> bool {
    let md = fs::read_dir(&path);
    match md {
        Ok(_) => {
            let _ = set_dir(path.clone());
            push_history(path).await;
            true
        }
        Err(_) => {
            err_log(format!(
                "Failed to open dir: {} | {}",
                &path,
                md.err().unwrap()
            ));
            false
        }
    }
}

#[tauri::command]
async fn go_back(is_dual_pane: bool) {
    let path_history = (PATH_HISTORY.lock().await).clone();
    if path_history.len() > 1 && !is_dual_pane {
        let last_path = path_history[path_history.len() - 2].clone();
        let _ = set_dir(last_path.into());
        pop_history().await;
    } else {
        let _ = set_dir("./../".into());
    }
}

#[tauri::command]
async fn go_to_dir(directory: u8) -> Vec<FDir> {
    let wanted_directory = match directory {
        0 => set_dir(desktop_dir().unwrap_or_default().to_str().unwrap().into()),
        1 => set_dir(download_dir().unwrap_or_default().to_str().unwrap().into()),
        2 => set_dir(document_dir().unwrap_or_default().to_str().unwrap().into()),
        3 => set_dir(picture_dir().unwrap_or_default().to_str().unwrap().into()),
        4 => set_dir(video_dir().unwrap_or_default().to_str().unwrap().into()),
        5 => set_dir(audio_dir().unwrap_or_default().to_str().unwrap().into()),
        _ => set_dir(current_dir().unwrap().to_str().unwrap().into()),
    };
    if !wanted_directory {
        err_log("Not a valid directory");
    } else {
        push_history(current_dir().unwrap().to_string_lossy().to_string()).await;
    }
    list_dirs().await
}

// :ftp
#[tauri::command]
async fn mount_sshfs(
    hostname: String,
    username: String,
    password: String,
    remote_path: String,
    app_window: Window,
) -> Result<String, ()> {
    let remote_address = format!("{}@{}:{}", username, hostname, remote_path);

    let mount_point = "/tmp/codriver-sshfs-mount/".to_owned() + &username;

    // Ensure the local mount point exists
    std::fs::create_dir_all(&mount_point).expect("Failed to create mount point directory");

    // Start sshfs process
    let child = Command::new("sshfs")
        .arg(&remote_address)
        .arg(&mount_point)
        .arg("-o")
        .arg("password_stdin")
        .stdin(Stdio::piped())
        .spawn();

    if child.is_err() {
        dialog::message(Some(&app_window), "", "Failed to start sshfs process");
    }

    let mut child = child.unwrap();

    // Write the password to stdin of the sshfs process
    dbg_log(format!("Connecting to {}", remote_address));
    let stdin = child.stdin.as_mut().expect("Failed to open stdin");
    stdin
        .write_all(password.as_bytes())
        .expect("Failed to write to stdin");

    let output = child
        .wait_with_output()
        .expect("Failed to read sshfs output");

    if output.status.success() {
        dbg_log(format!("Mounted {} to {}", remote_address, mount_point));
    } else {
        wng_log(format!(
            "Failed to mount: {}",
            String::from_utf8_lossy(&output.stderr),
        ));
    }
    Ok(mount_point)
}

#[tauri::command]
async fn open_in_terminal(path: String) -> bool {
    #[cfg(target_os = "windows")]
    {
        // Try to open with Windows Terminal first
        if Command::new("wt").args(&["-d", &path]).spawn().is_ok() {
            return true;
        }

        // Fallback to PowerShell
        // Have to launch via cmd to get a new terminal window
        if Command::new("cmd")
            .args(&[
                "/c",
                "start",
                "powershell",
                "-NoExit",
                "-Command",
                &format!("Set-Location '{}'", path),
            ])
            .spawn()
            .is_ok()
        {
            return true;
        }

        // Fallback to cmd
        return Command::new("cmd")
            .args(&["/c", "start", "cmd.exe", "/k", "cd", "/d", &path])
            .spawn()
            .is_ok();
    }

    #[cfg(target_os = "macos")]
    return Command::new("open")
        .args(["-na", "Terminal", &path])
        .spawn()
        .is_ok();

    #[cfg(target_os = "linux")]
    return Command::new("exo-open")
        .args(&["--working-directory", &path, "--launch", "TerminalEmulator"])
        .spawn()
        .is_ok();
}

#[tauri::command]
async fn go_home() {
    let _ = set_dir(home_dir().unwrap().to_str().unwrap().into());
    push_history(home_dir().unwrap().to_string_lossy().to_string()).await;
}

#[tauri::command]
async fn stop_searching() {
    *(IS_SEARCHING.lock().await) = false;
    dbg_log(format!("Stopped searching"));
}

#[tauri::command]
async fn search_for(
    mut file_name: String,
    max_items: i32,
    search_depth: i32,
    file_content: String,
    is_quick_search: bool,
) {
    let app_window = WINDOW.get().unwrap();
    *(IS_SEARCHING.lock().await) = true;
    let mut count_called_back = COUNT_CALLED_BACK.lock().await;
    *count_called_back = 0;

    dbg_log(format!(
        "Start searching for: {} with depth: {}, max items: {}, content: {}, threads: {}",
        &file_name,
        search_depth,
        max_items,
        &file_content,
        num_cpus::get() - 1
    ));
    let temp_file_name = String::from(&file_name);
    if temp_file_name.split(".").next().unwrap().contains("*") {
        file_name = temp_file_name.trim().replace("*", "");
    }

    let mut file_ext: String = String::from("");
    if file_name.split(".").count() >= 2 {
        if let Some(splitted) = file_name.split(".").last() {
            file_ext = ".".to_owned() + splitted;
        }
    }

    let mut v_exts: Vec<String> = vec![];
    if !file_ext.is_empty() || file_ext == ".".to_string() {
        v_exts.push(file_ext.to_lowercase());
    }

    let sw = Stopwatch::start_new();

    DirWalker::new()
        .set_ext(v_exts)
        .search(
            current_dir().unwrap().to_str().unwrap(),
            search_depth as u32,
            file_name,
            max_items,
            is_quick_search,
            file_content,
            &|item: DirWalkerEntry| {
                app_window
                    .emit(
                        "addSingleItem",
                        serde_json::to_string(&item).unwrap().to_string(),
                    )
                    .expect("Failed to emit");
            },
            &mut count_called_back,
        )
        .await;

    *(IS_SEARCHING.lock().await) = false;

    let _ = app_window.emit(
        "hide-filesearch-count",
        sw.elapsed().as_millis() as f64 / 1000.0,
    );

    dbg_log(format!("Search took: {:?}", sw.elapsed()));
}

#[tauri::command]
async fn copy_paste(
    act_file_name: String,
    from_path: String,
    is_for_dual_pane: String,
    mut copy_to_path: String,
) {
    let app_window = WINDOW.get().unwrap();
    if copy_to_path.clone().is_empty() {
        wng_log("No destination path provided. Defaulting to current dir");
        copy_to_path = current_dir().unwrap().to_string_lossy().to_string();
    }

    let final_filename = get_final_filename(
        act_file_name,
        from_path.clone(),
        is_for_dual_pane,
        copy_to_path,
    )
    .await;

    let mut to_copy_counter = TO_COPY_COUNTER.lock().await;
    *to_copy_counter = count_entries(&from_path).unwrap();
    let total_bytes_to_copy = get_items_size([from_path.clone()]) as f32;

    show_progressbar(&app_window);

    let sw = Stopwatch::start_new();

    let item_md = fs::metadata(&from_path);
    match item_md {
        Ok(md) => {
            if md.len() < 100000000 {
                // 100 mb
                let _ = copy(from_path, final_filename);
            } else {
                println!("Copying {} to {}", from_path, final_filename);
                copy_to(
                    final_filename,
                    from_path,
                    total_bytes_to_copy,
                    to_copy_counter.clone(),
                )
                .await;
            }
        }
        _ => return,
    }

    dbg_log(format!("Copy-Paste time: {:?}", sw.elapsed()));
    let _ = app_window.emit("finish-progress-bar", ());
}

#[tauri::command]
async fn arr_copy_paste(arr_items: Vec<FDir>, is_for_dual_pane: String, mut copy_to_path: String) {
    let app_window = WINDOW.get().unwrap();
    if copy_to_path.is_empty() {
        wng_log("No destination path provided. Defaulting to current dir");
        copy_to_path = current_dir().unwrap().to_string_lossy().to_string();
    }

    // Reset counter
    *(COPY_COUNTER.lock().await) = 0.0;
    *(TOTAL_BYTES_COPIED.lock().await) = 0.0;

    show_progressbar(app_window);

    let mut filename: String;
    let mut counter = 0.0;
    let mut total_bytes = 0.0;
    for item in arr_items.clone() {
        counter += count_entries(&item.path).unwrap();
        total_bytes += dir_info(item.path.clone()).size as f32;
    }

    let sw = Stopwatch::start_new();
    for item in arr_items {
        let item_path = item.path;
        filename = item_path
            .replace("\\", "/")
            .split("/")
            .last()
            .unwrap()
            .to_string();
        let final_filename = get_final_filename(
            filename,
            item_path.clone(),
            is_for_dual_pane.clone(),
            copy_to_path.clone(),
        )
        .await;
        // Execute the copy process for either a dir or file
        copy_to(final_filename, item_path, total_bytes, counter).await;
    }
    dbg_log(format!("Copy-Paste time: {:?}", sw.elapsed().as_secs_f32()));
    let _ = app_window.emit("finish-progress-bar", sw.elapsed().as_secs_f32());
}

#[tauri::command]
async fn get_final_filename(
    act_file_name: String,
    from_path: String,
    is_for_dual_pane: String,
    copy_to_path: String,
) -> String {
    let file = fs::metadata(&from_path);
    if file.is_err() {
        err_log("File could not be copied");
        return "".into();
    }
    let file_name: String;
    if is_for_dual_pane == "1" {
        file_name = act_file_name;
    } else {
        file_name = PathBuf::from(copy_to_path)
            .join(&act_file_name)
            .to_str()
            .unwrap()
            .to_string();
    }

    let mut file_ext: String;
    let mut temp_filename: String = String::new();

    for i in 0..file_name.split(".").count() - 1 {
        temp_filename += file_name.split(".").nth(i).unwrap();
    }

    let temp_file_ext: String = file_name
        .split(".")
        .nth(file_name.split(".").count() - 1)
        .unwrap()
        .to_string();
    file_ext = ".".to_string().to_owned() + temp_file_ext.as_str();

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
        final_filename = format!("{} ({}){}", &temp_filename, counter, file_ext);
        is_file_existing = fs::metadata(&final_filename).is_ok();
        counter += 1;
    }
    final_filename = final_filename.replace("\\", "/");
    final_filename
}

#[tauri::command]
async fn delete_item(act_file_name: String) {
    dbg_log(format!("Deleting: {}", String::from(&act_file_name)));

    #[cfg(target_os = "windows")]
    let dir_remove = remove_dir_all(&act_file_name.replace("\\", "/"));
    #[cfg(target_os = "windows")]
    if dir_remove.is_err() {
        let _ = delete_file(&act_file_name.replace("\\", "/")).expect("Failed to delete file");
        return;
    } else {
        return;
    }

    let file = File::open(&act_file_name);
    let mut is_dir = false;
    if file.is_ok() {
        is_dir = file.unwrap().metadata().unwrap().is_dir();
    }
    if is_dir {
        rapid_delete_dir_all(&act_file_name.replace("\\", "/"), None, None)
            .await
            .expect("Failed to delete dir");
    } else {
        let file_deletion = delete_file(&act_file_name.replace("\\", "/"));
        if file_deletion.is_err() {}
    }
}

#[tauri::command]
async fn arr_delete_items(arr_items: Vec<String>) {
    for path in arr_items {
        delete_item(path).await;
    }
}

#[tauri::command]
async fn extract_item(from_path: String, app_window: Window) {
    let action_id = create_new_action(
        &app_window,
        "Extracting ...".into(),
        from_path.clone().split("/").last().unwrap().to_string(),
        &from_path,
    );
    // Check file extension
    let file_ext = ".".to_string().to_owned()
        + from_path
            .split(".")
            .nth(from_path.split(".").count() - 1)
            .unwrap_or("");

    dbg_log(format!("Start unpacking {} - {}", &file_ext, &from_path));

    // zip, 7z, zstd, tar, tar.gz, tar.bz2, rar unpack
    let sw = Stopwatch::start_new();

    if file_ext == ".br" {
        let stripped_path = from_path
            .strip_suffix(&file_ext)
            .unwrap()
            .strip_suffix(".tar")
            .unwrap();
        let _ = extract_brotli_tar(
            &from_path,
            &stripped_path
                .strip_suffix(&(".".to_string() + stripped_path.split(".").last().unwrap()))
                .unwrap(),
        );
    } else if file_ext == ".density" {
        let _ = extract_from_density(&from_path, &from_path.strip_suffix(&file_ext).unwrap());
    } else if from_path.ends_with(".tar.zst") || from_path.ends_with(".tar.zstd") {
        let _ = extract_zst_archive(
            PathBuf::from(&from_path).as_path(),
            PathBuf::from(&from_path.strip_suffix(&file_ext).unwrap()).as_path(),
        );
    } else if file_ext == ".zip" || file_ext == ".zst" || file_ext == ".zstd" {
        let file = PathBuf::from(&from_path);
        let output = Path::new(from_path.strip_suffix(&file_ext).unwrap()).with_extension("");
        let _ = create_dir(&output);
        let _ = WINDOW.get().unwrap().emit("refreshView", ());
        let new_dir = PathBuf::from(output.as_path());
        let extract = zip_extract(&file, &new_dir);
        if extract.is_err() {
            let _ = app_window.eval("showToast('Archive couldnt be extracted')");
            remove_action(action_id);
            err_log(extract.unwrap_err().to_string());
            return;
        }
    } else if file_ext == ".rar" {
        let mut archive = unrar::Archive::new(&from_path)
            .open_for_processing()
            .unwrap();
        let _ = WINDOW.get().unwrap().emit("refreshView", ());
        while let Some(header) = archive.read_header().unwrap() {
            archive = if header.entry().is_file() {
                header.extract().unwrap()
            } else {
                header.skip().unwrap()
            }
        }
    } else if file_ext == ".7z" {
        let _ =
            sevenz_rust::decompress_file(&from_path, from_path.strip_suffix(&file_ext).unwrap());
    } else if file_ext == ".tar" {
        unpack_tar(
            File::open(&from_path).unwrap(),
            Path::new(&from_path)
                .with_extension("")
                .to_str()
                .unwrap()
                .to_string(),
        );
    } else if file_ext == ".gz" {
        let file = File::open(&from_path).unwrap();
        let mut archive = GzDecoder::new(file);
        let mut buffer = Vec::new();
        let _ = archive.read_to_end(&mut buffer).unwrap();
        let _ = File::create(from_path.strip_suffix(&file_ext).unwrap())
            .unwrap()
            .write_all(&buffer);
        unpack_tar(
            File::open(from_path.strip_suffix(&file_ext).unwrap()).unwrap(),
            from_path.strip_suffix(&file_ext).unwrap().to_string(),
        );
        let _ = remove_file(from_path.strip_suffix(&file_ext).unwrap());
    } else if file_ext == ".bz2" {
        let _ = extract_tar_bz2(
            Path::new(&from_path),
            Path::new(
                from_path.trim_end_matches(".tar.bz2").trim_end_matches(
                    &(".".to_string()
                        + from_path
                            .trim_end_matches(".tar.bz2")
                            .split(".")
                            .last()
                            .unwrap()),
                ),
            ),
        );
    } else {
        err_log("Unsupported file type");
        return;
    }

    dbg_log(format!("Unpack time: {:?}", sw.elapsed()));
    remove_action(action_id);
}

#[tauri::command]
async fn open_item(path: String) {
    dbg_log(format!("Opening: {}", &path));
    let _ = open::that_detached(path);
}

#[tauri::command]
async fn compress_item(
    from_path: String,
    compression_level: i32,
    path_to_zip: String,
    compression_type: String,
    interval_id: usize,
) {
    let output = format!(
        "{}.{}",
        current_dir()
            .unwrap()
            .join(path_to_zip)
            .to_string_lossy()
            .to_string(),
        compression_type
    );
    compress_items(
        output,
        vec![from_path],
        compression_level,
        &compression_type,
        None,
        interval_id,
    )
    .await
    .unwrap();
}

#[tauri::command]
async fn arr_compress_items(
    arr_items: Vec<String>,
    compression_level: i32,
    compression_type: String,
    interval_id: usize,
) {
    let path_to_zip = current_dir()
        .unwrap()
        .join("compressed_items_archive")
        .to_string_lossy()
        .to_string();
    let output = format!(
        "{}.{}",
        current_dir()
            .unwrap()
            .join(path_to_zip)
            .to_string_lossy()
            .to_string(),
        compression_type
    );
    compress_items(
        output,
        arr_items,
        compression_level,
        &compression_type,
        None,
        interval_id,
    )
    .await
    .unwrap();
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
async fn rename_element(path: String, new_name: String, app_window: Window) -> Vec<FDir> {
    let renamed = fs::rename(
        current_dir().unwrap().join(path.replace("\\", "/")),
        current_dir().unwrap().join(new_name.replace("\\", "/")),
    );
    if renamed.is_err() {
        err_log("Failed to rename element");
        app_window
            .eval("alert('Failed to rename element')")
            .unwrap();
    } else {
        dbg_log(format!("Renamed from {} to {}", path, new_name));
    }
    list_dirs().await
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
    is_image_preview: String,
    is_select_mode: String,
    arr_favorites: Vec<String>,
    current_theme: String,
) {
    let app_config_file = File::open(
        app_config_dir(&Config::default())
            .unwrap()
            .join("com.codriver.dev/app_config.json"),
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
        search_depth,
        max_items,
        is_image_preview: is_image_preview.replace("\\", "/"),
        is_select_mode: is_select_mode.replace("\\", "/"),
        arr_favorites,
        current_theme: current_theme.replace("\\", "/"),
    };
    let config_dir = app_config_dir(&Config::default())
        .unwrap()
        .join("com.codriver.dev/app_config.json")
        .to_str()
        .unwrap()
        .to_string();
    let _ = serde_json::to_writer_pretty(File::create(&config_dir).unwrap(), &app_config_json);
    dbg_log(format!("app_config was saved to {}", config_dir));
}

#[tauri::command]
async fn rename_elements_with_format(
    arr_elements: Vec<String>,
    new_name: String,
    start_at: i32,
    step_by: i32,
    n_digits: usize,
    ext: String,
) {
    let mut counter = start_at;
    for element in arr_elements {
        let mut item_ext: String = ext.to_string();
        if !element.split(".").last().unwrap().is_empty() && ext.is_empty() {
            item_ext = ".".to_string() + element.split(".").last().unwrap();
        }
        let _ = fs::rename(
            &element,
            format!("{}{:0>n_digits$}{}", new_name, counter, item_ext),
        );
        dbg_log(format!(
            "Renamed from {} to {}",
            element,
            format!("{}{:0>n_digits$}{}", new_name, counter, item_ext)
        ));
        counter += step_by;
    }
}

// TODO: impl this stuff
#[tauri::command]
async fn add_favorite(arr_favorites: Vec<String>) {
    let app_config_file = File::open(
        app_config_dir(&Config::default())
            .unwrap()
            .join("com.codriver.dev/app_config.json"),
    )
    .unwrap();
    let app_config_reader = BufReader::new(app_config_file);
    let mut app_config: Value = serde_json::from_reader(app_config_reader).unwrap();
    app_config["arr_favorites"] = arr_favorites
        .clone()
        .into_iter()
        .map(Value::String)
        .collect();
    let _ = serde_json::to_writer_pretty(
        File::create(
            app_config_dir(&Config::default())
                .unwrap()
                .join("com.codriver.dev/app_config.json")
                .to_str()
                .unwrap(),
        )
        .unwrap(),
        &app_config,
    );
    dbg_log(format!("Saved favorites: {:?}", arr_favorites));
}

#[tauri::command]
async fn get_installed_apps(extension: String) -> Vec<(String, String)> {
    let list_apps = get_apps(extension);
    let mut arr_apps: Vec<(String, String)> = vec![];
    for app in list_apps {
        arr_apps.push((app.name.clone(), app.app_path_exe));
    }
    arr_apps
}

#[tauri::command]
async fn open_with(_file_path: String, _app_path: String) {
    #[cfg(not(target_os = "linux"))]
    open_file_with(_file_path, _app_path);
}

#[tauri::command]
async fn find_duplicates(app_window: Window, path: String, depth: u32) -> Vec<Vec<DirWalkerEntry>> {
    let files = DirWalker::new()
        .depth(depth)
        .run(&path)
        .ext(vec![
            "png", "jpg", "jpeg", "txt", "svg", "gif", "mp4", "mp3", "wav", "pdf", "docx", "xlsx",
            "doc", "zip", "rar", "7z", "dmg", "iso", "exe", "msi", "jar", "deb", "sh", "py", "htm",
            "html",
        ])
        .get_items();
    let mut seen_items: Vec<DirWalkerEntry> = Vec::new();
    let mut duplicates: Vec<Vec<DirWalkerEntry>> = Vec::new();
    for item in files.into_par_iter().collect::<Vec<DirWalkerEntry>>() {
        let seen_item = seen_items.par_iter().find_any(|x| {
            x.is_file
                && x.size == item.size
                && x.size > 0
                && x.name.contains(item.name.substring(0, item.name.len() - 3))
        });
        if seen_item.is_some() {
            if duplicates.is_empty() {
                duplicates.push(vec![seen_item.unwrap().clone(), item.clone()]);
            } else {
                let collection = duplicates.par_iter_mut().find_any(|x| {
                    x[0].size == seen_item.unwrap().size
                        && x[0].size > 0
                        && x[0]
                            .name
                            .contains(item.name.substring(0, item.name.len() - 3))
                });
                if collection.is_some() {
                    collection.unwrap().push(item.clone());
                } else {
                    duplicates.push(vec![item.clone(), seen_item.unwrap().clone()]);
                }
            }
        } else {
            seen_items.push(item);
        }
    }
    for (idx, arr_duplicate) in duplicates.clone().iter().enumerate() {
        let var_idx = &idx.clone().to_string();
        let mut inner_html = String::new();
        let mut js_query = String::new()
            + "
            var duplicate"
            + var_idx
            + " = document.createElement('div');
            duplicate"
            + var_idx
            + ".setAttribute('itempaneside', '');
            duplicate"
            + var_idx
            + ".setAttribute('itemisdir', '0');
            duplicate"
            + var_idx
            + ".setAttribute('itemext', '');
            duplicate"
            + var_idx
            + ".setAttribute('isftp', '0');
            duplicate"
            + var_idx
            + ".className = 'list-item duplicate-item';
        ";
        for (idx, item) in arr_duplicate.clone().iter().enumerate() {
            inner_html.push_str(
                &(String::new()
                    + "
                <div style='display: flex; align-items: center; justify-content: space-between;'>
                    <div>
                        <h4>"
                    + &item.name
                    + "</h3>
                        <h4 class='text-2'>"
                    + &item.path
                    + "</h4>
                        <h4 class='text-2'>"
                    + &format_bytes(item.size)
                    + "</h4>
                    </div>
            "),
            );
            if item.name.ends_with("jpg")
                || item.name.ends_with("jpeg")
                || item.name.ends_with("png")
                || item.name.ends_with("gif")
                || item.name.ends_with("svg")
                || item.name.ends_with("webp")
                || item.name.ends_with("jfif")
                || item.name.ends_with("tiff")
            {
                inner_html.push_str(&(String::new()+"
                    <img style='box-shadow: 0px 0px 10px 1px var(--transparentColorActive); border-radius: 5px;' width='64px' height='auto' src='"+ASSET_LOCATION+""+&item.path+"'>
                </div>
                "));
            } else {
                inner_html.push_str(
                    &(String::new()
                        + "
                    </div>
                "),
                );
            }
            js_query.push_str(
                &(String::new()
                    + "
                duplicate"
                    + var_idx
                    + ".setAttribute('"
                    + &format!("itempath-{}", idx)
                    + "', '"
                    + &item.path
                    + "');
            "),
            );
        }
        js_query.push_str(
            &(String::new()
                + "
            duplicate"
                + var_idx
                + ".innerHTML = `"
                + &inner_html
                + "`;
            duplicate"
                + var_idx
                + ".oncontextmenu = (e) => showExtraContextMenu(e, duplicate"
                + var_idx
                + ");
            document.querySelector('.duplicates-list').append(duplicate"
                + var_idx
                + ");
        "),
        );
        let _ = app_window.eval(&js_query);
    }
    duplicates
}

#[tauri::command]
async fn cancel_operation() {
    *ISCANCELED.lock().await = true;
}

#[tauri::command]
async fn get_df_dir(number: u8) -> String {
    match number {
        0 => desktop_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        1 => download_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        2 => document_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        3 => picture_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        4 => video_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        5 => audio_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        _ => current_dir().unwrap().to_string_lossy().to_string(),
    }
}

// #[tauri::command]
// async fn download_yt_video(app_window: Window, url: String, quality: String) {
//     let action_id = create_new_action(
//         &app_window,
//         "Downloading ...".into(),
//         url.clone(),
//         &"".into(),
//     );
//     dbg_log(format!("Downloading {} as {}", url, quality));
//     let chosen_quality = match quality.as_str() {
//         "lowestvideo" => VideoQuality::LowestVideo,
//         "lowestaudio" => VideoQuality::LowestAudio,
//         "highestvideo" => VideoQuality::HighestVideo,
//         "highestaudio" => VideoQuality::HighestAudio,
//         _ => VideoQuality::HighestVideo,
//     };

//     dbg_log(format!("Chosen quality: {:?}", chosen_quality));

//     let video_options = VideoOptions {
//         quality: chosen_quality,
//         filter: VideoSearchOptions::Video,
//         ..Default::default()
//     };

//     let video = Video::new_with_options(url, video_options).unwrap();

//     let stream = video.stream().await;
//     if stream.is_err() {
//         let _ = &app_window.eval("alert('Failed to retrieve source')");
//         remove_action(action_id);
//         return;
//     }
//     let stream = stream.unwrap();
//     let video_info = video.get_basic_info().await.unwrap();
//     let mut file = File::create(video_info.video_details.title.to_owned() + ".mp4").unwrap();
//     let _total_size = stream.content_length() as f32;
//     let mut downloaded: u64 = 0;
//     let sw = Stopwatch::start_new();

//     while let Some(chunk) = stream.chunk().await.unwrap_or_default() {
//         file.write_all(&chunk).unwrap();
//         downloaded += chunk.len() as u64;
//         let _speed = calc_transfer_speed(downloaded, sw.elapsed_ms());
//     }
//     remove_action(action_id);
// }

#[tauri::command]
async fn get_app_icns(_path: String) -> String {
    #[cfg(target_os = "linux")]
    return "".into();

    #[cfg(target_os = "windows")]
    return "".into();

    #[cfg(target_os = "macos")]
    {
        let icns = applications::find_app_icns(_path.clone().into());
        if icns.is_some() {
            let icns = icns.unwrap();

            let icns_path = config_dir()
                .unwrap()
                .join("com.codriver.dev")
                .join("App-Thumbnails");
            let new_img_path = icns_path.to_string_lossy().to_string()
                + "/"
                + _path.split("/").last().unwrap()
                + icns.file_name().unwrap().to_str().unwrap()
                + ".png";

            if PathBuf::from(new_img_path.clone()).exists() {
                return new_img_path;
            }

            let file = BufReader::new(File::open(icns.to_string_lossy().to_string()).unwrap());
            let icon_family = IconFamily::read(file);
            if icon_family.is_err() {
                return icns.to_string_lossy().to_string();
            }
            let icon_family = icon_family.unwrap();

            let mut image = icon_family.get_icon_with_type(IconType::RGBA32_512x512_2x);
            if image.is_err() {
                image = icon_family.get_icon_with_type(IconType::RGBA32_512x512);
                if image.is_err() {
                    image = icon_family.get_icon_with_type(IconType::RGBA32_256x256_2x);
                    if image.is_err() {
                        image = icon_family.get_icon_with_type(IconType::RGBA32_256x256);
                        if image.is_err() {
                            image = icon_family.get_icon_with_type(IconType::RGBA32_128x128_2x);
                            if image.is_err() {
                                image = icon_family.get_icon_with_type(IconType::RGBA32_128x128);
                                if image.is_err() {
                                    image = icon_family.get_icon_with_type(IconType::RGBA32_64x64);
                                    if image.is_err() {
                                        image = icon_family
                                            .get_icon_with_type(IconType::RGBA32_32x32_2x);
                                        if image.is_err() {
                                            image = icon_family
                                                .get_icon_with_type(IconType::RGBA32_32x32);
                                            if image.is_err() {
                                                image = icon_family
                                                    .get_icon_with_type(IconType::RGBA32_16x16_2x);
                                                if image.is_err() {
                                                    image = icon_family
                                                        .get_icon_with_type(IconType::RGBA32_16x16);
                                                    if image.is_err() {
                                                        image = icon_family.get_icon_with_type(
                                                            IconType::RGB24_128x128,
                                                        );
                                                        if image.is_err() {
                                                            image = icon_family.get_icon_with_type(
                                                                IconType::RGB24_48x48,
                                                            );
                                                            if image.is_err() {
                                                                image = icon_family
                                                                    .get_icon_with_type(
                                                                        IconType::RGB24_32x32,
                                                                    );
                                                                if image.is_err() {
                                                                    image = icon_family
                                                                        .get_icon_with_type(
                                                                            IconType::RGB24_16x16,
                                                                        );
                                                                    if image.is_err() {
                                                                        image = icon_family
                                                                            .get_icon_with_type(
                                                                            IconType::Mask8_128x128,
                                                                        );
                                                                        if image.is_err() {
                                                                            image = icon_family
                                                                                .get_icon_with_type(
                                                                                    IconType::Mask8_48x48,
                                                                                );
                                                                            if image.is_err() {
                                                                                image = icon_family.get_icon_with_type(IconType::Mask8_32x32);
                                                                                if image.is_err() {
                                                                                    image = icon_family.get_icon_with_type(IconType::Mask8_16x16);
                                                                                    if image
                                                                                        .is_err()
                                                                                    {
                                                                                        return icns.to_string_lossy().to_string();
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Save additional icon to read from codriver
            let image = image.unwrap();
            if !PathBuf::from(&new_img_path).exists() {
                let file = File::create(&new_img_path);
                if file.is_err() {
                    return icns.to_string_lossy().to_string();
                }
                let file = file.unwrap();
                BufWriter::new(&file);
                image.write_png(file).unwrap();
                dbg_log(format!("Writing image to: {}", new_img_path));
            }

            new_img_path
        } else {
            String::from("")
        }
    }
}

#[tauri::command]
async fn get_thumbnail(image_path: String) -> String {
    dbg_log(format!("Getting thumbnail for: {}", image_path));

    let thumbnails_dir = config_dir()
        .unwrap()
        .join("com.codriver.dev")
        .join("Thumbnails");

    if !PathBuf::from(&thumbnails_dir).exists() {
        let _ = create_dir(&thumbnails_dir);
    }

    let new_thumbnail_path = thumbnails_dir.join(image_path.clone().split("/").last().unwrap());

    if PathBuf::from(&new_thumbnail_path).exists() {
        return new_thumbnail_path.to_string_lossy().to_string();
    }

    let item = image::open(&image_path);

    if item.is_err() {
        dbg_log(format!(
            "Couldn't load image for thumbnail: {}",
            &image_path.split("/").last().unwrap()
        ));
        return image_path;
    }
    let item = item.unwrap();

    let thumbnail = item.thumbnail(50, 25);

    dbg_log(format!(
        "Saving thumbnail for: {}",
        image_path.split("/").last().unwrap()
    ));

    thumbnail
        .save_with_format(
            &new_thumbnail_path,
            image::ImageFormat::from_extension(image_path.split(".").last().unwrap())
                .expect("Couldn't get format by extension"),
        )
        .expect("Couldn't save thumbnail");
    new_thumbnail_path.to_string_lossy().to_string()
}

#[tauri::command]
async fn get_simple_dir_info(
    path: String,
    _app_window: Window,
    _class_to_fill: String,
) -> SimpleDirInfo {
    unsafe {
        CALCED_SIZE = 0;
    }
    dir_info(path)
}

#[derive(Debug, Serialize)]
struct SimpleDirInfo {
    size: u64,
    count_elements: u64,
}

static mut CALCED_SIZE: u64 = 0; // Currently unused -> Coming implementation for showing progress

fn dir_info(path: String) -> SimpleDirInfo {
    if PathBuf::from(&path).is_file() {
        return SimpleDirInfo {
            size: PathBuf::from(&path).metadata().unwrap().len(),
            count_elements: 1,
        };
    }

    let entry = match fs::read_dir(path) {
        Ok(entry) => entry,
        Err(_) => {
            return SimpleDirInfo {
                size: 0,
                count_elements: 0,
            }
        }
    };
    let mut size = 0;
    let mut count_elements = 0;

    for entry in entry {
        if let Ok(entry) = entry {
            if entry.file_type().unwrap().is_file() {
                let file_size = match entry.metadata() {
                    Ok(s) => s.len(),
                    Err(_) => continue,
                };
                size += file_size;
            } else if entry.file_type().unwrap().is_dir() {
                let dir_size = dir_info(entry.path().to_string_lossy().to_string()).size;
                size += dir_size;
            }
            if entry
                .file_name()
                .to_string_lossy()
                .to_string()
                .starts_with(".")
            {
                continue;
            }
            count_elements += 1;
        }
    }

    SimpleDirInfo {
        size,
        count_elements,
    }
}

#[tauri::command]
async fn get_file_content(path: String) -> String {
    let content = fs::read_to_string(&path).unwrap();
    if path.ends_with(".json") {
        let json: Value = serde_json::from_str(&content).unwrap();
        let json_string_pretty = serde_json::to_string_pretty(&json).unwrap();
        return json_string_pretty;
    }
    content
}

#[tauri::command]
async fn open_config_location() {
    let _ = open::that(config_dir().unwrap().join("com.codriver.dev"));
}

#[tauri::command]
async fn get_config_location() -> String {
    config_dir()
        .unwrap()
        .join("com.codriver.dev")
        .to_str()
        .unwrap()
        .to_string()
}

#[tauri::command]
async fn log(log: String) {
    utils::log(log);
}

#[tauri::command]
async fn unmount_network_drive(path: String) {
    let _ = Command::new("umount").arg(&path).spawn();
    dbg_log(format!("Unmounted: {}", path));
    let remove = remove_dir(&path);
    if remove.is_err() {
        dbg_log(format!("Failed to remove: {} | Trying again in 0.5s", path));
        std::thread::sleep(std::time::Duration::from_millis(500));
        let remove2 = remove_dir(&path);
        if remove2.is_err() {
            dbg_log(format!("Failed to remove: {} | Trying again in 1s", path));
            std::thread::sleep(std::time::Duration::from_millis(1000));
            let remove3 = remove_dir(&path);
            if remove3.is_err() {
                dbg_log(format!(
                    "Failed to remove: {} | Err: {}",
                    path,
                    remove3.err().unwrap()
                ));
                return;
            }
        }
    }
    success_log(format!("Removed: {}", path));
}

#[tauri::command]
async fn unmount_drive(path: String) {
    #[cfg(target_os = "macos")]
    let _ = Command::new("diskutil")
        .arg("unmountDisk")
        .arg(path)
        .spawn();
    #[cfg(target_os = "linux")]
    let _ = Command::new("umount").arg(path).spawn();
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct ImageItem {
    image_id: String,
    image_url: String,
    image_type: String,
}

#[tauri::command]
async fn load_item_image(arr_items: Vec<ImageItem>, is_single: bool) {
    let app_window = WINDOW.get().unwrap();

    // First: Try to get image from local storage
    for item in &arr_items {
        let _ = &app_window
            .emit(
                "try_load_cached_image",
                (&item.image_id, &item.image_type, &item.image_url),
            )
            .unwrap();
    }

    let mut handles = Vec::new();

    for item in arr_items {
        let handle = tokio::task::spawn(async move {
            // Second: Get actual image data
            let image_dir = item
                .image_url
                .trim_end_matches(&("/".to_owned() + item.image_url.split("/").last().unwrap()));

            // Skip loading the image when the image dir is not the current directory
            // => Means that the user switched directories in the meantime
            if item.image_url.starts_with("resources/")
                || (image_dir != current_dir().unwrap().to_str().unwrap() && !is_single)
            {
                // Skipped loading the image
                return;
            }
            let thumbnail_size = 50;
            let mut bytes = Vec::new();
            match ImageReader::open(&item.image_url) {
                Ok(image) => {
                    match image.decode() {
                        Ok(image) if item.image_type == String::from("png") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("gif") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Gif)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("webp") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::WebP)
                                .unwrap();
                        }
                        Ok(image)
                            if item.image_type == String::from("jpg")
                                || item.image_type == String::from("jpeg") =>
                        {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Jpeg)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("tiff") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Tiff)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("ico") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Ico)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("avif") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Avif)
                                .unwrap();
                        }
                        Ok(image) if item.image_type == String::from("bmp") => {
                            image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Bmp)
                                .unwrap();
                        }
                        Ok(_) => {
                            // If image type not supported (yet?), try default way
                            let _ = WINDOW
                                .get()
                                .unwrap()
                                .emit("set_default_image", (&item.image_id, &item.image_url));
                        }
                        Err(err) => {
                            let _ = WINDOW
                                .get()
                                .unwrap()
                                .emit("set_default_image", (&item.image_id, &item.image_url));
                            err_log(format!("Failed to decode/load image: {}", err));
                        }
                    }
                    let data = BASE64_STANDARD.encode(&bytes);
                    // let _ = &app_window.eval(&format!("tryLoadCachedImage({}, {}, {})", &item.image_id, &item.image_type, &item.image_url));
                    let _ = &app_window.eval(&format!(
                        "setItemImage('{}', '{}', '{}')",
                        data, &item.image_id, &item.image_url
                    ));
                    // let _ = WINDOW.get().unwrap().emit(
                    //     "set-item-image",
                    //     format!(
                    //         "{{\"data\": \"{}\", \"id\": \"{}\", \"url\": \"{}\" }}",
                    //         data, item.image_id, item.image_url
                    //     ),
                    // );
                }
                Err(err) => {
                    let _ = WINDOW
                        .get()
                        .unwrap()
                        .emit("set_default_image", (item.image_id, item.image_url));
                    err_log(format!("Failed to load image: {}", err));
                }
            }
        });
        handles.push(handle);
    }
}

#[tauri::command]
async fn get_disk_info(path: String) -> Result<DisksInfo, String> {
    let disks = Disks::new_with_refreshed_list();
    for disk in disks.iter() {
        if disk.mount_point().to_str().unwrap_or("") == path {
            return Ok(DisksInfo {
                name: format!("{:?}", disk.name()),
                dev: format!("{:?}", disk.name()),
                format: format!("{:?}", disk.file_system().to_string_lossy()),
                path: format!("{:?}", disk.mount_point()).replace("\"", ""),
                avail: format!("{:?}", disk.available_space()),
                capacity: format!("{:?}", disk.total_space()),
                is_removable: disk.is_removable(),
            });
        }
    }

    match fs::metadata(&path) {
        Ok(metadata) => Ok(DisksInfo {
            name: format!("{:?}", &path.split("/").last().unwrap()),
            dev: format!("{:?}", &path.split("/").last().unwrap()),
            format: format!("{:?}", metadata.file_type()),
            path: format!("{:?}", &path),
            avail: format!("{:?}", metadata.len()),
            capacity: format!("{:?}", metadata.len()),
            is_removable: true,
        }),
        Err(err) => Err(format!("Failed to get disk info: {}", err)),
    }
}

#[tauri::command]
async fn get_machine_bytes(size_string: String) -> u64 {
    return match human_to_bytes(size_string) {
        Ok(value) => value,
        Err(err) => {
            dbg_log(err);
            0
        }
    };
}

#[tauri::command]
async fn get_single_item_info(path: String) -> Result<FDir, String> {
    let metadata = match fs::metadata(&path) {
        Ok(metadata) => metadata,
        Err(err) => {
            err_log(format!(
                "Failed to get metadata for path '{}': {}",
                path, err
            ));
            return Err(format!(
                "Failed to get metadata for path '{}': {}",
                path, err
            ));
        }
    };

    let name = path.split("/").last().unwrap().to_string();
    let size = metadata.len();
    let is_dir = metadata.is_dir();
    let file_ext = path.split(".").last().unwrap_or("").into();
    let file_date = format!("{:?}", metadata.modified().unwrap());

    Ok(FDir {
        name: name,
        is_dir: if is_dir { 1 } else { 0 },
        path: path,
        extension: file_ext,
        size: size.to_string(),
        last_modified: file_date.split(".").next().unwrap().into(),
    })
}
