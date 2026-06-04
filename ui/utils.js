const { listen } = window.__TAURI__.event;

function safeAnimationEnd(element, callback, timeout = 250) {
  if (!element) {
    if (callback) callback();
    return;
  }
  let called = false;
  const done = () => {
    if (called) return;
    called = true;
    clearTimeout(safetyTimeout);
    element.removeEventListener("animationend", done);
    if (callback) callback();
  };
  element.addEventListener("animationend", done, { once: true });
  const safetyTimeout = setTimeout(done, timeout);
}

// Initialize here to be accessable from anywhere
let ArrSelectedItems = [];
let ArrCopyItems = [];
let Applications = [];

/* IndexedDB caching system */
const DB_NAME = "CoDriverCache";
const DB_VERSION = 1;
const STORE_NAME = "thumbnails";
let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

async function getCachedImage(key) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB read error:", error);
    return null;
  }
}

async function cacheImage(key, value) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB write error:", error);
  }
}

/* Drag and drop files into file explorer */
// TODO: Make it simpler and not so shitty
let LastDraggedOverElement = null;

function clearDragHighlight(el) {
  if (!el) return;
  el.classList.remove("dragged-over");
  el.style.opacity = "";
  el.style.border = "";
  el.style.backgroundColor = "";
  el.style.scale = "";
}

const handleDragOver = (event) => {
  try {
    const { x, y } = event.payload.position || {};
    if (x === undefined || y === undefined) return;

    // Find DOM element under the OS drag cursor
    let rawEl = document.elementFromPoint(x, y);
    if (!rawEl) return;

    // Find if it's a directory item or sidebar/back button
    let el = rawEl.closest(".item-link") || rawEl.closest(".site-nav-bar-button") || rawEl.closest(".site-nav-bar-button-fav") || rawEl.closest(".go-back-button");

    if (el) {
      // Check if it is a folder (for .item-link directory entry)
      let isDir = el.getAttribute("itemisdir") == "1";
      // Sidebar button/back buttons are folders conceptually (they accept drops)
      let isAcceptableDrop = isDir || el.classList.contains("site-nav-bar-button") || el.classList.contains("site-nav-bar-button-fav") || el.classList.contains("go-back-button");

      if (isAcceptableDrop) {
        // Prevent highlighting if dragging over a selected item
        if (el.classList.contains("item-link") && typeof ArrSelectedItems !== "undefined" && ArrSelectedItems.includes(el)) {
          if (LastDraggedOverElement) {
            clearDragHighlight(LastDraggedOverElement);
            LastDraggedOverElement = null;
            DraggedOverElement = null;
          }
          return;
        }

        if (LastDraggedOverElement && LastDraggedOverElement !== el) {
          clearDragHighlight(LastDraggedOverElement);
        }

        el.classList.add("dragged-over");
        DraggedOverElement = el;
        LastDraggedOverElement = el;
        if (typeof MousePos !== "undefined") {
          MousePos = [x, y];
        }
        return;
      }
    }

    // If not hovering over a valid drop target, clear previous highlight
    if (LastDraggedOverElement) {
      clearDragHighlight(LastDraggedOverElement);
      LastDraggedOverElement = null;
      DraggedOverElement = null;
    }
  } catch (error) {
    console.error("Error in file-drop-hover:", error);
  }
};

listen("tauri://file-drop-hover", handleDragOver);
listen("tauri://drag-over", handleDragOver);

const handleDragLeave = () => {
  if (LastDraggedOverElement) {
    clearDragHighlight(LastDraggedOverElement);
    LastDraggedOverElement = null;
  }
  DraggedOverElement = null;
};

listen("tauri://file-drop-cancelled", handleDragLeave);
listen("tauri://drag-leave", handleDragLeave);

const handleDragDrop = async (event) => {
  const { invoke } = TAURI.core;
  try {
    ArrSelectedItems = [];
    ArrCopyItems = [];
    const dropPaths = Array.isArray(event.payload) ? event.payload : (event.payload.paths || []);

    // Resolve all dropped paths into clean FDir objects using the backend to avoid clipboard collision
    let droppedItems = [];
    for (let path of dropPaths) {
      try {
        let info = await invoke("get_single_item_info", { path });
        droppedItems.push(info);
      } catch (err) {
        let name = path.split(/[\\\/]/).pop().replace("'", "");
        droppedItems.push({
          name: name,
          path: path,
          is_dir: 0,
          size: "0",
          last_modified: "",
          extension: path.split(".").pop() || "",
        });
      }
    }

    // Populate ArrCopyItems for legacy compatibility if anything else references it
    droppedItems.forEach((item) => {
      let element = document.createElement("button");
      element.setAttribute("itemname", item.name);
      element.setAttribute("itempath", item.path);
      element.setAttribute("itemisdir", item.is_dir.toString());
      element.setAttribute("itemrawsize", item.size);
      element.setAttribute("itemmodified", item.last_modified);
      element.setAttribute("itemext", item.extension);
      ArrCopyItems.push(element);
    });

    if (IsFileOpIntern == false) {
      if (DraggedOverElement != null) {
        let operation = await fileOperationContextMenu();
        if (operation == "copy") {
          await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "", false, droppedItems);
          await listDirectories();
        } else if (operation == "move") {
          await pasteItem(
            DraggedOverElement.getAttribute("itempath") ?? "",
            true,
            droppedItems
          );
          await listDirectories();
        }
      } else {
        await pasteItem("", false, droppedItems);
      }
      CopyFileName = "";
      CopyFilePath = "";
      ArrCopyItems = [];
      ArrSelectedItems = [];
      if (LastDraggedOverElement) {
        clearDragHighlight(LastDraggedOverElement);
        LastDraggedOverElement = null;
      }
      DraggedOverElement = null;
    } else if (DraggedOverElement != null) {
      let operation = await fileOperationContextMenu();
      if (operation == "copy") {
        await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "", false, droppedItems);
        await listDirectories();
      } else if (operation == "move") {
        await pasteItem(
          DraggedOverElement.getAttribute("itempath") ?? "",
          true,
          droppedItems
        );
        await listDirectories();
      }
      CopyFileName = "";
      CopyFilePath = "";
      ArrCopyItems = [];
      ArrSelectedItems = [];
      if (LastDraggedOverElement) {
        clearDragHighlight(LastDraggedOverElement);
        LastDraggedOverElement = null;
      }
      DraggedOverElement = null;
    }
  } catch (error) {
    writeLog(error);
    IsFileOpIntern = false;
    alert(error);
  }
  FileOperation = "";
  IsFileOpIntern = false;
  document.querySelectorAll(".site-nav-bar-button").forEach((item) => {
    item.style.opacity = "1";
  });
};

