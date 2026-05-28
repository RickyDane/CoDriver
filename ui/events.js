listen("set-filesearch-count", (event) => {
  let count = event.payload;

  let container = document.querySelector(".searching-info-container");
  let element = document.querySelector(".file-searching-file-count");

  container.style.display = "block";
  element.style.display = "block";

  element.innerHTML = `${count} items found`;
});

listen("hide-filesearch-count", (event) => {
  let time = event.payload;

  $(".is-file-searching").hide();
  $(".file-searching-done").html(`Searching done in: ${time.toFixed(2)} sec.!`);

  setTimeout(() => $(".file-searching-done").html(""), 1500);
  setTimeout(() => $(".searching-info-container").css("display", "none"), 1500);

  stopFullSearch();
});

listen("set-filesearch-currentfile", (event) => {
  if (IsFullSearching) {
    let name = event.payload;
    $(".fullsearch-current-file").html(`${name}`);
  }
});

listen("set-item-image", async (event) => {
  let payload = JSON.parse(event.payload);

  let base64 = payload.data;
  let imageId = payload.id;
  let imageUrl = payload.url;

  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader && base64) {
    element.style.display = "block";
    let ext = payload.url.split(".").pop().toLowerCase();
    let type = ext === "icns" ? "png" : (ext === "jpg" ? "jpeg" : (ext === "tif" ? "tiff" : ext));
    element.src = `data:image/${type};base64,${base64}`;
    loader.style.display = "none";
  }

  await writeToLocalStorage(imageUrl, base64);
});

listen("set_default_image", async (event) => {
  let payload = event.payload;
  let imageId = payload[0];
  let image = payload[1];

  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader) {
    element.style.display = "block";
    element.src = convertFileSrc(image);
    loader.style.display = "none";
  }

  await writeToLocalStorage(image, image);
});

listen("try_load_cached_image", async (event) => {
  let imageId = event.payload[0];
  let imageType = event.payload[1];
  let imageUrl = event.payload[2];
  tryLoadCachedImage(imageId, imageType, imageUrl);
});

listen("addSingleItem", async (item) => {
  item = JSON.parse(item.payload);
  // We need to wait here, otherwise the function won't be triggered
  setTimeout(async () => {
    if (IsDualPaneEnabled == true) {
      await addSingleItem(item, SelectedItemPaneSide);
    } else {
      await addSingleItem(item);
    }
  }, 5);
});

listen("fs-mount-changed", (event) => {
  setTimeout(async () => {
    if (Platform == "darwin" && event.payload.paths[0].includes("/private/tmp/codriver-sshfs-mount")) {
      event.payload.paths[0] = event.payload.paths[0].replace("/private/tmp/codriver-sshfs-mount", "/tmp/codriver-sshfs-mount");
    }
    console.log(event.payload);
    if (event.payload.type == "create") {
      await addNewMount(event.payload);
    } else {
      await removeMount(event.payload);
    }
  }, 100);
});

listen("watcher-event", (event) => {
  setTimeout(async () => {
    const payload = event.payload;
    const paths = payload.paths;
    if (!paths || paths.length === 0) return;
    
    const path = paths[0];
    
    if (payload.type === "create") {
      console.log("FS-Event: File was created dynamically:", path);
      await handleDynamicCreate(path);
      window.scheduleDiskUsageRefresh?.();
    } else if (payload.type === "remove") {
      console.log("FS-Event: File was removed dynamically:", path);
      if (window.IsDeletingItems) {
        console.log("FS-Event: File was removed (refresh suppressed — active delete)");
      } else {
        handleDynamicRemove(path);
      }
      window.scheduleDiskUsageRefresh?.();
    } else if (payload.type === "modify") {
      if (payload.kind === "rename") {
        console.log("FS-Event: File was renamed dynamically:", paths, "mode:", payload.mode);
        const mode = payload.mode;
        
        if (mode === "both" || (mode === "any" && paths.length === 2)) {
          const oldPath = paths[0];
          const newPath = paths[1];
          handleDynamicRemove(oldPath);
          await handleDynamicCreate(newPath);
        } else if (mode === "from") {
          handleDynamicRemove(paths[0]);
        } else if (mode === "to") {
          await handleDynamicCreate(paths[0]);
        } else {
          // Fallback / "any" with 1 path
          const path = paths[0];
          const existsInUi = document.querySelector(`[itempath="${path}"]`);
          if (existsInUi) {
            handleDynamicRemove(path);
          } else {
            await handleDynamicCreate(path);
          }
        }
      } else {
        console.log("FS-Event: File was modified dynamically:", path);
        await handleDynamicUpdate(path);
      }
      window.scheduleDiskUsageRefresh?.();
    }
  }, 100);
});

