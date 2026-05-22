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
#[cfg(target_os = "windows")]
use remove_dir_all::remove_dir_all;
// use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
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
use sysinfo::Disks;
use utils::{
    copy_to, copy_to_preserving_existing, count_entries, create_new_action, dbg_log, err_log,
    remove_action, show_progressbar, success_log, unpack_tar, wng_log, DirWalker,
    DirWalkerEntry,
};
#[cfg(target_os = "macos")]
mod window_tauri_ext;
#[cfg(target_os = "macos")]
use window_tauri_ext::WindowExt;
mod applications;
#[allow(unused)]
use applications::{get_apps, open_file_with};
use lazy_static::lazy_static;

use crate::utils::{
    compress_items, dir_info, extract_brotli_tar, extract_from_density, extract_tar_bz2,
    extract_zst_archive, get_items_size, human_to_bytes, setup_fs_watcher,
};

// Global variables
lazy_static! {
    static ref HTTP_CLIENT: reqwest::Client = reqwest::Client::new();
    static ref COUNT_CALLED_BACK: Mutex<i32> = Mutex::new(0);
    static ref ISCANCELED: Mutex<bool> = Mutex::new(false);
    static ref PATH_HISTORY: Mutex<Vec<String>> = Mutex::new(Vec::new());
    static ref COPY_COUNTER: Mutex<f32> = Mutex::new(0.0);
    static ref TO_COPY_COUNTER: Mutex<f32> = Mutex::new(0.0);
    static ref TOTAL_BYTES_COPIED: Arc<Mutex<f32>> = Arc::new(Mutex::new(0.0));
    static ref IS_SEARCHING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    pub static ref IS_SIZE_CALC_CANCELLED: Arc<std::sync::atomic::AtomicBool> =
        Arc::new(std::sync::atomic::AtomicBool::new(false));
    pub static ref IS_SELECTION_SIZE_CALC_CANCELLED: Arc<std::sync::atomic::AtomicBool> =
        Arc::new(std::sync::atomic::AtomicBool::new(false));
    pub static ref IS_DUP_FIND_CANCELLED: Arc<std::sync::atomic::AtomicBool> =
        Arc::new(std::sync::atomic::AtomicBool::new(false));
}

// static mut IS_SEARCHING: bool = false;



const GEMINI_MODEL_TEXT: &str = "gemini-1.5-flash";
const GEMINI_MODEL_IMAGE: &str = "gemini-3.1-flash-image-preview";

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
            arr_copy_paste_resolved,
            arr_delete_items,
            arr_compress_items,
            get_installed_apps,
            open_with,
            cancel_operation,
            cancel_size_calculation,
            cancel_selection_size_calculation,
            get_df_dir,
            get_app_icns,
            get_thumbnail,
            get_image_dimensions,
            upscale_image,
            ai_upscale_image,
            ai_style_image,
            get_simple_dir_info,
            get_selection_size,
            get_capped_selection_size,
            get_themes,
            stop_searching,
            get_file_content,
            get_file_base64,
            open_config_location,
            log,
            get_config_location,
            get_sshfs_mounts,
            unmount_network_drive,
            unmount_drive,
            eject_disk,
            load_item_image,
            get_disk_info,
            get_machine_bytes,
            get_single_item_info,
            find_duplicates,
            cancel_duplicate_finder
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
struct CopyConflictItem {
    source_path: String,
    destination_path: String,
    policy: String,
}

#[derive(serde::Serialize, Clone, Debug)]
struct CopyPasteResolvedResult {
    copied_sources: Vec<String>,
    errors: Vec<String>,
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
    sidebar_top_blur_overlay_color: String,
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
    font_size: i32,
    is_window_transparency: String,
    gemini_api_key: String,
    is_ai_enabled: String,
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
            font_size: 12,
            is_window_transparency: "0".to_string(),
            gemini_api_key: "".to_string(),
            is_ai_enabled: "0".to_string(),
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
            .unwrap_or(10),
        max_items: app_config["max_items"].to_string().parse::<i32>().unwrap_or(1000),
        is_image_preview: app_config["is_image_preview"].to_string().replace('"', ""),
        is_select_mode: app_config["is_select_mode"].to_string().replace('"', ""),
        arr_favorites: app_config["arr_favorites"]
            .as_array()
            .unwrap_or(&default_vec)
            .iter()
            .map(|x| x.to_string().replace('"', ""))
            .collect(),
        current_theme: app_config["current_theme"].to_string().replace('"', ""),
        font_size: app_config["font_size"]
            .to_string()
            .replace('"', "")
            .parse::<i32>()
            .unwrap_or(12),
        is_window_transparency: app_config["is_window_transparency"]
            .to_string()
            .replace('"', ""),
        gemini_api_key: app_config["gemini_api_key"]
            .to_string()
            .replace('"', "")
            .replace("null", ""),
        is_ai_enabled: app_config["is_ai_enabled"]
            .to_string()
            .replace('"', "")
            .replace("null", "0"),
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
        let site_bar_color = app_config["site_bar_color"].to_string().replace('"', "");
        let sidebar_top_blur_overlay_color = app_config["sidebar_top_blur_overlay_color"]
            .as_str()
            .map(String::from)
            .unwrap_or_else(|| site_bar_color.clone());
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
            site_bar_color,
            nav_bar_color: app_config["nav_bar_color"].to_string().replace('"', ""),
            sidebar_top_blur_overlay_color,
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
            .find(|&ls_disk| ls_disk.name == disk.name().to_string_lossy().to_string())
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