listen("tauri://file-drop", handleDragDrop);
listen("tauri://drag-drop", handleDragDrop);

/* Toasts */
function showToast(message, type = ToastType.INFO, timeout = 2000) {
  let toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let colorClass = "";

  switch (type) {
    case ToastType.INFO:
      colorClass = "toast-info";
      break;
    case ToastType.SUCCESS:
      colorClass = "toast-success";
      break;
    case ToastType.ERROR:
      colorClass = "toast-error";
      break;
  }

  if (typeof message === "string" && message.trim().startsWith("<")) {
    toast.innerHTML = message;
  } else {
    toast.innerHTML = `
      <div class="toast-content ${colorClass}">
        <p>${message}</p>
      </div>
    `;
  }

  $(".toast-container").append(toast);

  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.translate = "100px";
  }, timeout);

  setTimeout(() => {
    toast?.remove();
  }, timeout + 200);
}

async function getThumbnail(imagePath) {
  const { invoke } = TAURI.core;
  let thumbnailPath = await invoke("get_thumbnail", { imagePath });
  return thumbnailPath;
}

async function getSimpleDirInfo(path = "", classToFill = "", isDir = false, updateId = null) {
  const { invoke } = TAURI.core;
  setSizeCalculationLoading(classToFill);
  try {
    const simpleDirInfo = await invoke("get_simple_dir_info", { path, appWindow, classToFill, updateId, isDir });
    if (!shouldApplySizeCalculationUpdate(updateId)) return simpleDirInfo;
    $(classToFill).html(
      formatBytes(simpleDirInfo.size) +
        " - " +
        simpleDirInfo.count_elements +
        (isDir == true && simpleDirInfo.count_elements > 1
          ? " items"
          : " item"),
    );
    return simpleDirInfo;
  } catch (error) {
    if (!shouldApplySizeCalculationUpdate(updateId)) throw error;
    $(classToFill).html("Unable to calculate size");
    throw error;
  }
}

function shouldApplySizeCalculationUpdate(updateId) {
  if (
    typeof updateId === "string" &&
    updateId.startsWith("properties-") &&
    typeof isPropertiesSizeUpdateCurrent === "function"
  ) {
    return isPropertiesSizeUpdateCurrent(updateId);
  }

  return true;
}

function setSizeCalculationLoading(target, progressText = "") {
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) return;

  let loading = container.querySelector(".size-calc-loading");
  if (!loading) {
    loading = document.createElement("div");
    loading.className = "size-calc-loading";
    loading.style.display = "flex";
    loading.style.gap = "10px";
    loading.style.alignItems = "center";

    const spinner = document.createElement("div");
    spinner.className = "preloader-small-invert";

    const label = document.createElement("span");
    label.append("Calculating ...");

    const progress = document.createElement("span");
    progress.className = "size-calc-progress";
    label.append(progress);

    loading.append(spinner, label);
    container.replaceChildren(loading);
  }

  const progress = loading.querySelector(".size-calc-progress");
  if (progress) {
    progress.textContent = progressText ? ` ${progressText}` : "";
  }
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const SIZE_CALC_LIMIT_BYTES = 10_000_000_000;

function formatSizeWithLimit(bytes, decimals = 2) {
  return Number(bytes) > SIZE_CALC_LIMIT_BYTES ? "10GB+" : formatBytes(bytes, decimals);
}

async function writeLog(log) {
  const { invoke } = TAURI.core;
  await invoke("log", { log: JSON.stringify(log) });
  console.log(log);
}

function isImage(fileExt) {
  switch (fileExt.toLowerCase()) {
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".svg":
    case ".bmp":
    case ".ico":
    case ".icns":
    case ".avif":
    case ".webp":
    case ".jfif":
    case ".tiff":
    case ".bmp":
      return true;
    default:
      return false;
  }
}

async function stopSearching() {
  const { invoke } = TAURI.core;
  await invoke("stop_searching");
}

