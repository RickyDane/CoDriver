use chrono::prelude::*;
use color_print::cprintln;
use serde::Serialize;
use std::{
    fmt::Debug,
    fs::{self, File},
    io::{BufReader, BufWriter, Read, Write},
};
use stopwatch::Stopwatch;
use tar::Archive as TarArchive;
use tauri::Window;

use crate::get_current_connection;
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
        let mut speed = 0.0;
        let sw = Stopwatch::start_new();
        let mut byte_counter = 0;
        let mut progress = 0.0;
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
                    if byte_counter % 5 == 0 {
                        speed = calc_transfer_speed(s as f64, sw.elapsed_ms() as f64 / 1000.0);
                        if speed.is_infinite() {
                            speed = 0.0
                        }
                        progress = (100.0 / file_size) * s as f32;
                    };
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
            byte_counter += 32;
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
            "document.querySelector('.progress-bar-text').innerText = '{:.1} %'",
            progress
        )
        .as_str(),
    );
    let _ = app_window.eval(
        format!(
            "document.querySelector('.progress-bar-text-2').innerText = '{:.0} MB/s | {}'",
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
    pub file_name: String,
    pub path: String,
    pub depth: u32,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
}

pub struct DirWalker {
    pub items: Vec<DirWalkerEntry>,
    pub depth: u32,
}

impl DirWalker {
    pub fn new() -> DirWalker {
        DirWalker {
            items: Vec::new(),
            depth: 0,
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
            if !fs::metadata(&path).is_ok() {
                continue;
            }
            if path.is_dir() {
                self.items.push(DirWalkerEntry {
                    file_name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth: depth,
                    is_dir: true,
                    is_file: false,
                    size: 0,
                });
                self.walk(path.to_str().unwrap(), depth + 1);
            } else {
                self.items.push(DirWalkerEntry {
                    file_name: item.file_name().to_str().unwrap().to_string(),
                    path: path.to_str().unwrap().to_string().replace("\\", "/"),
                    depth: depth,
                    is_dir: false,
                    is_file: true,
                    size: fs::metadata(&path).unwrap().len(),
                });
            }
        }
    }

    pub fn depth(&mut self, depth: u32) -> &mut Self {
        self.depth = depth;
        self
    }

    pub fn ext(&mut self, extensions: Vec<&str>) -> &mut Self {
        self.items = self
            .items
            .clone()
            .into_iter()
            .filter(|item| {
                for ext in &extensions {
                    if item.file_name.ends_with(ext) {
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

pub fn format_bytes(bytes: u64) -> String {
    let kb = bytes / 1024;
    let mb = kb / 1024;
    let gb = mb / 1024;
    let tb = gb / 1024;

    if tb > 0 {
        format!("{:.2} TB", tb as f32)
    } else if gb > 0 {
        format!("{:.2} GB", gb as f32)
    } else if mb > 0 {
        format!("{:.2} MB", mb as f32)
    } else if kb > 0 {
        format!("{:.2} KB", kb as f32)
    } else {
        format!("{:.2} B", bytes as f32)
    }
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
