#[allow(unused)]
use std::collections::HashSet;
#[allow(unused)]
use std::{borrow::Cow, error::Error};
#[allow(unused)]
use std::path::PathBuf;
#[allow(unused)]
use walkdir::WalkDir;
#[allow(unused)]
use ini::ini;
#[allow(unused)]
use serde::Serialize;
#[allow(unused)]
#[cfg(target_os = "windows")]
use winreg::{RegKey, HKEY};
#[allow(unused)]
#[cfg(target_os = "windows")]
use winreg::enums::*;

#[derive(Debug, Default, Serialize)]
pub struct App {
    pub name: String,
    pub icon_path: Option<PathBuf>,
    pub app_path_exe: PathBuf, // Path to the .app file for mac, or Exec for Linux, or .exe for Windows
    pub app_desktop_path: PathBuf, // Path to the .desktop file for Linux, .app for Mac
}

// Linux

#[cfg(target_os = "linux")]
pub fn parse_desktop_file(desktop_file_path: PathBuf) -> App {
    let mut app = App::default();
    app.app_desktop_path = desktop_file_path.clone();
    let desktop_file_path_str = desktop_file_path.to_str().unwrap();
    let map = ini!(desktop_file_path_str);
    let desktop_entry_exists = map.contains_key("desktop entry");
    if desktop_entry_exists {
        let desktop_entry = map["desktop entry"].clone();
        if desktop_entry.contains_key("exec") {
            let exec = desktop_entry["exec"].clone();
            app.app_path_exe = PathBuf::from(exec.unwrap());
        }
        if desktop_entry.contains_key("icon") {
            let icon = desktop_entry["icon"].clone();
            app.icon_path = Some(PathBuf::from(icon.unwrap()));
        }
        if desktop_entry.contains_key("name") {
            let name = desktop_entry["name"].clone();
            app.name = name.unwrap();
        }
    }
    return app;
}

#[cfg(target_os = "linux")]
pub fn get_apps() -> Vec<App> {
    // read XDG_DATA_DIRS env var
    let xdg_data_dirs = std::env::var("XDG_DATA_DIRS").unwrap_or("/usr/share".to_string());
    let xdg_data_dirs: Vec<&str> = xdg_data_dirs.split(':').collect();
    // make a string sett from xdg_data_dirs
    let mut search_dirs: HashSet<&str> = xdg_data_dirs.iter().cloned().collect();
    search_dirs.insert("/usr/share/applications");
    // get home dir of current user
    let home_dir = std::env::var("HOME").unwrap();
    let mut home_path = PathBuf::from(home_dir);
    let local_share_apps = home_path.join(".local/share/applications");
    search_dirs.insert(local_share_apps.to_str().unwrap());
    search_dirs.insert("/usr/share/xsessions");
    search_dirs.insert("/etc/xdg/autostart");
    // for each dir, search for .desktop files
    let mut apps: Vec<App> = Vec::new();
    for dir in search_dirs {
        let dir = PathBuf::from(dir);
        if !dir.exists() {
            continue;
        }
        for entry in WalkDir::new(dir.clone()) {
            if entry.is_err() {
                continue;
            }
            let entry = entry.unwrap();
            let path = entry.path();
            if path.extension().is_none() {
                continue;
            }

            if path.extension().unwrap() == "desktop" {
                let app = parse_desktop_file(path.to_path_buf());
                apps.push(app);
            }
        }
    }
    apps
}

#[cfg(target_os = "linux")]
pub fn open_file_with(file_path: PathBuf, exec_path: PathBuf) {
    let exec_path_str = exec_path.to_str().unwrap();
    let file_path_str = file_path.to_str().unwrap();
    let output = std::process::Command::new(exec_path_str)
        .arg(file_path_str)
        .output()
        .expect("failed to execute process");
    println!("Output: {:?}", output);
}

// macOS