function createNewAction(actionId, actionName, actionDescription, path) {
  const newAction = new ActiveAction(
    actionName,
    actionDescription,
    actionId,
    path,
  );
  ArrActiveActions.push(newAction);
  renderActiveActionsPill();
  refreshActiveActionsPopup();
}

function removeAction(actionId) {
  ArrActiveActions = ArrActiveActions.filter(
    (action) => action.id !== actionId,
  );
  const row = document.querySelector(`.active-action-${actionId}`);
  if (row) {
    row.style.opacity = "0";
    setTimeout(() => row.remove(), 250);
  }
  renderActiveActionsPill();
  refreshActiveActionsPopup();
}

function renderActiveActionsPill() {
  const isDual = typeof IsDualPaneEnabled !== "undefined" && IsDualPaneEnabled;
  const activeContainer = isDual
    ? document.querySelector(".active-actions-header-placeholder")
    : document.querySelector(".active-actions-container");
  const inactiveContainer = isDual
    ? document.querySelector(".active-actions-container")
    : document.querySelector(".active-actions-header-placeholder");

  if (inactiveContainer) {
    inactiveContainer.innerHTML = "";
  }

  if (!activeContainer) return;

  if (ArrActiveActions.length === 0) {
    activeContainer.innerHTML = "";
    closeActiveActionsPopup();
    return;
  }
  let pill = activeContainer.querySelector(".active-actions-pill");
  if (!pill) {
    activeContainer.innerHTML = `
      <button class="active-actions-pill" type="button"
        onclick="toggleActiveActionsPopup(event)"
        aria-label="Show active actions">
        <span class="active-actions-pill__spinner"><div class="preloader-small-invert"></div></span>
        <span class="active-actions-pill__label">Actions</span>
        <span class="active-actions-pill__count">0</span>
      </button>
    `;
    pill = activeContainer.querySelector(".active-actions-pill");
  }
  pill.querySelector(".active-actions-pill__count").textContent = ArrActiveActions.length;
  pill.setAttribute("title", `${ArrActiveActions.length} active action${ArrActiveActions.length === 1 ? "" : "s"}`);
}

function toggleActiveActionsPopup(event) {
  event?.stopPropagation();
  if (document.querySelector(".active-actions-popup")) {
    closeActiveActionsPopup();
  } else {
    showActiveActionsPopup();
  }
}

function showActiveActionsPopup() {
  if (document.querySelector(".active-actions-popup")) return;
  if (ArrActiveActions.length === 0) return;

  const popup = document.createElement("div");
  popup.className = "active-actions-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "false");
  popup.setAttribute("aria-label", "Active actions");
  popup.innerHTML = `
    <header class="active-actions-popup__header">
      <span class="active-actions-popup__title">Active actions</span>
      <span class="active-actions-popup__count">${ArrActiveActions.length}</span>
    </header>
    <div class="active-actions-popup__list"></div>
  `;

  if (IsDualPaneEnabled) {
    const pill = document.querySelector(".active-actions-pill");
    if (pill) {
      const rect = pill.getBoundingClientRect();
      popup.style.top = `${rect.bottom + 8}px`;
      popup.style.left = `${rect.left}px`;
      popup.style.bottom = "auto";
    }
  }

  document.body.appendChild(popup);
  refreshActiveActionsPopup();
  requestAnimationFrame(() => popup.classList.add("is-open"));

  setTimeout(() => {
    document.addEventListener("pointerdown", handleActiveActionsOutsideClick);
  }, 0);
}

function closeActiveActionsPopup() {
  const popup = document.querySelector(".active-actions-popup");
  if (!popup) return;
  document.removeEventListener("pointerdown", handleActiveActionsOutsideClick);
  popup.classList.remove("is-open");
  popup.classList.add("is-closing");
  setTimeout(() => {
    popup.remove();
  }, 180);
}

function handleActiveActionsOutsideClick(event) {
  if (event.target.closest(".active-actions-popup") || event.target.closest(".active-actions-pill")) return;
  closeActiveActionsPopup();
}

function refreshActiveActionsPopup() {
  const list = document.querySelector(".active-actions-popup__list");
  if (!list) return;
  if (ArrActiveActions.length === 0) {
    closeActiveActionsPopup();
    return;
  }
  const count = document.querySelector(".active-actions-popup__count");
  if (count) count.textContent = ArrActiveActions.length;

  const existingChildrenCount = list.querySelectorAll(".active-action").length;
  if (existingChildrenCount !== ArrActiveActions.length) {
    list.innerHTML = ArrActiveActions.map((a) => a.getHTMLElement()).join("");
    return;
  }

  ArrActiveActions.forEach((a) => {
    const el = list.querySelector(`.active-action-${a.id}`);
    if (el) {
      const nameEl = el.querySelector(".active-action__name");
      const descEl = el.querySelector(".active-action__desc");
      const percentEl = el.querySelector(".active-action__percent");
      const fillEl = el.querySelector(".active-action__progress-fill");
      const countEl = el.querySelector(".active-action__count");
      const speedEl = el.querySelector(".active-action__speed");

      if (nameEl && nameEl.textContent !== a.name) nameEl.textContent = a.name;
      if (descEl && descEl.textContent !== (a.currentFile || a.description)) {
        descEl.textContent = a.currentFile || a.description;
      }
      if (percentEl) {
        const pctText = `${Math.round(a.progress)}%`;
        if (percentEl.textContent !== pctText) percentEl.textContent = pctText;
      }
      if (fillEl) {
        fillEl.style.width = `${a.progress}%`;
      }
      if (countEl && countEl.textContent !== a.countLabel) countEl.textContent = a.countLabel;
      if (speedEl && speedEl.textContent !== a.speedLabel) speedEl.textContent = a.speedLabel;
    } else {
      list.innerHTML = ArrActiveActions.map((item) => item.getHTMLElement()).join("");
    }
  });
}