listen("refreshView", () => refreshView());

listen("show-progressbar", () => {
  if (typeof FileOpProgressActionId !== "undefined" && FileOpProgressActionId) {
    const existing = ArrActiveActions.find((a) => a.id === FileOpProgressActionId);
    if (!existing) {
      FileOpProgressActionId = null;
    }
  } else {
    FileOpProgressActionId = null;
  }
  showProgressbar();
});

listen("update-progress-bar", (event) => {
  let data = event.payload;
  updateProgressBar(data[0], data[1], data[2], data[3], data[4], data[5]);
});

listen("finish-progress-bar", (event) => {
  finishProgressBar(event.payload);
  if (typeof window.scheduleDiskUsageRefresh === "function") {
    window.scheduleDiskUsageRefresh();
  }

  // Auto-reload remote directories (FTP/SSHFS) if copy/move finishes and either pane/current folder is remote
  setTimeout(async () => {
    const isRemote = (p) => p && (p.startsWith("ftp://") || p.includes("sshfs") || p.startsWith("/tmp/codriver-sshfs-mount"));
    if (typeof IsDualPaneEnabled !== "undefined" && IsDualPaneEnabled) {
      const leftIsRemote = typeof LeftDualPanePath !== "undefined" && isRemote(LeftDualPanePath);
      const rightIsRemote = typeof RightDualPanePath !== "undefined" && isRemote(RightDualPanePath);
      if (leftIsRemote || rightIsRemote) {
        if (typeof refreshBothViews === "function") {
          await refreshBothViews(typeof SelectedItemPaneSide !== "undefined" ? SelectedItemPaneSide : "");
        }
      }
    } else {
      const currentIsRemote = typeof CurrentDir !== "undefined" && isRemote(CurrentDir);
      if (currentIsRemote) {
        if (typeof refreshView === "function") {
          await refreshView();
        }
      }
    }
  }, 100);
});

listen("disk-analyzer-progress", (event) => {
  const { folders, files, bytes_scanned, volume_used_bytes, target_size, current_path } = event.payload;
  $("#disk-analyzer-progress-folders").text(folders.toLocaleString());
  $("#disk-analyzer-progress-files").text(files.toLocaleString());
  
  // Calculate real progress percentage based on actual disk load / directory total size
  let percent = 0;
  if (target_size > 0 && bytes_scanned > 0) {
    percent = Math.min(99, Math.floor((bytes_scanned / target_size) * 100));
  } else {
    // Fallback if target_size is zero or not yet calculated
    const items = folders + files;
    percent = Math.min(95, Math.floor(15 * Math.log10(items + 1)));
  }
  
  if (percent === 0 && (folders > 0 || files > 0)) {
    percent = 1;
  }
  
  $("#disk-analyzer-progress-fill").css("width", percent + "%");
  $("#disk-analyzer-progress-percent").text(percent + "%");
  
  let path = current_path || "";
  if (path.length > 50) {
    path = path.slice(0, 47) + "...";
  }
  $("#disk-analyzer-progress-path").text(path);

  // Store in global cache for when reopening the popup
  if (typeof DiskAnalyzerLastPayload !== "undefined") {
    DiskAnalyzerLastPayload = { folders, files, percent, path };
  }

  // Update background action card
  if (typeof DiskAnalyzerIsBackground !== "undefined" && DiskAnalyzerIsBackground) {
    const actionId = "diskanalyzer-scan";
    if (typeof ArrActiveActions !== "undefined") {
      const action = ArrActiveActions.find((a) => a.id === actionId);
      if (action) {
        action.progress = percent;
        action.currentFile = path;
        action.countLabel = `${(folders + files).toLocaleString()} items`;
        action.speedLabel = "Scanning...";
        
        if (typeof renderActiveActionsPill === "function") renderActiveActionsPill();
        if (typeof refreshActiveActionsPopup === "function") refreshActiveActionsPopup();
      }
    }
  }
});

listen("update-progress", (event) => {
  const { chunk_length, content_length } = event.payload;
  
  if (content_length) {
    const percent = Math.min(100, Math.floor((chunk_length / content_length) * 100));
    $("#update-progress-bar").css("width", percent + "%");
    $("#update-progress-text").text(`${percent}% (${(chunk_length / 1024 / 1024).toFixed(2)} MB / ${(content_length / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    $("#update-progress-bar").css("width", "100%");
    $("#update-progress-text").text(`Downloaded ${(chunk_length / 1024 / 1024).toFixed(2)} MB`);
  }
});

listen("update-finished", () => {
  $("#update-status-message").text("Installation completed! Relaunching...");
  $("#update-progress-bar").css("width", "100%");
  $("#update-progress-text").text("Complete");
});

