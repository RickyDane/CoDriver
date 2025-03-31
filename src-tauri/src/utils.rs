use chrono::prelude::*;
use color_print::cprintln;
use regex::Regex;
use serde::Serialize;
use tauri::api::dialog;
use std::fs::OpenOptions;
use std::{
    ffi::OsStr,
    fmt::Debug,
    fs::{self, File},
    io::{BufReader, BufWriter, Read, Write},
};
use stopwatch::Stopwatch;
use sysinfo::System;
use tar::Archive as TarArchive;
use tauri::api::path::config_dir;
use tauri::Window;

#[allow(unused_imports)]
use crate::ISCANCELED;
use crate::{COUNT_CALLED_BACK, IS_SEARCHING, WINDOW};

pub static mut COPY_COUNTER: f32 = 0.0;
pub static mut TO_COPY_COUNTER: f32 = 0.0;

pub fn dbg_log(msg: String, _line_no: String) {
    cprintln!(
        "[<white>{:?}</white> DBG] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
}
pub fn wng_log(msg: String) {
    cprintln!(
        "[<white>{:?}</white> <yellow>WNG</yellow>] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
}
pub fn err_log(msg: String) {
    cprintln!(
        "[<white>{:?}</white> <red>ERR</red>] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
    log(msg);
}

pub fn log(msg: String) {
    let log = format!("\n[{}] {}", chrono::Local::now().format("%H:%M:%S"), msg);
    let log_file_path = config_dir()
        .unwrap()
        .join("com.codriver.dev")
        .join("log.txt");
    if !log_file_path.exists() {
        let _ = fs::File::create(&log_file_path);
    }

    // Write text to logfile
    let mut file = OpenOptions::new()
        .append(true)
        .open(&log_file_path)
        .unwrap();
    let _ = file.write_all(log.as_bytes());

    dbg_log(
        format!(
            "Written to: {} Log: {}",
            log_file_path.to_str().unwrap(),
            log
        ),
        dbg!("").into(),
    );
}
pub fn copy_to(app_window: &Window, final_filename: String, from_path: String) {
    let file = fs::metadata(&from_path).unwrap();
    if file.is_file() {
        // Prepare to copy file
        let mut fr = BufReader::new(File::open(&from_path).unwrap());
        let mut buf = vec![0; 1_000_000]; // Copy in 1 mb chunks
        let new_file = File::create(&final_filename).unwrap();
        let file_size = fs::metadata(&from_path).unwrap().len() as f32;
        let mut fw = BufWriter::new(new_file);
        let mut s = 0;
        let mut speed: f64;
        let sw = Stopwatch::start_new();
        let mut progress: f32;
        unsafe {
            update_progressbar_2(
                app_window,
                (100.0 / TO_COPY_COUNTER) * COPY_COUNTER,
                final_filename.split("/").last().unwrap(),
            );
            COPY_COUNTER += 1.0;
        }
        loop {
            match fr.read(&mut buf) {
                Ok(ds) => {
                    s += ds as u64;
                    if ds == 0 {
                        break;
                    }
                    match fw.write_all(&buf[..ds]) {
                        Ok(_) => {
                            // Calculate transfer speed and progres
                            speed = calc_transfer_speed(s, sw.elapsed_ms());
                            if speed.is_infinite() { speed = 0.0 }
                            progress = (100.0 / file_size) * s as f32;
                            unsafe {
                                update_progressbar(
                                    app_window,
                                    progress,
                                    format!("{}/{}", COPY_COUNTER, TO_COPY_COUNTER).as_str(),
                                    speed,
                                );
                            };
                        },
                        Err(err) => {
                            dialog::message(WINDOW.get(), "Info", format!("{:?}", err.to_string()));
                            break;
                        },
                    }
                }
                Err(e) => {
                    err_log(format!("Error copying: {}", e));
                    break;
                }
            }
        }
    } else if file.is_dir() {
        // Recursive copying of the directory
        fs::create_dir_all(&final_filename).unwrap();
        for entry in fs::read_dir(&from_path).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            let relative_path = path.strip_prefix(&from_path).unwrap();
            let dest_file = final_filename.clone() + "/" + relative_path.to_str().unwrap();
            copy_to(app_window, dest_file, path.to_str().unwrap().to_string());
        }
    } else {
        wng_log(format!("Unsupported file type: {}", from_path));
    }
}

pub fn count_entries(path: &str) -> Result<f32, std::io::Error> {
    let mut count: f32 = 0.0;

    if fs::metadata(path).is_err() {
        return Ok(0.0);
    }
    if !fs::metadata(path).unwrap().is_dir() {
        return Ok(1.0);
    }

    for entry in fs::read_dir(path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_dir() {
            count += count_entries(path.to_str().unwrap()).unwrap();
        } else {
            count += 1.0;
        }
    }
    Ok(count)
}

pub fn show_progressbar(app_window: &Window) {
    let _ = &app_window
        .eval("document.querySelector('.progress-bar-container-popup').style.display = 'flex'");
    let _ = app_window.eval("document.querySelector('.progress-bar-2').style.display = 'block'");
}

pub fn update_progressbar(
    app_window: &Window,
    progress: f32,
    items_count_text: &str,
    mb_per_sec: f64,
) {
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-fill').style.width = '{}%'",
            &progress
        )
        .as_str(),
    );
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-text').innerText = '{:.2} %'",
            progress
        )
        .as_str(),
    );
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-text-2').innerText = '{:.2} MB/s | {}'",
            mb_per_sec, items_count_text
        )
        .as_str(),
    );
}