function endsWith(text, divider = ".", ends = []) {
  let endedWithIt = false;
  if (!text) return;
  false;
  let textEnd = text.split(divider)[text.split(divider).length - 1];
  ends.forEach((end) => {
    if (textEnd == end) {
      endedWithIt = true;
      return true;
    }
  });
  return endedWithIt;
}

listen("updateItemMetadata", (event) => {
  updateItemMetadata(event.payload);
});

async function updateItemMetadata(data) {
  let path = data[0];
  let size = data[1];
  let itemSize = document.getElementById(`size-${path}`);

  itemSize.textContent = formatBytes(parseInt(size), 2);
}

function getIconForFile(item, itemsCount) {
  let fileIcon = "";
  if (item.is_dir == 1) {
    fileIcon = "resources/folder-icon.png";
    // Check for dir name to apply custom icons
    switch (item.name.toLowerCase()) {
      case "downloads":
        fileIcon = "resources/folder-downloads.png";
        break;
      case "desktop":
      case "schreibtisch":
        fileIcon = "resources/folder-desktop.png";
        break;
      case "dokumente":
      case "doks":
      case "documents":
      case "docs":
        fileIcon = "resources/folder-docs.png";
        break;
      case "musik":
      case "music":
      case "audio":
        fileIcon = "resources/folder-music.png";
        break;
      case "bilder":
      case "fotos":
      case "photos":
      case "pictures":
      case "images":
        fileIcon = "resources/folder-images.png";
        break;
      case "videos":
      case "video":
      case "movies":
      case "movie":
      case "films":
      case "filme":
        fileIcon = "resources/folder-videos.png";
        break;
      case "coding":
      case "programming":
      case "programmieren":
      case "code":
        fileIcon = "resources/folder-coding.png";
        break;
      case "werkzeuge":
      case "tools":
        fileIcon = "resources/folder-tools.png";
        break;
      case "public":
      case "öffentlich":
      case "shared":
      case "geteilt":
        fileIcon = "resources/folder-public.png";
        break;
      case "games":
      case "gaming":
      case "spiele":
        fileIcon = "resources/folder-games.png";
        break;
      case "developer":
      case "entwickler":
      case "entwicklung":
      case "development":
        fileIcon = "resources/folder-development.png";
        break;
      case "applications":
      case "programme":
        fileIcon = "resources/folder-applications.png";
        break;
      case "sdk":
      case "sdks":
        fileIcon = "resources/folder-sdk.png";
        break;
      default:
        fileIcon = "resources/folder-icon.png";
        break;
    }
  } else {
    switch (item.extension.toLowerCase()) {
      case ".rs":
        fileIcon = "resources/rust-file.png";
        break;
        case ".dart":
          fileIcon = "resources/dart-file.png";
          break;
      case ".js":
      case ".jsx":
        fileIcon = "resources/javascript-file.png";
        break;
      case ".css":
      case ".scss":
        fileIcon = "resources/css-file.png";
        break;
      case ".sql":
      case ".db":
        fileIcon = "resources/sql-file.png";
        break;
      case ".go":
        fileIcon = "resources/go-file.png";
        break;
      case ".md":
        fileIcon = "resources/markdown-file.png";
        break;
      case ".bin":
        fileIcon = "resources/bin-file.png";
        break;
      case ".json":
      case ".cs":
      case ".c":
      case ".xml":
      case ".htm":
      case ".html":
      case ".php":
      case ".py":
      case ".ts":
      case ".tsx":
        fileIcon = "resources/code-file.png";
        break;
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif":
      case ".webp":
      case ".svg":
      case ".ico":
      case ".bmp":
      case ".tiff":
      case ".tif":
      case ".jfif":
      case ".avif":
      case ".icns":
        if (IsImagePreview && !item.path.startsWith("ftp://")) {
          if (item.size < 50000000 && itemsCount < 1000) {
            // ~50 mb
            fileIcon = item.path;
          } else {
            fileIcon = "resources/img-file.png";
          }
        } else {
          fileIcon = "resources/img-file.png";
        }
        break;
      case ".pdf":
        fileIcon = "resources/pdf-file.png";
        break;
      case ".txt":
      case ".rtf":
        fileIcon = "resources/text-file.png";
        break;
      case ".docx":
      case ".doc":
        fileIcon = "resources/word-file.png";
        break;
      case ".zip":
      case ".rar":
      case ".tar":
      case ".zst":
      case ".7z":
      case ".gz":
      case ".xz":
      case ".bz2":
      case ".lz":
      case ".lz4":
      case ".lzma":
      case ".lzo":
      case ".z":
      case ".zstd":
      case ".br":
      case ".brotli":
      case ".density":
      case ".tgz":
      case ".tbz2":
      case ".txz":
        fileIcon = "resources/zip-file.png";
        break;
      case ".xlsx":
        fileIcon = "resources/spreadsheet-file.png";
        break;
      case ".appimage":
        fileIcon = "resources/appimage-file.png";
        break;
      case ".mp4":
      case ".mkv":
      case ".avi":
      case ".mov":
      case ".wmv":
      case ".flv":
      case ".webm":
        fileIcon = "resources/video-file.png";
        break;
      case ".mp3":
      case ".wav":
      case ".ogg":
      case ".opus":
        fileIcon = "resources/audio-file.png";
        break;
      case ".iso":
        fileIcon = "resources/iso-file.png";
        break;
      default:
        fileIcon = "resources/file-icon.png";
        break;
    }
  }
  return fileIcon;
}

