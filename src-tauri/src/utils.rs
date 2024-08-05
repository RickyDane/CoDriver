use chrono::prelude::*;
use color_print::cprintln;
use fuzzy_matcher::{skim::SkimMatcherV2, FuzzyMatcher};
use regex::Regex;
use serde::Serialize;
use std::{
    env::current_dir,
    ffi::OsStr,
    fmt::Debug,
    fs::{self, File},
    io::{BufReader, BufWriter, Read, Write},
};
use stopwatch::Stopwatch;
use tar::Archive as TarArchive;
use tauri::Window;
const FUZZY_SEARCH: &str = r".*";

use crate::COUNT_CALLED_BACK;
#[allow(unused_imports)]
use crate::ISCANCELED;

pub static mut COPY_COUNTER: f32 = 0.0;
pub static mut TO_COPY_COUNTER: f32 = 0.0;

pub fn dbg_log(msg: String) {
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
}

pub fn copy_to(app_window: &Window, final_filename: String, from_path: String) {
    let file = fs::metadata(&from_path).unwrap();
    if file.is_file() {
        // Kopieren der Datei
        let mut fr = BufReader::new(File::open(&from_path).unwrap());
        let mut buf = vec![0; 10_000_000];
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
                    fw.write_all(&buf[..ds]).unwrap();
                    // Calculate transfer speed and progres
                    speed = calc_transfer_speed(s as f64, sw.elapsed_ms() as f64 / 1000.0);
                    if speed.is_infinite() {
                        speed = 0.0
                    }
                    progress = (100.0 / file_size) * s as f32;
                    unsafe {
                        update_progressbar(
                            app_window,
                            progress,
                            format!("{}/{}", COPY_COUNTER, TO_COPY_COUNTER).as_str(),
                            speed,
                        );
                    };
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
            count += count_entries(&path.to_str().unwrap()).unwrap();
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
    show_progressbar(app_window);
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

pub fn calc_transfer_speed(file_size: f64, time: f64) -> f64 {
    (file_size / time) / 1024.0 / 1024.0
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
        for entry in fs::read_dir(path).unwrap() {
            let item = entry.unwrap();
            if item.file_name().to_str().unwrap().starts_with(".") {
                continue;
            }
            let path = item.path();
            if !fs::metadata(&path).is_ok()
                || (self.exts.len() > 0
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
                    depth: depth,
                    is_dir: true,
                    is_file: false,
                    extension: path.extension().unwrap().to_string_lossy().to_string(),
                    last_modified: format!("{:?}", item.metadata().unwrap().modified().unwrap()),
                    size: 0,
                });
                self.walk(path.to_str().unwrap(), depth + 1);
            } else {
                self.items.push(DirWalkerEntry {
                    name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth: depth,
                    is_dir: false,
                    is_file: true,
                    extension: path.extension().unwrap().to_string_lossy().to_string(),
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
        callback: &impl Fn(DirWalkerEntry),
    ) {
        // if self.depth >= depth {
        //     return;
        // }
        let dir_depth = path
            .split(current_dir().unwrap().to_str().unwrap())
            .last()
            .unwrap()
            .split("/")
            .count()
            - 1;
        // println!("Dir depth: {}", dir_depth);
        unsafe {
            if dir_depth >= depth as usize || COUNT_CALLED_BACK >= max_items {
                return;
            }
        }
        let reg_exp = build_regex_search_input(
            Some(&file_name),
            self.exts.first().map(|x| x.as_str()),
            true,
            true,
        );
        let matcher = SkimMatcherV2::default();
        let dir = fs::read_dir(path);
        if dir.is_err() {
            return;
        }
        for entry in dir.unwrap() {
            // let entry: Result<DirEntry, Error> = entry;
            let item = entry.unwrap();
            let path = item.path();
            let item_path = item.file_name().clone().to_str().unwrap().to_lowercase();
            let item_ext = ".".to_owned()
                + &item_path
                    .split(".")
                    .last()
                    .unwrap()
                    .to_string()
                    .to_lowercase();

            let search_pattern = file_name.to_lowercase();

            let file_metadata = fs::metadata(&path);
            if file_metadata.is_err() {
                continue;
            }

            let last_mod: DateTime<Utc> = file_metadata.unwrap().modified().unwrap().clone().into();

            let matching_score = matcher
                .fuzzy_match(&item_path, &search_pattern)
                .unwrap_or_else(|| 0);

            if matching_score == 0 && path.is_file() && !path.is_dir() {
                continue;
            }

            if !fs::metadata(&path).is_ok()
                || (self.exts.len() > 0
                    && path.is_file()
                    && !path.is_dir()
                    && !self.exts.contains(&item_ext))
            {
                continue;
            }
            if path.is_dir() {
                self.search(
                    &path.clone().to_str().unwrap(),
                    depth,
                    file_name.clone(),
                    max_items,
                    callback,
                );
                if matching_score > 0 {
                    println!("Calling the callback for: {:?} | Matching score: {}, item path: {:?}, search pattern: {:?}, is dir: {}, is file: {}", path,matching_score, &item_path, &search_pattern, path.is_dir(), path.is_file());
                    callback(DirWalkerEntry {
                        name: item.file_name().to_str().unwrap().to_string(),
                        path: path.to_str().unwrap().to_string().replace("\\", "/"),
                        depth: depth,
                        is_dir: true,
                        is_file: false,
                        extension: item_ext,
                        last_modified: format!("{:?}", last_mod),
                        size: fs::metadata(&path).unwrap().len(),
                    });
                }
            } else if path.is_file() && matching_score > 0 {
                println!("Calling the callback for: {:?} | Matching score: {}, item path: {:?}, search pattern: {:?}, is dir: {}, is file: {}", path,matching_score, &item_path, &search_pattern, path.is_dir(), path.is_file());
                callback(DirWalkerEntry {
                    name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth: depth,
                    is_dir: false,
                    is_file: true,
                    extension: item_ext,
                    last_modified: format!("{:?}", last_mod),
                    size: fs::metadata(&path).unwrap().len(),
                });
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

pub fn build_regex_search_input(
    search_input: Option<&str>,
    file_ext: Option<&str>,
    strict: bool,
    ignore_case: bool,
) -> Regex {
    let file_type = file_ext.unwrap_or("*");
    let search_input = search_input.unwrap_or(r"\w+");

    let mut formatted_search_input = if strict {
        format!(r#"{search_input}\.{file_type}$"#)
    } else {
        format!(r#"{search_input}{FUZZY_SEARCH}\.{file_type}$"#)
    };

    if ignore_case {
        formatted_search_input = set_case_insensitive(&formatted_search_input);
    }
    Regex::new(&formatted_search_input).unwrap()
}

fn set_case_insensitive(formatted_search_input: &str) -> String {
    "(?i)".to_owned() + formatted_search_input
}