pub fn update_progressbar_2(app_window: &Window, progress: f32, file_name: &str) {
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-2-fill').style.width = '{}%'",
            progress
        )
        .as_str(),
    );
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-item-text').innerText = '{}'",
            file_name
        )
        .as_str(),
    );
}

pub fn calc_transfer_speed(file_size: u64, time: i64) -> f64 {
    (file_size as f64 / (time as f64 / 1000.0)) / 1024.0 / 1024.0
}

#[derive(Clone, Debug, Serialize)]
pub struct DirWalkerEntry {
    pub name: String,
    pub path: String,
    pub depth: u32,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub extension: String,
    pub last_modified: String,
}

pub struct DirWalker {
    pub items: Vec<DirWalkerEntry>,
    pub depth: u32,
    pub exts: Vec<String>,
}

impl DirWalker {
    pub fn new() -> DirWalker {
        DirWalker {
            items: Vec::new(),
            depth: 0,
            exts: vec![],
        }
    }

    pub fn run(&mut self, path: &str) -> &mut Self {
        self.walk(path, 0);
        self
    }

    pub fn walk(&mut self, path: &str, depth: u32) {
        if self.depth > 0 && depth > self.depth {
            return;
        }
        let entries = fs::read_dir(path);

        if entries.is_err() {
            return;
        }

        for entry in entries.unwrap() {
            let item = entry;
            if item.is_err() {
                continue;
            }
            let item = item.unwrap();
            if item.file_name().to_str().unwrap().starts_with(".") {
                continue;
            }
            let path = item.path();
            if fs::metadata(&path).is_err()
                || (!self.exts.is_empty()
                    && !self.exts.contains(
                        &item
                            .file_name()
                            .to_str()
                            .unwrap()
                            .split(".")
                            .last()
                            .unwrap()
                            .to_string(),
                    ))
            {
                continue;
            }
            if path.is_dir() {
                self.items.push(DirWalkerEntry {
                    name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth,
                    is_dir: true,
                    is_file: false,
                    extension: path
                        .extension()
                        .unwrap_or(OsStr::new(""))
                        .to_string_lossy()
                        .to_string(),
                    last_modified: format!("{:?}", item.metadata().unwrap().modified().unwrap()),
                    size: 0,
                });
                self.walk(path.to_str().unwrap(), depth + 1);
            } else {
                self.items.push(DirWalkerEntry {
                    name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth,
                    is_dir: false,
                    is_file: true,
                    extension: path
                        .extension()
                        .unwrap_or(OsStr::new(""))
                        .to_string_lossy()
                        .to_string(),
                    last_modified: format!("{:?}", item.metadata().unwrap().modified().unwrap()),
                    size: fs::metadata(&path).unwrap().len(),
                });
            }
        }
    }