let FileOpProgressActionId = null;
let lastFileOpProgressUpdate = 0;
window.IsProgressModalDismissed = false;

function getOrCreateFileOpAction(name = "File operation", description = "Preparing…") {
  if (FileOpProgressActionId === "CANCELLED") return null;
  if (FileOpProgressActionId) {
    const existing = ArrActiveActions.find((a) => a.id === FileOpProgressActionId);
    if (existing) return existing;
    return null; // The action was removed/cancelled. Ignore stray events.
  }
  let finalName = name;
  if (window.IsCompressingActive) {
    finalName = "Compressing Items";
    // Deduplicate: filter out non-progress spinner "Archive" items
    ArrActiveActions = ArrActiveActions.filter(
      (a) => a.isProgress || (a.name !== "Archive" && a.name !== "Compressing Items" && !a.description.includes("into "))
    );
  }
  FileOpProgressActionId = `fileop-${Date.now()}`;
  const action = new ActiveAction(finalName, description, FileOpProgressActionId, "", true);
  action.progress = 0;
  ArrActiveActions.push(action);
  renderActiveActionsPill();
  refreshActiveActionsPopup();
  return action;
}

function reopenProgressModal(actionId) {
  if (actionId && actionId.startsWith("diskanalyzer-")) {
    if (typeof reopenDiskAnalyzerModal === "function") {
      reopenDiskAnalyzerModal();
    }
    return;
  }
  window.IsProgressModalDismissed = false;
  showProgressbar();
  closeActiveActionsPopup();
}

async function cancelActionInline(event, id, name) {
  const { invoke } = TAURI.core;
  if (event) event.stopPropagation();
  let isCompress = window.IsCompressingActive || name.toLowerCase().includes("compress") || name.toLowerCase().includes("archiv");
  
  // Force stop both to guarantee backend process halts, since they cannot run concurrently anyway
  await invoke("stop_compression").catch((err) => { console.error("stop_compression failed:", err); });
  await invoke("stop_copy_paste").catch((err) => { console.error("stop_copy_paste failed:", err); });
  
  if (isCompress) {
    showToast("Compression cancelled.", ToastType.INFO);
  } else {
    showToast("Copy cancelled.", ToastType.INFO);
  }
  removeAction(id);
  FileOpProgressActionId = "CANCELLED";
  
  const modal = document.querySelector(".file-progress-modal");
  if (modal) {
    modal.classList.add("popup-exit");
    safeAnimationEnd(modal, () => {
      modal.remove();
      IsPopUpOpen = false;
    });
  }
}

