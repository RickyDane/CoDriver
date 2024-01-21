use chrono::prelude::*;
use color_print::cprintln;

pub fn dbg_log(msg: String) {
    println!("[{:?} DBG] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}
pub fn wng_log(msg: String) {
    cprintln!("[{:?} <yellow>WNG</yellow>] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}
pub fn err_log(msg: String) {
    cprintln!("[{:?} <red>ERR</red>] {}", Local::now().format("%H:%M:%S").to_string(), msg);
}