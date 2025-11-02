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
  resetProgressBar();
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

async function getSimpleDirInfo(path = "", classToFill = "", isDir = false) {
  $(classToFill).html(
    `<div style="display: flex; gap: 10px;">
      <div class="preloader-small-invert"></div>
      Loading ...
    </div>`,
  );
  await invoke("get_simple_dir_info", { path, appWindow, classToFill }).then(
    (simpleDirInfo) => {
      $(classToFill).html(
        formatBytes(simpleDirInfo.size) +
          " - " +
          simpleDirInfo.count_elements +
          (isDir == true && simpleDirInfo.count_elements > 1
            ? " items"
            : " item"),
      );
      return simpleDirInfo;
    },
  );
  return null;
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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
  let newAction = new ActiveAction(
    actionName,
    actionDescription,
    actionId,
    path,
  );
  ArrActiveActions.push(newAction);
  $(".active-actions-container").append(newAction.getHTMLElement());
}

function removeAction(actionId) {
  ArrActiveActions = ArrActiveActions.filter(
    (action) => action.id !== actionId,
  );
  $(`.active-action-${actionId}`).css("opacity", "0");
  setTimeout(() => {
    $(`.active-action-${actionId}`).remove();
  }, 300);
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

function showProgressbar() {
  let progressBarContainer = document.querySelector(".progress-bar-container-popup");
  progressBarContainer.style.display = "block";
  progressBarContainer.style.scale = "1";
  progressBarContainer.style.opacity = "1";
  progressBarContainer.style.height = "fit-content";
}

function updateProgressBar(totalPercentage, elementsPercentage, countElements, currentElementNumber, currentFile, currentSpeed) {
  if (countElements == 1) {
    document.querySelector('.progress-bar-main-percentage').innerHTML = `${totalPercentage.toFixed(0)}%`;
  } else {
    document.querySelector('.progress-bar-main-percentage').innerHTML = `
      <span>${elementsPercentage.toFixed(0)}%</span>
      <span style="font-size: x-small">${totalPercentage.toFixed(0)}%</span>
    `;
  }
  document.querySelector('.progress-bar-detail-info').innerText = `${currentElementNumber} of ${countElements} - ${currentSpeed.toFixed(0)} MB/s`;
  document.querySelector('.progress-bar-current-file-text').innerText = `${currentFile}`;
  if (currentFile.split('.').length > 1) {
    document.querySelector('.progress-bar-current-file-ext').innerText = `(.${currentFile.split('.')[currentFile.split('.').length - 1]})`;
  } else {
    document.querySelector('.progress-bar-current-file-ext').innerText = ``;
  }
  document.querySelector('.progress-bar-main-progress-fill').style.width = `${totalPercentage}%`;
}

function finishProgressBar(time = 0) {
  console.log(time);
  document.querySelector('.progress-bar-detail-info').innerText += ` - in ${time.toFixed(2)} seconds`;
  document.querySelector('.progress-bar-main-percentage').innerHTML = `<i class="fas fa-check" style="color: green; width: 24px; height: 24px;"></i>`;
  let progressBarContainer = document.querySelector(".progress-bar-container-popup");
  setTimeout(() => {
    progressBarContainer.style.scale = "0";
    progressBarContainer.style.opacity = "0";
    progressBarContainer.style.height= "0";
  }, 3000);
}
