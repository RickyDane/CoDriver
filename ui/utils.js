const { listen } = window.__TAURI__.event;

// Initialize here to be accessable from anywhere
let ArrSelectedItems = [];
let ArrCopyItems = [];
let Applications = [];

/* Drag and drop files into file explorer */
// TODO: Make it simpler and not so shitty
listen("tauri://file-drop", async (event) => {
  try {
    ArrSelectedItems = [];
    ArrCopyItems = [];
    event.payload.forEach((item) => {
      CopyFilePath = item;
      CopyFileName = CopyFilePath.split("/")[
        CopyFilePath.split("/").length - 1
      ].replace("'", "");
      let element = document.createElement("button");
      element.setAttribute("itemname", CopyFileName);
      element.setAttribute("itempath", CopyFilePath);
      ArrCopyItems.push(element);
    });
    if (IsFileOpIntern == false) {
      if (DraggedOverElement != null) {
        let operation = await fileOperationContextMenu();
        if (operation == "copy") {
          await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
          await listDirectories();
        } else if (operation == "move") {
          await pasteItem(
            DraggedOverElement.getAttribute("itempath") ?? "",
            true,
          );
          await listDirectories();
        }
      } else {
        await pasteItem();
      }
      CopyFileName = "";
      CopyFilePath = "";
      ArrCopyItems = [];
      ArrSelectedItems = [];
    } else if (DraggedOverElement != null) {
      let operation = await fileOperationContextMenu();
      if (operation == "copy") {
        await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
        await listDirectories();
      } else if (operation == "move") {
        await pasteItem(
          DraggedOverElement.getAttribute("itempath") ?? "",
          true,
        );
        await listDirectories();
      }
      CopyFileName = "";
      CopyFilePath = "";
      ArrCopyItems = [];
      ArrSelectedItems = [];
      DraggedOverElement.style.opacity = "1";
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
});

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

  toast.innerHTML = `
    <div class="toast-content ${colorClass}">
      <p>${message}</p>
    </div>
  `;

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
  let thumbnailPath = await invoke("get_thumbnail", { imagePath });
  return thumbnailPath;
}

async function getSimpleDirInfo(path = "", classToFill = "", isDir = false, updateId = null) {
  setSizeCalculationLoading(classToFill);
  try {
    const simpleDirInfo = await invoke("get_simple_dir_info", { path, appWindow, classToFill, updateId });
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
  const container = document.querySelector(".active-actions-container");
  if (!container) return;
  if (ArrActiveActions.length === 0) {
    container.innerHTML = "";
    closeActiveActionsPopup();
    return;
  }
  let pill = container.querySelector(".active-actions-pill");
  if (!pill) {
    container.innerHTML = `
      <button class="active-actions-pill" type="button"
        onclick="toggleActiveActionsPopup(event)"
        aria-label="Show active actions">
        <span class="active-actions-pill__spinner"><div class="preloader-small-invert"></div></span>
        <span class="active-actions-pill__label">Actions</span>
        <span class="active-actions-pill__count">0</span>
      </button>
    `;
    pill = container.querySelector(".active-actions-pill");
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
  list.innerHTML = ArrActiveActions.map((a) => a.getHTMLElement()).join("");
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
        if (IsImagePreview) {
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
      case ".density":
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

function getOrCreateFileOpAction(name = "File operation", description = "Preparing…") {
  if (FileOpProgressActionId) {
    const existing = ArrActiveActions.find((a) => a.id === FileOpProgressActionId);
    if (existing) return existing;
  }
  FileOpProgressActionId = `fileop-${Date.now()}`;
  const action = new ActiveAction(name, description, FileOpProgressActionId, "", true);
  action.progress = 0;
  ArrActiveActions.push(action);
  renderActiveActionsPill();
  refreshActiveActionsPopup();
  return action;
}

function showProgressbar() {
  getOrCreateFileOpAction();
}

function updateProgressBar(totalPercentage, elementsPercentage, countElements, currentElementNumber, currentFile, currentSpeed) {
  const action = getOrCreateFileOpAction();
  action.progress = totalPercentage;
  action.currentFile = currentFile;
  action.countLabel = countElements > 1
    ? `${currentElementNumber} / ${countElements} · ${elementsPercentage.toFixed(0)}%`
    : `${currentElementNumber} / ${countElements}`;
  action.speedLabel = `${currentSpeed.toFixed(0)} MB/s`;

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
  }
}

function finishProgressBar(time = 0) {
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
  setTimeout(() => {
    if (FileOpProgressActionId === id) FileOpProgressActionId = null;
    removeAction(id);
  }, 1500);
}

function tryLoadCachedImage(imageId, imageType, imageUrl) {
  let data = readFromLocalStorage(imageUrl);

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

function setItemImage(base64, imageId, imageUrl) {
  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader && base64) {
    element.style.display = "block";
    let ext = imageUrl.split(".").pop().toLowerCase();
    let type = ext === "icns" ? "png" : (ext === "jpg" ? "jpeg" : (ext === "tif" ? "tiff" : ext));
    element.src = `data:image/${type};base64,${base64}`;
    loader.style.display = "none";
  }

  writeToLocalStorage(imageUrl, base64);
}