    pub fn search(
        &mut self,
        path: &str,
        depth: u32,
        file_name: String,
        max_items: i32,
        is_quick_search: bool,
        file_content: String,
        callback: &impl Fn(DirWalkerEntry),
        app_window: &Window,
    ) {
        let reg_exp: Regex;

        if !self.exts.is_empty() {
            reg_exp = Regex::new(format!("(?i){}", file_name).as_str()).unwrap();
            println!(
                "Searching with file extension: {} | regex: {}",
                self.exts.first().unwrap(),
                reg_exp.as_str()
            );
        } else {
            reg_exp = Regex::new(format!("(?i){}.*", file_name).as_str()).unwrap();
        }

        let mut count_of_checked_items: usize = 0;

        for entry in jwalk::WalkDir::new(path)
            .parallelism(jwalk::Parallelism::RayonNewPool(
                System::new().physical_core_count().unwrap_or(4) - 1,
            ))
            .sort(true)
            .min_depth(0)
            .max_depth(depth as usize)
            .skip_hidden(false)
            .follow_links(true)
        {
            count_of_checked_items += 1;

            unsafe {
                if !IS_SEARCHING && COUNT_CALLED_BACK < max_items {
                    dbg_log("Interrupted searching".into(), dbg!("").into());
                    return;
                }
                if COUNT_CALLED_BACK >= max_items || !IS_SEARCHING {
                    return;
                }
            }

            if entry.is_err() {
                continue;
            }

            let entry = entry.unwrap();

            let name = entry.file_name().to_str().unwrap_or("").to_string();
            let path = entry.path();
            let item_path = entry.file_name().to_str().unwrap_or("").to_lowercase();

            println!("Checking: {}", item_path);

            // Show how many files have already been checked
            let _ = app_window.eval(&format!(
                "$('.file-searching-file-count').html('{} items found<br/><br/>{} items checked')",
                unsafe { COUNT_CALLED_BACK },
                count_of_checked_items
            ));

            // Exclude onedrive so the file explorer doesn't download stuff from it => TODO: Make it configurable in the future
            if item_path.contains("onedrive") {
                continue;
            }

            let item_ext = ".".to_owned()
                + &item_path
                    .split(".")
                    .last()
                    .unwrap()
                    .to_string()
                    .to_lowercase();

            let file_metadata = fs::metadata(&path);
            if file_metadata.is_err() {
                return;
            }

            let last_mod: DateTime<Utc> = file_metadata.unwrap().modified().unwrap().into();

            if !reg_exp.is_match(&name) {
                continue;
            }

            app_window
                .eval(
                    format!(
                        "document.querySelector('.fullsearch-current-file').innerHTML = '{} ({})'",
                        name,
                        format_bytes(fs::metadata(&path).unwrap().len())
                    )
                    .as_str(),
                )
                .unwrap();

            let is_match = reg_exp.is_match(&name);
            let is_with_exts = !self.exts.is_empty() && self.exts.contains(&item_ext);
            let is_file = path.is_file();
            let is_quick_search = is_quick_search;

            if is_match && ((is_with_exts && is_file) || is_quick_search) {
                // Search for file content
                if !file_content.is_empty() {
                    let content = fs::read_to_string(&path).unwrap_or_else(|_| "".into());
                    // => TODO: Extend with line number of text occurence later on
                    if content.contains(&file_content) {
                        dbg_log(
                            format!("File found with file_content: {}", &name),
                            dbg!("").into(),
                        );
                        callback(DirWalkerEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                            depth,
                            is_dir: path.is_dir(),
                            is_file: path.is_file(),
                            extension: item_ext,
                            last_modified: format!("{:?}", last_mod),
                            size: fs::metadata(&path).unwrap().len(),
                        });
                    }
                } else {
                    // Search w/o file content
                    dbg_log(format!("File found: {}", &name), dbg!("").into());
                    callback(DirWalkerEntry {
                        name,
                        path: path.to_string_lossy().to_string(),
                        depth,
                        is_dir: path.is_dir(),
                        is_file: path.is_file(),
                        extension: item_ext,
                        last_modified: format!("{:?}", last_mod),
                        size: fs::metadata(&path).unwrap().len(),
                    });
                }
            }
        }
    }

    pub fn depth(&mut self, depth: u32) -> &mut Self {
        self.depth = depth;
        self
    }

    pub fn set_ext(&mut self, exts: Vec<String>) -> &mut Self {
        self.exts = exts;
        self
    }

    pub fn ext(&mut self, extensions: Vec<&str>) -> &mut Self {
        self.items = self
            .items
            .clone()
            .into_iter()
            .filter(|item| {
                for ext in &extensions {
                    if item.name.ends_with(ext) {
                        return true;
                    }
                }
                false
            })
            .collect();
        self
    }

    pub fn get_items(&self) -> Vec<DirWalkerEntry> {
        (*self.items).to_vec()
    }
}

pub fn format_bytes(size: u64) -> String {
    // Define size units and their labels
    const UNITS: [&str; 7] = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
    let mut size = size as f64; // Convert to float for division
    let mut unit_index = 0; // Start with bytes (B)

    // Find the appropriate unit
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    // Format with 2 decimal places
    format!("{:.2} {}", size, UNITS[unit_index])
}

pub fn unpack_tar(file: File) {
    let mut archive = TarArchive::new(file);
    let _ = fs::create_dir("Unpacked_Archive");

    for file in archive.entries().unwrap() {
        // Make sure there wasn't an I/O error
        if file.is_err() {
            continue;
        }
        // Unwrap the file
        let mut file = file.unwrap();
        let _ = file.unpack_in("Unpacked_Archive").unwrap_or_default();
    }
}

pub fn create_new_action(
    app_window: &Window,
    action_name: String,
    action_desc: String,
    path: &String,
) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    let _ = app_window.eval(
        format!(
            "createNewAction('{}', '{}', '{}', '{}')",
            id, action_name, action_desc, path
        )
        .as_str(),
    );
    id
}

pub fn remove_action(app_window: Window, action_id: String) {
    let _ = app_window.eval(format!("removeAction('{}')", action_id).as_str());
}
