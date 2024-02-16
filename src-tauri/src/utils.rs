use std::{fs::{self, File}, io::{BufReader, BufWriter, Read, Write}};
use chrono::prelude::*;
use color_print::cprintln;
use stopwatch::Stopwatch;
use tauri::Window;

pub static mut COPY_COUNTER: f32 = 0.0;
pub static mut TO_COPY_COUNTER: f32 = 0.0;

pub fn dbg_log(msg: String) {
    cprintln!("[<white>{:?}</white> DBG] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}
pub fn wng_log(msg: String) {
    cprintln!("[<white>{:?}</white> <yellow>WNG</yellow>] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}
pub fn err_log(msg: String) {
    cprintln!("[<white>{:?}</white> <red>ERR</red>] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}

pub fn copy_to(app_window: &Window, final_filename: String, from_path: String) {
    let metadata = fs::metadata(&from_path).unwrap();
    if metadata.is_file() {
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
            update_progressbar_2(app_window, (100.0/TO_COPY_COUNTER) * COPY_COUNTER, final_filename.split("/").last().unwrap());
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
                        if speed.is_infinite() { speed = 0.0 }
                        progress = (100.0/file_size) * s as f32;
                    };
                    unsafe {
                        update_progressbar(app_window, progress, format!("{}/{}", COPY_COUNTER, TO_COPY_COUNTER).as_str(), speed);
                    };
                }
                Err(e) => {
                    err_log(format!("Error copying: {}", e));
                    break;
                }
            }
            byte_counter += 32;
        }
    }
    else if metadata.is_dir() {
        // Recursive copying of the directory
        fs::create_dir_all(&final_filename).unwrap();
        for entry in fs::read_dir(&from_path).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            let relative_path = path.strip_prefix(&from_path).unwrap();
            let dest_file = final_filename.clone() + "/" + relative_path.to_str().unwrap();
            copy_to(app_window, dest_file, path.to_str().unwrap().to_string());
        }
    }
    else {
        wng_log(format!("Unsupported file type: {}", from_path));
    }
}

pub fn count_entries(path: &str) -> f32 {
    let mut count: f32 = 0.0;

    if !fs::metadata(path).unwrap().is_dir() {
        return 1.0;
    }

    for entry in fs::read_dir(path).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_dir() {
            count += count_entries(&path.to_str().unwrap());
        }
        else {
            count += 1.0;
        }
    }

    count
}

pub fn update_progressbar(app_window: &Window, progress: f32, items_count_text: &str, mb_per_sec: f64) {
    let _ = app_window.eval(format!("document.querySelector('.progress-bar-fill').style.width = '{}%'", &progress).as_str());
    let _ = app_window.eval(format!("document.querySelector('.progress-bar-text').innerText = '{:.1} %'", progress).as_str());
    let _ = app_window.eval(format!("document.querySelector('.progress-bar-text-2').innerText = '{:.0} MB/s | {}'", mb_per_sec, items_count_text).as_str());
}

pub fn update_progressbar_2(app_window: &Window, progress: f32, file_name: &str) {
    let _ = app_window.eval(format!("document.querySelector('.progress-bar-2-fill').style.width = '{}%'", progress).as_str());
    let _ = app_window.eval(format!("document.querySelector('.progress-bar-item-text').innerText = '{}'", file_name).as_str());
}

pub fn calc_transfer_speed(file_size: f64, time: f64) -> f64 {
    (file_size / time) / 1024.0 / 1024.0
}