    let ls_volumes = fs::read_dir("/Volumes");
    if ls_volumes.is_ok() {
        let ls_sshfs_mounts = ls_volumes.unwrap();
        for mount in ls_sshfs_mounts {
            let mount = mount.unwrap();
            if ls_disks
                .iter()
                .find(|rp| {
                    rp.path == mount.path().to_string_lossy().to_string()
                        || rp.name == mount.file_name().to_string_lossy().to_string()
                })
                .is_none()
            {
                ls_disks.push(DisksInfo {
                    name: format!("{:?}", mount.file_name())
                        .split("/")
                        .last()
                        .unwrap_or("/")
                        .to_string()
                        .replace("\"", ""),
                    dev: format!("{:?}", mount.file_name()),
                    format: "Network-Drive".into(),
                    path: format!("{:?}", mount.path()).replace("\"", ""),
                    avail: format!("{:?}", mount.metadata().unwrap().len()),
                    capacity: format!("{:?}", mount.metadata().unwrap().len()),
                    is_removable: true,
                });
            }
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
                let size;
                match temp_item.metadata() {
                    Ok(metadata) => {
                        size = metadata.len();
                    }
                    Err(_) => size = 0,
                }
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

// :ftp / :sshfs
#[tauri::command]
async fn mount_sshfs(
    hostname: String,
    username: String,
    password: String,
    remote_path: String,
    name: String,
) -> Result<String, ()> {
    // Build the remote address string
    let remote_addr = format!("{}@{}:{}", username, hostname, remote_path);

    // Mount point under /tmp
    let mount_point = format!("/tmp/codriver-sshfs-mount/{}", name);
    std::fs::create_dir_all(&mount_point).expect("Failed to create mount point");

    // Command: sudo -S sshfs -o password_stdin <remote> <mount>
    let mut child = Command::new("sshfs")
        .arg("-o")
        .arg("password_stdin") // <-- critical
        .arg(&remote_addr)
        .arg(&mount_point)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to spawn sshfs process");

    // Pipe both passwords: sudo first, then remote SSH password
    if let Some(stdin) = child.stdin.take() {
        use std::io::{BufWriter, Write};

        let mut writer = BufWriter::new(stdin);

        // sudo password + newline
        // writeln!(writer, "{}", sudo_password).expect("Failed to write sudo password"); // Not needed as the whole program needs to be ran as root

        // remote SSH password + newline
        writeln!(writer, "{}", password).expect("Failed to write remote SSH password");

        writer.flush().expect("Failed to flush password stream");
    } else {
        return Err(());
    }

    let output = child
        .wait_with_output()
        .expect("Failed to wait for sshfs process");

    if output.status.success() {
        Ok(mount_point)
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        err_log(err);
        Err(())
    }
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
                if let Err(err) = copy_to(
                    final_filename,
                    from_path,
                    total_bytes_to_copy,
                    to_copy_counter.clone(),
                )
                .await
                {
                    err_log(format!("Copy failed: {}", err));
                }
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
    crate::utils::reset_copy_start_time();

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
        if let Err(err) = copy_to(final_filename, item_path, total_bytes, counter).await {
            err_log(format!("Copy failed: {}", err));
        }
    }
    dbg_log(format!("Copy-Paste time: {:?}", sw.elapsed().as_secs_f32()));
    let _ = app_window.emit("finish-progress-bar", sw.elapsed().as_secs_f32());
}

#[tauri::command]
async fn arr_copy_paste_resolved(items: Vec<CopyConflictItem>) -> CopyPasteResolvedResult {
    let app_window = WINDOW.get().unwrap();
    if items.is_empty() {
        return CopyPasteResolvedResult {
            copied_sources: Vec::new(),
            errors: Vec::new(),
        };
    }

    *(COPY_COUNTER.lock().await) = 0.0;
    *(TOTAL_BYTES_COPIED.lock().await) = 0.0;
    crate::utils::reset_copy_start_time();

    show_progressbar(app_window);

    let mut counter = 0.0;
    let mut total_bytes = 0.0;
    for item in items.clone() {
        counter += count_entries(&item.source_path).unwrap_or(0.0);
        total_bytes += dir_info(item.source_path.clone()).size as f32;
    }

    let sw = Stopwatch::start_new();
    let mut copied_sources: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for item in items {
        if item.policy == "skip" {
            continue;
        }

        let source = item.source_path.replace("\\", "/");
        let mut destination = item.destination_path.replace("\\", "/");
        let source_path = Path::new(&source);

        let copy_result = match item.policy.as_str() {
            "replace" => {
                let destination_path = Path::new(&destination);
                if let Err(err) = validate_copy_destination(source_path, destination_path) {
                    wng_log(format!(
                        "Skipping unsafe copy from '{}' to '{}': {}",
                        source, destination, err
                    ));
                    errors.push(err);
                    continue;
                }
                replace_path_safely(source_path, destination_path, total_bytes, counter).await
            }
            "merge" => {
                let destination_path = Path::new(&destination);
                if let Err(err) = validate_copy_destination(source_path, destination_path) {
                    wng_log(format!(
                        "Skipping unsafe copy from '{}' to '{}': {}",
                        source, destination, err
                    ));
                    errors.push(err);
                    continue;
                }
                if source_path.is_dir() && destination_path.is_dir() {
                    copy_to_preserving_existing(
                        destination.clone(),
                        source.clone(),
                        total_bytes,
                        counter,
                    )
                    .await
                } else {
                    Err("Merge is only supported for two folders".to_string())
                }
            }
            "duplicate" => {
                let destination_path = Path::new(&destination);
                destination = get_available_path(destination_path);
                let destination_path = Path::new(&destination);
                if let Err(err) = validate_copy_destination(source_path, destination_path) {
                    wng_log(format!(
                        "Skipping unsafe copy from '{}' to '{}': {}",
                        source, destination, err
                    ));
                    errors.push(err);
                    continue;
                }
                copy_to(destination.clone(), source.clone(), total_bytes, counter).await
            }
            _ => {
                let destination_path = Path::new(&destination);
                if destination_path.exists() {
                    destination = get_available_path(destination_path);
                }
                let destination_path = Path::new(&destination);
                if let Err(err) = validate_copy_destination(source_path, destination_path) {
                    wng_log(format!(
                        "Skipping unsafe copy from '{}' to '{}': {}",
                        source, destination, err
                    ));
                    errors.push(err);
                    continue;
                }
                copy_to(destination.clone(), source.clone(), total_bytes, counter).await
            }
        };

        match copy_result {
            Ok(()) => copied_sources.push(source),
            Err(err) => {
                err_log(format!(
                    "Copy failed from '{}' to '{}': {}",
                    source, destination, err
                ));
                errors.push(format!("{} → {}: {}", source, destination, err));
            }
        }
    }

    dbg_log(format!("Copy-Paste time: {:?}", sw.elapsed().as_secs_f32()));
    let _ = app_window.emit("finish-progress-bar", sw.elapsed().as_secs_f32());
    CopyPasteResolvedResult {
        copied_sources,
        errors,
    }
}

fn canonical_or_parent_path(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return path
            .canonicalize()
            .map_err(|err| format!("Failed to canonicalize '{}': {}", path.display(), err));
    }

    let parent = path
        .parent()
        .ok_or_else(|| format!("Destination has no parent: '{}'", path.display()))?;
    let canonical_parent = parent.canonicalize().map_err(|err| {
        format!(
            "Failed to canonicalize destination parent '{}': {}",
            parent.display(),
            err
        )
    })?;
    let file_name = path
        .file_name()
        .ok_or_else(|| format!("Destination has no file name: '{}'", path.display()))?;
    Ok(canonical_parent.join(file_name))
}

fn comparable_path(path: &Path) -> String {
    let value = path.to_string_lossy().replace("\\", "/");
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        value.to_lowercase()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        value
    }
}

