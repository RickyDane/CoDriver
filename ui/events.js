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

listen("set-item-image", (event) => {
  let payload = JSON.parse(event.payload);

  let base64 = payload.data;
  let imageId = payload.id;
  let imageUrl = payload.url;

  let element = document.getElementById(imageId);
  let loader = document.querySelector(".preloader-" + imageId);

  if (element && loader && base64) {
    element.style.display = "block";
    element.src = `data:image/${payload.url.split(".").pop()};base64,${base64}`;
    loader.style.display = "none";
  }

  writeToLocalStorage(imageUrl, base64);
});

listen("set_default_image", (event) => {
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

  writeToLocalStorage(image, image);
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
    if (event.payload.type == "create") {
      await addNewMount(event.payload);
    } else {
      await removeMount(event.payload);
    }
  }, 500);
});

listen("watcher-event", (event) => {
  setTimeout(async () => {
    if (event.payload.type == "create") { refreshView(); console.log("FS-Event: File was created")}
    if (event.payload.type == "remove") { refreshView(); console.log("FS-Event: File was removed")}
    if (event.payload.type == "rename") { refreshView(); console.log("FS-Event: File was renamed")}
    // if (event.payload.type == "modify") { refreshView(); console.log("FS-Event: File was modified")}
  }, 100);
});

listen("refreshView", () => refreshView());

listen("show-progressbar", () => showProgressbar());

listen("update-progress-bar", (event) => {
  let data = event.payload;
  updateProgressBar(data[0], data[1], data[2], data[3], data[4], data[5]);
});

listen("finish-progress-bar", (event) => {
  finishProgressBar(event.payload);
});