function showProgressbar() {
  const action = getOrCreateFileOpAction();
  if (!action) return;

  if (window.IsProgressModalDismissed) {
    return;
  }

  // Create detailed progress modal
  let modal = document.querySelector(".file-progress-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "file-progress-modal props-card";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "File progress");

    let actionTitle = "Copying Items";
    if (action.name.toLowerCase().includes("compress") || action.name.toLowerCase().includes("archiv")) {
      actionTitle = "Compressing Items";
    } else if (typeof IsCopyToCut !== "undefined" && IsCopyToCut === true) {
      actionTitle = "Moving Items";
    }

    const progress = action.progress ?? 0;
    const currentFile = action.currentFile || "Preparing...";
    const countLabel = action.countLabel || "0 / 0";
    const speedLabel = action.speedLabel || "0 MB/s";
    const chipText = countLabel ? countLabel.split(" · ")[0] : "0 / 0";

    modal.innerHTML = `
      <section class="props-card__hero file-progress-modal__hero">
        <div class="props-card__thumb file-progress-modal__thumb">
          <div class="preloader-small-invert"></div>
        </div>
        <div class="props-card__heading">
          <h2 class="props-card__name progress-modal-title">${actionTitle}...</h2>
          <div class="props-card__meta">
            <span class="progress-modal-meta-speed">${speedLabel}</span>
            <span class="props-card__chip progress-modal-meta-count">${chipText}</span>
          </div>
        </div>
      </section>

      <dl class="props-card__list">
        <div class="props-card__row props-card__row--block">
          <dt class="props-card__label"><i class="fa-regular fa-file"></i>Current File</dt>
          <dd class="props-card__value progress-modal-current-file" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${currentFile}">
            ${currentFile}
          </dd>
        </div>
        <div class="props-card__row props-card__row--block" style="gap: 12px; padding-top: 12px; padding-bottom: 12px;">
          <div style="width: 100%; background: rgba(255, 255, 255, 0.08); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.05); position: relative;">
            <div class="progress-modal-fill" style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--selectColor2), #4da3ff); box-shadow: 0 0 12px rgba(77, 163, 255, 0.6); transition: width 0.1s ease-out; border-radius: 4px;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--textColor2); margin-top: -4px;">
            <span class="progress-modal-percent-text">${Math.round(progress)}% completed</span>
            <span class="progress-modal-count-text">${countLabel} items</span>
          </div>
        </div>
      </dl>

      <footer class="props-card__footer">
        <button class="props-card__btn" data-progress-background>
          <i class="fa-solid fa-angles-down"></i><span>Run in Background</span>
        </button>
        <button class="props-card__btn props-card__btn--primary" id="btn-progress-stop" style="background: rgba(220, 53, 69, 0.25); border-color: rgba(220, 53, 69, 0.4); box-shadow: 0 4px 10px rgba(220, 53, 69, 0.15); cursor: pointer;">
          <i class="fa-solid fa-stop" style="color: #ff6b6b;"></i><span>Stop</span>
        </button>
      </footer>
    `;
    document.body.appendChild(modal);
    modal.classList.add("popup-enter");
    IsPopUpOpen = true;

    modal.querySelector("[data-progress-background]").onclick = () => {
      window.IsProgressModalDismissed = true;
      modal.classList.add("popup-exit");
      safeAnimationEnd(modal, () => {
        modal.remove();
        IsPopUpOpen = false;
      });
    };

    const stopBtn = modal.querySelector("#btn-progress-stop");
    if (stopBtn) {
      stopBtn.onclick = async () => {
        const { invoke } = TAURI.core;
        const action = getOrCreateFileOpAction();
        if (!action) return;
        let isCompress = window.IsCompressingActive || action.name.toLowerCase().includes("compress") || action.name.toLowerCase().includes("archiv");
        
        await invoke("stop_compression").catch((err) => { console.error("stop_compression failed:", err); });
        await invoke("stop_copy_paste").catch((err) => { console.error("stop_copy_paste failed:", err); });
        
        if (isCompress) {
          showToast("Compression cancelled.", ToastType.INFO);
        } else {
          showToast("Copy cancelled.", ToastType.INFO);
        }
        removeAction(action.id);
        FileOpProgressActionId = "CANCELLED";
        modal.classList.add("popup-exit");
        safeAnimationEnd(modal, () => {
          modal.remove();
          IsPopUpOpen = false;
        });
      };
    }
  }
}

function updateProgressBar(totalPercentage, elementsPercentage, countElements, currentElementNumber, currentFile, currentSpeed) {
  const action = getOrCreateFileOpAction();
  if (!action) return;
  if (window.IsCompressingActive) {
    action.name = "Compressing Items";
  }
  action.progress = totalPercentage;
  action.currentFile = currentFile;
  action.countLabel = countElements > 1
    ? `${currentElementNumber} / ${countElements} · ${elementsPercentage.toFixed(0)}%`
    : `${currentElementNumber} / ${countElements}`;
  action.speedLabel = `${currentSpeed.toFixed(2)} MB/s`;

  const now = Date.now();
  // Throttle DOM updates to at most once every 80ms to prevent UI stutter/overload, but update instantly on completion
  if (now - lastFileOpProgressUpdate >= 80 || totalPercentage >= 100) {
    lastFileOpProgressUpdate = now;
    const row = document.querySelector(`.active-action-${action.id}`);
    if (row) {
      const fill = row.querySelector(".active-action__progress-fill");
      if (fill) fill.style.width = `${totalPercentage}%`;
      const pct = row.querySelector(".active-action__percent");
      if (pct) pct.textContent = `${Math.round(totalPercentage)}%`;
      const file = row.querySelector(".active-action__current-file");
      if (file) file.textContent = currentFile;
      const count = row.querySelector(".active-action__count");
      if (count) count.textContent = action.countLabel;
      const speed = row.querySelector(".active-action__speed");
      if (speed) speed.textContent = action.speedLabel;
    } else {
      refreshActiveActionsPopup();
    }

    // Update detailed progress modal if visible
    const modal = document.querySelector(".file-progress-modal");
    if (modal) {
      let actionTitle = "Copying Items";
      if (action.name.toLowerCase().includes("compress") || action.name.toLowerCase().includes("archiv")) {
        actionTitle = "Compressing Items";
      } else if (typeof IsCopyToCut !== "undefined" && IsCopyToCut === true) {
        actionTitle = "Moving Items";
      }
      modal.querySelector(".progress-modal-title").textContent = `${actionTitle}...`;

      const currentFileEl = modal.querySelector(".progress-modal-current-file");
      if (currentFileEl) {
        currentFileEl.textContent = currentFile || "Preparing...";
        currentFileEl.setAttribute("title", currentFile || "");
      }

      const fillEl = modal.querySelector(".progress-modal-fill");
      if (fillEl) fillEl.style.width = `${totalPercentage}%`;

      const percentEl = modal.querySelector(".progress-modal-percent-text");
      if (percentEl) percentEl.textContent = `${Math.round(totalPercentage)}% completed`;

      const countEl = modal.querySelector(".progress-modal-count-text");
      const countPillEl = modal.querySelector(".progress-modal-meta-count");
      const countText = countElements > 1
        ? `${currentElementNumber} / ${countElements} · ${elementsPercentage.toFixed(0)}%`
        : `${currentElementNumber} / ${countElements}`;
      const pillText = `${currentElementNumber} / ${countElements}`;
      if (countEl) countEl.textContent = `${countText} items`;
      if (countPillEl) countPillEl.textContent = pillText;

      const speedEl = modal.querySelector(".progress-modal-meta-speed");
      if (speedEl) speedEl.textContent = `${currentSpeed.toFixed(2)} MB/s`;
    }
  }
}