fn validate_copy_destination(source_path: &Path, destination_path: &Path) -> Result<(), String> {
    let source_canonical = source_path.canonicalize().map_err(|err| {
        format!(
            "Failed to canonicalize source '{}': {}",
            source_path.display(),
            err
        )
    })?;
    let destination_canonical = canonical_or_parent_path(destination_path)?;

    let source_cmp = comparable_path(&source_canonical);
    let destination_cmp = comparable_path(&destination_canonical);
    if source_cmp == destination_cmp {
        return Err("Source and destination resolve to the same path".to_string());
    }
    if source_path.is_dir() {
        let source_prefix = format!("{}/", source_cmp.trim_end_matches('/'));
        if destination_cmp.starts_with(&source_prefix) {
            return Err("Cannot copy or move a folder into itself or its descendant".to_string());
        }
    }
    Ok(())
}

fn get_replace_temp_path(destination_path: &Path, prefix: &str) -> PathBuf {
    let parent = destination_path.parent().unwrap_or_else(|| Path::new(""));
    let name = destination_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("item");
    let mut counter = 0;
    loop {
        let candidate = parent.join(format!(
            ".codriver-{}-{}-{}-{}",
            prefix,
            std::process::id(),
            counter,
            name
        ));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

fn get_replace_staging_path(destination_path: &Path) -> PathBuf {
    get_replace_temp_path(destination_path, "replace-tmp")
}

fn get_replace_backup_path(destination_path: &Path) -> PathBuf {
    get_replace_temp_path(destination_path, "replace-backup")
}

async fn replace_path_safely(
    source_path: &Path,
    destination_path: &Path,
    total_bytes: f32,
    counter: f32,
) -> Result<(), String> {
    let staging_path = get_replace_staging_path(destination_path);
    let staging = staging_path.to_string_lossy().replace("\\", "/");
    let source = source_path.to_string_lossy().replace("\\", "/");

    if let Err(err) = copy_to(staging.clone(), source, total_bytes, counter).await {
        let _ = remove_path(&staging_path).await;
        return Err(err);
    }

    let backup_path = if destination_path.exists() {
        let backup_path = get_replace_backup_path(destination_path);
        if let Err(err) = fs::rename(destination_path, &backup_path) {
            let _ = remove_path(&staging_path).await;
            return Err(format!(
                "Failed to back up existing destination '{}' before replacement: {}",
                destination_path.display(),
                err
            ));
        }
        Some(backup_path)
    } else {
        None
    };

    let had_backup = backup_path.is_some();
    if let Err(err) = fs::rename(&staging_path, destination_path) {
        let rollback_error = if let Some(backup_path) = &backup_path {
            fs::rename(backup_path, destination_path)
                .err()
                .map(|rollback_err| rollback_err.to_string())
        } else {
            None
        };

        let _ = remove_path(&staging_path).await;

        return Err(match rollback_error {
            Some(rollback_err) => format!(
                "Failed to install replacement '{}' from staging '{}': {}. Rollback also failed: {}",
                destination_path.display(),
                staging,
                err,
                rollback_err
            ),
            None if had_backup => format!(
                "Failed to install replacement '{}' from staging '{}': {}. Original destination was restored",
                destination_path.display(),
                staging,
                err
            ),
            None => format!(
                "Failed to install replacement '{}' from staging '{}': {}",
                destination_path.display(),
                staging,
                err
            ),
        });
    }

    if let Some(backup_path) = backup_path {
        if let Err(err) = remove_path(&backup_path).await {
            wng_log(format!(
                "Replacement succeeded but backup cleanup failed '{}': {}",
                backup_path.display(),
                err
            ));
        }
    }

    Ok(())
}

async fn remove_path(path: &Path) -> Result<(), String> {
    let path_string = path.to_string_lossy().replace("\\", "/");
    if path.is_dir() {
        #[cfg(target_os = "windows")]
        {
            remove_dir_all(path).map_err(|err| err.to_string())?;
        }
        #[cfg(not(target_os = "windows"))]
        {
            rapid_delete_dir_all(&path_string, None, None)
                .await
                .map_err(|err| err.to_string())?;
        }
    } else if path.exists() {
        delete_file(&path_string).map_err(|err| err.to_string())?;
    }
    Ok(())
}

fn get_available_path(path: &Path) -> String {
    if !path.exists() {
        return path.to_string_lossy().replace("\\", "/");
    }

    let parent = path.parent().unwrap_or_else(|| Path::new(""));
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled");
    let extension = path.extension().and_then(|value| value.to_str());
    let mut counter = 1;

    loop {
        let candidate_name = match extension {
            Some(ext) if !ext.is_empty() => format!("{} ({}).{}", stem, counter, ext),
            _ => format!("{} ({})", stem, counter),
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() {
            return candidate.to_string_lossy().replace("\\", "/");
        }
        counter += 1;
    }
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
async fn cancel_duplicate_finder() {
    IS_DUP_FIND_CANCELLED.store(true, std::sync::atomic::Ordering::Relaxed);
}

#[derive(serde::Serialize)]
struct DuplicateFile {
    path: String,
    modified: u64,
}

#[derive(serde::Serialize)]
struct DuplicateGroup {
    size: u64,
    hash: String,
    files: Vec<DuplicateFile>,
}

#[tauri::command]
async fn find_duplicates(path: String, max_depth: Option<usize>) -> Result<Vec<DuplicateGroup>, String> {
    use std::collections::HashMap;
    use std::fs::File;
    use std::io::{Read, BufReader};
    use std::hash::{Hash, Hasher};
    use std::collections::hash_map::DefaultHasher;
    use std::path::PathBuf;

    IS_DUP_FIND_CANCELLED.store(false, std::sync::atomic::Ordering::Relaxed);

    let base_path = std::path::Path::new(&path);
    if !base_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let mut size_groups: HashMap<u64, Vec<PathBuf>> = HashMap::new();

    let mut walker = jwalk::WalkDir::new(base_path)
        .skip_hidden(true)
        .follow_links(false);
    if let Some(depth) = max_depth {
        walker = walker.max_depth(depth);
    }

    for entry in walker {
        if IS_DUP_FIND_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("Search cancelled".to_string());
        }
        if let Ok(entry) = entry {
            if entry.file_type().is_file() {
                let file_path = entry.path();
                if let Ok(metadata) = std::fs::metadata(&file_path) {
                    let size = metadata.len();
                    if size > 0 {
                        size_groups.entry(size).or_default().push(file_path);
                    }
                }
            }
        }
    }

    let candidate_groups: Vec<(u64, Vec<PathBuf>)> = size_groups
        .into_iter()
        .filter(|(_, files)| files.len() > 1)
        .collect();

    fn calculate_file_hash(file_path: &std::path::Path) -> std::io::Result<u64> {
        let file = File::open(file_path)?;
        let mut reader = BufReader::new(file);
        let mut hasher = DefaultHasher::new();
        let mut buffer = [0; 65536];
        
        loop {
            if IS_DUP_FIND_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
                return Err(std::io::Error::new(std::io::ErrorKind::Interrupted, "Search cancelled"));
            }
            let count = reader.read(&mut buffer)?;
            if count == 0 {
                break;
            }
            buffer[..count].hash(&mut hasher);
        }
        
        Ok(hasher.finish())
    }

    let mut duplicates: Vec<DuplicateGroup> = Vec::new();

    for (size, files) in candidate_groups {
        if IS_DUP_FIND_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            return Err("Search cancelled".to_string());
        }
        let mut hash_groups: HashMap<u64, Vec<DuplicateFile>> = HashMap::new();
        
        for file_path in files {
            if IS_DUP_FIND_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
                return Err("Search cancelled".to_string());
            }
            if let Ok(hash) = calculate_file_hash(&file_path) {
                let path_str = file_path.to_string_lossy().to_string().replace("\\", "/");
                let modified = std::fs::metadata(&file_path)
                    .and_then(|meta| meta.modified())
                    .map(|time| time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                    .unwrap_or(0);
                hash_groups.entry(hash).or_default().push(DuplicateFile {
                    path: path_str,
                    modified,
                });
            }
        }
        
        for (hash, dup_files) in hash_groups {
            if dup_files.len() > 1 {
                duplicates.push(DuplicateGroup {
                    size,
                    hash: format!("{:016x}", hash),
                    files: dup_files,
                });
            }
        }
    }

    duplicates.sort_by(|a, b| b.size.cmp(&a.size));

    Ok(duplicates)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_find_duplicates() {
        use std::fs::{create_dir_all, write};
        use std::path::Path;

        let test_dir = Path::new("temp_test_duplicates");
        if test_dir.exists() {
            let _ = std::fs::remove_dir_all(test_dir);
        }
        create_dir_all(test_dir).unwrap();

        // Create identical duplicates group A (size 10 bytes)
        let dir_a = test_dir.join("group_a");
        create_dir_all(&dir_a).unwrap();
        let file_a1 = dir_a.join("file1.txt");
        let file_a2 = dir_a.join("file2.txt");
        write(&file_a1, b"1234567890").unwrap();
        write(&file_a2, b"1234567890").unwrap();

        // Create identical duplicates group B (size 20 bytes - larger, should be sorted first)
        let dir_b = test_dir.join("sub/group_b");
        create_dir_all(&dir_b).unwrap();
        let file_b1 = dir_b.join("file_b1.bin");
        let file_b2 = dir_b.join("file_b2.bin");
        let file_b3 = dir_b.join("file_b3.bin");
        write(&file_b1, b"abcdefghijklmnopqrst").unwrap();
        write(&file_b2, b"abcdefghijklmnopqrst").unwrap();
        write(&file_b3, b"abcdefghijklmnopqrst").unwrap();

        // Create a file with same size as group A but different contents (should not group with A)
        let file_diff_content = test_dir.join("diff_content.txt");
        write(&file_diff_content, b"0987654321").unwrap();

        // Create a unique file (size 15 bytes)
        let file_unique = test_dir.join("unique.txt");
        write(&file_unique, b"1234567890abcde").unwrap();

        // Run find_duplicates
        let res = find_duplicates(test_dir.to_string_lossy().to_string(), None).await;
        
        // Clean up immediately
        let _ = std::fs::remove_dir_all(test_dir);

        let dup_groups = res.expect("find_duplicates should succeed");
        
        // We expect exactly 2 groups of duplicates:
        // Group 1: size 20 (3 files)
        // Group 2: size 10 (2 files)
        assert_eq!(dup_groups.len(), 2);

        // First group should be the larger one (size 20)
        assert_eq!(dup_groups[0].size, 20);
        assert_eq!(dup_groups[0].files.len(), 3);

        // Second group should be size 10
        assert_eq!(dup_groups[1].size, 10);
        assert_eq!(dup_groups[1].files.len(), 2);
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
        #[cfg(not(target_os = "windows"))]
        {
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
    let output = format!("{}.{}", path_to_zip, compression_type);
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
    let output = current_dir()
        .unwrap()
        .join("compressed_items_archive")
        .with_extension(&compression_type)
        .to_string_lossy()
        .to_string();

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
    font_size: i32,
    is_window_transparency: String,
    gemini_api_key: String,
    is_ai_enabled: String,
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
        font_size,
        is_window_transparency: is_window_transparency.replace("\\", ""),
        gemini_api_key: gemini_api_key.replace("\\", ""),
        is_ai_enabled: is_ai_enabled.replace("\\", ""),
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
async fn cancel_operation() {
    *ISCANCELED.lock().await = true;
}

#[tauri::command]
async fn cancel_size_calculation() {
    IS_SIZE_CALC_CANCELLED.store(true, std::sync::atomic::Ordering::Relaxed);
}

#[tauri::command]
async fn cancel_selection_size_calculation() {
    IS_SELECTION_SIZE_CALC_CANCELLED.store(true, std::sync::atomic::Ordering::Relaxed);
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

            if let Ok(metadata) = fs::metadata(&new_img_path) {
                if metadata.len() > 0 {
                    return new_img_path;
                }
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
            let mut should_write = true;
            if let Ok(metadata) = fs::metadata(&new_img_path) {
                if metadata.len() > 0 {
                    should_write = false;
                }
            }
            if should_write {
                if let Ok(file) = File::create(&new_img_path) {
                    let mut writer = BufWriter::new(file);
                    if image.write_png(&mut writer).is_ok() {
                        let _ = writer.flush();
                        dbg_log(format!("Writing image to: {}", new_img_path));
                    }
                }
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
async fn get_image_dimensions(path: String) -> Result<(u32, u32), String> {
    let img = image::open(&path)
        .map_err(|e| format!("Failed to open image: {}", e))?;
    Ok((img.width(), img.height()))
}

#[tauri::command]
async fn upscale_image(
    from_path: String,
    scale_factor: f32,
    filter_type: String,
    output_path: String,
) -> Result<(), String> {
    let img = image::open(&from_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    let filter = match filter_type.to_lowercase().as_str() {
        "nearest" => image::imageops::FilterType::Nearest,
        "triangle" => image::imageops::FilterType::Triangle,
        "catmull_rom" => image::imageops::FilterType::CatmullRom,
        "gaussian" => image::imageops::FilterType::Gaussian,
        "lanczos3" | _ => image::imageops::FilterType::Lanczos3,
    };

    let width = img.width();
    let height = img.height();
    let new_width = (width as f32 * scale_factor).round() as u32;
    let new_height = (height as f32 * scale_factor).round() as u32;

    let res = img.resize(new_width, new_height, filter);

    res.save(&output_path)
        .map_err(|e| format!("Failed to save upscaled image: {}", e))?;

    Ok(())
}

fn get_image_mime_type(path: &str) -> &'static str {
    let ext = path.split('.').last().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    }
}

fn get_image_data(path: &str) -> Result<(String, String), String> {
    let mime_type = get_image_mime_type(path).to_string();
    let img_bytes = std::fs::read(path).map_err(|e| format!("Failed to read source image: {}", e))?;
    let img_base64 = BASE64_STANDARD.encode(&img_bytes);
    Ok((mime_type, img_base64))
}

async fn call_gemini_api(
    api_key: &str,
    model: &str,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    let resp = HTTP_CLIENT
        .post(&url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("HTTP request to Gemini failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Gemini API error ({}): {}", status, err_text));
    }

    resp.json()
        .await
        .map_err(|e| format!("Failed to parse Gemini response JSON: {}", e))
}

fn extract_gemini_text(json: &serde_json::Value) -> Result<String, String> {
    json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| format!("Invalid text response format from Gemini: {:?}", json))
}

fn extract_gemini_image(json: &serde_json::Value) -> Result<String, String> {
    let parts = json["candidates"][0]["content"]["parts"]
        .as_array()
        .ok_or_else(|| format!("Invalid image response format from Gemini: {:?}", json))?;

    for part in parts {
        if let Some(inline_data) = part.get("inlineData") {
            if let Some(data) = inline_data.get("data").and_then(|d| d.as_str()) {
                return Ok(data.to_string());
            }
        }
    }
    Err(format!("No image data found in Gemini response: {:?}", json))
}

async fn save_gemini_image(output_path: &str, b64_data: String) -> Result<(), String> {
    let path = Path::new(output_path);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create output directory: {}", e))?;
        }
    }

    let decoded_bytes = BASE64_STANDARD
        .decode(b64_data)
        .map_err(|e| format!("Failed to decode Gemini Image base64 output: {}", e))?;

    std::fs::write(output_path, &decoded_bytes)
        .map_err(|e| format!("Failed to write AI generated image file: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn ai_upscale_image(
    api_key: String,
    from_path: String,
    aspect_ratio: String,
    output_path: String,
    creative: bool,
) -> Result<(), String> {
    let (mime_type, img_base64) = get_image_data(&from_path)?;

    // 1. Call Gemini Flash to generate a detailed prompt
    let description_prompt = if creative {
        "Analyze this image and write a highly detailed, descriptive, professional prompt to re-generate this exact image in ultra-high resolution. Focus on preserving the core layout and subject matter, but creatively enhance details, textures, clarity, lighting, and visual appeal for an outstanding aesthetic result. Only output the prompt, nothing else."
    } else {
        "Analyze this image and write a highly detailed, descriptive prompt to re-generate this exact image in ultra-high resolution. You must instruct the generator to keep the image exactly as-is: do not creatively re-interpret, do not add or subtract subjects, and preserve the original composition, layout, color palette, text, and overall style completely. The goal is a high-fidelity super-resolution upscale that maintains total fidelity to the original. Only output the prompt, nothing else."
    };

    let gemini_payload = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": img_base64
                        }
                    },
                    {
                        "text": description_prompt
                    }
                ]
            }
        ]
    });

    let gemini_json = call_gemini_api(&api_key, GEMINI_MODEL_TEXT, gemini_payload).await?;
    let detailed_prompt = extract_gemini_text(&gemini_json)?;

    // 2. Call Gemini Image model to generate the high-res image
    let final_instruction = if creative {
        format!("Creatively enhance and upscale this image to ultra-high resolution based on this description: {}. Focus on maintaining the core subject and layout, but feel free to beautify details, lighting, and textures.", detailed_prompt)
    } else {
        format!("Upscale this image to ultra-high resolution based on this description: {}. You must keep this image exactly as-is: do not change the subject, character's face, hair, orientation, posture, style, colors, background, or lighting. Maintain total visual identity and pixel structure fidelity to the original.", detailed_prompt)
    };

    let imagen_payload = serde_json::json!({
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": img_base64
                        }
                    },
                    {
                        "text": final_instruction
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio
            }
        }
    });

    let imagen_json = call_gemini_api(&api_key, GEMINI_MODEL_IMAGE, imagen_payload).await?;
    let b64_data = extract_gemini_image(&imagen_json)?;

    save_gemini_image(&output_path, b64_data).await
}

