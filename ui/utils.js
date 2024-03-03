const { listen } = window.__TAURI__.event;

/* Drag and drop files into file explorer */
listen('tauri://file-drop', async event => {
  if (IsFileOpIntern == false) {
      ArrSelectedItems = [];
      ArrCopyItems = [];
      event.payload.forEach(async item => {
      CopyFilePath = item;
      CopyFileName = CopyFilePath.split("/")[CopyFilePath.split("/").length - 1].replace("'", "");
      let element = document.createElement("button");
      element.setAttribute("itemname", CopyFileName);
      element.setAttribute("itempath", CopyFilePath);
      ArrCopyItems.push(element);
    });
    await pasteItem();
    CopyFileName = "";
    CopyFilePath = "";
    ArrCopyItems = [];
    ArrSelectedItems = [];
  }
  else if (DraggedOverElement != null) {
    ArrSelectedItems = [];
    ArrCopyItems = [];
    event.payload.forEach(async item => {
      ArrCopyItems.push(item);
    });
    let operation = await fileOperationContextMenu();
    if (operation == "copy") {
      await invoke("arr_copy_paste", { appWindow, arrItems: ArrCopyItems, isForDualPane: "0", copyToPath: DraggedOverElement.getAttribute("itempath") });
      showToast("File Operation", "Files copied successfully", "success");
      await listDirectories();
    }
    else if (operation == "move") {
      await invoke("arr_copy_paste", { appWindow, arrItems: ArrCopyItems, isForDualPane: "0", copyToPath: DraggedOverElement.getAttribute("itempath") });
      await invoke("arr_delete_items", { appWindow, arrItems: ArrCopyItems });
      await listDirectories();
      showToast("File Operation", "Files moved successfully", "success");
    }
    CopyFileName = "";
    CopyFilePath = "";
    ArrCopyItems = [];
    ArrSelectedItems = [];
  }
  resetProgressBar();
  document.querySelectorAll(".site-nav-bar-button").forEach(item => { item.style.opacity = "1"; });
  DraggedOverElement.style.opacity = "1";
  DraggedOverElement = null;
});

/* Toasts */
function showToast(title, message, type = "info") {
  let toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let iconClass = "fa-solid fa-info-circle";

  if (type == "success") {
      iconClass = "fa-solid fa-circle-check";
  }
  else if (type == "error") {
      iconClass = "fa-solid fa-triangle-exclamation";
  }

  toast.innerHTML = `
      <div class="toast-icon toast-icon-${type}">
          <i class="fa-regular ${iconClass}"></i>
      </div>
      <div class="toast-content">
          <h5>
              <span>${title}</span>
          </h5>
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