#[cfg(target_os = "macos")]
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
    }
    else if all_icons.len() == 0 {
        None
    }
    else {
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
pub fn get_apps() -> Vec<App> {
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
                    icon_path: find_app_icns(path.clone()),
                    app_path_exe: path.clone(),
                    app_desktop_path: path.clone(),
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
pub fn open_file_with(file_path: PathBuf, app_path: PathBuf) {
    let mut command = std::process::Command::new("open");
    command.arg("-a");
    command.arg(app_path);
    command.arg(file_path);
    let output = command.output().expect("failed to execute process");
    println!("output: {:?}", output);
}

// Windows

#[cfg(target_os = "windows")]
pub struct InstalledApp {
    reg: RegKey,
}

#[cfg(target_os = "windows")]
struct AppList {
    uninstalls: RegKey,
    index: usize,
}

#[cfg(target_os = "windows")]
impl Iterator for AppList {
    type Item = InstalledApp;
    fn next(&mut self) -> Option<Self::Item> {
        let key = self.uninstalls.enum_keys().nth(self.index)?.ok()?;
        self.index += 1;
        let reg = self.uninstalls.open_subkey(key).ok()?;
        Some(InstalledApp { reg })
    }
}

#[cfg(target_os = "windows")]
impl AppList {
    fn new(hive: HKEY, path: &str) -> Result<Self, Box<dyn Error>> {
        let hive = RegKey::predef(hive);
        let uninstalls = hive.open_subkey(path)?;

        Ok(AppList {
            uninstalls,
            index: 0,
        })
    }
}

#[cfg(target_os = "windows")]
impl InstalledApp {
    fn get_value(&self, name: &str) -> Cow<str> {
        self.reg
            .get_value::<String, &str>(name)
            .map(Cow::Owned)
            .unwrap_or_else(|_| Cow::Borrowed(""))
    }
    pub fn name(&self) -> Cow<str> {
        self.get_value("DisplayName")
    }
    pub fn path(&self) -> Cow<str> {
        self.get_value("InstallLocation")
    }
    pub fn publisher(&self) -> Cow<str> {
        self.get_value("Publisher")
    }
    pub fn version(&self) -> Cow<str> {
        self.get_value("DisplayVersion")
    }
    pub fn dump(&self) -> String {
        self.reg
            .enum_values()
            .map(|r| {
                let (name, value) = r.unwrap();
                format!("{}: {}\n", name, value)
            })
            .collect()
    }
    pub fn list() -> Result<impl Iterator<Item = InstalledApp>, Box<dyn Error>> {
        let system_apps = AppList::new(
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        )
        .ok()
        .into_iter()
        .flatten();
        let _system_apps_32 = AppList::new(
            HKEY_LOCAL_MACHINE,
            "SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        )
        .ok()
        .into_iter()
        .flatten();
        let user_apps = AppList::new(
            HKEY_CURRENT_USER,
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        )
        .ok()
        .into_iter()
        .flatten();
        // this one may not exist
        let _user_apps_32 = AppList::new(
            HKEY_CURRENT_USER,
            "SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        )
        .ok()
        .into_iter()
        .flatten();

        let chain = system_apps.chain(user_apps);

        Ok(chain)
    }
}

#[cfg(target_os = "windows")]
pub fn get_apps() -> Vec<App> {

    let mut ls_apps: Vec<App> = vec![];
    let apps_list = InstalledApp::list();

    for app in apps_list.unwrap() {
        if &app.name() != &"" && !&app.name().contains("{}") {
            ls_apps.push(App {
                name: app.name().to_string(),
                app_path_exe: PathBuf::from(app.path().to_string()),
                app_desktop_path: "".into(),
                icon_path: Option::from(PathBuf::from(""))
            });
        }
    }
    ls_apps
}

#[cfg(target_os = "windows")]
pub fn open_file_with(file_path: PathBuf, app_path: PathBuf) {}