#[tauri::command]
async fn ai_style_image(
    api_key: String,
    from_path: String,
    prompt: String,
    output_path: String,
) -> Result<(), String> {
    let (mime_type, img_base64) = get_image_data(&from_path)?;

    let payload = serde_json::json!({
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": img_base64
                        }
                    },
                    {
                        "text": format!("Edit and restyle this image. Maintain the overall layout, content, and subject, but apply the following stylistic style instructions: {}. Generate only the resulting image.", prompt)
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        }
    });

    let json = call_gemini_api(&api_key, GEMINI_MODEL_IMAGE, payload).await?;
    let b64_data = extract_gemini_image(&json)?;

    save_gemini_image(&output_path, b64_data).await
}



#[tauri::command]
async fn get_selection_size(paths: Vec<String>, update_id: String) -> u64 {
    IS_SIZE_CALC_CANCELLED.store(false, std::sync::atomic::Ordering::Relaxed);

    let mut total_size = 0;
    for path in paths {
        total_size += crate::utils::dir_info_incremental(path, Some(&update_id)).size;
        if IS_SIZE_CALC_CANCELLED.load(std::sync::atomic::Ordering::Relaxed) {
            break;
        }
    }
    total_size
}

#[tauri::command]
async fn get_capped_selection_size(paths: Vec<String>, update_id: String) -> u64 {
    IS_SELECTION_SIZE_CALC_CANCELLED.store(false, std::sync::atomic::Ordering::Relaxed);

    let mut total_size = 0;
    let mut state = crate::utils::SizeCalcState::new_selection_capped();
    for path in paths {
        total_size +=
            crate::utils::dir_info_incremental_capped(path, Some(&update_id), &mut state).size;
        if state.should_stop() {
            break;
        }
    }
    total_size
}

