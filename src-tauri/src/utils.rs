use chrono::prelude::*;

pub fn dbg_log(msg: String) {
    println!("[{:?} DBG] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}
pub fn err_log(msg: String) {
    eprintln!("[{:?} ERR] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}