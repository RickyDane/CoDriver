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
function showToast(message, type = "info") {
  let toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let colorClass = "";

  switch (type) {
    case "info":
      colorClass = "toast-info";
      break;
    case "success":
      colorClass = "toast-success";
      break;
    case "error":
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
  }, 2000);

  setTimeout(() => {
    toast?.remove();
  }, 2200);
}

async function getThumbnail(imagePath) {
  let thumbnailPath = await invoke("get_thumbnail", { imagePath });
  return thumbnailPath;
}

async function dirSize(path = "", classToFill = "") {
  $(classToFill).html(
    `<div style="display: flex; gap: 10px;"><div class="preloader-small-invert"></div> Loading ...</div>`,
  );
  await invoke("get_dir_size", { path, appWindow, classToFill }).then(
    (bytes) => {
      $(classToFill).html(formatBytes(bytes));
    },
  );
}
