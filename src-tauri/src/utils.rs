use std::{fs::{self, File}, io::{BufReader, BufWriter, Read, Write}};

use chrono::prelude::*;
use color_print::cprintln;
use tauri::Window;

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
    let mut fr = BufReader::new(File::open(&from_path).unwrap());

    let mut buf = vec![0; 10_000_000];

    let new_file = File::create(&final_filename).unwrap();
    let file_size = fs::metadata(&from_path).unwrap().len();
    let mut fw = BufWriter::new(new_file);
    let mut s: u64 = 0;

    loop {
        match fr.read(&mut buf) {
            Ok(ds) => {
                s += ds as u64;
                if ds == 0 {
                    break;
                }
                fw.write_all(&buf[..ds]).unwrap();
                let _ = app_window.eval(format!("document.querySelector('.progress-bar-fill').style.width = '{}%'", format!("{:?}", (100.0/file_size as f64) * s as f64)).as_str());
                let _ = app_window.eval(format!("document.querySelector('.progress-bar-text').textContent = parseFloat({}).toFixed(1)+'%'", format!("{:?}", (100.0/file_size as f64) * s as f64)).as_str());
                // println!("Percentage: {:?}%", format!("{:?}", (100.0/file_size as f64) * s as f64));
            }
            Err(e) => {
                err_log(format!("Error copying: {}", e));
                break;
            }
        }
    }
}
