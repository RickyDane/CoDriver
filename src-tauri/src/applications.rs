#[allow(unused)]
use ini::ini;
#[allow(unused)]
use serde::Serialize;
#[allow(unused)]
use std::collections::HashSet;
#[allow(unused)]
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use std::process::Command;
#[cfg(target_os = "windows")]
use std::thread::sleep;
#[allow(unused)]
use std::{borrow::Cow, error::Error};
#[allow(unused)]
use walkdir::WalkDir;
#[cfg(target_os = "windows")]
use widestring::u16cstr;
#[cfg(target_os = "windows")]
use windows::Win32::UI::Shell::{
    IAssocHandler, SHAssocEnumHandlers, ShellExecuteW, ASSOC_FILTER_RECOMMENDED,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::SW_NORMAL;
#[allow(unused)]
#[cfg(target_os = "windows")]
use winreg::enums::*;
#[allow(unused)]
#[cfg(target_os = "windows")]
use winreg::{RegKey, HKEY};

#[derive(Debug, Default, Serialize)]
pub struct App {
    pub name: String,
    pub icon_path: String,
    pub operation: String,
    pub app_path_exe: String,
    pub app_desktop_path: String,
}

// Linux

#[cfg(target_os = "linux")]
pub fn parse_desktop_file(desktop_file_path: String) -> App {
    let mut app = App::default();
    // app.app_desktop_path = desktop_file_path.clone();
    // let desktop_file_path_str = desktop_file_path.to_str().unwrap();
    // let map = ini!(desktop_file_path_str);
    // let desktop_entry_exists = map.contains_key("desktop entry");
    // if desktop_entry_exists {
    //     let desktop_entry = map["desktop entry"].clone();
    //     if desktop_entry.contains_key("exec") {
    //         let exec = desktop_entry["exec"].clone();
    //         app.app_path_exe = PathBuf::from(exec.unwrap());
    //     }
    //     if desktop_entry.contains_key("icon") {
    //         let icon = desktop_entry["icon"].clone();
    //         app.icon_path = Some(PathBuf::from(icon.unwrap()));
    //     }
    //     if desktop_entry.contains_key("name") {
    //         let name = desktop_entry["name"].clone();
    //         app.name = name.unwrap();
    //     }
    // }
    return app;
}

#[cfg(target_os = "linux")]
pub fn get_apps(extention: String) -> Vec<App> {
    // // read XDG_DATA_DIRS env var
    // let xdg_data_dirs = std::env::var("XDG_DATA_DIRS").unwrap_or("/usr/share".to_string());
    // let xdg_data_dirs: Vec<&str> = xdg_data_dirs.split(':').collect();
    // // make a string sett from xdg_data_dirs
    // let mut search_dirs: HashSet<&str> = xdg_data_dirs.iter().cloned().collect();
    // search_dirs.insert("/usr/share/applications");
    // // get home dir of current user
    // let home_dir = std::env::var("HOME").unwrap();
    // let home_path = PathBuf::from(home_dir);
    // let local_share_apps = home_path.join(".local/share/applications");
    // search_dirs.insert(local_share_apps.to_str().unwrap());
    // search_dirs.insert("/usr/share/xsessions");
    // search_dirs.insert("/etc/xdg/autostart");
    // for each dir, search for .desktop files
    let mut apps: Vec<App> = Vec::new();
    // for dir in search_dirs {
    //     let dir = PathBuf::from(dir);
    //     if !dir.exists() {
    //         continue;
    //     }
    //     for entry in WalkDir::new(dir.clone()) {
    //         if entry.is_err() {
    //             continue;
    //         }
    //         let entry = entry.unwrap();
    //         let path = entry.path();
    //         if path.extension().is_none() {
    //             continue;
    //         }

    //         if path.extension().unwrap() == "desktop" {
    //             let app = parse_desktop_file(path.to_path_buf());
    //             apps.push(app);
    //         }
    //     }
    // }
    apps
}

#[cfg(target_os = "linux")]
pub fn open_file_with(file_path: String, exec_path: String) {
    // let exec_path_str = exec_path.to_str().unwrap();
    // let file_path_str = file_path.to_str().unwrap();
    // let output = std::process::Command::new(exec_path_str)
    //     .arg(file_path_str)
    //     .output()
    //     .expect("failed to execute process");
    // println!("Output: {:?}", output);
}

// macOS

#[cfg(target_os = "macos")]
#[allow(unused)]
fn find_ios_app_icon(app_path: PathBuf) -> Option<PathBuf> {
    // find all png files in the app_path, search for AppIcon ignore case in the pngs
    let mut all_icons: Vec<PathBuf> = vec![];
    for entry in WalkDir::new(app_path.clone()) {
        if entry.is_err() {
            return None;
        }
        let entry = entry.unwrap();
        if entry.path().extension().is_none() {
            continue;
        }
        if entry.path().extension().unwrap() == "png" {
            all_icons.push(entry.path().to_path_buf());
        }
    }
    if all_icons.len() == 0 {
        None
    } else if all_icons.len() == 1 {
        Some(all_icons[0].clone())
    } else {
        // more than one png found, search for keyword AppIcon, ignore case
        // filter to get png with AppIcon in name, ignore case
        // sort all_icons by path length, shortest first
        all_icons.sort_by(|a, b| a.to_str().unwrap().len().cmp(&b.to_str().unwrap().len()));
        let filtered_all_icons = all_icons
            .iter()
            .filter(|&x| {
                x.file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_lowercase()
                    .contains("appicon")
            })
            .collect::<Vec<_>>();
        if filtered_all_icons.len() == 1 {
            Some(filtered_all_icons[0].clone())
        } else if filtered_all_icons.len() == 0 {
            Some(all_icons[0].clone())
        } else {
            // filtered_all_icons more than 1, use the one with shortest length
            Some(filtered_all_icons[0].clone())
        }
    }
}

#[allow(unused)]
#[cfg(target_os = "macos")]
pub fn find_app_icns(app_path: PathBuf) -> Option<PathBuf> {
    // default location: Contents/Resources/AppIcon.icns
    let contents_path = app_path.join("Contents");
    if !contents_path.exists() {
        // this may be a ios app, look for png app icon
        return find_ios_app_icon(app_path);
    }
    let resources_path = contents_path.join("Resources");
    let default_icns_path = resources_path.join("AppIcon.icns");
    if default_icns_path.exists() {
        return Some(default_icns_path);
    } else if (resources_path.join("electron.icns").exists()) {
        return Some(resources_path.join("electron.icns"));
    }
    let mut all_icons: Vec<PathBuf> = vec![];
    for entry in WalkDir::new(contents_path.clone()) {
        if entry.is_err() {
            continue;
        }
        let entry = entry.unwrap();
        if entry.path().extension().is_none() {
            continue;
        }
        if entry.path().extension().unwrap() == "icns" {
            all_icons.push(entry.path().to_path_buf());
        }
    }
    if all_icons.len() == 1 {
        Some(all_icons[0].clone())
    } else if all_icons.len() == 0 {
        None
    } else {
        // more than one icon found
        // search for appicon in name, ignore case
        // sort all_icons by path length, shortest first
        all_icons.sort_by(|a, b| a.to_str().unwrap().len().cmp(&b.to_str().unwrap().len()));
        let filtered_all_icons = all_icons
            .iter()
            .filter(|&x| {
                x.file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_lowercase()
                    .contains("appicon")
            })
            .collect::<Vec<_>>();
        if filtered_all_icons.len() == 1 {
            Some(filtered_all_icons[0].clone())
        } else if filtered_all_icons.len() == 0 {
            Some(all_icons[0].clone())
        } else {
            // filtered_all_icons more than 1, use the one with shortest length
            Some(filtered_all_icons[0].clone())
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_apps(_extension: String) -> Vec<App> {
    let applications_folder = PathBuf::from("/Applications");
    // iterate this folder
    // for each .app file, create an App struct
    // return a vector of App structs
    // list all files in applications_folder
    let mut apps: Vec<App> = Vec::new();
    for entry in applications_folder
        .read_dir()
        .expect("Unable to read directory")
    {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.extension().is_none() {
                continue;
            }
            if path.extension().unwrap() == "app" {
                // search for .icns in Contents/Resources
                let app = App {
                    name: path.file_name().unwrap().to_string_lossy().into_owned(),
                    icon_path: "".into(),
                    app_path_exe: path.to_string_lossy().clone().into(),
                    app_desktop_path: path.to_string_lossy().clone().into(),
                    operation: "open".into(),
                };
                apps.push(app);
            }
        }
    }
    apps
}

/// On Mac, the `open` command has a optional `-a` flag to specify the app to open the file with.
/// For example, opening `main.rs` with VSCode: `open -a "Visual Studio Code" main.rs`, where "Visual Studio Code.app" is the app folder name.
/// The `.app` can be included or discarded in the `open` command.
#[cfg(target_os = "macos")]
pub fn open_file_with(file_path: String, app_path: String) {
    let mut command = std::process::Command::new("open");
    command.arg("-a");
    command.arg(app_path);
    command.arg(file_path);
    let output = command.output().expect("failed to execute process");
    println!("output: {:?}", output);
}

// Windows
#[cfg(target_os = "windows")]
use widestring::{U16CString, U16Str};
#[cfg(target_os = "windows")]
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::UI::Shell::{AssocQueryStringW, ASSOCF_NONE, ASSOCSTR_EXECUTABLE},
};
#[cfg(target_os = "windows")]
const BATCH_SIZE: usize = 4;
#[cfg(target_os = "windows")]
pub fn get_apps(ext: String) -> Vec<App> {
    let mut ls_apps: Vec<App> = vec![];

    // SHT WINDOWS STUFF IS STARTING
    let in_str = U16CString::from_vec(ext.encode_utf16().collect::<Vec<_>>());

    // either ASSOC_FILTER_RECOMMENDED or ASSOC_FILTER_NONE, depending on if you only wish to show
    // the recommended ones
    let enum_handler =
        unsafe { SHAssocEnumHandlers(PCWSTR(in_str.unwrap().as_ptr()), ASSOC_FILTER_RECOMMENDED) }
            .unwrap();

    let mut found_associations = Vec::new();

    let mut out_buf: [Option<IAssocHandler>; BATCH_SIZE] = [None, None, None, None];
    let mut size_retrieved: u32 = BATCH_SIZE as u32;

    while let Ok(()) = unsafe { enum_handler.Next(out_buf.as_mut(), Some(&mut size_retrieved)) } {
        if size_retrieved == 0 {
            break;
        }
        for i in 0..size_retrieved {
            let assoc = unsafe { std::mem::take(&mut out_buf[i as usize]).unwrap_unchecked() };

            let ui_name = unsafe { assoc.GetUIName() }.unwrap();
            let name = unsafe { assoc.GetName() }.unwrap();

            ls_apps.push(App {
                operation: "open".into(),
                app_desktop_path: U16Str::from_slice(unsafe { name.as_wide() })
                    .to_string()
                    .unwrap()
                    .into(),
                app_path_exe: U16Str::from_slice(unsafe { name.as_wide() })
                    .to_string()
                    .unwrap()
                    .into(),
                name: U16Str::from_slice(unsafe { ui_name.as_wide() })
                    .to_string()
                    .unwrap(),
                icon_path: "".into(),
            });

            found_associations.push(
                U16Str::from_slice(unsafe { ui_name.as_wide() })
                    .to_string()
                    .unwrap(),
            );
        }
        size_retrieved = BATCH_SIZE as u32;
    }
    ls_apps.push(App {
        operation: "open".into(),
        app_desktop_path: "Rundll32 Shell32.dll,OpenAs_RunDLL".into(),
        app_path_exe: "Rundll32 Shell32.dll,OpenAs_RunDLL".into(),
        name: "Open with other".into(),
        icon_path: "".into(),
    });
    // SHT WINDOWS STUFF ENDED

    ls_apps
}

#[cfg(target_os = "windows")]
pub fn open_file_with(file_path: String, app_path: String) {
    let file = U16CString::from_vec(file_path.encode_utf16().collect::<Vec<_>>()).unwrap();
    let app = U16CString::from_vec(app_path.encode_utf16().collect::<Vec<_>>()).unwrap();
    println!("file: {} , app: {}", file_path, app_path);
    if app_path.contains("RunDLL") {
        Command::new("powershell")
            .args(["-Command", &app_path, &file_path.replace("/", "\\")])
            .output()
            .expect("");
        return;
    } else if (app_path.contains("Fotoanzeige")) {
        Command::new("powershell")
            .args([
                "-Command",
                &format!(
                    "{}{}",
                    "start ms-photos:viewer?filePath=",
                    &file_path.replace("/", "\\")
                ),
            ])
            .output()
            .expect("");
        return;
    }
    unsafe {
        let output = ShellExecuteW(
            None,
            PCWSTR(u16cstr!("open").as_ptr()),
            PCWSTR(app.as_ptr()),
            PCWSTR(file.as_ptr()),
            None,
            SW_NORMAL,
        );
        println!("{:?}", output);
    }
}
