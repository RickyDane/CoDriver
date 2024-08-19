const { listen } = window.__TAURI__.event;

/* Drag and drop files into file explorer */
// TODO: Make it simpler and not so shitty
listen("tauri://file-drop", async (event) => {
  try {
    ArrSelectedItems = [];
    ArrCopyItems = [];
    event.payload.forEach((item) => {
      CopyFilePath = item;
      CopyFileName = CopyFilePath.split("/")[CopyFilePath.split("/").length - 1].replace("'", "");
      let element = document.createElement("button");
      element.setAttribute("itemname", CopyFileName);
      element.setAttribute("itempath", CopyFilePath);
      ArrCopyItems.push(element);
    });
    if (IsFileOpIntern == false) {
      console.log("Extern file drop");
      if (DraggedOverElement != null) {
        let operation = await fileOperationContextMenu();
        if (operation == "copy") {
          await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
          await listDirectories();
        } else if (operation == "move") {
          IsCopyToCut = true;
          await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
          IsCopyToCut = false;
          await listDirectories();
        }
      }
      else {
        await pasteItem();
      }
      CopyFileName = "";
      CopyFilePath = "";
      ArrCopyItems = [];
      ArrSelectedItems = [];
    } else if (DraggedOverElement != null) {
      console.log("Intern file operation");
      let operation = await fileOperationContextMenu();
      if (operation == "copy") {
        await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
        await listDirectories();
      } else if (operation == "move") {
        IsCopyToCut = true;
        await pasteItem(DraggedOverElement.getAttribute("itempath") ?? "");
        IsCopyToCut = false;
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
    await invoke("log", { log: JSON.stringify(error) });
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

async function getSimpleDirInfo(path = "", classToFill = "") {
  $(classToFill).html(
    `<div style="display: flex; gap: 10px;">
      <div class="preloader-small-invert"></div>
      Loading ...
    </div>`,
  );
  await invoke("get_simple_dir_info", { path, appWindow, classToFill }).then(
    (simpleDirInfo) => {
      $(classToFill).html(formatBytes(simpleDirInfo.size));
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