function finishProgressBar(time = 0) {
  window.IsProgressModalDismissed = false;
  const id = FileOpProgressActionId;
  if (!id) return;
  const action = ArrActiveActions.find((a) => a.id === id);
  if (action) {
    action.progress = 100;
    action.speedLabel = time ? `done in ${time.toFixed(2)}s` : "done";
  }
  const row = document.querySelector(`.active-action-${id}`);
  if (row) {
    const fill = row.querySelector(".active-action__progress-fill");
    if (fill) fill.style.width = `100%`;
    const pct = row.querySelector(".active-action__percent");
    if (pct) pct.innerHTML = `<i class="fas fa-check" style="color: var(--successColor, #4ade80);"></i>`;
    const speed = row.querySelector(".active-action__speed");
    if (speed && action) speed.textContent = action.speedLabel;
  }

  // Finalize and close the detailed progress modal if visible
  const modal = document.querySelector(".file-progress-modal");
  if (modal) {
    modal.querySelector(".progress-modal-title").textContent = "Completed Successfully!";

    const thumbEl = modal.querySelector(".file-progress-modal__thumb");
    if (thumbEl) {
      thumbEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--successColor, #4ade80);"></i>`;
    }

    const fillEl = modal.querySelector(".progress-modal-fill");
    if (fillEl) {
      fillEl.style.width = "100%";
      fillEl.style.background = "var(--successColor, #4ade80)";
      fillEl.style.boxShadow = "0 0 12px rgba(74, 222, 128, 0.6)";
    }

    const percentEl = modal.querySelector(".progress-modal-percent-text");
    if (percentEl) percentEl.textContent = "100% completed";

    const speedEl = modal.querySelector(".progress-modal-meta-speed");
    if (speedEl) speedEl.textContent = time ? `Done in ${time.toFixed(2)}s` : "Done";

    const currentFileEl = modal.querySelector(".progress-modal-current-file");
    if (currentFileEl) currentFileEl.textContent = "All operations completed.";

    setTimeout(() => {
      modal.classList.add("popup-exit");
      safeAnimationEnd(modal, () => {
        modal.remove();
        if (IsPopUpOpen) IsPopUpOpen = false;
      });
    }, 1200);
  }

  setTimeout(() => {
    if (FileOpProgressActionId === id) FileOpProgressActionId = null;
    removeAction(id);
  }, 1500);
}

async function tryLoadCachedImage(imageId, imageType, imageUrl) {
  let data = await getCachedImage(imageUrl);

  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader && data) {
    element.style.display = "block";
    if (data === imageUrl) {
      element.src = convertFileSrc(data);
    } else {
      let ext = imageType.toLowerCase();
      let type = ext === "icns" ? "png" : (ext === "jpg" ? "jpeg" : (ext === "tif" ? "tiff" : ext));
      element.src = `data:image/${type};base64,${data}`;
    }
    loader.style.display = "none";
  }
}

async function setItemImage(base64, imageId, imageUrl) {
  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader && base64) {
    element.style.display = "block";
    let ext = imageUrl.split(".").pop().toLowerCase();
    let type = ext === "icns" ? "png" : (ext === "jpg" ? "jpeg" : (ext === "tif" ? "tiff" : ext));
    element.src = `data:image/${type};base64,${base64}`;
    loader.style.display = "none";
  }

  await cacheImage(imageUrl, base64);
}

