use chrono::prelude::*;
use color_print::cprintln;
use serde::Serialize;
use std::env::current_dir;
use std::fs::OpenOptions;
use std::path::Path;
use std::{
    ffi::OsStr,
    fmt::Debug,
    fs::{self, File},
    io::{BufReader, BufWriter, Read, Write},
};
use stopwatch::Stopwatch;
use tar::Archive as TarArchive;
use tauri::api::dialog;
use tauri::api::path::config_dir;
use tauri::Window;
use tokio::sync::MutexGuard;

#[allow(unused_imports)]
use crate::ISCANCELED;
use crate::{COPY_COUNTER, IS_SEARCHING, TO_COPY_COUNTER, WINDOW};

pub fn success_log<S: Into<String>>(msg: S) {
    let msg = msg.into();
    cprintln!(
        "[<white>{:?}</white> <green>SUC</green>] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
}

pub fn dbg_log<S: Into<String>>(msg: S) {
    let msg = msg.into();
    cprintln!(
        "[<white>{:?}</white> DBG] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
}
pub fn wng_log<S: Into<String>>(msg: S) {
    let msg = msg.into();
    cprintln!(
        "[<white>{:?}</white> <yellow>WNG</yellow>] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
}
pub fn err_log<S: Into<String>>(msg: S) {
    let msg = msg.into();
    cprintln!(
        "[<white>{:?}</white> <red>ERR</red>] {}",
        Local::now().format("%H:%M:%S").to_string(),
        msg
    );
    log(msg);
}

pub fn log<S: Into<String>>(msg: S) {
    let msg = msg.into();
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

    dbg_log(format!(
        "Written to: {} Log: {}",
        log_file_path.to_str().unwrap(),
        log
    ));
}
pub async fn copy_to(final_filename: String, from_path: String) {
    let app_window = WINDOW.get().unwrap();
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
        let mut copy_counter = COPY_COUNTER.lock().await;
        let to_copy_counter = TO_COPY_COUNTER.lock().await;
        update_progressbar_2(
            app_window,
            (100.0 / *to_copy_counter) * *copy_counter,
            final_filename.split("/").last().unwrap(),
        );
        *copy_counter += 1.0;
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
                            if speed.is_infinite() {
                                speed = 0.0
                            }
                            progress = (100.0 / file_size) * s as f32;
                            update_progressbar(
                                app_window,
                                progress,
                                format!("{}/{}", *copy_counter, *to_copy_counter).as_str(),
                                speed,
                            );
                        }
                        Err(err) => {
                            dialog::message(WINDOW.get(), "Info", format!("{:?}", err.to_string()));
                            break;
                        }
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
            Box::pin(copy_to(dest_file, path.to_str().unwrap().to_string())).await;
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

    pub async fn search(
        &mut self,
        path: &str,
        depth: u32,
        file_name: String,
        max_items: i32,
        _: bool,
        file_content: String,
        callback: &impl Fn(DirWalkerEntry),
        count_called_back: &mut MutexGuard<'_, i32>,
    ) {
        let app_window = WINDOW.get().unwrap();
        // let reg_exp: Regex;
        let mut count_of_checked_items: usize = 0;

        for entry in jwalk::WalkDir::new(path)
            .parallelism(jwalk::Parallelism::RayonNewPool(num_cpus::get() - 1))
            .sort(true)
            .min_depth(0)
            .max_depth(depth as usize)
            .skip_hidden(false)
            .follow_links(true)
        {
            count_of_checked_items += 1;

            if entry.is_err() {
                wng_log(format!("Skipped: {}", entry.err().unwrap()));
                continue;
            }

            let entry = entry.unwrap();
            let item_path = entry.file_name().to_str().unwrap_or("").to_lowercase();
            let name = entry.file_name().to_str().unwrap_or("").to_string();
            let path = entry.path();

            let item_ext = ".".to_owned()
                + &item_path
                    .split(".")
                    .last()
                    .unwrap()
                    .to_string()
                    .to_lowercase();

            // Exclude some stuff
            if item_path.contains("onedrive")
                || name
                    == current_dir()
                        .unwrap()
                        .to_str()
                        .unwrap()
                        .to_string()
                        .split("/")
                        .last()
                        .unwrap()
                        .to_string()
                || item_ext == ".declarations"
                || item_ext == ".declarations_content"
                || item_ext == ".resolved"
                || item_ext == ".unlinked2"
                || item_ext == ".linked"
            {
                continue;
            }

            unsafe {
                // End searching if interrupted through esc-key
                if IS_SEARCHING == false && **count_called_back < max_items {
                    dbg_log(format!("Interrupted searching | {} items checked | {} items found | is searching: {}", count_of_checked_items, **count_called_back, IS_SEARCHING));
                    return;
                }
                if **count_called_back >= max_items || IS_SEARCHING == false {
                    return;
                }
            }

            let file_metadata = fs::metadata(&path);
            if file_metadata.is_err() {
                return;
            }

            let last_mod: DateTime<Local> = file_metadata.unwrap().modified().unwrap().into();

            let _ = app_window.emit("set-filesearch-currentfile", format!("{} ({})", name, format_bytes(fs::metadata(&path).unwrap().len())));

            let is_with_exts = !self.exts.is_empty() && self.exts.contains(&item_ext);

            let is_match = is_match_file(&name, &file_name, &is_with_exts);

            if is_match {
                // Search for file content
                if !file_content.is_empty() {
                    let content = fs::read_to_string(&path).unwrap_or_else(|_| "".into());
                    // => TODO: Extend with line number of text occurence later on
                    if content.contains(&file_content) {
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
                        **count_called_back += 1;
                    }
                } else {
                    // Search w/o file content
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
                    **count_called_back += 1;
                }
            }

            let _ = app_window.emit("set-filesearch-count", **count_called_back);
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

fn is_match_file(file_name: &str, search_input: &str, is_with_ext: &bool) -> bool {
    let file_name_lower = file_name.to_lowercase();

    let search = search_input.to_lowercase();
    let terms = search
        .split_whitespace()
        .filter(|term| !term.is_empty())
        .collect::<Vec<&str>>();

    if !is_with_ext {
        return terms.iter().all(|term| file_name_lower.contains(term));
    } else {
        let ext = Path::new(file_name)
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        return terms
            .iter()
            .all(|term| file_name_lower.contains(term) && file_name_lower.contains(&ext));
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