#[tauri::command]
async fn get_simple_dir_info(
    path: String,
    _app_window: Window,
    _class_to_fill: String,
    update_id: Option<String>,
) -> crate::utils::SimpleDirInfo {
    IS_SIZE_CALC_CANCELLED.store(false, std::sync::atomic::Ordering::Relaxed);

    crate::utils::dir_info_incremental(path, update_id.as_deref())
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
async fn get_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(BASE64_STANDARD.encode(&bytes))
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
async fn unmount_network_drive(path: String, sudo_password: String) -> Result<(), String> {
    // Sanity check: mount point must exist.
    if !std::path::Path::new(&path).exists() {
        return Err("Mount point does not exist".to_string());
    }

    let mut child = Command::new("sudo")
        .arg("-S") // read sudo password from stdin
        .arg("umount")
        .arg(&path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to spawn umount process");

    // Write the sudo password.
    if let Some(stdin) = child.stdin.take() {
        use std::io::{BufWriter, Write};
        let mut w = BufWriter::new(stdin);
        writeln!(w, "{}", sudo_password).expect("Failed to write sudo password");
        w.flush().expect("Failed to flush sudo password stream");
    } else {
        return Err("Failed to write sudo password".to_string());
    }

    let output = child
        .wait_with_output()
        .expect("Failed to wait for umount process");

    if output.status.success() {
        match remove_dir(path) {
            Ok(_) => success_log("Successfully unmounted network drive"),

            Err(err) => err_log(&format!("Failed to remove directory: {}", err)),
        }
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(err.to_string())
    }
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

#[tauri::command]
async fn eject_disk(path: String) -> Result<String, String> {
    let path = path.trim();
    if path.is_empty() || path == "/" {
        return Err("Refusing to eject system root".into());
    }

    #[cfg(target_os = "macos")]
    {
        if !path.starts_with("/Volumes/") {
            return Err("Only mounted volumes under /Volumes can be ejected".into());
        }

        let output = Command::new("diskutil")
            .args(["unmount", path])
            .output()
            .map_err(|error| format!("Failed to start diskutil: {error}"))?;

        if output.status.success() {
            Ok("Disk ejected".into())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            Err(if stderr.is_empty() {
                "diskutil failed to eject disk".into()
            } else {
                stderr
            })
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("Eject disk is only supported on macOS".into())
    }
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

            // 1. Check supported formats (excluding ICNS for now)
            let supported_formats = vec![
                "png", "jpg", "jpeg", "gif", "webp", "tiff", "tif", "bmp", "ico", "avif"
            ];

            // 2. Handle ICNS on macOS
            #[cfg(target_os = "macos")]
            if item.image_type == "icns" {
                let mut decoded = false;
                if let Ok(file) = File::open(&item.image_url) {
                    if let Ok(icon_family) = IconFamily::read(BufReader::new(file)) {
                        let mut icns_image = icon_family.get_icon_with_type(IconType::RGBA32_512x512_2x);
                        if icns_image.is_err() {
                            icns_image = icon_family.get_icon_with_type(IconType::RGBA32_512x512);
                            if icns_image.is_err() {
                                icns_image = icon_family.get_icon_with_type(IconType::RGBA32_256x256_2x);
                                if icns_image.is_err() {
                                    icns_image = icon_family.get_icon_with_type(IconType::RGBA32_256x256);
                                    if icns_image.is_err() {
                                        icns_image = icon_family.get_icon_with_type(IconType::RGBA32_128x128_2x);
                                        if icns_image.is_err() {
                                            icns_image = icon_family.get_icon_with_type(IconType::RGBA32_128x128);
                                            if icns_image.is_err() {
                                                icns_image = icon_family.get_icon_with_type(IconType::RGBA32_64x64);
                                                if icns_image.is_err() {
                                                    icns_image = icon_family.get_icon_with_type(IconType::RGBA32_32x32_2x);
                                                    if icns_image.is_err() {
                                                        icns_image = icon_family.get_icon_with_type(IconType::RGBA32_32x32);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if let Ok(icon) = icns_image {
                            let mut png_bytes = Vec::new();
                            if icon.write_png(&mut png_bytes).is_ok() {
                                if let Ok(image) = image::load_from_memory(&png_bytes) {
                                    if image
                                        .thumbnail(thumbnail_size, thumbnail_size)
                                        .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)
                                        .is_ok()
                                    {
                                        decoded = true;
                                    }
                                }
                            }
                        }
                    }
                }
                
                if decoded && !bytes.is_empty() {
                    let data = BASE64_STANDARD.encode(&bytes);
                    let _ = &app_window.eval(&format!(
                        "setItemImage('{}', '{}', '{}')",
                        data, &item.image_id, &item.image_url
                    ));
                } else {
                    let _ = WINDOW
                        .get()
                        .unwrap()
                        .emit("set_default_image", (&item.image_id, &item.image_url));
                }
                return;
            }

            // 3. Fallback for completely unsupported types (e.g. svg or non-macOS icns)
            if !supported_formats.contains(&item.image_type.as_str()) {
                let _ = WINDOW
                    .get()
                    .unwrap()
                    .emit("set_default_image", (&item.image_id, &item.image_url));
                return;
            }

            // 4. Standard image loading & decoding
            match ImageReader::open(&item.image_url) {
                Ok(image) => {
                    let mut decoded = false;
                    match image.decode() {
                        Ok(image) if item.image_type == String::from("png") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("gif") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Gif)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("webp") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::WebP)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image)
                            if item.image_type == String::from("jpg")
                                || item.image_type == String::from("jpeg") =>
                        {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Jpeg)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("tiff") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Tiff)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("ico") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Ico)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("avif") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Avif)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(image) if item.image_type == String::from("bmp") => {
                            if image
                                .thumbnail(thumbnail_size, thumbnail_size)
                                .write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Bmp)
                                .is_ok()
                            {
                                decoded = true;
                            }
                        }
                        Ok(_) => {
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
                            dbg_log(format!("Failed to decode/load image: {}", err));
                        }
                    }
                    if decoded && !bytes.is_empty() {
                        let data = BASE64_STANDARD.encode(&bytes);
                        let _ = &app_window.eval(&format!(
                            "setItemImage('{}', '{}', '{}')",
                            data, &item.image_id, &item.image_url
                        ));
                    }
                }
                Err(err) => {
                    let _ = WINDOW
                        .get()
                        .unwrap()
                        .emit("set_default_image", (item.image_id, item.image_url));
                    dbg_log(format!("Failed to load image: {}", err));
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
            format: format!(
                "{:?}",
                if *&path.contains("codriver-sshfs-mount") {
                    "SSHFS Network-Drive"
                } else {
                    "Drive"
                }
            ),
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
    let file_date = match metadata.modified() {
        Ok(mod_time) => {
            let dt: chrono::DateTime<chrono::Local> = mod_time.into();
            dt.to_string()
        }
        Err(_) => "-".into(),
    };

    Ok(FDir {
        name: name,
        is_dir: if is_dir { 1 } else { 0 },
        path: path,
        extension: file_ext,
        size: size.to_string(),
        last_modified: file_date.split(".").next().unwrap().into(),
    })
}