function renderMarkdown(md) {
  if (!md) return "";

  // 1. Escape basic HTML tags to prevent XSS
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = html.split("\n");
  let inCodeBlock = false;
  let codeContent = [];
  let codeLanguage = "";

  let processedBlocks = [];
  let currentParagraph = [];
  let currentList = [];
  let currentListType = null; // 'ul' or 'ol'
  let currentQuote = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      let pText = currentParagraph.join(" ").trim();
      if (pText) {
        pText = applyInlineFormatting(pText);
        processedBlocks.push(`<p style="margin: 0 0 10px 0; line-height: 1.5; color: var(--textColor2); font-size: calc(var(--fontSize) * 0.95);">${pText}</p>`);
      }
      currentParagraph = [];
    }
  }

  function flushList() {
    if (currentList.length > 0) {
      const listStyle = currentListType === "ol"
        ? "margin: 8px 0; padding: 0 0 0 20px; list-style-type: decimal;"
        : "margin: 8px 0; padding: 0 0 0 20px; list-style-type: disc;";

      const itemsHtml = currentList.map(item => {
        return `<li style="margin-bottom: 4px; color: var(--textColor2); line-height: 1.4; font-size: calc(var(--fontSize) * 0.95);">${applyInlineFormatting(item)}</li>`;
      }).join("");

      processedBlocks.push(`<${currentListType} style="${listStyle}">${itemsHtml}</${currentListType}>`);
      currentList = [];
      currentListType = null;
    }
  }

  function flushQuote() {
    if (currentQuote.length > 0) {
      const firstLine = currentQuote[0].trim();
      const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i);

      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase();
        const contentLines = currentQuote.slice(1);
        const contentHtml = contentLines.map(line => applyInlineFormatting(line)).join("<br />");

        let icon = "fa-info-circle";
        let color = "#4ba3ff"; // Blue for NOTE
        let title = "Note";
        let bg = "rgba(75, 163, 255, 0.08)";

        if (alertType === "TIP") {
          icon = "fa-lightbulb";
          color = "#4cd964"; // Green for TIP
          title = "Tip";
          bg = "rgba(76, 217, 100, 0.08)";
        } else if (alertType === "IMPORTANT") {
          icon = "fa-circle-exclamation";
          color = "#ad8bff"; // Purple for IMPORTANT
          title = "Important";
          bg = "rgba(173, 139, 255, 0.08)";
        } else if (alertType === "WARNING") {
          icon = "fa-triangle-exclamation";
          color = "#ff9500"; // Orange for WARNING
          title = "Warning";
          bg = "rgba(255, 149, 0, 0.08)";
        } else if (alertType === "CAUTION") {
          icon = "fa-circle-exclamation";
          color = "#ff3b30"; // Red for CAUTION
          title = "Caution";
          bg = "rgba(255, 59, 48, 0.08)";
        }

        processedBlocks.push(`
          <div class="alert-block alert-${alertType.toLowerCase()}" style="border-left: 4px solid ${color}; padding: 10px 14px; margin: 12px 0; background: ${bg}; border-radius: 6px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255, 255, 255, 0.03); border-right: 1px solid rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <div style="display: flex; align-items: center; gap: 8px; color: ${color}; font-weight: 700; font-size: calc(var(--fontSize) * 0.9); text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid ${icon}"></i>
              <span>${title}</span>
            </div>
            <div style="color: var(--textColor3); line-height: 1.45; font-size: calc(var(--fontSize) * 0.95); font-style: normal;">
              ${contentHtml}
            </div>
          </div>
        `);
      } else {
        const contentHtml = currentQuote.map(line => applyInlineFormatting(line)).join("<br />");
        processedBlocks.push(`<blockquote style="border-left: 3px solid var(--selectColor2); padding: 6px 14px; margin: 12px 0; background: rgba(255, 255, 255, 0.02); color: var(--textColor2); font-style: italic; line-height: 1.45; font-size: calc(var(--fontSize) * 0.95);">${contentHtml}</blockquote>`);
      }
      currentQuote = [];
    }
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushQuote();
  }

  function applyInlineFormatting(text) {
    return text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Inline code
      .replace(/`([^`\n]+)`/g, '<code style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.05); padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 90%; color: var(--selectColor2);">$1</code>')
      // Links (use invoke('open_item', { path: url }) to launch natively)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        const cleanUrl = url.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        return `<a href="#" onclick="event.preventDefault(); invoke('open_item', { path: '${cleanUrl}' });" style="color: #4ba3ff; text-decoration: underline; cursor: pointer; font-weight: 500;">${linkText}</a>`;
      });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle Code Blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const code = codeContent.join("\n");
        processedBlocks.push(`<pre style="background: rgba(0, 0, 0, 0.25); padding: 10px; border-radius: 6px; border: 1px solid var(--tertiaryColor); font-family: monospace; font-size: calc(var(--fontSize) * 0.85); overflow-x: auto; margin: 10px 0; line-height: 1.4; white-space: pre;"><code style="background: none; padding: 0; color: var(--textColor);">${code}</code></pre>`);
        codeContent = [];
        codeLanguage = "";
      } else {
        flushAll();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushAll();
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushAll();
      processedBlocks.push('<hr style="border: 0; border-top: 1px solid var(--tertiaryColor); margin: 16px 0; opacity: 0.3;" />');
      continue;
    }

    // Headers
    if (trimmed.startsWith("#")) {
      flushAll();

      const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = applyInlineFormatting(headerMatch[2]);
        let size = "1.1em";
        let weight = "600";
        let border = "";
        let margin = "12px 0 6px 0";

        if (level === 1) { size = "1.4em"; weight = "700"; border = "border-bottom: 1px solid var(--tertiaryColor); padding-bottom: 6px;"; margin = "20px 0 10px 0"; }
        else if (level === 2) { size = "1.25em"; border = "border-bottom: 1px solid var(--tertiaryColor); padding-bottom: 4px;"; margin = "18px 0 8px 0"; }
        else if (level === 3) { size = "1.15em"; margin = "16px 0 8px 0"; }

        processedBlocks.push(`<h${level} style="margin: ${margin}; font-weight: ${weight}; font-size: ${size}; color: var(--textColor); ${border}">${text}</h${level}>`);
        continue;
      }
    }

    // Blockquotes
    if (trimmed.startsWith("&gt;") || trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      const quoteText = trimmed.replace(/^(&gt;|>)\s?/, "");
      currentQuote.push(quoteText);
      continue;
    }

    // Unordered List Items
    const ulMatch = trimmed.match(/^([-\*+])\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      flushQuote();
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
      }
      currentList.push(ulMatch[2]);
      continue;
    }

    // Ordered List Items
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      flushQuote();
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
      }
      currentList.push(olMatch[2]);
      continue;
    }

    // Default: regular text lines for paragraph
    flushList();
    flushQuote();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return processedBlocks.join("\n");
}
