use bzip2::read::{MultiBzDecoder};
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
#[cfg(target_os = "macos")]
use serde::Serialize;
use std::env::current_dir;
use std::fs::{Metadata, OpenOptions};
use std::io::{self, Error};
use std::os::unix::fs::MetadataExt;
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
use tokio::task;
use zip::write::FileOptions;
use zip::ZipWriter;

#[allow(unused_imports)]
use crate::ISCANCELED;
use crate::{COPY_COUNTER, IS_SEARCHING, TOTAL_BYTES_COPIED, WINDOW};

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
pub async fn copy_to(final_filename: String, from_path: String, total_size: f32, count_to_copy: f32) {
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
                            // Clear console
                            println!("\x1B[2J\x1B[1;1H");
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
            Box::pin(copy_to(dest_file, path.to_str().unwrap().to_string(), total_size.clone(), count_to_copy.clone())).await;
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
    let path = Path::new(&path).with_extension("").to_str().unwrap().to_string();
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

pub async fn compress_items<P: AsRef<Path>, I: IntoIterator<Item = P> + Clone>(
    output_path: impl AsRef<Path>,
    input_paths: I,
    compression_level: i32,
    compression_format: &str,
    strip_prefix: Option<&Path>, // Optional: strip common prefix from paths
) -> io::Result<()> {
    let output_path = output_path.as_ref();
    let stop_watch = Stopwatch::start_new();

    if compression_format == "density" {
        for input_path in input_paths {
            let path = input_path.as_ref();
            compress_to_density(
                path.to_str().unwrap(),
                output_path.to_str().unwrap(),
                compression_level,
            )?;
        }
        Ok(())
        // Implement density compression logic here
    } else {
        // Collect all files to compress
        let mut files_to_compress = Vec::new();
        for input_path in input_paths {
            let path = input_path.as_ref();
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
        let _ = WINDOW.get().unwrap().emit("refreshView", ());
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
        let (tx, mut rx) = tokio::sync::mpsc::channel::<(String, Vec<u8>)>(32);

        // Writer task
        let writer_handle = task::spawn(async move {
            while let Some((name, data)) = rx.recv().await {
                zip.start_file(&name, options)?;
                // Async write data to zip file
                zip.write_all(&data).unwrap();
            }
            zip.finish().map(|_| ())
        });

        // Read files in parallel
        let mut handles = Vec::new();
        for (full_path, base_path) in files_to_compress.clone() {
            let tx = tx.clone();
            let strip = strip_prefix.map(|p| p.to_path_buf());

            // let output_value = output_search_path.clone();
            let handle = task::spawn(async move {
                if let Ok(data) = read_file_async(&full_path).await {
                    // Compute relative path inside ZIP
                    let zip_path = if let Some(strip) = strip {
                        full_path.strip_prefix(strip).unwrap_or(&full_path)
                    } else {
                        full_path
                            .strip_prefix(&base_path.parent().unwrap_or(&base_path))
                            .unwrap_or(&full_path)
                    };

                    let zip_name = zip_path.to_string_lossy().replace("\\", "/");
                    let _ = tx.send((zip_name.clone(), data)).await;
                }
            });
            handles.push(handle);
        }

        for h in handles {
            h.await?;
        }

        drop(tx); // Close channel
        writer_handle.await??; // Propagate errors

        let _ = WINDOW.get().unwrap().eval(&format!(
            "showToast('Compression done in {:?}', ToastType.INFO);",
            stop_watch.elapsed()
        ));

        Ok(())
    }
}

/// Helper: Asynchronously read an entire file into memory
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
) -> Result<(), std::io::Error> {
    let mut output_file = File::create(output_path)?;
    let _ = WINDOW.get().unwrap().emit("refreshView", ());

    // Read the input file into memory
    let input_data: Vec<u8>;
    if fs::metadata(&input_path).unwrap().is_file() {
        input_data = std::fs::read(input_path)?;
    } else {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Directories are not supported",
        ));
    }
    println!("Read {} bytes from {}", input_data.len(), input_path);

    // Allocate a buffer for the compressed data
    let max_compressed_size: usize;
    match compression_level {
        1 => max_compressed_size = Chameleon::safe_encode_buffer_size(input_data.len()),
        2 => max_compressed_size = Cheetah::safe_encode_buffer_size(input_data.len()),
        3 => max_compressed_size = Lion::safe_encode_buffer_size(input_data.len()),
        _ => max_compressed_size = Cheetah::safe_encode_buffer_size(input_data.len()),
    }
    let mut compressed_data = vec![0u8; max_compressed_size];

    // Compress the data
    let compressed_size: usize;
    match compression_level {
        1 => compressed_size = Chameleon::encode(&input_data, &mut compressed_data).unwrap(),
        2 => compressed_size = Cheetah::encode(&input_data, &mut compressed_data).unwrap(),
        3 => compressed_size = Lion::encode(&input_data, &mut compressed_data).unwrap(),
        _ => compressed_size = Cheetah::encode(&input_data, &mut compressed_data).unwrap(),
    }
    let mut output = Vec::with_capacity(8 + compressed_size as usize);

    // Prepend original size as little-endian u64
    output.extend_from_slice(&input_data.len().to_le_bytes());
    // Append compressed data
    output.extend_from_slice(&compressed_data[0..compressed_size]);

    println!(
        "Compressed to {} bytes (ratio: {:.2}%)",
        compressed_size,
        (compressed_size as f64 / input_data.len() as f64) * 100.0
    );

    // Write to output file
    output_file.write_all(&output)?;

    println!("Compressed archive written to {}", output_path);
    Ok(())
}

pub fn extract_from_density(input_path: &str, output_path: &str) -> Result<(), String> {
    // Read the entire compressed archive
    let mut input_file = File::open(input_path).unwrap();
    let mut input_data = Vec::new();
    input_file.read_to_end(&mut input_data).unwrap();

    if input_data.len() < 8 {
        return Err("Invalid archive: too short for header".into());
    }

    // Extract original size from first 8 bytes (little-endian u64)
    let original_size_bytes: [u8; 8] = input_data[0..8].try_into().unwrap();
    let original_size = u64::from_le_bytes(original_size_bytes) as usize;

    // Compressed data is the rest
    let compressed_data = &input_data[8..];
    println!("Original size from header: {} bytes", original_size);
    println!("Compressed data size: {} bytes", compressed_data.len());

    // Allocate output buffer of exact original size
    let mut output_data = vec![0u8; original_size];

    // Decompress
    let decoded_size = Chameleon::decode(compressed_data, &mut output_data).unwrap();
    if decoded_size != original_size {
        return Err(format!(
            "Decode mismatch: expected {}, got {}",
            original_size, decoded_size
        )
        .into());
    }
    println!("Successfully decompressed {} bytes", decoded_size);

    // Write to output file
    let mut output_file = File::create(output_path).unwrap();
    output_file.write_all(&output_data).unwrap();

    println!("Decompressed file written to {}", output_path);
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
    watcher.watch(Path::new("/"), RecursiveMode::Recursive)?;
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
        && event.paths[0].starts_with("/Volumes")
    {
        // Check mounts
        dbg_log(format!("Mount event => {:?}", event));
        let _ = WINDOW.get().unwrap().emit("fs-mount-changed", event.clone());
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
                || event.kind == Modify(ModifyKind::Metadata(notify::event::MetadataKind::WriteTime))
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
