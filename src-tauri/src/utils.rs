use brotlic::{CompressorWriter, DecompressorReader};
use bzip2::read::MultiBzDecoder;
use chrono::prelude::*;
use color_print::cprintln;
use density_rs::algorithms::chameleon::chameleon::Chameleon;
use density_rs::algorithms::cheetah::cheetah::Cheetah;
use density_rs::algorithms::lion::lion::Lion;
use density_rs::codec::codec::Codec;
use jwalk::WalkDir;
use notify::event::{CreateKind, ModifyKind, RemoveKind};
use notify::EventKind::{Create, Modify, Remove};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::env::current_dir;
use std::fs::{create_dir_all, Metadata, OpenOptions};
use std::io::{self, Error};
use std::os::unix::fs::MetadataExt;
use std::path::Path;
use std::usize;
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
use tokio::task;
use zip::write::FileOptions;
use zip::ZipWriter;

#[allow(unused_imports)]
use crate::ISCANCELED;
use crate::{COPY_COUNTER, IS_SEARCHING, TOTAL_BYTES_COPIED, WINDOW};

const CHUNK_SIZE: usize = 64 * 1024;
const MAGIC: u32 = 0xDE_AD;

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
pub async fn copy_to(
    final_filename: String,
    from_path: String,
    total_size: f32,
    count_to_copy: f32,
) {
    // let app_window = WINDOW.get().unwrap();
    let file = fs::metadata(&from_path).unwrap();
    let total_size = total_size;
    if file.is_file() {
        // Prepare to copy file
        let mut fr = BufReader::new(File::open(&from_path).unwrap());
        let mut buf = vec![0; 1_048_576]; // Copying in 1 MB chunks
        let new_file = File::create(&final_filename).unwrap();
        let file_size = fs::metadata(&from_path).unwrap().len() as f32;
        let mut fw = BufWriter::new(new_file);
        let mut s = 0;
        let mut speed: f64;
        let sw = Stopwatch::start_new();
        let mut progress: f32;
        let mut copy_counter = COPY_COUNTER.lock().await;
        *copy_counter += 1.0;
        println!("Copying file...");
        let copy_counter = copy_counter.clone();
        loop {
            match fr.read(&mut buf) {
                Ok(ds) => {
                    s += ds as u64;
                    *(TOTAL_BYTES_COPIED.lock().await) += ds as f32;
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

                            clear_console();
                            println!("Progress: {:.0}% | Total size: {} | Bytes copied: {} | Speed: {:.0} MB/s", progress, format_bytes(total_size as u64), format_bytes(*(TOTAL_BYTES_COPIED.lock().await) as u64), speed);
                            // Only update the progressbar every 5%
                            // if progress % 5.0 < 1.0 {
                            update_progressbar(
                                progress,
                                (100.0 / total_size) * *(TOTAL_BYTES_COPIED.lock().await),
                                count_to_copy,
                                copy_counter,
                                final_filename.split("/").last().unwrap(),
                                speed,
                            );
                            // }
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
            Box::pin(copy_to(
                dest_file,
                path.to_str().unwrap().to_string(),
                total_size.clone(),
                count_to_copy.clone(),
            ))
            .await;
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
    let _ = app_window.emit("show-progressbar", ());
}

pub fn update_progressbar(
    progress: f32,
    elements_progress: f32,
    items_count: f32,
    current_element_count: f32,
    file_name: &str,
    mb_per_sec: f64,
) {
    let _ = WINDOW.get().unwrap().emit(
        "update-progress-bar",
        (
            progress,
            elements_progress,
            items_count,
            current_element_count,
            file_name,
            mb_per_sec,
        ),
    );
    // let file_ext = file_name.split('.').last().unwrap_or("unknown");
    // let _ = app_window.eval(&format!(
    //     "
    //         document.querySelector('.progress-bar-main-percentage').innerText = `{progress:.0}%`;
    //         document.querySelector('.progress-bar-detail-info').innerText = `{current_element_count} of {items_count} - {mb_per_sec:.0} MB/s`;
    //         document.querySelector('.progress-bar-current-file-text').innerText = `{file_name}`;
    //         document.querySelector('.progress-bar-current-file-ext').innerText = `(.{file_ext})`;
    //         document.querySelector('.progress-bar-main-progress-fill').style.width = `{progress:.0}%`;
    //     ",
    // ));
    // progress, items_count, current_element_count, mb_per_sec, file_name, progress,
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

            // End searching if interrupted through esc-key
            if *IS_SEARCHING.lock().await == false && **count_called_back < max_items {
                dbg_log(format!(
                    "Interrupted searching | {} items checked | {} items found | is searching: {}",
                    count_of_checked_items,
                    **count_called_back,
                    IS_SEARCHING.lock().await
                ));
                return;
            }
            if **count_called_back >= max_items || *IS_SEARCHING.lock().await == false {
                return;
            }

            let file_metadata = fs::metadata(&path);
            if file_metadata.is_err() {
                return;
            }

            let last_mod: DateTime<Local> = file_metadata.unwrap().modified().unwrap().into();

            let _ = app_window.emit(
                "set-filesearch-currentfile",
                format!(
                    "{} ({})",
                    name,
                    format_bytes(fs::metadata(&path).unwrap().len())
                ),
            );

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

pub fn unpack_tar(file: File, path: String) {
    let path = Path::new(&path)
        .with_extension("")
        .to_str()
        .unwrap()
        .to_string();
    let mut archive = TarArchive::new(file);
    let _ = fs::create_dir(&path);

    for file in archive.entries().unwrap() {
        // Make sure there wasn't an I/O error
        if file.is_err() {
            continue;
        }
        // Unwrap the file
        let mut file = file.unwrap();
        let _ = file.unpack_in(path.clone()).unwrap_or_default();
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

pub fn remove_action(action_id: String) {
    let _ = WINDOW
        .get()
        .unwrap()
        .eval(format!("removeAction('{}')", action_id).as_str());
}

#[allow(unused)]
pub fn update_list_item_data<S: Into<String> + Clone + Serialize>(path: S, metadata: Metadata) {
    let _ = WINDOW
        .get()
        .unwrap()
        .emit("updateItemMetadata", (path.clone(), metadata.size()));
}

/// Converts a human-readable size string (e.g., "1.66 GB", "1 KiB", "42MB") to bytes (u64).
///
/// Supports:
/// - Decimal: K/KB (10^3), M/MB (10^6), G/GB (10^9), T/TB (10^12), etc.
/// - Binary: Ki/KiB/KIB (2^10), Mi/MiB (2^20), Gi/GiB (2^30), etc.
/// - Fractions: "1.5 GB" → 1_500_000_000
/// - Case insensitive, ignores whitespace.
///
/// # Errors
/// - Invalid number, unknown unit, too large (> u64::MAX), too precise (>20 decimals).
///
/// # Examples
/// ```
/// let bytes = human_to_bytes("1.66 GB").unwrap();
/// assert_eq!(bytes, 1_660_000_000);
///
/// let bytes = human_to_bytes("1.66 GiB").unwrap();
/// assert_eq!(bytes, 1_783_287_424); // 1.66 * 1024^3
///
/// let bytes = human_to_bytes("0.5 KB").unwrap();
/// assert_eq!(bytes, 500);
/// ```
pub fn human_to_bytes<S: Into<String>>(input: S) -> Result<u64, String> {
    let input = input.into();
    let trimmed = input.trim().to_uppercase();
    let parts: Vec<&str> = trimmed.split_whitespace().collect();

    let (num_str, unit) = if parts.len() == 2 {
        (parts[0], parts[1])
    } else if parts.len() == 1 {
        // Assume bytes if no unit
        let num: f64 = parts[0].parse().map_err(|_| "Invalid number")?;
        return Ok(num.round() as u64);
    } else {
        return Err("Invalid format: expected 'number unit' like '1.66 GB'".to_string());
    };

    let num: f64 = num_str.parse().map_err(|_| "Invalid number")?;

    let multiplier = match unit {
        "B" => 1.0,
        "KB" => 1_000.0,
        "MB" => 1_000_000.0,
        "GB" => 1_000_000_000.0,
        "TB" => 1_000_000_000_000.0,
        "PB" => 1_000_000_000_000_000.0,
        _ => return Err("Unknown unit: supported B, KB, MB, GB, TB, PB".to_string()),
    };

    let bytes_f64 = num * multiplier;
    if bytes_f64 > u64::MAX as f64 {
        return Err("Value too large for u64".to_string());
    }
    Ok(bytes_f64.round() as u64)
}

pub async fn compress_items(
    output_path: impl AsRef<Path>,
    input_paths: Vec<String>,
    compression_level: i32,
    compression_format: &str,
    strip_prefix: Option<&Path>, // Optional: strip common prefix from paths
    interval_id: usize,
) -> io::Result<()> {
    let output_path = output_path.as_ref();
    let stop_watch = Stopwatch::start_new();

    if compression_format == "density" {
        for input_path in input_paths {
            compress_to_density(
                &input_path,
                output_path.to_str().unwrap(),
                compression_level,
            ).expect("Failed to compress to density");
        }
        // Implement density compression logic here
    } else if compression_format == "br" {
        let _ = compress_files_to_brotli_tar(
            output_path.with_extension("tar").with_added_extension("br"),
            input_paths,
        );
    } else {
        // Collect all files to compress
        let mut files_to_compress = Vec::new();
        for input_path in input_paths {
            let path = Path::new(&input_path);
            if path.is_file() {
                files_to_compress.push((path.to_path_buf(), path.to_path_buf()));
            } else if path.is_dir() {
                for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                    let entry_path = entry.path();
                    if entry_path.is_file() {
                        files_to_compress.push((entry_path.to_path_buf(), path.to_path_buf()));
                    }
                }
            }
        }

        // Open ZIP file
        let zip_file = File::create(output_path)?;
        let mut zip = ZipWriter::new(zip_file);

        let options = FileOptions::default()
            .compression_method(if compression_format == "zstd" {
                zip::CompressionMethod::Zstd
            } else {
                zip::CompressionMethod::Deflated
            })
            .large_file(true)
            .compression_level(Some(compression_level))
            .unix_permissions(0o644);

        // Channel to send file data to writer
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(String, Vec<u8>, bool)>(CHUNK_SIZE);

        // Writer task
        let writer_handle = task::spawn(async move {
            while let Some((name, data, is_same)) = rx.recv().await {
                if !is_same {
                    zip.start_file(&name, options)?;
                }
                // Async write data to zip file
                zip.write_all(&data).unwrap();
            }
            zip.finish().map(|_| ())
        });

        // Read files in parallel
        for (full_path, base_path) in files_to_compress.clone() {
            let tx = tx.clone();
            let strip = strip_prefix.map(|p| p.to_path_buf());

            let zip_path = if let Some(strip) = strip {
                full_path.strip_prefix(strip).unwrap_or(&full_path)
            } else {
                full_path
                    .strip_prefix(&base_path.parent().unwrap_or(&base_path))
                    .unwrap_or(&full_path)
            };
            let zip_name = zip_path.to_string_lossy().replace("\\", "/");
            let mut last_path = String::new();

            // 1. Open file
            let file_open_result = File::open(&full_path);

            if let Ok(mut file) = file_open_result {
                // 2. Buffer for the next chunk
                let mut buffer = vec![0; CHUNK_SIZE];
                loop {
                    // 3. Read
                    match file.read(&mut buffer) {
                        Ok(0) => {
                            // End of file reached
                            // let _ = tx.send((zip_name.clone(), None)).await;
                            break;
                        }
                        Ok(n) => {
                            // Keep only read bytes
                            buffer.truncate(n);

                            // 4. Send async
                            let _ = tx
                                .send((zip_name.clone(), buffer.clone(), last_path == zip_name))
                                .await;
                            last_path = zip_name.clone();
                        }
                        Err(e) => {
                            eprintln!("Error reading file {}: {}", full_path.display(), e);
                            break;
                        }
                    }
                }
            } else {
                eprintln!("Error opening file {}", full_path.display());
            }
        }

        drop(tx); // Close channel
        writer_handle.await??; // Propagate errors

        let _ =
            WINDOW.get().unwrap().eval(&format!(
            "showToast('Compression done in ' + parseFloat('{:?}').toFixed(2) + 's', ToastType.INFO);",
            stop_watch.elapsed()));

        let _ = WINDOW
            .get()
            .unwrap()
            .eval(&format!("clearInterval({})", interval_id));
    }
    Ok(())
}

/// Helper: Read an entire file into memory
#[allow(unused)]
async fn read_file_async(path: &Path) -> io::Result<Vec<u8>> {
    let mut file = File::open(path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    Ok(buffer)
}

pub fn extract_zst_archive(archive_path: &Path, output_dir: &Path) -> Result<(), Error> {
    let mut output: String = output_dir.to_string_lossy().to_string();
    if output.ends_with(".tar") {
        output = output.strip_suffix(".tar").unwrap().to_string();
    }

    // Create the output directory if it doesn't exist
    fs::create_dir_all(Path::new(&output).with_extension(""))?;

    let _ = WINDOW.get().unwrap().emit("refreshView", ());

    // Open the .zst file
    let file = File::open(archive_path)?;

    // Wrap in a buffered reader for efficiency
    let reader = BufReader::new(file);

    // Create a Zstandard decoder
    let mut decoder = zstd::Decoder::new(reader)?;

    // Create a tar archive reader from the decoder
    let mut archive = tar::Archive::new(&mut decoder);

    // Unpack the archive to the output directory
    archive.unpack(Path::new(&output).with_extension(""))?;

    Ok(())
}

#[allow(unused)]
pub fn get_items_size<I: IntoIterator<Item = String>>(items: I) -> u64 {
    let items = items.into_iter().map(|item| fs::metadata(item));
    items.into_iter().map(|item| item.unwrap().size()).sum()
}

pub fn compress_to_density(
    input_path: &str,
    output_path: &str,
    compression_level: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    let input_file = BufReader::new(File::open(input_path)?);
    let mut output_file = BufWriter::new(File::create(output_path)?);

    // Write header: magic, original_size (streamed, so compute on fly? For simplicity, two-pass: first count size.
    // Alt: Write placeholder, seek back. But for streaming, assume we compute size first or use unknown.
    // Here: Read all chunks to count.
    let mut total_size = 0u64;
    let mut chunks = Vec::new();
    for (_i, chunk) in input_file
        .bytes()
        .map(|b| b.unwrap())
        .collect::<Vec<u8>>()
        .chunks(CHUNK_SIZE)
        .enumerate()
    {
        chunks.push(chunk.to_vec());
        total_size += chunk.len() as u64;
    }
    let num_chunks = chunks.len() as u32;

    // Write header
    output_file.write_all(&MAGIC.to_le_bytes())?;
    output_file.write_all(&total_size.to_le_bytes())?;
    output_file.write_all(&num_chunks.to_le_bytes())?;

    // Compress chunks
    for (i, chunk) in chunks.into_iter().enumerate() {
        let max_comp;
        let mut comp_data;
        let comp_size;
        match compression_level {
            1 => {
                max_comp = Chameleon::safe_encode_buffer_size(chunk.len());
                comp_data = vec![0u8; max_comp];
                comp_size = Chameleon::encode(&chunk, &mut comp_data)?;
            },
            2 => {
                max_comp = Cheetah::safe_encode_buffer_size(chunk.len());
                comp_data = vec![0u8; max_comp];
                comp_size = Cheetah::encode(&chunk, &mut comp_data)?;
            },
            3 => {
                max_comp = Lion::safe_encode_buffer_size(chunk.len());
                comp_data = vec![0u8; max_comp];
                comp_size = Lion::encode(&chunk, &mut comp_data)?;
            },
            _ => {
                max_comp = Cheetah::safe_encode_buffer_size(chunk.len());
                comp_data = vec![0u8; max_comp];
                comp_size = Cheetah::encode(&chunk, &mut comp_data)?;
            }
        }
        output_file.write_all(&(i as u32).to_le_bytes())?; // Index
        output_file.write_all(&(comp_size as u32).to_le_bytes())?; // Comp size
        output_file.write_all(&comp_data[..comp_size])?;
    }
    output_file.flush()?;
    Ok(())
}

pub fn extract_from_density(
    input_path: &str,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut input_file = BufReader::new(File::open(input_path)?);
    let mut output_file = BufWriter::new(File::create(output_path)?);

    let mut header = [0u8; 4];
    input_file.read_exact(&mut header)?;
    if u32::from_le_bytes(header) != MAGIC { return Err("Invalid magic".into()); }

    let mut size_buf = [0u8; 8];
    input_file.read_exact(&mut size_buf)?;
    let _total_size = u64::from_le_bytes(size_buf);

    let mut chunk_buf = [0u8; 4];
    input_file.read_exact(&mut chunk_buf)?;
    let num_chunks = u32::from_le_bytes(chunk_buf);

    for _ in 0..num_chunks {
        input_file.read_exact(&mut chunk_buf)?;
        let _idx = u32::from_le_bytes(chunk_buf);  // Skip idx if not needed
        input_file.read_exact(&mut chunk_buf)?;
        let comp_size: usize = u32::from_le_bytes(chunk_buf) as usize;

        let mut comp_data = vec![0u8; comp_size];
        input_file.read_exact(&mut comp_data)?;

        let mut decomp_data = vec![0u8; CHUNK_SIZE];  // Max chunk
        let decomp_size = Chameleon::decode(&comp_data, &mut decomp_data)?;
        output_file.write_all(&decomp_data[..decomp_size])?;
    }
    output_file.flush()?;
    Ok(())
}

pub fn setup_fs_watcher() {
    dbg_log("Setting up the file system watcher ...");
    watch("/").expect("error watching folder");
}

fn watch<P: AsRef<Path>>(_path: P) -> notify::Result<()> {
    let (tx, rx) = std::sync::mpsc::channel();

    // Automatically select the best implementation for your platform.
    // You can also access each implementation directly e.g. INotifyWatcher.
    let mut watcher = RecommendedWatcher::new(tx, notify::Config::default())?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored for changes.
    #[cfg(target_os = "macos")]
    watcher.watch(Path::new("/"), RecursiveMode::Recursive)?;
    #[cfg(target_os = "linux")]
    {
        watcher.watch(Path::new("/dev"), RecursiveMode::Recursive)?;
        watcher.watch(Path::new("/mnt"), RecursiveMode::Recursive)?;
        watcher.watch(Path::new("/media"), RecursiveMode::Recursive)?;
        watcher.watch(Path::new("/run/media"), RecursiveMode::Recursive)?;
        watcher.watch(Path::new("/home"), RecursiveMode::Recursive)?;
    }
    // watcher.watch(Path::new("/Volumes"), RecursiveMode::Recursive)?;
    // watcher.watch(Path::new("/Users"), RecursiveMode::Recursive)?;
    // watcher.watch(Path::new("/Library"), RecursiveMode::Recursive)?;
    // watcher.watch(Path::new("/Applications"), RecursiveMode::Recursive)?;
    // watcher.watch(Path::new("/System"), RecursiveMode::Recursive)?;

    for res in rx {
        match res {
            Ok(event) => handle_fs_change(event),
            Err(error) => err_log(format!("Error: {error:?}")),
        }
    }

    Ok(())
}

fn handle_fs_change(event: notify::Event) {
    if (event.kind == Create(CreateKind::Folder) || event.kind == Remove(RemoveKind::Folder))
        && event.paths.len() == 1
        && (event.paths[0].starts_with("/Volumes")
            || event.paths[0].to_str().unwrap().contains("/run/media")
            || event.paths[0].to_str().unwrap().contains("/mnt"))
    {
        // Check mounts
        dbg_log(format!("Mount event => {:?}", event));
        let _ = WINDOW
            .get()
            .unwrap()
            .emit("fs-mount-changed", event.clone());
        let _ = WINDOW.get().unwrap().emit("watcher-event", event);
    } else {
        // Check if the event path is within the current directory
        let event_path = event.paths[0].to_str().unwrap();
        let trimmed_event_path = event_path.trim_end_matches(event_path.split("/").last().unwrap());
        let current_dir = current_dir().unwrap().to_string_lossy().to_string() + "/";

        if current_dir == trimmed_event_path {
            // Check entire file system events
            if event.kind == Create(CreateKind::File)
                || event.kind == Create(CreateKind::Folder)
                || event.kind == Remove(RemoveKind::File)
                || event.kind == Remove(RemoveKind::Folder)
                || event.kind == Modify(ModifyKind::Data(notify::event::DataChange::Size))
                || event.kind == Modify(ModifyKind::Data(notify::event::DataChange::Content))
                || event.kind == Modify(ModifyKind::Metadata(notify::event::MetadataKind::Any))
                || event.kind
                    == Modify(ModifyKind::Metadata(notify::event::MetadataKind::WriteTime))
                || event.kind == Modify(ModifyKind::Name(notify::event::RenameMode::To))
                || event.kind == Modify(ModifyKind::Name(notify::event::RenameMode::Any))
            {
                let _ = WINDOW.get().unwrap().emit("watcher-event", event);
            }
        }
    }
}

pub fn extract_tar_bz2(archive_path: &Path, output_dir: &Path) -> io::Result<()> {
    // Create output dir
    fs::create_dir_all(output_dir)?;

    // Open archive
    let file = File::open(archive_path)?;

    // Decompress data
    let decompressed = MultiBzDecoder::new(file);

    // Open tar archive
    let mut archive = tar::Archive::new(decompressed);

    // Iterate over entries
    for entry in archive.entries()? {
        let mut entry = entry?;
        let header = entry.header();
        let path = header.path()?;

        // Final path for entry
        let output_path = output_dir.join(path.clone());

        // Check existence
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)?;
        }

        match entry.header().entry_type() {
            tar::EntryType::Regular => {
                // Extract data (streamed)
                let mut file = File::create(&output_path)?;
                io::copy(&mut entry, &mut file)?;
            }
            tar::EntryType::Directory => {
                fs::create_dir_all(&output_path)?;
            }
            _ => {
                // Ignore symlinks, hardlinks etc.
            }
        }
    }

    Ok(())
}

pub fn compress_files_to_brotli_tar<P>(
    output_path: P,
    files: Vec<impl AsRef<Path>>,
) -> io::Result<()>
where
    P: AsRef<Path>,
{
    let output_file = File::create(output_path.as_ref())?;
    let compressor = CompressorWriter::new(output_file);
    let mut tar_builder = tar::Builder::new(compressor);

    for file_path in files {
        let file_name = file_path.as_ref().file_name().ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "File path has no basename")
        })?;
        let archive_name = Path::new(file_name);
        tar_builder.append_path_with_name(&file_path, archive_name)?;
    }

    tar_builder.finish()?;
    Ok(())
}

pub fn extract_brotli_tar<P, Q>(archive_path: P, output_dir: Q) -> io::Result<()>
where
    P: AsRef<Path>,
    Q: AsRef<Path>,
{
    let archive_file = std::fs::File::open(archive_path.as_ref())?;
    let decompressor = DecompressorReader::new(BufReader::new(archive_file));
    let mut archive = tar::Archive::new(decompressor);

    let output_path = output_dir.as_ref().to_path_buf();
    create_dir_all(&output_path)?;

    for entry in archive.entries()? {
        let mut entry = entry?;
        let header = entry.header();
        let entry_path = header.path()?;
        let full_path = output_path.join(entry_path);

        // Ensure the parent directory exists
        if let Some(parent) = full_path.parent() {
            create_dir_all(parent)?;
        }

        // Extract the file
        let mut file = std::fs::File::create(&full_path)?;
        std::io::copy(&mut entry, &mut file)?;
    }

    Ok(())
}

pub fn clear_console() {
    println!("\x1B[2J\x1B[1;1H");
}
