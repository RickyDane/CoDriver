const TAURI = window.__TAURI__;
const { invoke } = TAURI.tauri;
const { confirm } = TAURI.dialog;
const { message } = TAURI.dialog;
const { open } = TAURI.dialog;
const { appWindow } = TAURI.window;
const { writeText } = TAURI.clipboard;
const { getTauriVersion } = TAURI.app;
const { getVersion } = TAURI.app;
const { getMatches } = TAURI.cli;
const { platform } = TAURI.os;
const { arch } = TAURI.os;
const convertFileSrc = TAURI.convertFileSrc;
const { resolveResource } = TAURI.path;

// :entry_point Entry point

getMatches().then((matches) => {
  // alert(JSON.stringify(matches.args.source.value));
});

// :drag / Dragging functionality

async function startDrag(options, onEvent) {
  if (ds) ds.break();
  let dragIcon = options.icon || DefaultFileIcon;
  if (!dragIcon || dragIcon === "") {
    dragIcon = "resources/file-icon.png";
  }

  try {
    await invoke("plugin:drag|start_drag", {
      item: options.item,
      image: dragIcon,
      onEventFn: onEvent ? transformCallback(onEvent) : null,
    });
  } catch (error) {
    writeLog("Drag and drop error: " + error);
  }
  // Removed immediate resetEverything() as it might interfere with the drag operation start
}

async function handleDragStart(e, item) {
  e.preventDefault();
  if (ds) ds.break();
  IsFileOpIntern = true;

  // Use resolved icons. If the itemicon is a full path, it might fail in the plugin.
  // Fallback to DefaultFileIcon for files and DefaultFolderIcon for directories.
  let icon = item.getAttribute("itemicon");
  let isDirAttr = item.getAttribute("itemisdir");
  let isDir = isDirAttr == "1" || isDirAttr == "true" || isDirAttr === true || isDirAttr == 1;

  if (isDir) {
    icon = DefaultFolderIcon;
  } else if (!icon || icon.includes("/") || icon.includes("\\")) {
    // If it's a full path or empty, use the default resolved file icon
    icon = DefaultFileIcon;
  }

  // Determine drag items: if dragged item is in current selection, drag all selected;
  // otherwise drag only this item (without mutating selection array)
  let isInSelection = ArrSelectedItems.some(
    (sel) => sel.getAttribute("itempath") === item.getAttribute("itempath")
  );
  let dragItems = isInSelection ? ArrSelectedItems : [item];
  let arr = dragItems.map((it) => it.getAttribute("itempath"));

  if (arr.length > 0) {
    await startDrag({ item: arr, icon: icon });
  }
}

const ds = new DragSelect({
  immediateDrag: false,
});

const cdCtMenu = new CDContextMenu();

// :drag / Selec items via dragging

ds.subscribe("DS:select", async (payload) => {
  const isShift = window.event ? window.event.shiftKey : false;
  const isCtrl = window.event ? window.event.ctrlKey : false;
  const isMeta = window.event ? window.event.metaKey : false;
  if (
    payload.item == SelectedElement ||
    isShift === true ||
    isCtrl === true ||
    isMeta === true ||
    ArrSelectedItems.find(
      (itemOfArray) =>
        itemOfArray.getAttribute("itempath") ==
        payload.item.getAttribute("itempath"),
    ) != null
  ) {
    return;
  }
  selectItem(payload.item, "", true);
});

ds.subscribe("DS:unselect", async (payload) => {
  deSelectItem(payload.item);
});

/* region Global Variables */
let ViewMode = "wrap";
let OrgViewMode = "wrap";

let DirectoryList;
let ArrDirectoryItems = [];
let ArrActiveActions = [];
let ContextMenu = document.querySelector(".context-menu");
let CopyFileName = "";
let CopyFilePath = "";
let CurrentDir = "/";
let IsShowDisks = false;
let IsShowHiddenFiles = false;




let IsQuickSearchOpen = false;
let ConfiguredPathOne = "";
let ConfiguredPathTwo = "";
let ConfiguredPathThree = "";
let IsTabs = false;
let TabCount = 0;
let CurrentActiveTab = 1;
let CurrentMillerCol = 1;
let TabOnePath;
let TabTwoPath;
let TabThreePath;
let TabFourPath;
let TabFivePath;
let IsTabsEnabled = false;
let IsDualPaneEnabled = false;
let LeftDualPanePath = "";
let RightDualPanePath = "";
let SelectedElement = null;
let SelectedItemPath = "";
let SelectedItemPaneSide = "";
let SelectedItemIndex = 0;
let LeftPaneItemCollection = [];
let RightPaneItemCollection = [];
let IsDisableShortcuts = false;
let LeftPaneItemIndex = 0;
let RightPaneItemIndex = 0;
let LastLeftPaneIndex = 0;
let LastRightPaneIndex = 0;
let IsPopUpOpen = false;
let SettingsSearchDepth = 10;
let SettingsMaxItems = 1000;
let IsFullSearching = false;
let IsSearching = false;
let FoundItemsCountIndex = 0;

let IsImagePreview = false;
let CurrentFtpPath = "";
let IsCopyToCut = false;
let Platform = "";
let IsSelectMode = true;
let IsItemPreviewOpen = false;
let IsInputFocused = false;
let ArrFavorites = [];
let IsFilteredBySize = false;
let IsFilteredByDate = false;
let IsFilteredByName = false;
let SelectedItemToOpen = null;
let DefaultFileIcon = "";
let DefaultFolderIcon = "";
let IsFileOpIntern = false;
let DraggedOverElement = null;
let MousePos = [];
let FileOperation = "";
let IsFirstRun = true;
const TIMETORESET = 500;
let CurrentQuickSearch = "";
let CurrentQuickSearchTime = 100;
let CurrentQuickSearchTimer = null;

/* Colors  */
let PrimaryColor = "#3f4352";
let SecondaryColor = "rgb(56, 59, 71)";
let SelectedColor = "rgba(0, 0, 0, 0.5)";
let TransparentColor = "rgba(0, 0, 0, 0.1)";
let CurrentTheme = "0";

/* endregion Global variables */

/* Upper right search bar logic */

function updateFileSearchbarState(forceCancelVisible = null) {
  const searchInput = document.querySelector(".search-bar-input");
  const searchbar = document.querySelector(".file-searchbar");
  const cancelButton = document.querySelector(".cancel-search-button");
  if (!searchInput) return;

  if (typeof forceCancelVisible !== "boolean") forceCancelVisible = null;

  const hasValue = searchInput.value.trim().length > 0;
  searchbar?.classList.toggle("has-value", hasValue);
  cancelButton?.classList.toggle(
    "is-visible",
    forceCancelVisible ?? hasValue,
  );
}

document.querySelector(".search-bar-input").addEventListener("focusin", (e) => {
  $(".file-searchbar").css("width", "clamp(220px, 30vw, 320px)");
  IsInputFocused = true;
});
document
  .querySelector(".search-bar-input")
  .addEventListener("focusout", (e) => {
    $(".file-searchbar").css("width", "clamp(180px, 22vw, 240px)");
    IsInputFocused = false;
  });
document
  .querySelector(".search-bar-input")
  .addEventListener("input", updateFileSearchbarState);
document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
  updateFileSearchbarState();
  if (e.keyCode === 13) {
    let fileName = $(".search-bar-input").val();
    searchFor(fileName);
  } else if (e.keyCode === 27) {
    cancelSearch();
  }
});

/* Quicksearch for dual pane view */

async function startFullSearch() {
  if (IsFullSearching == false) {
    IsFullSearching = true;
    $(".full-searching-loader").css("display", "block");
    $(".fullsearch-search-button").html(`
      <div class="button-icon"><i class="fa-solid fa-stop"></i></div>
      Stop
      `);
    document
      .querySelector(".fullsearch-search-button")
      .addEventListener("click", async () => {
        await stopFullSearch();
      });
    let fileName = document.querySelector(".full-dualpane-search-input").value;
    let maxItems = parseInt(
      document.querySelector(".full-search-max-items-input").value,
    );
    maxItems = maxItems >= 1 ? maxItems : 9999999;
    let searchDepth = parseInt(
      document.querySelector(".full-search-search-depth-input").value,
    );
    searchDepth = searchDepth >= 1 ? searchDepth : 1;
    let fileContent = document.querySelector(
      ".full-dualpane-search-file-content-input",
    ).value;
    await searchFor(fileName, maxItems, searchDepth, false, fileContent);
  }
}

async function stopFullSearch() {
  stopSearching();
  document
    .querySelector(".fullsearch-search-button")
    .replaceWith(
      document.querySelector(".fullsearch-search-button").cloneNode(true),
    );
  IsFullSearching = false;
  $(".full-searching-loader").css("display", "none");
  $(".fullsearch-current-file").html("");
  $(".fullsearch-search-button").html(`
    <div class="button-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
    Search
    `);
  document
    .querySelector(".fullsearch-search-button")
    .addEventListener("click", async () => {
      await startFullSearch();
    });
}

document.addEventListener("keydown", async (e) => {
  if (e.altKey) return;
  if (e.metaKey) return;
  if (e.ctrlKey) return;
  if (e.key === "Escape") {
    if (IsQuickSearchOpen == true) {
      goUp(false, true);
    }
    await resetEverything();
    document.querySelector(".search-bar-input").value = "";
    updateFileSearchbarState();
    $(".search-bar-input").blur();
    // Close all popups etc.
    // ContextMenu.style.display = "none";
    if (DraggedOverElement != null) {
      DraggedOverElement.style.opacity = "1";
    }
    await stopSearching();
    document.querySelectorAll(".site-nav-bar-button").forEach((item) => {
      item.style.opacity = "1";
    });
  }

  // :quicksearch :instantsearch
  const activeEl = document.activeElement;
  const isFormElementFocused =
    activeEl &&
    /^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName) &&
    !activeEl.disabled &&
    !activeEl.classList.contains("instant-search-input");
  if (
    IsInputFocused === false &&
    IsPopUpOpen === false &&
    isFormElementFocused === false &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !isShortcut(e.key) &&
    e.key != " "
  ) {
    CurrentQuickSearch += e.key;
    $(".instant-search-input").css("display", "block");
    $(".instant-search-input").val(CurrentQuickSearch);
    await searchFor(CurrentQuickSearch, 999999, 1, true);
    setTimeout(() => {
      if (IsDualPaneEnabled === true) {
        // goUp(true);
      } else {
        // goLeft();
      }
    }, 500);
    CurrentQuickSearchTime = TIMETORESET;
    clearInterval(CurrentQuickSearchTimer);
    resetQuickSearch();
  }
});

function resetQuickSearch() {
  CurrentQuickSearchTimer = setInterval(() => {
    if (CurrentQuickSearchTime <= 0) {
      clearInterval(CurrentQuickSearchTimer);
      CurrentQuickSearchTime = TIMETORESET;
      CurrentQuickSearch = "";
      $(".instant-search-input").val("");
      $(".instant-search-input").css("display", "none");
    } else {
      CurrentQuickSearchTime -= 50;
    }
  }, 100);
}

async function resetEverything() {
  closeLoadingPopup();
  closeSearchBar();
  closeSettings();
  closeFullSearchContainer();
  closeFtpConfig();
  closeItemPreview();
  closeMultiRenamePopup();
  closeCompressPopup();
  closeYtDownloadPopup();
  closeInfoProperties();
  closeActiveActionsPopup();
  finishProgressBar();
  closeInputDialogs();
  unSelectAllItems();
  closeConfirmPopup();
  closeCustomContextMenu();
  closeFindDuplicatesPopup();
  resetBackButton();
  $(".popup-background").css("display", "none");
  IsPopUpOpen = false;
  IsInputFocused = false;
  IsDisableShortcuts = false;
  IsFileOpIntern = false;
  if (ArrCopyItems.length == 0) {
    IsCopyToCut = false;
  }
  $(".path-item")?.css("opacity", "1");
  $(".site-nav-bar-button").css("border", "1px solid transparent");
  $(".site-nav-bar-button").css("backgroundColor", "transparent");
  $(".item-link").css("border", "1px solid transparent");
  $(".item-link").css("backgroundColor", "transparent");
  $(".item-link").css("scale", "1");
  $(".path-item").css("border", "1px solid transparent");
  $(".path-item").css("backgroundColor", "var(--transparentColor)");
  CurrentQuickSearch = "";
  resetQuickSearch();
  cdCtMenu.hide();
  cdCtMenu.hideSubMenu();
}

// Close context menu or new folder input dialog when click elsewhere
document.addEventListener("mousedown", (e) => {
  if (e.buttons == 8) {
    goBack(e);
  }

  // Right-click is handled by the contextmenu event. Closing here causes the
  // empty-area menu to flash before item-specific menus are shown.
  if (e.button === 2) {
    return;
  }

  // Check if your click is outside of important elements
  if (
    !e.target.closest(".context-menu") &&
    !e.target.classList.contains("context-item-icon") &&
    !e.target.classList.contains("context-item") &&
    !e.target.classList.contains("open-with-item") &&
    !e.target.classList.contains("input-dialog") &&
    !e.target.classList.contains("confirm-popup") &&
    !e.target.classList.contains("uni-popup") &&
    !e.target.classList.contains("popup-body") &&
    !e.target.classList.contains("popup-body-content") &&
    !e.target.classList.contains("directory-entry") &&
    !e.target.classList.contains("disk-item") &&
    !e.target.classList.contains("item-button") &&
    !e.target.classList.contains("item-button-list") &&
    !e.target.classList.contains("item-icon") &&
    !e.target.classList.contains("item-button-list-text") &&
    !e.target.classList.contains("item-button-list-info-span") &&
    !e.target.classList.contains("disk-item-top") &&
    !e.target.classList.contains("disk-info") &&
    !e.target.classList.contains("item-button-text") &&
    !e.target.classList.contains("item-preview-file-content") &&
    !e.target.classList.contains("popup-header") &&
    !e.target.classList.contains("item-preview-copy-path-button") &&
    !e.target.classList.contains("context-label") &&
    !e.target.classList.contains("item-size-box") &&
    !e.target.classList.contains("fa-cube") &&
    !e.target.classList.contains("site-nav-bar-button") &&
    !e.target.closest(".site-nav-bar-button") &&
    e.target.tagName !== "I" &&
    e.target.id !== "size-" + e.target.id.split("-")[1] &&
    !e.target.closest(".item-size-box")
  ) {
    // ContextMenu.style.display = "none";
    cdCtMenu.hide();
    cdCtMenu.hideSubMenu();
    $(".extra-c-menu")?.remove();

    // Reset context menu
    resetContextMenu();

    // document
    //   .querySelector(".c-item-duplicates")
    //   .setAttribute("disabled", "true");
    // document
    //   .querySelector(".c-item-duplicates")
    //   .classList.add("c-item-disabled");
    unSelectAllItems();
    if (DraggedOverElement != null) {
      DraggedOverElement.style.filter = "none";
    }
    // closeItemPreview();
  }
  if (
    IsPopUpOpen === true &&
    IsInputFocused === true &&
    !e.target.classList.contains("input-dialog") &&
    !e.target.classList.contains("input-dialog-headline") &&
    !e.target.classList.contains("text-input")
  ) {
    closeInputDialogs();
  }
  if (!e.target.classList.contains("c-item-custom")) {
    closeCustomContextMenu();
  }
  $(".site-nav-bar-button").css("border", "1px solid transparent");
  $(".site-nav-bar-button").css("backgroundColor", "transparent");
  $(".item-link").css("border", "1px solid transparent");
  $(".item-link").css("backgroundColor", "transparent");
  $(".path-item").css("border", "1px solid transparent");
});

// Open context menu for pasting for example
// :context open
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".context-menu")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (e.target.closest(".item-link") || e.target.closest(".disk-item")) {
    return;
  }

  cdCtMenu.setSelectedItem(null, e);
  cdCtMenu.show(e);
  return;
  e.preventDefault();
  console.log(IsPopUpOpen, IsInputFocused);
  if (IsPopUpOpen == false && IsInputFocused == false) {
    ContextMenu.children[7].replaceWith(
      ContextMenu.children[7].cloneNode(true),
    );

    positionContextMenu(e);

    ContextMenu.children[7].addEventListener(
      "click",
      function () {
        createFileInputPrompt(e);
      },
      { once: true },
    );

    if (CopyFilePath === "") {
      document.querySelector(".c-item-paste").setAttribute("disabled", "true");
      document.querySelector(".c-item-paste").classList.add("c-item-disabled");
    } else {
      document.querySelector(".c-item-paste").removeAttribute("disabled");
      document
        .querySelector(".c-item-paste")
        .classList.remove("c-item-disabled");
    }

    // Currently disabled due to issues with download functionality
    // document.querySelector(".c-item-ytdownload").replaceWith(document.querySelector(".c-item-ytdownload").cloneNode(true));
    // document.querySelector(".c-item-ytdownload").addEventListener(
    // 		"click",
    // 		async () => {
    //  			await showYtDownload();
    // 		},
    // 		{ once: true },
    // );
  }
});

// Position contextmenu
function positionContextMenu(e) {
  cdCtMenu.menu.style.display = "flex";

  // Horizontal position
  if (cdCtMenu.menu.clientWidth + e.clientX >= window.innerWidth) {
    cdCtMenu.menu.style.left = e.clientX - cdCtMenu.menu.clientWidth + "px";
  } else {
    cdCtMenu.menu.style.left = e.clientX + "px";
  }

  // Vertical position
  if (cdCtMenu.menu.offsetHeight + e.clientY <= window.innerHeight) {
    cdCtMenu.menu.style.top = e.clientY + "px";
    cdCtMenu.menu.style.bottom = null;
  } else if (
    cdCtMenu.menu.offsetHeight + e.clientY >= window.innerHeight &&
    e.clientY - cdCtMenu.menu.offsetHeight > 0
  ) {
    cdCtMenu.menu.style.top = e.clientY - cdCtMenu.menu.offsetHeight + "px";
    cdCtMenu.menu.style.bottom = null;
  } else {
    cdCtMenu.menu.style.top =
      window.innerHeight - cdCtMenu.menu.offsetHeight - 10 + "px";
    cdCtMenu.menu.style.bottom = null;
  }
}

/* :shortcuts Shortcuts definition */

function isShortcut(key) {
  if (
    key == "Meta" ||
    key == "Super" ||
    key == "Compose" ||
    key == "Control" ||
    key == "Shift" ||
    key == "Alt" ||
    key == "CapsLock" ||
    key == "Enter" ||
    key == "Backspace" ||
    key == "Delete" ||
    key == "ArrowLeft" ||
    key == "ArrowRight" ||
    key == "ArrowUp" ||
    key == "ArrowDown" ||
    key == "Escape" ||
    key == "Tab" ||
    key == "F1" ||
    key == "F2" ||
    key == "F3" ||
    key == "F4" ||
    key == "F5" ||
    key == "F6" ||
    key == "F7" ||
    key == "F8" ||
    key == "F9" ||
    key == "F10" ||
    key == "F11" ||
    key == "F12" ||
    key == "F13" ||
    key == "Home" ||
    key == "End" ||
    key == "PageUp" ||
    key == "PageDown" ||
    key == "PrintScreen" ||
    key == "Insert" ||
    key == "Pause" ||
    key == "Help" ||
    key == "NumLock" ||
    key == "Clear" ||
    key == "ScrollLock" ||
    key == "+" ||
    key == "-" ||
    key == "*" ||
    key == "/" ||
    key == ","
  ) {
    return true;
  } else {
    return false;
  }
}

document.onkeydown = async (e) => {
  if (IsDisableShortcuts === false) {
    // Shortcut for jumping to configured directory
    if (e.altKey && e.code == "Digit1") {
      if (ConfiguredPathOne == "") return;
      openItem(null, SelectedItemPaneSide, ConfiguredPathOne);
    }
    if (e.altKey && e.code == "Digit2") {
      if (ConfiguredPathTwo == "") return;
      openItem(null, SelectedItemPaneSide, ConfiguredPathTwo);
    }
    if (e.altKey && e.code == "Digit3") {
      if (ConfiguredPathThree == "") return;
      openItem(null, SelectedItemPaneSide, ConfiguredPathThree);
    }

    // :dual_pane :shortcuts
    if (
      IsDualPaneEnabled == true &&
      IsDisableShortcuts == false &&
      IsPopUpOpen == false
    ) {
      // check if return is pressed
      if (!e.altKey && e.keyCode == 13) {
        e.preventDefault();
        e.stopPropagation();
        await openSelectedItem();
      }
      // check if backspace is pressed
      if (e.keyCode == 8 && IsPopUpOpen == false) {
        goBack(e);
        e.preventDefault();
        e.stopPropagation();
      }
      // check if lshift + f5 is pressed
      if (e.shiftKey && e.key == "F5") {
        e.preventDefault();
        e.stopPropagation();
        let isToMove = await confirm("Current selection will be moved over");
        if (isToMove == true) {
          IsCopyToCut = true;
          await pasteItem();
        }
      }
      // check if f5 is pressed
      else if (e.key == "F5" && IsTabsEnabled == false) {
        e.preventDefault();
        e.stopPropagation();
        let isToCopy = await confirm("Current selection will be copied over");
        if (isToCopy == true) {
          pasteItem();
        }
      }
      // check if arrow up is pressed
      if (e.keyCode == 38) {
        if (SelectedElement == null) {
          goUp(false, true);
        } else {
          goUp();
        }
        e.preventDefault();
        e.stopPropagation();
      }
      // check if arrow down is pressed
      if (e.keyCode == 40) {
        e.preventDefault();
        e.stopPropagation();
        if (SelectedElement == null) {
          goUp(false, true);
        } else {
          goDown();
        }
      }
      // check if tab is pressed
      if (e.keyCode == 9) {
        e.preventDefault();
        e.stopPropagation();
        goToOtherPane();
      }
      if (e.key == "PageUp") {
        goUp();
        goUp();
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key == "PageDown") {
        goDown();
        goDown();
        e.preventDefault();
        e.stopPropagation();
      }

      // Open disk dropdown / :dropdown :disk_dropdown
      if (e.key == "F1" && (e.metaKey || e.altKey)) {
        let diskDropdown = document.querySelector(".left-disk-dropdown");
        let evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mousedown"); // Find alternative to deprecated method
        diskDropdown.dispatchEvent(evt);
      } else if (e.key == "F2" && (e.metaKey || e.altKey)) {
        SelectedItemPaneSide = "right";
        let diskDropdown = document.querySelector(".right-disk-dropdown");
        let evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mousedown"); // Find alternative to deprecated method
        diskDropdown.dispatchEvent(evt);
      }
    } else if (IsItemPreviewOpen == true && IsDualPaneEnabled === true) {
      // check if arrow up is pressed
      if (e.keyCode == 38) {
        goUp();
        e.preventDefault();
        e.stopPropagation();
      }
      // check if arrow down is pressed
      if (e.keyCode == 40) {
        goDown(e);
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Check if cmd / ctrl + shift + c is pressed
    if (
      ((Platform != "darwin" && e.ctrlKey && e.altKey) ||
        (Platform == "darwin" && e.shiftKey)) &&
      e.key == "c"
    ) {
      await writeText(CurrentDir);
      showToast("Current dir path copied", ToastType.SUCCESS);
      return;
    }

    // Check if cmd / ctrl + f is pressed
    if (e.key == "f" && (e.ctrlKey || e.metaKey)) {
      if (IsDualPaneEnabled == true) return;
      $(".search-bar-input").focus();
      IsInputFocused = true;
      e.preventDefault();
      e.stopPropagation();
    }

    // Check if space is pressed on selected item
    if (e.key == " " && SelectedElement != null) {
      e.preventDefault();
      e.stopPropagation();
      if (
        IsPopUpOpen == false &&
        IsInputFocused == false &&
        IsItemPreviewOpen == false
      ) {
        showItemPreview(SelectedElement);
      } else {
        closeItemPreview();
      }
    }

    if (IsPopUpOpen == false) {
      // check if del is pressed
      if (
        IsInputFocused == false &&
        (e.keyCode == 46 || (e.metaKey && e.keyCode == 8))
      ) {
        await deleteItems();
        closeLoadingPopup();
        await listDirectories();
        goUp();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Check if cmd / ctrl + a is pressed
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.key == "a" &&
        IsInputFocused === false &&
        IsPopUpOpen === false
      ) {
        if (IsDualPaneEnabled) {
          if (SelectedItemPaneSide == "left") {
            await unSelectAllItems();
            for (let i = 0; i < LeftPaneItemCollection.children.length; i++) {
              selectItem(LeftPaneItemCollection.children[i]);
            }
          } else {
            await unSelectAllItems();
            for (let i = 0; i < RightPaneItemCollection.children.length; i++) {
              selectItem(RightPaneItemCollection.children[i]);
            }
          }
        } else {
          await unSelectAllItems();
          for (let i = 0; i < DirectoryList.children.length; i++) {
            selectItem(DirectoryList.children[i]);
          }
        }
      }

      if (
        (e.altKey && e.key == "Enter") ||
        (e.key == "F2" && !e.metaKey && !e.ctrlKey && !e.altKey) ||
        (Platform == "darwin" &&
          e.key == "Enter" &&
          IsDualPaneEnabled == false &&
          IsInputFocused == false)
      ) {
        // check if alt + enter is pressed
        renameElementInputPrompt(SelectedElement);
      }

      // check if cmd / ctrl + r is pressed
      if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "r") {
        e.preventDefault();
        e.stopPropagation();
        await unSelectAllItems();
        if (IsDualPaneEnabled === true) {
          refreshBothViews(SelectedItemPaneSide);
        } else {
          refreshView();
        }
      }

      // check if cmd / ctrl + c is pressed
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.key == "c" &&
        IsInputFocused == false
      ) {
        copyItem(SelectedElement);
        e.preventDefault();
        e.stopPropagation();
      }

      // check if cmd / ctrl + x is pressed
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.key == "x" &&
        IsInputFocused == false
      ) {
        e.preventDefault();
        e.stopPropagation();
        await copyItem(SelectedElement, true);
      }

      // check if cmd / ctrl + v is pressed
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.key == "v" &&
        IsInputFocused == false
      ) {
        e.preventDefault();
        e.stopPropagation();
        pasteItem();
      }

      // check if cmd / ctrl + g is pressed | Path input
      if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "g") {
        e.preventDefault();
        e.stopPropagation();
        showInputPopup("Input path to jump to");
      }

      // New folder input prompt when f7 is pressed
      if (e.key == "F7") {
        e.preventDefault();
        e.stopPropagation();
        createFolderInputPrompt();
      }

      // New file input prompt when f6 is pressed
      if (e.keyCode == 117) {
        e.preventDefault();
        e.stopPropagation();
        createFileInputPrompt();
      }

      // Open file search container when f8 is pressed
      if (e.key == "F8" || e.keyCode == 119) {
        e.preventDefault();
        e.stopPropagation();
        openFullSearchContainer();
      }

      // check if ctrl / cmd + shift + m is pressed
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.shiftKey &&
        (e.key == "M" || e.key == "m") &&
        ArrSelectedItems.length >= 1
      ) {
        showMultiRenamePopup();
        e.preventDefault();
        e.stopPropagation();
      }

      if (IsDualPaneEnabled === false) {
        // check if return is pressed
        if (!e.altKey && e.keyCode == 13 && Platform != "darwin") {
          await openSelectedItem();
          e.preventDefault();
          e.stopPropagation();
        }

        // check if backspace is pressed
        if (
          e.keyCode == 8 &&
          IsPopUpOpen === false &&
          IsInputFocused === false &&
          ArrSelectedItems.length == 0
        ) {
          goBack(e);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }

    if (
      IsDualPaneEnabled === false &&
      IsItemPreviewOpen === false &&
      IsInputFocused === false
    ) {
      if (
        (e.metaKey || e.ctrlKey || e.key == "Super") &&
        e.key.toLowerCase() == "k"
      ) {
        showCompressPopup(ArrSelectedItems[0]);
      }
      // :new_shortcut :new :shortcut
    }

    // Item preview :preview
    if (
      IsDualPaneEnabled === false &&
      ((IsItemPreviewOpen === true && IsPopUpOpen === true) ||
        IsPopUpOpen === false) &&
      IsInputFocused === false
    ) {
      if (ViewMode == "wrap") {
        // check if arrow up is pressed
        if (e.keyCode == 38) {
          e.preventDefault();
          e.stopPropagation();
          goGridUp();
        }

        // check if arrow down is pressed
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          goGridDown();
        }
      }

      // check if arrow left is pressed
      if (
        e.keyCode == 37 ||
        ((ViewMode == "column" || ViewMode == "miller") && e.keyCode == 38)
      ) {
        e.preventDefault();
        e.stopPropagation();
        goLeft();
      }

      // check if arrow right is pressed
      if (
        e.keyCode == 39 ||
        ((ViewMode == "column" || ViewMode == "miller") && e.keyCode == 40)
      ) {
        e.preventDefault();
        e.stopPropagation();
        goRight();
      }
    }
  }
};

// Reset key toggle
document.onkeyup = (e) => {
  if (e.key == "G" || e.key == "g") IsGDown = false;
};

/* End of shortcut config */

// check for click on one of the dual pane containers and set directory accordingly
document.querySelector(".dual-pane-left").addEventListener("click", () => {
  if (IsPopUpOpen == false && SelectedItemPaneSide != "left") {
    setCurrentDir(LeftDualPanePath, "left");
  }
});
document
  .querySelector(".dual-pane-left")
  .addEventListener("contextmenu", () => {
    if (IsPopUpOpen == false && SelectedItemPaneSide != "left") {
      setCurrentDir(LeftDualPanePath, "left");
    }
  });
document.querySelector(".dual-pane-right").addEventListener("click", () => {
  if (IsPopUpOpen == false && SelectedItemPaneSide != "right") {
    setCurrentDir(RightDualPanePath, "right");
  }
});
document
  .querySelector(".dual-pane-right")
  .addEventListener("contextmenu", () => {
    if (IsPopUpOpen == false && SelectedItemPaneSide != "right") {
      setCurrentDir(RightDualPanePath, "right");
    }
  });

// Main function to handle directory visualization
async function showItems(items, dualPaneSide = "", millerCol = 1) {
  unSelectAllItems();
  await cancelSearch(); // Cancel any ongoing search

  // Reenable miller column view when navigating out from disk view
  if (IsShowDisks == true && ViewMode == "miller") {
    $(".miller-container")?.css("display", "flex");
    $(".non-dual-pane-container")?.css("display", "none");
    $(".explorer-container")?.css("padding", "10px 10px 0 10px");
  }

  IsShowDisks = false;

  if (items.length > 1000) {
    showLoadingPopup("Loading much data, please wait...");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Reset position when navigating into another directory
  document.querySelector(".explorer-container")?.scrollTo(0, 0);

  if (IsDualPaneEnabled == true) {
    if (dualPaneSide == "left") {
      document.querySelector(".dual-pane-left").innerHTML = "";
      document.querySelector(".dual-pane-left").scrollTop = 0;
    } else if (dualPaneSide == "right") {
      document.querySelector(".dual-pane-right").innerHTML = "";
      document.querySelector(".dual-pane-right").scrollTop = 0;
    } else {
      SelectedItemPaneSide = "left";
      document.querySelector(".dual-pane-left").innerHTML = "";
      document.querySelector(".dual-pane-left").scrollTop = 0;
      document.querySelector(".dual-pane-right").innerHTML = "";
      document.querySelector(".dual-pane-right").scrollTop = 0;
    }
  }
  document.querySelector(".normal-list-column-header").style.display = "block";
  document.querySelector(".disk-list-column-header").style.display = "none";

  DirectoryList = document.createElement("div");
  if (IsDualPaneEnabled == true) {
    DirectoryList.className = "directory-list-dual-pane";
  } else {
    DirectoryList.className = "directory-list";
  }
  if (IsShowHiddenFiles === false) {
    items = items.filter(
      (str) =>
        !str.name.startsWith(".") &&
        !str.name.toLowerCase().includes("desktop.ini"),
    );
  }
  items = items.filter((str) => !str.name.toLowerCase().includes("ntuser"));
  let counter = 0;
  let docFragment = document.createDocumentFragment();
  items.forEach(async (item) => {
    let itemLink = document.createElement("button");
    itemLink.setAttribute(
      "onclick",
      "interactWithItem(this, '" + dualPaneSide + "', null, event)",
    );
    let itemIconId = crypto.randomUUID();
    itemLink.setAttribute("itemiconid", itemIconId);
    itemLink.setAttribute("itempath", item.path);
    itemLink.setAttribute("itemindex", counter++);
    itemLink.setAttribute("itempaneside", dualPaneSide);
    itemLink.setAttribute("itemisdir", item.is_dir ? 1 : 0);
    itemLink.setAttribute("itemext", item.extension);
    itemLink.setAttribute("itemname", item.name);
    itemLink.setAttribute("itemsize", formatBytes(item.size));
    itemLink.setAttribute("itemrawsize", item.size);
    itemLink.setAttribute("itemmodified", item.last_modified);
    itemLink.setAttribute("draggable", true);
    itemLink.setAttribute("itemformillercol", parseInt(millerCol) + 1);
    itemLink.setAttribute("itemisselected", false);

    let fileIcon = "resources/file-icon.png"; // Default
    let iconSize = "56px";
    fileIcon = getIconForFile(item, items.length);

    itemLink.setAttribute("itemicon", fileIcon);
    itemLink.className = "item-link directory-entry";

    if (ViewMode == "wrap") {
      var itemButton = document.createElement("div");
      itemButton.innerHTML = `
        <div style="margin: 8px; ${fileIcon.startsWith("resources/") ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
        <img style="${fileIcon.startsWith("resources/") ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="${iconSize}" height="${iconSize}" loading="lazy" />
        <p class="item-button-text" style="text-align: left;">${item.name}</p>
        `;
      itemButton.className = "item-button directory-entry";
      itemLink.append(itemButton);
      DirectoryList.style.gridTemplateColumns =
        "repeat(auto-fill, minmax(80px, 1fr))";
      DirectoryList.style.rowGap = "15px";
    } else if (ViewMode == "column") {
      var itemButtonList = document.createElement("div");
      itemButtonList.innerHTML = `
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; min-width: 0; width: fit-content; max-width: 500px; overflow: hidden;">
          <div style="margin: 8px; ${fileIcon.startsWith("resources/") ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
          <img style="${fileIcon.startsWith("resources/") ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="32px" height="32px" loading="lazy"/>
          <p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
        </span>
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: fit-content; justify-content: flex-end; padding-right: 5px;">
          <p class="item-button-list-text" style="width: 100%; text-align: right;">${item.last_modified}</p>
          <div class="item-button-list-text item-size-box" style="width: 115px; display: flex; gap: 10px; align-items: center; justify-content: space-around;">
       			<span id="size-${item.path}">${formatBytes(parseInt(item.size), 2)}</span>
       			<i class="fa-solid fa-cube"></i>
      		</div>
        </span>
        `;
      if (dualPaneSide != null && dualPaneSide != "") {
        itemButtonList.className = "directory-entry dual-pane-list-item";
      } else {
        itemButtonList.className = "item-button-list directory-entry";
      }
      itemLink.append(itemButtonList);
      DirectoryList.style.gridTemplateColumns = "unset";
      DirectoryList.style.rowGap = "2px";
    } else if (ViewMode == "miller") {
      var itemButtonList = document.createElement("div");
      itemButtonList.innerHTML = `
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: 200px; overflow: hidden;">
        <div style="margin: 8px; ${fileIcon.startsWith("resources/") ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
        <img style="${fileIcon.startsWith("resources/") ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="24px" height="24px" loading="lazy"/>
        <p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
        </span>
        `;
      if (dualPaneSide != null && dualPaneSide != "") {
        itemButtonList.className = "directory-entry dual-pane-list-item";
      } else {
        itemButtonList.className = "item-button-list directory-entry";
      }
      itemLink.append(itemButtonList);
      DirectoryList.style.gridTemplateColumns = "unset";
      DirectoryList.style.rowGap = "1px";
    }
    // DirectoryList.append(itemLink);
    docFragment.append(itemLink);
    ArrDirectoryItems.push(itemLink);
  });
  DirectoryList.append(docFragment);
  DirectoryList.querySelectorAll(".item-link").forEach(async (item) => {
    // Start dragging item
    item.ondragstart = (e) => {
      handleDragStart(e, item);
    };
    item.addEventListener("mousedown", (e) => {
      if (e.button === 0 && ds) {
        ds.break();
      }
    });
    // Accept file drop into folders
    item.addEventListener("dragover", (e) => {
      MousePos = [e.clientX, e.clientY];
      if (item.getAttribute("itemisdir") == "1") {
        if (!ArrSelectedItems.includes(item))
          item.style.border = "1px solid var(--selectColor2)";
        {
          item.style.backgroundColor = "var(--selectColor3)";
          item.style.scale = "1";
          DraggedOverElement = item;
        }
      }
    });
    item.addEventListener("dragleave", () => {
      item.style.border = "1px solid transparent";
      item.style.backgroundColor = "1px solid var(--transparentColor)";
      item.style.scale = "1";
    });
    // :item_right_click :context_menu / showItems()
    // Open context menu when right-clicking on file/folder
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cdCtMenu.setSelectedItem(item, e);
      cdCtMenu.show(e);
    });

    // :thumbnail :set_thumbnail | Set thumbnail image
    if (isImage(item.getAttribute("itemext"))) {
      // if (item.getAttribute("itemrawsize") > 50000000) { // ~50 mb
      //   item.querySelector("img").src = convertFileSrc(await getThumbnail(item.getAttribute("itempath")));
      // }
    } else if (item.getAttribute("itemext") == ".app") {
      item.querySelector("img").src = convertFileSrc(
        await invoke("get_app_icns", { path: item.getAttribute("itempath") }),
      );
    }
  });
  if (IsDualPaneEnabled == true) {
    if (dualPaneSide == "left") {
      document.querySelector(".dual-pane-left").append(DirectoryList);
      LeftDualPanePath = CurrentDir;
      LeftPaneItemCollection = DirectoryList;
    } else if (dualPaneSide == "right") {
      document.querySelector(".dual-pane-right").append(DirectoryList);
      RightDualPanePath = CurrentDir;
      RightPaneItemCollection = DirectoryList;
    }
  } else if (ViewMode == "miller") {
    $(".miller-col-" + millerCol).html("");
    $(".miller-col-" + millerCol).append(DirectoryList);
    $(".miller-col-" + millerCol).attr("miller-col-path", CurrentDir);
    CurrentMillerCol = millerCol;
  } else {
    document.querySelector(".explorer-container").innerHTML = "";
    document.querySelector(".explorer-container").append(DirectoryList);
  }
  ds.setSettings({
    selectables: document.querySelectorAll(".item-link"),
    area: document.querySelector(".explorer-container"),
    draggability: false,
  });
  closeLoadingPopup();

  // Load all the item images after items were added to the view to avoid lag / frozen application
  let arrItems = document.querySelectorAll(".item-link");
  arrLoadItemImage(arrItems);
}

function arrLoadItemImage(arrItems, isSingle = false) {
  let arr = Array.from(arrItems).map((item) => {
    return {
      image_id: item.getAttribute("itemiconid"),
      image_url: item.getAttribute("itemicon"),
      image_type: item.getAttribute("itemext").replace(".", "").toLowerCase(),
    };
  });
  invoke("load_item_image", {
    arrItems: arr,
    isSingle: isSingle,
  });
}

function writeToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("Error writing image to local storage:", error);
  }
}

function readFromLocalStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Error reading image from local storage:", error);
  }
}

async function addSingleItem(
  item,
  dualPaneSide = "",
  millerCol = 1,
  itemIndex = 0,
) {
  if (IsShowHiddenFiles === false) {
    if (
      item.name.startsWith(".") == true ||
      item.name.toLowerCase().includes("desktop.ini")
    ) {
      return;
    }
  }
  if (item.name.toLowerCase().includes("ntuser")) {
    return;
  }
  IsShowDisks = false;
  // Reset position when navigating in another directory
  window.scrollTo(0, 0);
  if (IsDualPaneEnabled == true) {
    if (dualPaneSide == "left") {
      document.querySelector(".dual-pane-left").scrollTop = 0;
    } else if (dualPaneSide == "right") {
      document.querySelector(".dual-pane-right").scrollTop = 0;
    } else {
      document.querySelector(".dual-pane-left").scrollTop = 0;
      document.querySelector(".dual-pane-right").scrollTop = 0;
    }
  }
  document.querySelector(".normal-list-column-header").style.display = "block";
  document.querySelector(".disk-list-column-header").style.display = "none";

  let itemLink = document.createElement("button");
  itemLink.setAttribute(
    "onclick",
    "interactWithItem(this, '" + dualPaneSide + "', null, event)",
  );
  let itemIconId = crypto.randomUUID();
  itemLink.setAttribute("itemiconid", itemIconId);
  itemLink.setAttribute("itempath", item.path);
  itemLink.setAttribute("itemindex", FoundItemsCountIndex++);
  itemLink.setAttribute("itempaneside", dualPaneSide);
  itemLink.setAttribute("itemisdir", item.is_dir ? 1 : 0);
  itemLink.setAttribute("itemext", item.extension);
  itemLink.setAttribute("itemname", item.name);
  itemLink.setAttribute("itemsize", formatBytes(item.size));
  itemLink.setAttribute("itemrawsize", item.size);
  itemLink.setAttribute("itemmodified", item.last_modified);
  itemLink.setAttribute("draggable", true);
  itemLink.setAttribute("itemformillercol", parseInt(millerCol) + 1);

  let fileIcon = "resources/file-icon.png"; // Default
  let iconSize = "56px";
  fileIcon = getIconForFile(item, 1);

  itemLink.setAttribute("itemicon", fileIcon);
  itemLink.className = "item-link directory-entry";

  if (ViewMode == "wrap") {
    var itemButton = document.createElement("div");
    itemButton.innerHTML = `
      <div style="margin: 8px; ${fileIcon.startsWith("resources/") ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
      <img style="${fileIcon.startsWith("resources/") ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="${iconSize}" height="${iconSize}" loading="lazy" />
      <p class="item-button-text" style="text-align: left;">${item.name}</p>
      `;
    itemButton.className = "item-button directory-entry";
    itemLink.append(itemButton);
    $(".directory-list").css(
      "gridTemplateColumns",
      "repeat(auto-fill, minmax(80px, 1fr))",
    );
    $(".directory-list").css("rowGap", "15px");
  } else if (ViewMode == "column") {
    var itemButtonList = document.createElement("div");
    itemButtonList.innerHTML = `
      <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: 500px; overflow: hidden;">
        <div style="margin: 8px; ${fileIcon.startsWith("resources/") ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
        <img style="${fileIcon.startsWith("resources/") ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="32px" height="32px" loading="lazy"/>
        <p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
      </span>
      <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; width: 50%; justify-content: flex-end; padding-right: 5px;">
        <p class="item-button-list-text" style="width: auto; text-align: right;">${item.last_modified}</p>
        <div class="item-button-list-text item-size-box" style="width: 115px; display: flex; gap: 10px; align-items: center; justify-content: space-around;">
     			<span id="size-${item.path}">${formatBytes(parseInt(item.size), 2)}</span>
     			<i class="fa-solid fa-cube"></i>
    		</div>
      </span>
      `;
    if (dualPaneSide != null && dualPaneSide != "") {
      itemButtonList.className = "directory-entry dual-pane-list-item";
    } else {
      itemButtonList.className = "item-button-list directory-entry";
    }
    itemLink.append(itemButtonList);
    $(".directory-list").css("gridTemplateColumns", "unset");
    $(".directory-list").css("rowGap", "2px");
  } else if (ViewMode == "miller") {
    $(".directory-list").style.gridTemplateColumns = "unset";
    $(".directory-list").style.rowGap = "1px";
  }
  // Start dragging item
  itemLink.ondragstart = (e) => {
    handleDragStart(e, itemLink);
  };
  itemLink.addEventListener("mousedown", (e) => {
    if (e.button === 0 && ds) {
      ds.break();
    }
  });
  // Accept file drop into folders
  itemLink.addEventListener("dragover", (e) => {
    MousePos = [e.clientX, e.clientY];
    if (itemLink.getAttribute("itemisdir") == "1") {
      if (!ArrSelectedItems.includes(itemLink)) {
        itemLink.style.opacity = "0.5";
        itemLink.style.border = "1px solid var(--textColor)";
        DraggedOverElement = itemLink;
      }
    }
  });
  itemLink.addEventListener("dragleave", () => {
    itemLink.style.opacity = "1";
    itemLink.style.border = "1px solid transparent";
  });
  // :item_right_click :context_menu | addSingleItem()
  // Open context menu when right-clicking on file/folder
  itemLink.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    cdCtMenu.setSelectedItem(itemLink, e);
    cdCtMenu.show(e);
  });

  if (IsDualPaneEnabled === true) {
    if (dualPaneSide === "left") {
      $(".dual-pane-left").append(itemLink);
      LeftPaneItemCollection = document.querySelector(".dual-pane-left");
      goUp(false, true);
    } else if (dualPaneSide === "right") {
      $(".dual-pane-right").append(itemLink);
      RightPaneItemCollection = document.querySelector(".dual-pane-right");
      goUp(false, true);
    }
  } else {
    $(".directory-list").append(itemLink);
  }
  ArrDirectoryItems.push(itemLink);

  // Load the item image after it was added to the view to avoid lag / frozen application
  arrLoadItemImage([itemLink], true);
}

async function getCurrentDir() {
  return await invoke("get_current_dir");
}

async function setCurrentDir(currentDir = "", dualPaneSide = "", syncBackend = true) {
  try {
    if (currentDir == "") return;

    if (IsDualPaneEnabled && typeof comparisonActive !== "undefined" && comparisonActive) {
      clearComparisonVisuals();
      comparisonActive = false;
      comparisonResults = null;
      const syncBtn = document.getElementById("dual-pane-sync-btn");
      if (syncBtn) {
        syncBtn.setAttribute("disabled", "true");
        syncBtn.classList.add("disabled");
      }
      const clearBtn = document.getElementById("dual-pane-clear-btn");
      if (clearBtn) {
        clearBtn.style.display = "none";
      }
    }

    if (dualPaneSide != "") {
      SelectedItemPaneSide = dualPaneSide;
    }

    if (syncBackend) {
      const isSuccess = await invoke("set_dir", { currentDir });
      if (isSuccess === false) {
        alert("Switching directory failed. Probably no permissions.");
        return;
      }
    }

    // Setting the current path on the bottom. Some navigation commands already
    // changed the backend current dir; avoid invoking set_dir twice in those paths.
    updateCurrentPath(currentDir, dualPaneSide);

    if (dualPaneSide == "left") {
      LeftDualPanePath = currentDir;
      $(".dual-pane-left").css(
        "box-shadow",
        "inset 0px 0px 30px 3px var(--transparentColorActive)",
      );
      $(".dual-pane-right").css("box-shadow", "none");
    } else if (dualPaneSide == "right") {
      RightDualPanePath = currentDir;
      $(".dual-pane-right").css(
        "box-shadow",
        "inset 0px 0px 30px 3px var(--transparentColorActive)",
      );
      $(".dual-pane-left").css("box-shadow", "none");
    }
  } catch (e) {
    writeLog(e);
  }
}

function updateCurrentPath(currentDir, dualPaneSide) {
  try {
    CurrentDir = currentDir;
    let currentDirContainer = document.querySelector(".current-path");
    currentDirContainer.innerHTML = "";
    let currentPathTracker = "/";
    if (Platform != "darwin" && Platform.includes("win")) {
      currentPathTracker = "";
    }

    if (currentDir.endsWith("/")) {
      currentDir = currentDir.substring(currentDir.length - 1);
    }

    if (currentDir.startsWith("/")) {
      currentDir = currentDir.substring(1, currentDir.length);
    }

    let counter = 0;

    currentDir.split("/").forEach((path) => {
      if (path == "") return;
      let pathItem = document.createElement("button");
      pathItem.textContent = path;
      pathItem.className = "path-item";
      currentPathTracker += path + "/";
      pathItem.setAttribute(
        "itempath",
        currentPathTracker.endsWith("/")
          ? currentPathTracker.substring(0, currentPathTracker.length - 1)
          : currentPathTracker,
      );
      pathItem.setAttribute("itempaneside", dualPaneSide);
      pathItem.setAttribute("itemisdir", 1);
      pathItem.setAttribute(
        "onClick",
        "openItem(this, '" + dualPaneSide + "', '')",
      );
      pathItem.ondragover = (e) => {
        MousePos = [e.clientX, e.clientY - 60];
        e.preventDefault();
        pathItem.style.border = "2px solid var(--selectColor)";
        pathItem.style.backgroundColor = "var(--tertiaryColor)";
        pathItem.style.scale = "1.05";
        DraggedOverElement = pathItem;
      };
      pathItem.ondragleave = (e) => {
        e.preventDefault();
        pathItem.style.opacity = 1;
        pathItem.style.border = "2px solid transparent";
        pathItem.style.backgroundColor = "var(--transparentColor)";
        pathItem.style.scale = "1";
      };
      let divider = document.createElement("i");
      divider.className = "fa fa-chevron-right";
      divider.style.color = "var(--textColor)";
      divider.style.fontSize = "10px";
      if (counter > 0) {
        currentDirContainer.appendChild(divider);
      }
      currentDirContainer.appendChild(pathItem);
      counter++;
    });
  } catch (e) {
    writeLog(e);
  }
}

async function deleteItems() {
  // ContextMenu.style.display = "none";
  let msg = "Do you really want to delete:<br/><br/>";
  for (let i = 0; i < ArrSelectedItems.length; i++) {
    if (i == 0) {
      msg +=
        "<span class='confirm-popup-item'>" +
        ArrSelectedItems[i].getAttribute("itemname") +
        "</span>";
    } else {
      msg +=
        "<br/><span class='confirm-popup-item'>" +
        ArrSelectedItems[i].getAttribute("itemname") +
        "</span>";
    }
  }
  let arr = ArrSelectedItems.map((item) => item.getAttribute("itempath"));
  let isConfirm = await showPopup(msg, PopupType.DELETE);
  if (isConfirm == true) {
    let actionId = new Date().getMilliseconds();
    createNewAction(actionId, "Deleting", "Delete Items", "Delete Items");
    window.IsDeletingItems = true;
    try {
      for (let i = 0; i < arr.length; i++) {
        let actFileName = arr[i];
        await invoke("delete_item", { actFileName });
      }
      IsCopyToCut = false;
      if (Platform != "darwin") {
        await listDirectories();
      }
      ArrSelectedItems = [];
      showToast("Deletion of items is done", ToastType.INFO);
    } finally {
      window.IsDeletingItems = false;
      removeAction(actionId);
      scheduleDiskUsageRefresh();
    }
  }
}

async function copyItem(item, toCut = false, fromInternal = false) {
  if (item == null) {
    return;
  }
  CopyFilePath = item?.getAttribute("itempath");
  let tempCopyFilePath = item?.getAttribute("itempath").split("/");
  CopyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
  if (fromInternal == false) {
    ArrCopyItems = [];
  }
  if (ArrSelectedItems.length > 0) {
    for (let i = 0; i < ArrSelectedItems.length; i++) {
      if (toCut === true) {
        ArrSelectedItems[i].style.opacity = "0.5";
        ArrSelectedItems[i].style.filter = "blur(2px)";
      }
      ArrCopyItems.push(ArrSelectedItems[i]);
    }
  } else {
    ArrCopyItems.push(item);
    if (toCut === true) {
      item.style.opacity = "0.5";
      item.style.filter = "blur(2px)";
    }
  }
  // ContextMenu.style.display = "none";
  await writeText(CopyFilePath);
  if (toCut == true) {
    IsCopyToCut = true;
  } else {
    IsCopyToCut = false;
  }
}

async function extractItem(item) {
  const isExtracting = await showExtractPopup(item);
  if (isExtracting === true) {
    const extractFilePath = item.getAttribute("itempath");
    const extractFileName = item.getAttribute("itemname");
    if (extractFileName != "") {
      const fromPath = extractFilePath.toString();
      await invoke("extract_item", { fromPath, appWindow });
      showToast("Extraction done", ToastType.SUCCESS);
      await listDirectories();
      scheduleDiskUsageRefresh();
    }
  }
}

async function showExtractPopup(item) {
  if (IsPopUpOpen !== false) return false;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  const name = item.getAttribute("itemname");
  const ext = (item.getAttribute("itemext") || "").replace(".", "").toUpperCase();

  const popup = document.createElement("div");
  popup.className = "extract-popup props-card";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Extract archive");
  popup.innerHTML = `
    <section class="props-card__hero">
      <div class="props-card__thumb"><i class="fa-solid fa-file-zipper"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(name)}">${escHtml(name)}</h2>
        <div class="props-card__meta">
          <span>Archive</span>
          ${ext ? `<span class="props-card__chip">${escHtml(ext)}</span>` : ""}
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-regular fa-folder-open"></i>Destination</dt>
        <dd class="props-card__value">
          <span class="props-card__path">${escHtml(CurrentDir)}</span>
        </dd>
      </div>
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" data-extract-cancel>
        <i class="fa-solid fa-xmark"></i><span>Close</span>
      </button>
      <button class="props-card__btn props-card__btn--primary" data-extract-confirm>
        <i class="fa-solid fa-maximize"></i><span>Extract</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  return new Promise((resolve) => {
    let isClosed = false;
    const finish = (ok) => {
      if (isClosed) return;
      isClosed = true;
      popup.classList.add("popup-exit");
      popup.addEventListener("animationend", () => {
        popup.remove();
        IsPopUpOpen = false;
        resolve(ok);
      }, { once: true });
    };
    popup.querySelector("[data-extract-cancel]").onclick = () => finish(false);
    popup.querySelector("[data-extract-confirm]").onclick = () => finish(true);
    popup.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      if (e.key === "Enter")  { e.preventDefault(); finish(true);  }
    });
    popup.querySelector("[data-extract-confirm]").focus();
  });
}

async function showCompressPopup(item) {
  if (IsPopUpOpen !== false) return;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  const arrCompressItems = ArrSelectedItems.length > 1 ? ArrSelectedItems : [item];
  if (!arrCompressItems.length || !arrCompressItems[0]) return;

  const isMulti = arrCompressItems.length > 1;
  const heroName = isMulti
    ? `${arrCompressItems.length} items`
    : arrCompressItems[0].getAttribute("itemname");
  const heroKind = isMulti ? "Multiple selection" : "Single item";

  const itemsListHtml = isMulti
    ? `<ul class="props-card__items-list">
         ${arrCompressItems.map((i) => {
           const n = i.getAttribute("itemname");
           return `<li title="${escHtml(n)}">${escHtml(n)}</li>`;
         }).join("")}
       </ul>`
    : "";

  const popup = document.createElement("div");
  popup.className = "compression-popup props-card props-card--wide";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Compress items");
  popup.innerHTML = `
    <section class="props-card__hero">
      <div class="props-card__thumb"><i class="fa-solid fa-file-zipper"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(heroName)}">${escHtml(heroName)}</h2>
        <div class="props-card__meta">
          <span>${escHtml(heroKind)}</span>
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-file-code"></i>Format</dt>
        <dd class="props-card__value">
          <select class="props-card__input compression-popup-type-select" style="cursor: pointer;">
            <option value="zstd">Zstd (Level -7 - 22)</option>
            <option value="zip">Zip (Level 1 - 9)</option>
            <option value="density">Density (Level 1 - 3)</option>
            <option value="br">Brotli (Level 1)</option>
          </select>
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-gauge-high"></i>Level</dt>
        <dd class="props-card__value">
          <input type="number" class="props-card__input compression-popup-level-input" value="1" placeholder="Default: 1" />
        </dd>
      </div>
      ${itemsListHtml ? `
      <div class="props-card__row props-card__row--block">
        <dt class="props-card__label"><i class="fa-regular fa-rectangle-list"></i>Items</dt>
        <dd class="props-card__value">${itemsListHtml}</dd>
      </div>` : ""}
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" onclick="closeCompressPopup()">
        <i class="fa-solid fa-xmark"></i><span>Close</span>
      </button>
      <button class="props-card__btn props-card__btn--primary compress-item-button">
        <i class="fa-solid fa-minimize"></i><span>Compress</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  popup.querySelector(".compress-item-button").addEventListener("click", async () => {
    await compressItem(
      arrCompressItems,
      $(".compression-popup-level-input").val(),
      $(".compression-popup-type-select").val(),
    );
  });

  const levelInput = popup.querySelector(".compression-popup-level-input");
  levelInput.addEventListener("focus", () => (IsInputFocused = true));
  levelInput.addEventListener("blur", () => (IsInputFocused = false));
  levelInput.addEventListener("keyup", (e) => {
    if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
      popup.querySelector(".compress-item-button").click();
    }
  });
}

async function compressItem(
  arrItems,
  compressionLevel = 6,
  compressionType = "zip",
) {
  if (
    compressionType == "zip" &&
    (compressionLevel > 9 || compressionLevel < 1)
  ) {
    alert("Compression level must be between 1 and 9");
    return;
  } else if (
    compressionType == "zstd" &&
    (compressionLevel > 22 || compressionLevel < -7)
  ) {
    alert("Compression level must be between -7 and 22");
    return;
  } else if (compressionType == "br" && compressionLevel != 1) {
    alert("Compression level must be 1");
    return;
  }
  closeCompressPopup();

  let actionId = crypto.randomUUID();

  createNewAction(
    actionId,
    arrItems.length == 1 ? arrItems[0].getAttribute("itemname") : "Archive",
    arrItems.length == 1
      ? "into " + compressionType + " with level " + compressionLevel
      : "Archive",
    arrItems.length == 1 ? arrItems[0].getAttribute("itempath") : null,
  );

  // Update the file size info of the file which is being compressed
  if (arrItems.length > 1) {
    var filePath = CurrentDir + "/compressed_items_archive." + compressionType;
  } else {
    var filePath =
      arrItems[0].getAttribute("itempath") +
      (compressionType == "br" ? ".tar" : "") +
      "." +
      compressionType;
  }
  let isCompressingDone = false;
  let intervalId = setInterval(async () => {
    if (!isCompressingDone) {
      try {
        var item = await invoke("get_single_item_info", {
          path: filePath,
        });
      } catch (error) {
        if (error.includes("No such file or directory")) {
          return;
        }
        console.log(error);
        isCompressingDone = true;
        showToast("Compressing stopped", ToastType.ERROR);
        clearInterval(intervalId);
        removeAction(actionId);
        return;
      }
      let itemSize = document.getElementById(`size-${filePath}`);
      if (itemSize) {
        itemSize.textContent = formatBytes(parseInt(item.size), 2);
      }
    } else {
      clearInterval(intervalId);
    }
  }, 200);

  if (arrItems.length > 1) {
    await invoke("arr_compress_items", {
      arrItems: arrItems.map((item) => item.getAttribute("itempath")),
      compressionLevel: parseInt(compressionLevel),
      compressionType: compressionType,
      intervalId: intervalId,
    });
    await listDirectories();
  } else {
    let item = arrItems[0];
    let compressFilePath = item.getAttribute("itempath");
    let compressFileName = item.getAttribute("itemname");
    if (compressFileName != "") {
      SelectedItemPaneSide = item.getAttribute("itempaneside");
      await invoke("compress_item", {
        fromPath: compressFilePath,
        compressionLevel: parseInt(compressionLevel),
        compressionType: compressionType,
        pathToZip: compressFilePath,
        intervalId: intervalId,
      });
      await listDirectories();
    }
  }
  isCompressingDone = true;
  removeAction(actionId);
  scheduleDiskUsageRefresh();
}

async function closeCompressPopup() {
  let popup = document.querySelector(".compression-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsInputFocused = false;
    }, { once: true });
  } else {
    IsPopUpOpen = false;
    IsInputFocused = false;
  }
}

function showLoadingPopup(msg) {
  let body = document.querySelector("body");
  let popup = document.createElement("div");
  popup.innerHTML = `
    <h4>${msg}</h4>
    <div class="preloader"></div>
    `;
  popup.className = "uni-popup loading-popup";
  body.append(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;
}
function closeLoadingPopup() {
  let popup = document.querySelector(".loading-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
    }, { once: true });
  } else {
    IsPopUpOpen = false;
  }
}

function showInputPopup(msg) {
  let body = document.querySelector("body");
  let popup = document.createElement("div");
  popup.innerHTML = `
    <h4 style="color: var(--textColor);">${msg}</h4>
    <input class="text-input" placeholder="/path/to/dir" autofocus/>
    `;
  popup.className = "input-popup input-dialog uni-popup";
  popup.children[1].addEventListener("keyup", async (e) => {
    if (e.keyCode == 13) {
      await openDirAndSwitch(popup.children[1].value);
      await listDirectories();
      closeInputPopup();
    }
  });
  body.append(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;
  popup.children[1].focus();
  IsInputFocused = true;
  popup.children[1].addEventListener("focusout", () => {
    resetEverything();
    IsInputFocused = false;
  });
}

function closeInputPopup() {
  let popup = document.querySelector(".input-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
    }, { once: true });
  } else {
    IsPopUpOpen = false;
  }
}

function normalizePath(path = "") {
  return String(path ?? "").replaceAll("\\", "/").replace(/\/+$/, "");
}

function parentPath(path = "") {
  let normalized = normalizePath(path);
  let index = normalized.lastIndexOf("/");
  if (index <= 0) return index === 0 ? "/" : "";
  return normalized.slice(0, index);
}

function joinPath(base = "", name = "") {
  let normalizedBase = normalizePath(base);
  if (normalizedBase === "") return name;
  if (normalizedBase === "/") return `/${name}`;
  return `${normalizedBase}/${name}`;
}

function comparablePath(path = "") {
  let normalized = normalizePath(path);
  return ["darwin", "windows"].includes(Platform) ? normalized.toLowerCase() : normalized;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toCopyModel(item) {
  return {
    name: item.getAttribute("itemname") ?? "",
    path: item.getAttribute("itempath") ?? "",
    is_dir: parseInt(item.getAttribute("itemisdir") ?? 0) ?? 0,
    size: item.getAttribute("itemrawsize") ?? "",
    last_modified: item.getAttribute("itemmodified") ?? "",
    extension: item.getAttribute("itemext") ?? "",
  };
}

function formatConflictMeta(item) {
  let modified = item?.last_modified ? `Modified ${item.last_modified}` : "Modified unknown";
  let size = item?.is_dir == 1 ? "Folder" : formatBytes(parseInt(item?.size ?? 0), 2);
  return `${modified} • ${size}`;
}

async function getDestinationConflict(item, destinationPath) {
  try {
    let existing = await invoke("get_single_item_info", { path: destinationPath });
    return { item, existing, destinationPath };
  } catch (_) {
    return null;
  }
}

function isConflictActionValid(action, conflict) {
  if (action !== "merge") return true;
  return conflict.item.is_dir == 1 && conflict.existing.is_dir == 1;
}

async function resolveCopyMoveConflicts(items, targetPath, shouldMove = false) {
  let resolvedItems = [];
  let conflicts = [];

  for (let item of items) {
    let destinationPath = joinPath(targetPath, item.name);
    if (shouldMove && comparablePath(item.path) === comparablePath(destinationPath)) {
      showToast("Cannot move item onto itself", ToastType.ERROR);
      writeLog(`Move skipped: source and destination are the same path (${item.path})`);
      continue;
    }
    let conflict = await getDestinationConflict(item, destinationPath);
    if (conflict) {
      conflicts.push(conflict);
    } else {
      resolvedItems.push({
        source_path: item.path,
        destination_path: destinationPath,
        policy: "copy",
      });
    }
  }

  let applyToAllAction = null;
  for (let i = 0; i < conflicts.length; i++) {
    let conflict = conflicts[i];
    let decision = null;

    if (applyToAllAction && isConflictActionValid(applyToAllAction, conflict)) {
      decision = { action: applyToAllAction, applyToAll: true };
    } else {
      decision = await showDestinationConflictPopup(conflict, i + 1, conflicts.length);
    }

    if (decision.action === "cancel") {
      return null;
    }
    if (decision.applyToAll) {
      applyToAllAction = decision.action;
    }
    if (decision.action === "skip") {
      continue;
    }

    resolvedItems.push({
      source_path: conflict.item.path,
      destination_path: conflict.destinationPath,
      policy: decision.action,
    });
  }

  return resolvedItems;
}

async function runResolvedCopyMove(items, targetPath, shouldMove = false) {
  if (!targetPath || items.length === 0) return [];

  let resolvedItems = await resolveCopyMoveConflicts(items, targetPath, shouldMove);
  if (resolvedItems === null) {
    showToast("Operation cancelled", ToastType.INFO);
    return [];
  }

  let result;
  try {
    result = await invoke("arr_copy_paste_resolved", { items: resolvedItems });
  } catch (error) {
    showToast(`Copy failed: ${error}`, ToastType.ERROR);
    return [];
  }
  let copiedSources = Array.isArray(result) ? result : (result?.copied_sources ?? []);
  let errors = Array.isArray(result) ? [] : (result?.errors ?? []);
  if (errors.length > 0) {
    showToast(`${errors.length} item(s) failed to copy. Source files were kept.`, ToastType.ERROR);
    errors.forEach((error) => writeLog(`Copy failed: ${error}`));
  }
  if (shouldMove && copiedSources.length > 0) {
    await invoke("arr_delete_items", { arrItems: copiedSources });
  }
  if (copiedSources.length > 0) {
    scheduleDiskUsageRefresh();
  }
  return copiedSources;
}

async function showDestinationConflictPopup(conflict, index, total) {
  let isFolderConflict = conflict.item.is_dir == 1 && conflict.existing.is_dir == 1;
  let popup = document.createElement("div");
  popup.className = "uni-popup destination-conflict-popup";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-labelledby", "destination-conflict-title");
  popup.setAttribute("aria-describedby", "destination-conflict-desc");
  popup.innerHTML = `
    <div class="popup-header destination-conflict-header">
      <div class="destination-conflict-title-row">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <h3 id="destination-conflict-title">Item already exists</h3>
      </div>
      <p class="destination-conflict-count">Conflict ${index} of ${total}</p>
    </div>
    <div class="popup-body destination-conflict-body">
      <p id="destination-conflict-desc" class="popup-body-content">“${escapeHtml(conflict.item.name)}” already exists in the destination.</p>
      <div class="destination-conflict-comparison" aria-label="Item comparison">
        <section class="destination-conflict-card">
          <h4>Incoming item</h4>
          <p class="destination-conflict-name" title="${escapeHtml(conflict.item.path)}">${escapeHtml(conflict.item.name)}</p>
          <p class="text-2"><i class="fa-regular fa-clock" style="font-size: 11px;"></i> ${escapeHtml(formatConflictMeta(conflict.item))}</p>
          <p class="text-2" title="${escapeHtml(conflict.item.path)}"><i class="fa-solid fa-folder-open" style="font-size: 11px;"></i> From: ${escapeHtml(normalizePath(conflict.item.path).split("/").slice(0, -1).join("/") || "/")}</p>
        </section>
        <section class="destination-conflict-card">
          <h4>Existing item</h4>
          <p class="destination-conflict-name" title="${escapeHtml(conflict.existing.path)}">${escapeHtml(conflict.existing.name)}</p>
          <p class="text-2"><i class="fa-regular fa-clock" style="font-size: 11px;"></i> ${escapeHtml(formatConflictMeta(conflict.existing))}</p>
          <p class="text-2" title="${escapeHtml(conflict.destinationPath)}"><i class="fa-solid fa-location-dot" style="font-size: 11px;"></i> In: ${escapeHtml(normalizePath(conflict.destinationPath).split("/").slice(0, -1).join("/") || "/")}</p>
        </section>
      </div>
      <fieldset class="destination-conflict-options">
        <legend>Choose what to do</legend>
        <label><input type="radio" name="conflict-action" value="replace"> <span>Replace existing item</span><small>This will overwrite the existing item.</small></label>
        <label class="${isFolderConflict ? "" : "is-disabled"}"><input type="radio" name="conflict-action" value="merge" ${isFolderConflict ? "" : "disabled"}> <span>Merge folders</span><small>${isFolderConflict ? "Combine folder contents." : "Available only when both items are folders."}</small></label>
        <label><input type="radio" name="conflict-action" value="duplicate" checked> <span>Keep both</span><small>Create a duplicate with a new name.</small></label>
      </fieldset>
      ${total > 1 ? `<label class="destination-conflict-apply-all"><input type="checkbox" class="destination-conflict-apply-all-input"> Apply this choice to all remaining conflicts</label>` : ""}
    </div>
    <div class="popup-controls destination-conflict-controls">
      <button class="icon-button destination-conflict-cancel"><div class="button-icon"><i class="fa-solid fa-xmark"></i></div>Cancel</button>
      <button class="icon-button destination-conflict-skip"><div class="button-icon"><i class="fa-solid fa-forward-step"></i></div>Skip</button>
      <button class="icon-button destination-conflict-confirm"><div class="button-icon"><i class="fa-solid fa-check"></i></div>Continue</button>
    </div>`;
  document.querySelector(".main-container").appendChild(popup);
  popup.classList.add("popup-enter");

  let previouslyFocused = document.activeElement;
  IsPopUpOpen = true;
  IsDisableShortcuts = true;
  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1"));
  popup.querySelector(".destination-conflict-confirm").focus();

  return new Promise((resolve) => {
    let isClosed = false;
    let focusableSelector = "button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    let close = (action) => {
      if (isClosed) return;
      isClosed = true;
      let selected = popup.querySelector("input[name='conflict-action']:checked")?.value ?? "duplicate";
      let applyToAll = popup.querySelector(".destination-conflict-apply-all-input")?.checked ?? false;
      popup.classList.add("popup-exit");
      popup.addEventListener("animationend", () => {
        popup?.remove();
        $(".popup-background").css("display", "none");
        $(".popup-background").css("opacity", "0");
        IsPopUpOpen = false;
        IsDisableShortcuts = false;
        if (previouslyFocused && typeof previouslyFocused.focus === "function") {
          previouslyFocused.focus();
        }
        resolve({ action: action ?? selected, applyToAll });
      }, { once: true });
    };

    popup.querySelector(".destination-conflict-cancel").onclick = () => close("cancel");
    popup.querySelector(".destination-conflict-skip").onclick = () => close("skip");
    popup.querySelector(".destination-conflict-confirm").onclick = () => close();
    popup.onkeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close("cancel");
      }
      if (event.key === "Tab") {
        let focusable = [...popup.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
        if (focusable.length === 0) return;
        let first = focusable[0];
        let last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === "Enter" && !["INPUT", "LABEL"].includes(event.target.tagName)) {
        event.preventDefault();
        close();
      }
    };
  });
}

async function itemMoveTo(isForDualPane = false) {
  // ContextMenu.style.display = "none";
  let selectedPath = "";
  if (isForDualPane == false) {
    selectedPath = await open({ multiple: false, directory: true });
  } else {
    switch (SelectedItemPaneSide) {
      case "left":
        await setCurrentDir(RightDualPanePath, "right");
        selectedPath = CurrentDir;
        break;
      case "right":
        await setCurrentDir(LeftDualPanePath, "left");
        selectedPath = CurrentDir;
        break;
    }
  }

  let arr = ArrSelectedItems.map(toCopyModel);

  if (selectedPath != "" && selectedPath != null) {
    let copiedSources = await runResolvedCopyMove(arr, selectedPath, true);
    if (copiedSources.length > 0) {
      if (isForDualPane) {
        refreshBothViews(SelectedItemPaneSide);
      } else {
        refreshView();
      }
    }
  }
}

async function pasteItem(copyToPath = "", isCopyToCut = false) {
  let arr = [];
  if (IsDualPaneEnabled == true) {
    arr = ArrSelectedItems;
  } else {
    arr = ArrCopyItems;
  }

  arr = arr.map(toCopyModel);

  let targetPath = copyToPath;

  if (IsDualPaneEnabled == true) {
    if (SelectedItemPaneSide == "left") {
      await invoke("set_dir", { currentDir: RightDualPanePath });
      targetPath = copyToPath || RightDualPanePath;
    } else if (SelectedItemPaneSide == "right") {
      await invoke("set_dir", { currentDir: LeftDualPanePath });
      targetPath = copyToPath || LeftDualPanePath;
    }
  } else {
    targetPath = copyToPath || CurrentDir;
  }

  if (isCopyToCut == true || IsCopyToCut == true) {
    let targetDirectory = normalizePath(targetPath);
    let sourceParents = arr.map((element) => parentPath(element.path));
    if (sourceParents.includes(targetDirectory)) {
      alert("Cannot copy to the same directory");
      writeLog("Cannot copy to the same directory");
      return;
    }
    let copiedSources = await runResolvedCopyMove(arr, targetPath, true);
    if (copiedSources.length > 0) {
      ArrCopyItems = [];
      IsCopyToCut = false;
      if (IsDualPaneEnabled === true) {
        refreshBothViews(SelectedItemPaneSide);
      }
      await listDirectories(IsDualPaneEnabled === true);
    }
  } else {
    let copiedSources = await runResolvedCopyMove(arr, targetPath, false);
    if (copiedSources.length > 0) {
      await unSelectAllItems();
      if (IsDualPaneEnabled === true) {
        refreshBothViews(SelectedItemPaneSide);
      }
    }
  }
}

function createFolderInputPrompt() {
  document.querySelectorAll(".input-dialog").forEach((item) => {
    item.remove();
  });
  let nameInput = document.createElement("div");
  nameInput.className = "input-dialog uni-popup";
  nameInput.innerHTML = `
    <h4 class="input-dialog-headline">Type in a name for your new folder.</h4>
    <input class="text-input" type="text" placeholder="New folder" autofocus>
    `;
  document.querySelector("body").append(nameInput);
  // ContextMenu.style.display = "none";
  nameInput.children[1].focus();
  IsInputFocused = true;
  IsDisableShortcuts = true;
  IsPopUpOpen = false;
  nameInput.addEventListener("keyup", (e) => {
    if (e.keyCode === 13) {
      createFolder(nameInput.children[1].value);
      resetEverything();
      nameInput.remove();
    }
  });
  IsPopUpOpen = true;
  nameInput.addEventListener("focusout", () => {
    IsInputFocused = false;
  });
  nameInput.addEventListener("focusin", () => {
    IsInputFocused = true;
  });
}

function createFileInputPrompt(e) {
  $(".input-dialog").remove();
  let nameInput = document.createElement("div");
  nameInput.className = "input-dialog";
  nameInput.innerHTML = `
    <h4 class="input-dialog-headline">Type in a name for your new file.</h4>
    <input class="text-input" type="text" placeholder="New document" autofocus>
    `;
  document.querySelector("body").append(nameInput);
  // ContextMenu.style.display = "none";
  nameInput.children[1].focus();
  IsInputFocused = true;
  IsDisableShortcuts = true;
  nameInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      createFile(nameInput.children[1].value);
      resetEverything();
      nameInput.remove();
    }
  });
  IsPopUpOpen = true;
  nameInput.addEventListener("focusout", () => {
    IsInputFocused = false;
  });
  nameInput.addEventListener("focusin", () => {
    IsInputFocused = true;
  });
}

function closeInputDialogs() {
  $(".input-dialog").remove();
  IsDisableShortcuts = false;
  IsInputFocused = false;
  IsPopUpOpen = false;
}

function renameElementInputPrompt(item) {
  unSelectAllItems();
  let tempFilePath = item.getAttribute("itempath");
  let tempRenameFilePath = item.getAttribute("itempath").split("/");
  let tempFileName = tempRenameFilePath[tempRenameFilePath.length - 1].replace(
    "'",
    "",
  );
  let nameInput = document.createElement("div");

  nameInput.className = "input-dialog";
  nameInput.innerHTML = `
    <h4 class="input-dialog-headline">Type in a new name for this item.</h4>
    <input class="text-input" type="text" placeholder="document.txt" value="${tempFileName}" required pattern="[0-9]" autofocus>
    `;

  document.querySelector("body").append(nameInput);
  IsDisableShortcuts = true;
  IsPopUpOpen = true;
  nameInput.children[1].focus();
  IsInputFocused = true;
  nameInput.addEventListener("keydown", (e) => {
    if (e.key == "Enter" && IsPopUpOpen == true) {
      renameElement(tempFilePath, nameInput.children[1].value);
      nameInput.remove();
      IsDisableShortcuts = false;
      IsPopUpOpen = false;
    }
  });
  nameInput.addEventListener("focusout", () => {
    IsInputFocused = false;
  });
  nameInput.addEventListener("focusin", () => {
    IsInputFocused = true;
  });
  IsPopUpOpen = true;
}

async function createFolder(folderName) {
  let isDualPaneEnabled = IsDualPaneEnabled;
  await invoke("create_folder", { folderName, isDualPaneEnabled });
  listDirectories();
  scheduleDiskUsageRefresh();
}

async function createFile(fileName) {
  await invoke("create_file", { fileName });
  listDirectories();
  scheduleDiskUsageRefresh();
}

async function renameElement(path, newName) {
  await invoke("rename_element", { path, newName, appWindow });
  IsInputFocused = false;
  await listDirectories();
  scheduleDiskUsageRefresh();
}

async function showAppInfo() {
  alert(`
    App version: ${await getVersion()}
    Tauri version: ${await getTauriVersion()}
    Architecture: ${await arch()}
    Developer: Ricky Dane


    Shortcuts:

    Navigation & General
    Ctrl / Cmd + C – Copy the currently selected item
    Ctrl / Cmd + X – Cut the currently selected item
    Ctrl / Cmd + V – Paste the currently copied/cut item
    Esc – Close pop-up windows.
    Ctrl / Cmd + G – Jump to a directory by entering a path.
    Space – Quick preview of a selected file (supported formats: images, PDF, MP4, JSON, TXT, HTML).

    File & Folder Operations
    F6 – Create a new file.
    F7 – Create a new folder.
    Ctrl / Cmd + LShift + M – Start multi-rename on selected items.
    Ctrl / Cmd + Return – Execute the multi-rename operation.

    Sorting & Filtering
    Start typing – Instantly filter directory entries (instant navigation).
    View & Layout

    Dual-Pane Mode
    F5 – Copy the currently selected item to the other pane.
    LShift + F5 – Move the currently selected item to the other pane.
    F8 – Search for files (add. with content)

    Directory Navigation
    LAlt + 1 / 2 / 3 (macOS: Option + 1 / 2 / 3) – Navigate to a pre-configured directory (set in Settings).

    Multi-Rename
    Ctrl / Cmd + LShift + M – Initiate multi-rename.
    Ctrl / Cmd + Return – Run the multi-rename.
  `);
}

async function checkAppConfig() {
  await applyPlatformFeatures();
  await invoke("check_app_config").then(async (appConfig) => {
    let viewMode = appConfig.view_mode.replaceAll('"', "");
    await switchView(viewMode);

    if (appConfig.is_dual_pane_enabled.includes("1")) {      document.querySelector(".show-dual-pane-checkbox").checked = true;
      document.querySelector(".switch-dualpane-view-button").style.display =
        "block";
    } else {
      document.querySelector(".show-dual-pane-checkbox").checked = false;
      document.querySelector(".switch-dualpane-view-button").style.display =
        "none";
    }
    if (appConfig.is_select_mode.includes("1")) {
      document.querySelector("#choose-interaction-mode").checked = true;
      IsSelectMode = true;
    } else {
      document.querySelector("#choose-interaction-mode").checked = false;
      IsSelectMode = false;
    }

    if (appConfig.is_image_preview.includes("1")) {
      document.querySelector(".image-preview-checkbox").checked =
        IsImagePreview = true;
    } else {
      document.querySelector(".image-preview-checkbox").checked = false;
    }

    // Theme options
    CurrentTheme = appConfig.current_theme;
    ArrFavorites = appConfig.arr_favorites || [];
    appConfig.themes = await invoke("get_themes");
    // Fallback when there's no theme installed
    if (appConfig.themes.length == 0) {
      appConfig.themes = [
        {
          name: "Default",
          primary_color: "#3f4352",
          secondary_color: "rgba(56, 59, 71, 1)",
          tertiary_color: "#474b5c",
          text_color: "rgba(255, 255, 255, 0.8)",
          text_color2: "rgba(255, 255, 255, 0.6)",
          text_color3: "rgb(255, 255, 255)",
          transparent_color: "rgba(0, 0, 0, 0.15)",
          transparent_color_active: "rgba(0, 0, 0, 0.25)",
          site_bar_color: "rgb(45, 47, 57)",
          nav_bar_color: "rgba(30, 30, 40, 0.5)",
        },
      ];
    }
    let themeSelect = document.querySelector(".theme-select");
    themeSelect.innerHTML = "";
    let themeCounter = 0;
    appConfig.themes.forEach((theme) => {
      let themeOption = document.createElement("option");
      themeOption.value = themeCounter;
      themeOption.textContent = theme.name;
      themeSelect.appendChild(themeOption);
      themeCounter++;
    });

    // Set current theme
    themeSelect.value = CurrentTheme;

    checkColorMode(appConfig);

    // General configurations
    document.querySelector(".configured-path-one-input").value =
      ConfiguredPathOne = appConfig.configured_path_one;
    document.querySelector(".configured-path-two-input").value =
      ConfiguredPathTwo = appConfig.configured_path_two;
    document.querySelector(".configured-path-three-input").value =
      ConfiguredPathThree = appConfig.configured_path_three;
    document.querySelector(".launch-path-input").value = appConfig.launch_path;
    document.querySelector(".search-depth-input").value = SettingsSearchDepth =
      parseInt(appConfig.search_depth);
    document.querySelector(".max-items-input").value = SettingsMaxItems =
      parseInt(appConfig.max_items);

    // New settings
    let fontSize = parseInt(appConfig.font_size) || 12;
    document.querySelector(".font-size-slider").value = fontSize;
    document.getElementById("font-size-value").textContent = fontSize + "px";
    document.documentElement.style.setProperty("--fontSize", fontSize + "px");

    if (appConfig.is_window_transparency && appConfig.is_window_transparency.includes("1")) {
      document.querySelector(".window-transparency-checkbox").checked = true;
      document.body.style.opacity = "0.78";
    } else {
      document.querySelector(".window-transparency-checkbox").checked = false;
      document.body.style.opacity = "1.0";
    }

    if (appConfig.is_dual_pane_active.includes("1")) {
      await switchToDualPane();
      if (appConfig.launch_path.length >= 1) {
        let path = appConfig.launch_path;
        let isSwitched = await invoke("open_dir", { path });
        if (isSwitched === true) {
          await setCurrentDir(path, "left", false);
          await listDirectories();
        }
      } else {
        await initDualPane(await getCurrentDir());
        await goHome();
      }
    } else if (appConfig.launch_path.length >= 1 && IsFirstRun == true) {
      let path = appConfig.launch_path;
      let isSwitched = await invoke("open_dir", { path });
      if (isSwitched === true) {
        await setCurrentDir(path, "left", false);
        await listDirectories();
      } else {
        alert(
          "No directory found or unable to open due to missing permissions",
        );
      }
    } else {
      await initDualPane(await getCurrentDir());
      await goHome();
    }
  });
  await configBackButton();
  await unSelectAllItems();
  IsFirstRun = false;
}

async function applyPlatformFeatures() {
  Platform = await platform();
  // Check for macOS and position titlebar buttons on the left
  if (Platform == "darwin") {
    let headerNav = document.querySelector(".header-nav");
    // headerNav.style.borderBottom = "none";
    headerNav.style.boxShadow = "none";
    $(".site-nav-bar").css("padding-top", "50px");
    $(".file-searchbar-shortcut").text("⌘F");
  } else {
    appWindow.setDecorations(false);
    $(".windows-linux-titlebar-buttons").css("display", "flex");
    $(".minimize-button").on("click", () => appWindow.minimize());
    $(".maximize-button").on("click", () => appWindow.toggleMaximize());
    $(".close-button").on("click", () => appWindow.close());
    $(".file-searchbar-shortcut").text("Ctrl+F");
  }
  DefaultFileIcon = await resolveResource("resources/file-icon.png");
  DefaultFolderIcon = await resolveResource("resources/folder-icon.png");
}

async function listDisks() {
  await invoke("list_disks").then((disks) => {
    IsShowDisks = true;
    document.querySelector(".disk-list-column-header").style.display = "block";
    document.querySelector(".normal-list-column-header").style.display = "none";
    document.querySelector(".tab-container-" + CurrentActiveTab).innerHTML = "";
    DirectoryList = document.createElement("div");
    DirectoryList.className = "directory-list";
    disks.forEach((item) => {
      let itemLink = document.createElement("button");
      itemLink.setAttribute(
        "itempath",
        item.path.replace('"', "").replace('"', ""),
      );
      itemLink.setAttribute(
        "itemname",
        item.name.replace('"', "").replace('"', ""),
      );
      itemLink.setAttribute("itemisdir", 1);
      itemLink.setAttribute("itemisdisk", "1");
      itemLink.setAttribute(
        "itemisremovable",
        isEjectableDisk(item) ? "1" : "0",
      );
      itemLink.className = "item-link directory-entry";
      let itemButton = document.createElement("div");
      itemButton.setAttribute("itemisdisk", "1");
      itemButton.setAttribute(
        "itemisremovable",
        itemLink.getAttribute("itemisremovable"),
      );
      if (item.name == "") {
        item.name = "/";
      }

      if (ViewMode == "miller") {
        $(".miller-container")?.css("display", "none");
        $(".non-dual-pane-container")?.css("display", "flex");
        $(".explorer-container")?.css("display", "block");
        $(".explorer-container")?.css("padding", "85px 20px 20px 20px");
      }

      let usedPercentage = 100 - evalCurrentLoad(item.avail, item.capacity);
      itemButton.innerHTML = `
        <div class="disk-card">
          <img class="disk-card-icon" src="resources/disk-icon.png" />
          <div class="disk-card-body">
            <div class="disk-card-header">
              <div class="disk-card-title-group">
                <h3 class="disk-card-name">${item.name}</h3>
                <span class="disk-card-filesystem">${item.format.replace(/"/g, "")}</span>
              </div>
              <span class="disk-card-usage-percent">${usedPercentage}% used</span>
            </div>

            <div class="disk-card-usage-bar-bg">
              <div class="disk-card-usage-bar-fill" style="width: ${usedPercentage}%"></div>
            </div>

            <div class="disk-card-stats-row">
              <span>Total ${formatBytes(item.capacity)}</span>
              <span>Used ${formatBytes(item.capacity - item.avail)}</span>
              <span>Available ${formatBytes(item.avail)}</span>
            </div>
          </div>
        </div>
      `;
      itemButton.className = "disk-item-button-button directory-entry";

      DirectoryList.style.gridTemplateColumns = "unset";
      DirectoryList.style.rowGap = "2px";

      itemButton.style.width = "100%";
      itemLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await interactWithItem(itemLink, "", null, e);
      });
      itemLink.addEventListener("dblclick", async (e) => {
        e.preventDefault();
        await openItem(itemLink, "");
      });
      itemLink.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cdCtMenu.setSelectedItem(itemLink, e);
        cdCtMenu.show(e);
      });
      itemLink.append(itemButton);
      DirectoryList.append(itemLink);
      document.querySelector(".current-path").innerHTML = `
        <div class="path-item">Disks</div>
        `;
    });
  });
  document
    .querySelector(".tab-container-" + CurrentActiveTab)
    .append(DirectoryList);
}

function isEjectableDisk(item) {
  const path = item.path?.replace(/"/g, "") ?? "";
  if (!path || path === "/") return false;
  if (Platform === "darwin") {
    return item.is_removable === true && path.startsWith("/Volumes/");
  }
  return item.is_removable === true;
}

async function listDirectories(fromDualPaneCopy = false) {
  let lsItems = await invoke("list_dirs");
  if (IsDualPaneEnabled == true) {
    ViewMode = "column";
    if (fromDualPaneCopy == true) {
      switch (SelectedItemPaneSide) {
        case "left":
          CurrentDir = RightDualPanePath;
          await showItems(lsItems, "right");
          break;
        case "right":
          CurrentDir = LeftDualPanePath;
          await showItems(lsItems, "left");
          break;
      }
    } else {
      await showItems(lsItems, SelectedItemPaneSide);
    }
    goUp(false, true);
  } else {
    await showItems(lsItems, "", CurrentMillerCol);
  }
  setTimeout(() => {
    ds.setSettings({
      selectables: document.querySelectorAll(".item-link"),
    });
  }, 500);
}

async function refreshView() {
  await listDirectories();
}

async function refreshBothViews(dualPaneSide = "") {
  if (IsDualPaneEnabled == true) {
    const origSide = dualPaneSide || SelectedItemPaneSide || "left";
    const otherSide = origSide === "left" ? "right" : "left";
    const origPath = origSide === "left" ? LeftDualPanePath : RightDualPanePath;
    const otherPath = origSide === "left" ? RightDualPanePath : LeftDualPanePath;

    // Refresh the inactive pane first
    await setCurrentDir(otherPath, otherSide);
    await listDirectories();

    // Refresh the active pane second, ensuring focus and state remain on the correct side
    await setCurrentDir(origPath, origSide);
    await listDirectories();

    goUp(false, true);
  } else {
    await listDirectories();
  }
}

async function interactWithItem(
  element = null,
  dualPaneSide = "",
  shortcutPath = null,
  e = null,
) {
  let isDir = element?.getAttribute("itemisdir");
  if (dualPaneSide == "left") {
    document.querySelector(".dual-pane-left").style.boxShadow =
      "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
    document.querySelector(".dual-pane-right").style.boxShadow = "none";
  } else if (dualPaneSide == "right") {
    document.querySelector(".dual-pane-right").style.boxShadow =
      "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
    document.querySelector(".dual-pane-left").style.boxShadow = "none";
  }

  const isMeta = e ? e.metaKey : (window.event ? window.event.metaKey : false);
  const isShift = e ? e.shiftKey : (window.event ? window.event.shiftKey : false);

  // Interaction mode: Select
  if (
    element != null &&
    element != SelectedItemToOpen &&
    IsSelectMode == true &&
    (isDir == 0 || ViewMode != "miller" || isMeta == true)
  ) {
    if (isShift === true) {
      if (IsDualPaneEnabled === false) {
        let firstIndex = parseInt(SelectedElement.getAttribute("itemindex"));
        let lastIndex = parseInt(element.getAttribute("itemindex"));
        unSelectAllItems();
        if (firstIndex < lastIndex) {
          for (let i = firstIndex; i <= lastIndex; i++) {
            selectItem(DirectoryList.children[i], "", false, true, e);
          }
        } else {
          for (let i = firstIndex; i >= lastIndex; i--) {
            selectItem(DirectoryList.children[i], "", false, true, e);
          }
        }
      } else {
        if (dualPaneSide == "left") {
          let firstIndex = parseInt(
            SelectedElement?.getAttribute("itemindex") ?? 0,
          );
          let lastIndex = parseInt(element.getAttribute("itemindex"));
          unSelectAllItems();
          if (firstIndex < lastIndex) {
            for (let i = firstIndex; i <= lastIndex; i++) {
              selectItem(LeftPaneItemCollection.children[i], "", false, true, e);
            }
          } else {
            for (let i = firstIndex; i >= lastIndex; i--) {
              selectItem(LeftPaneItemCollection.children[i], "", false, true, e);
            }
          }
        } else {
          let firstIndex = parseInt(
            SelectedElement?.getAttribute("itemindex") ?? 0,
          );
          let lastIndex = parseInt(element.getAttribute("itemindex"));
          unSelectAllItems();
          if (firstIndex < lastIndex) {
            for (let i = firstIndex; i <= lastIndex; i++) {
              selectItem(RightPaneItemCollection.children[i], "", false, true, e);
            }
          } else {
            for (let i = firstIndex; i >= lastIndex; i--) {
              selectItem(RightPaneItemCollection.children[i], "", false, true, e);
            }
          }
        }
      }
    } else {
      await selectItem(element, "", false, true, e);
    }
  }
  // Interaction mode: Open item
  else if (
    (element != null &&
      (element == SelectedItemToOpen || IsSelectMode == false)) ||
    (isDir == 1 && ViewMode == "miller" && isMeta == false)
  ) {
    await openItem(element, dualPaneSide, shortcutPath);
  }
  // Double click logic / reset after 250 ms to force double click to open
  setTimeout(() => {
    SelectedItemToOpen = null;
  }, 250); // TODO: Maybe make this customizable in the future
}

async function openItem(element, dualPaneSide, shortcutDirPath = null) {
  let isDir =
    element != null
      ? parseInt(element.getAttribute("itemisdir"))
      : shortcutDirPath != null
        ? 1
        : 0;
  let path =
    element != null ? element.getAttribute("itempath") : shortcutDirPath;
  let millerCol =
    element != null ? element.getAttribute("itemformillercol") : null;
  let ext = element != null ? element.getAttribute("itemext") : null;
  if (IsPopUpOpen == false || IsQuickSearchOpen === true) {
    if (IsItemPreviewOpen == false && isDir == 1 && ext != ".app") {
      // Open directory
      let isSwitched = await invoke("open_dir", { path });
      if (isSwitched == true) {
        await configBackButton(CurrentDir);
        if (IsDualPaneEnabled === false) {
          if (ViewMode == "miller") {
            $(".selected-item").removeClass("selected-item");
            element.classList.add("selected-item");
            await removeExcessMillerCols(parseInt(millerCol));
            await addMillerCol(millerCol);
            await setMillerColActive(null, millerCol);
            await listDirectories();
          } else {
            await listDirectories();
          }
          await setCurrentDir(path, "", false);
        } else {
          if (dualPaneSide == "left") {
            LeftDualPanePath = path;
          } else {
            RightDualPanePath = path;
          }
          SelectedItemPaneSide = dualPaneSide;
          await setCurrentDir(path, SelectedItemPaneSide, false);
          await listDirectories();
        }
        await unSelectAllItems();
      } else {
        alert("Could not open directory");
        return;
      }
    } else if (IsItemPreviewOpen == false) {
      await invoke("open_item", { path });
    }
  }
}

async function selectItem(
  element,
  dualPaneSide = "",
  isNotReset = false,
  triggerCalculation = true,
  e = null,
) {
  if (element == null || element == undefined) {
    return;
  }
  cdCtMenu.hide();
  cdCtMenu.hideSubMenu();
  let path = element?.getAttribute("itempath");
  let index = element?.getAttribute("itemindex");

  const isMeta = e ? e.metaKey : (window.event ? window.event.metaKey : false);
  const isCtrl = e ? e.ctrlKey : (window.event ? window.event.ctrlKey : false);
  const isShift = e ? e.shiftKey : (window.event ? window.event.shiftKey : false);

  // Reset colored selection
  if (
    SelectedElement != null &&
    isMeta == false &&
    isCtrl == false &&
    isShift == false &&
    isNotReset === false
  ) {
    ArrSelectedItems.forEach((item) => {
      if (IsDualPaneEnabled) {
        item.children[0].classList.remove("selected-item");
      } else if (ViewMode == "column" || ViewMode == "miller") {
        if (IsShowDisks == true) {
          (item.children[1] ?? item.children[0])?.classList.remove(
            "selected-item",
          );
        } else {
          item.children[0].classList.remove("selected-item");
        }
      } else {
        if (IsShowDisks == true) {
          item.children[0].classList.remove("selected-item");
        } else {
          item.children[0].children[0].classList.remove("selected-item");
          item.children[0].children[1].classList.remove("selected-item-min");
        }
      }
    });
    ArrSelectedItems = [];
  }
  SelectedElement = element; // Switch to new element / selection
  SelectedItemToOpen = isNotReset ? null : element;
  if (IsDualPaneEnabled) {
    SelectedElement?.children[0].classList.add("selected-item");
  } else if (ViewMode == "column" || ViewMode == "miller") {
    if (IsShowDisks == true) {
      (
        SelectedElement?.children[1] ?? SelectedElement?.children[0]
      )?.classList.add("selected-item");
    } else {
      SelectedElement?.children[0].classList.add("selected-item");
    }
  } else {
    if (IsShowDisks == true) {
      SelectedElement?.children[0].classList.add("selected-item");
    } else {
      SelectedElement?.children[0].children[0].classList.add("selected-item");
      SelectedElement?.children[0].children[1].classList.add(
        "selected-item-min",
      );
    }
  }
  SelectedElement.setAttribute("itemisselected", true);
  SelectedItemPath = path;
  if (dualPaneSide != "" && dualPaneSide != null) {
    SelectedItemPaneSide = dualPaneSide;
  }
  if (dualPaneSide == "left") {
    LeftPaneItemIndex = index;
  } else if (dualPaneSide == "right") {
    RightPaneItemIndex = index;
  }
  // Switch item preview when already open
  if (IsItemPreviewOpen == true) {
    await showItemPreview(SelectedElement, true);
  }
  ArrSelectedItems.push(SelectedElement);
  updateSelectionInfo(triggerCalculation);
}

listen("size-update", (event) => {
  const [id, size, count] = event.payload;
  if (id === "selection") {
    let selectionInfo = document.querySelector(".selection-info");
    if (selectionInfo) {
      if (ArrSelectedItems.length === 1) {
        selectionInfo.textContent = ArrSelectedItems[0].getAttribute("itemname") + " (" + formatSizeWithLimit(size, 2) + ")";
      } else {
        selectionInfo.textContent = ArrSelectedItems.length + " items selected (Sum: " + formatSizeWithLimit(size, 2) + ")";
      }
    }
  } else if (id === activePropertiesSizeUpdateId && isPropertiesSizeCalculationActive) {
    setSizeCalculationLoading(".properties-item-size", formatBytes(size, 2));
  }
});

let currentPropertiesSizeRequestId = 0;
let activePropertiesSizeUpdateId = null;
let isPropertiesSizeCalculationActive = false;

function startPropertiesSizeCalculation() {
  activePropertiesSizeUpdateId = `properties-${++currentPropertiesSizeRequestId}`;
  isPropertiesSizeCalculationActive = true;
  return activePropertiesSizeUpdateId;
}

function finishPropertiesSizeCalculation(updateId) {
  if (activePropertiesSizeUpdateId === updateId) {
    isPropertiesSizeCalculationActive = false;
    activePropertiesSizeUpdateId = null;
  }
}

function isPropertiesSizeUpdateCurrent(updateId) {
  return activePropertiesSizeUpdateId === updateId && isPropertiesSizeCalculationActive;
}

let currentSelectionRequestId = 0;
async function updateSelectionInfo(shouldCalculate = true) {
  let selectionInfo = document.querySelector(".selection-info");
  if (!selectionInfo) return;
  if (ArrSelectedItems.length == 0) {
    selectionInfo.textContent = "";
    return;
  }

  if (!shouldCalculate) {
    if (ArrSelectedItems.length == 1) {
      let item = ArrSelectedItems[0];
      let size = item.getAttribute("itemsize");
      let rawSize = item.getAttribute("itemrawsize");
      let displaySize = rawSize ? formatSizeWithLimit(rawSize, 2) : size;
      selectionInfo.textContent =
        item.getAttribute("itemname") + (displaySize ? " (" + displaySize + ")" : "");
    } else {
      selectionInfo.textContent = ArrSelectedItems.length + " items selected";
    }
    return;
  }

  let requestId = ++currentSelectionRequestId;
  await invoke("cancel_selection_size_calculation");
  selectionInfo.innerHTML = '<div class="preloader-small-invert"></div>';

  if (ArrSelectedItems.length == 1) {
    let item = ArrSelectedItems[0];
    let size = item.getAttribute("itemsize");
    if (item.getAttribute("itemisdir") == "1") {
      let paths = [item.getAttribute("itempath")];
      let totalSize = await invoke("get_capped_selection_size", { paths, updateId: "selection" });
      if (requestId !== currentSelectionRequestId) return;
      selectionInfo.textContent = item.getAttribute("itemname") + " (" + formatSizeWithLimit(totalSize, 2) + ")";
    } else {
      let rawSize = item.getAttribute("itemrawsize");
      let displaySize = rawSize ? formatSizeWithLimit(rawSize, 2) : size;
      selectionInfo.textContent = item.getAttribute("itemname") + (displaySize ? " (" + displaySize + ")" : "");
    }
  } else {
    let paths = ArrSelectedItems.map(item => item.getAttribute("itempath"));
    let totalSize = await invoke("get_capped_selection_size", { paths, updateId: "selection" });
    if (requestId !== currentSelectionRequestId) return;
    selectionInfo.textContent = ArrSelectedItems.length + " items selected (Sum: " + formatSizeWithLimit(totalSize, 2) + ")";
  }
}

function deSelectItem(item) {
  if (IsDualPaneEnabled) {
    item.children[0].classList.remove("selected-item");
  } else if (ViewMode == "column") {
    item.children[0].classList.remove("selected-item");
  } else {
    item.children[0].children[0].classList.remove("selected-item");
    item.children[0].children[1].classList.remove("selected-item-min");
  }
  var index = ArrSelectedItems.indexOf(item);
  if (index !== -1) {
    ArrSelectedItems.splice(index, 1);
  }
  var index = ArrSelectedItems.indexOf(item);
  ArrSelectedItems.splice(index, 1);
  item.setAttribute("itemisselected", false);
  updateSelectionInfo();
}

async function unSelectAllItems() {
  if (ArrSelectedItems.length > 0) {
    for (let i = 0; i < ArrSelectedItems.length; i++) {
      if (IsDualPaneEnabled == true) {
        ArrSelectedItems[i].children[0].classList.remove("selected-item");
      } else if (ViewMode == "column" || ViewMode == "miller") {
        ArrSelectedItems[i].children[0].classList.remove("selected-item");
      } else {
        try {
          if (IsShowDisks === true) {
            ArrSelectedItems[i].children[0].classList.remove("selected-item");
            ArrSelectedItems[i].children[1].classList.remove(
              "selected-item-min",
            );
          } else {
            ArrSelectedItems[i].children[0].children[0].classList.remove(
              "selected-item",
            );
            ArrSelectedItems[i].children[0].children[1].classList.remove(
              "selected-item-min",
            );
          }
        } catch (e) {
          writeLog(e);
        }
      }
      ArrSelectedItems[i].setAttribute("itemisselected", false);
    }
  }
  SelectedElement = null;
  ArrSelectedItems = [];
  SelectedItemToOpen = null;
  $(".selected-item")?.removeClass("selected-item");
  $(".selected-item-min")?.removeClass("selected-item-min");
  updateSelectionInfo();
}

async function goHome() {
  try {
    await invoke("go_home");
    await listDirectories();
    await setCurrentDir(await getCurrentDir(), "", false);
  } catch (error) {
    console.error(error);
  }
}

async function goBack(e = null) {
  const isMeta = e ? e.metaKey : (window.event ? window.event.metaKey : false);
  const isAlt = e ? e.altKey : (window.event ? window.event.altKey : false);
  const isCtrl = e ? e.ctrlKey : (window.event ? window.event.ctrlKey : false);
  console.log("Going back", isMeta, isAlt, isCtrl);
  if (IsDualPaneEnabled === true) {
    if (SelectedItemPaneSide == "left") {
      LeftPaneItemIndex = LastLeftPaneIndex ?? 0;
    } else {
      RightPaneItemIndex = LastRightPaneIndex ?? 0;
    }
  }
  if (isMeta == false) {
    await invoke("go_back", { isDualPane: IsDualPaneEnabled });
    await listDirectories();
  }
  await setCurrentDir(await getCurrentDir(), SelectedItemPaneSide, false);
}

function goUp(isSwitched = false, toFirst = false) {
  if (IsDualPaneEnabled === true) {
    let element = null;
    let selectedItemIndex = 0;
    if (toFirst == false) {
      if (SelectedElement != null) {
        if (SelectedItemPaneSide == "left") {
          selectedItemIndex = LeftPaneItemIndex;
          if (LeftPaneItemIndex > 0 && isSwitched == true) {
            selectedItemIndex = LeftPaneItemIndex;
            element =
              LeftPaneItemCollection.querySelectorAll(".item-link")[
                selectedItemIndex
              ];
          } else if (parseInt(selectedItemIndex) < 1) {
            selectedItemIndex = 0;
            element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
          } else {
            selectedItemIndex = parseInt(selectedItemIndex) - 1;
            element =
              LeftPaneItemCollection.querySelectorAll(".item-link")[
                selectedItemIndex
              ];
          }
          LeftPaneItemIndex = selectedItemIndex;
        } else if (SelectedItemPaneSide == "right") {
          selectedItemIndex = RightPaneItemIndex;
          if (RightPaneItemIndex > 0 && isSwitched == true) {
            selectedItemIndex = RightPaneItemIndex;
            element =
              RightPaneItemCollection.querySelectorAll(".item-link")[
                selectedItemIndex
              ];
          } else if (parseInt(selectedItemIndex) - 1 < 1) {
            selectedItemIndex = 0;
            element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
          } else {
            selectedItemIndex = parseInt(selectedItemIndex) - 1;
            element =
              RightPaneItemCollection.querySelectorAll(".item-link")[
                selectedItemIndex
              ];
          }
          RightPaneItemIndex = selectedItemIndex;
        }
        SelectedElement.style.backgroundColor = "transparent";
      } else {
        SelectedItemPaneSide = "left";
        if (SelectedItemPaneSide == "right") {
          RightPaneItemIndex = 0;
          element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
        } else {
          LeftPaneItemIndex = 0;
          element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
        }
        if (element != null && element != SelectedElement) {
          element.onclick();
        }
      }
      if (
        element != SelectedElement &&
        SelectedElement != null &&
        element != null
      ) {
        SelectedElement.style.backgroundColor = "transparent";
        element.onclick();
      }

      /* Scroll logic */
      if (SelectedItemPaneSide == "left") {
        if (
          parseInt(selectedItemIndex) * 38 -
            document.querySelector(".dual-pane-left").scrollTop <
          10
        ) {
          document.querySelector(".dual-pane-left").scrollTop -= 38;
        }
      } else if (SelectedItemPaneSide == "right") {
        if (
          parseInt(selectedItemIndex) * 38 -
            document.querySelector(".dual-pane-right").scrollTop <
          10
        ) {
          document.querySelector(".dual-pane-right").scrollTop -= 38;
        }
      }
    } else {
      if (SelectedItemPaneSide == "right") {
        RightPaneItemIndex = 0;
        element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
      } else {
        LeftPaneItemIndex = 0;
        element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
      }
      if (element != null && element != SelectedElement) {
        element.onclick();
      }
    }
  }
}

function goDown() {
  let element = null;
  let selectedItemIndex = 0;
  if (SelectedElement != null) {
    selectedItemIndex = SelectedElement.getAttribute("itemindex");
    if (SelectedItemPaneSide == "left") {
      if (
        parseInt(selectedItemIndex) + 1 >=
        LeftPaneItemCollection.querySelectorAll(".item-link").length - 1
      ) {
        selectedItemIndex =
          LeftPaneItemCollection.querySelectorAll(".item-link").length - 1;
        element =
          LeftPaneItemCollection.querySelectorAll(".item-link")[
            parseInt(selectedItemIndex)
          ];
      } else {
        selectedItemIndex = parseInt(selectedItemIndex) + 1;
        element =
          LeftPaneItemCollection.querySelectorAll(".item-link")[
            selectedItemIndex
          ];
      }
      LeftPaneItemIndex = selectedItemIndex;
    } else if (SelectedItemPaneSide == "right") {
      if (
        parseInt(selectedItemIndex) + 1 >=
        RightPaneItemCollection.querySelectorAll(".item-link").length - 1
      ) {
        selectedItemIndex =
          RightPaneItemCollection.querySelectorAll(".item-link").length - 1;
        element =
          RightPaneItemCollection.querySelectorAll(".item-link")[
            selectedItemIndex
          ];
      } else {
        selectedItemIndex = parseInt(selectedItemIndex) + 1;
        element =
          RightPaneItemCollection.querySelectorAll(".item-link")[
            selectedItemIndex
          ];
      }
      RightPaneItemIndex = selectedItemIndex;
    }
  } else {
    if (SelectedItemPaneSide == "left") {
      element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
      selectedItemIndex = 0;
      LeftPaneItemIndex = selectedItemIndex;
    } else if (SelectedItemPaneSide == "right") {
      element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
      selectedItemIndex = 0;
      RightPaneItemIndex = selectedItemIndex;
    }
  }
  if (
    element != null &&
    element != SelectedElement &&
    SelectedElement != null
  ) {
    SelectedElement.children[0].style.backgroundColor = "transparent";
    element.onclick();
  }

  /* Scroll logic */
  if (SelectedItemPaneSide == "left") {
    if (
      parseInt(selectedItemIndex) * 38 -
        document.querySelector(".dual-pane-left").scrollTop >
      window.innerHeight - 150
    ) {
      document.querySelector(".dual-pane-left").scrollTop += 38;
    }
  } else if (SelectedItemPaneSide == "right") {
    if (
      parseInt(selectedItemIndex) * 38 -
        document.querySelector(".dual-pane-right").scrollTop >
      window.innerHeight - 150
    ) {
      document.querySelector(".dual-pane-right").scrollTop += 38;
    }
  }
}

async function goToOtherPane() {
  if (SelectedItemPaneSide == "right") {
    await setCurrentDir(LeftDualPanePath, "left");
  } else {
    await setCurrentDir(RightDualPanePath, "right");
  }
  try {
    goUp(true);
  } catch (e) {
    writeLog(e);
  }
}

async function initDualPane(path = "") {
  LeftDualPanePath = path;
  RightDualPanePath = path;
  SelectedItemIndex = 0;
  SelectedItemPaneSide = "left";

  // Set the disks into the dropdowns
  await setDiskDropdowns();

  await refreshBothViews();
  goUp(false, true);
}

async function setDiskDropdowns() {
  let leftDiskDropdown = document.querySelector(".left-disk-dropdown");
  let rightDiskDropdown = document.querySelector(".right-disk-dropdown");

  // Get current disks
  let disks = await invoke("list_disks");

  // reset current selection
  leftDiskDropdown.innerHTML = "";
  rightDiskDropdown.innerHTML = "";

  for (let i = 0; i < disks.length; i++) {
    let leftOption = document.createElement("option");
    let rightOption = document.createElement("option");
    leftOption.value = disks[i].path;
    rightOption.value = disks[i].path;
    leftOption.textContent = displayDiskName(disks[i].name);
    rightOption.textContent = displayDiskName(disks[i].name);
    leftDiskDropdown.append(leftOption);
    rightDiskDropdown.append(rightOption);
  }
}

async function navigateToDisk(path, paneSide = SelectedItemPaneSide) {
  await setCurrentDir(path, paneSide);
  await listDirectories();
}

function goLeft(isToFirst = false, index = null) {
  if (index == null) {
    if (SelectedElement == null) {
      index = 0;
    } else {
      index = parseInt(SelectedElement?.getAttribute("itemindex")) - 1 ?? 0;
    }
  }
  if (index < 0) {
    index = 0;
  }
  SelectedElement = DirectoryList.children[index];
  selectItem(SelectedElement);
}

function goRight(isToFirst = false, index = null) {
  if (index == null) {
    if (SelectedElement == null) {
      index = 0;
    } else {
      index = parseInt(SelectedElement?.getAttribute("itemindex")) + 1 ?? 0;
    }
  }
  if (index > DirectoryList.children.length - 1) {
    index = DirectoryList.children.length - 1;
  }
  SelectedElement = DirectoryList.children[index];
  selectItem(SelectedElement);
}

function goGridUp() {
  var rowlen = Array.prototype.reduce.call(
    DirectoryList.children,
    function (prev, next) {
      if (!prev[2]) {
        var ret = next.getBoundingClientRect().left;
        // if increasing, increment unter
        if (!(prev[0] > -1 && ret < prev[1])) {
          prev[0]++;
        } else {
          prev[2] = 1;
        } // else stop counting
      }
      return [prev[0], ret, prev[2]]; // [counter, elem, stop-counting]
    },
    [0, null, 0],
  )[0];
  let index = 0;
  if (SelectedElement != null) {
    index = parseInt(SelectedElement?.getAttribute("itemindex")) - rowlen;
  }
  goLeft(false, index);
}

function goGridDown() {
  var rowlen = Array.prototype.reduce.call(
    DirectoryList.children,
    function (prev, next) {
      if (!prev[2]) {
        var ret = next.getBoundingClientRect().left;
        // if increasing, increment counter
        if (!(prev[0] > -1 && ret < prev[1])) {
          prev[0]++;
        } else {
          prev[2] = 1;
        } // else stop counting
      }
      return [prev[0], ret, prev[2]]; // [counter, elem, stop-counting]
    },
    [0, null, 0],
  )[0];
  let index = 0;
  if (SelectedElement != null) {
    index = parseInt(SelectedElement?.getAttribute("itemindex")) + rowlen;
  }
  goRight(false, index);
}

async function openSelectedItem() {
  if (IsDualPaneEnabled === true) {
    if (SelectedItemPaneSide == "left") {
      LastLeftPaneIndex = LeftPaneItemIndex;
    } else {
      LastRightPaneIndex = RightPaneItemIndex;
    }
    if (SelectedElement != null) {
      await openItem(SelectedElement, SelectedItemPaneSide);
    }
  } else {
    if (SelectedElement != null) {
      await openItem(SelectedElement);
    }
  }
  goUp(false, true);
}

async function goToDir(directory) {
  invoke("go_to_dir", { directory }).then(async (items) => {
    if (IsDualPaneEnabled == true) {
      await showItems(items, SelectedItemPaneSide);
    } else {
      await showItems(items);
    }
    await setCurrentDir(await getCurrentDir(), "", false);
  });
}

async function openInTerminal(item = null) {
  const path =
    item?.getAttribute("itempath") ??
    (ArrSelectedItems.length === 0 ? CurrentDir : SelectedItemPath);
  if (
    !(await invoke("open_in_terminal", {
      path,
    }))
  ) {
    if (Platform === "linux") {
      showToast(
        "Failed to open terminal. Make sure exo-open is installed and configured.",
        ToastType.ERROR,
        5000,
      );
    } else {
      showToast("Failed to open terminal.", ToastType.ERROR);
    }
  }
}

async function ejectDisk(item) {
  const path = item?.getAttribute("itempath");
  if (!path) {
    showToast("No disk selected to eject", ToastType.ERROR);
    return;
  }

  try {
    const message = await invoke("eject_disk", { path });
    showToast(message || "Disk ejected", ToastType.SUCCESS);
    await listDisks();
  } catch (error) {
    showToast(`Failed to eject disk: ${error}`, ToastType.ERROR, 5000);
  }
}

async function searchFor(
  fileName = "",
  maxItems = SettingsMaxItems,
  searchDepth = SettingsSearchDepth,
  isQuickSearch = false,
  fileContent = "",
) {
  if (IsSearching === true) return;
  if (fileName.length > 1 || isQuickSearch == true) {
    $(".is-file-searching").css("display", "block");
    updateFileSearchbarState(true);
    if (IsDualPaneEnabled === true) {
      if (SelectedItemPaneSide === "left") {
        $(".dual-pane-left").html("");
      } else {
        $(".dual-pane-right").html("");
      }
    } else {
      $(".directory-list").html("");
    }
    IsSearching = true;
    FoundItemsCountIndex = 0;
    await invoke("search_for", {
      fileName,
      maxItems,
      searchDepth,
      fileContent,
      isQuickSearch,
    });
    setTimeout(() => {
      ds.setSettings({
        selectables: ArrDirectoryItems,
      });
    }, 250);
  } else {
    stopFullSearch();
    alert("Type in a minimum of 2 characters");
  }
  IsSearching = false;
  IsFullSearching = false;
}

function openFullSearchContainer() {
  document.querySelector(".search-full-container").style.display = "flex";
  document.querySelector(".full-dualpane-search-input").focus();
  IsInputFocused = true;
  IsPopUpOpen = true;
  IsDisableShortcuts = true;
  document.querySelectorAll(".trigger-for-full-search").forEach((element) =>
    element.addEventListener("keydown", (e) => {
      if (e.key == "Enter") {
        startFullSearch();
      }
    }),
  );
}

function closeFullSearchContainer() {
  document.querySelector(".search-full-container").style.display = "none";
  IsPopUpOpen = false;
  IsDisableShortcuts = false;
  IsInputFocused = false;
}

document
  .querySelector(".dualpane-search-input")
  .addEventListener("keyup", async (e) => {
    if (e.keyCode == 13) {
      // 13 = Enter
      closeSearchBar();
      if (IsDualPaneEnabled == true) {
        await openSelectedItem(SelectedElement);
      }
    } else if (
      IsQuickSearchOpen == true &&
      e.key !== "Escape" &&
      e.key != "Shift" &&
      e.key != "Control" &&
      e.key != "Alt" &&
      e.key != "Meta"
    ) {
      await searchFor($(".dualpane-search-input").val(), 999999, 1, true);
    } else {
      goUp(false, true);
    }
  });

function openSearchBar() {
  document.querySelector(".search-bar-container").style.display = "flex";
  document.querySelector(".dualpane-search-input").focus();
  IsInputFocused = true;
  IsDisableShortcuts = true;
  IsQuickSearchOpen = true;
  IsPopUpOpen = true;
  document
    .querySelector(".dualpane-search-input")
    .addEventListener("focusout", () => {
      resetEverything();
    });
}

function closeSearchBar() {
  document.querySelector(".dualpane-search-input").value = "";
  document.querySelector(".search-bar-container").style.display = "none";
  IsDisableShortcuts = false;
  IsQuickSearchOpen = false;
  IsPopUpOpen = false;
}

async function cancelSearch() {
  document.querySelector(".cancel-search-button").classList.remove("is-visible");
  document.querySelector(".search-bar-input").value = "";
  updateFileSearchbarState();
  if (IsSearching || IsFullSearching) {
    await invoke("stop_searching");
    IsSearching = false;
    IsFullSearching = false;
  }
  // await listDirectories();
}

async function switchView(newMode = null) {
  if (IsDualPaneEnabled == false) {
    if (newMode) {
      ViewMode = newMode;
    } else {
      if (ViewMode == "wrap") ViewMode = "column";
      else if (ViewMode == "column") ViewMode = "miller";
      else ViewMode = "wrap";
    }

    // Update segmented control active state
    document.querySelectorAll(".view-mode-btn").forEach((btn) => {
      const isActive = btn.dataset.view === ViewMode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (ViewMode == "column") {
      document.querySelectorAll(".directory-list").forEach((list) => {
        list.style.gridTemplateColumns = "unset";
        list.style.rowGap = "2px";
      });
      document
        .querySelectorAll(".item-button")
        .forEach((item) => (item.style.display = "none"));
      document
        .querySelectorAll(".item-button-list")
        .forEach((item) => (item.style.display = "flex"));
      document.querySelector(".list-column-header").style.display = "flex";
      $(".explorer-container")?.css("padding", "100px 10px 10px 10px");
      document.querySelector(".miller-container").style.display = "none";
      document.querySelector(".non-dual-pane-container").style.display = "block";
      $(".file-searchbar").css("opacity", "1");
      $(".file-searchbar").css("pointer-events", "all");
    } else if (ViewMode == "miller") {
      document.querySelector(".list-column-header").style.display = "none";
      document.querySelector(".miller-container").style.display = "flex";
      document.querySelector(".miller-column").style.display = "inline";
      document.querySelector(".non-dual-pane-container").style.display = "none";
      $(".explorer-container").css("padding", "10px 10px 0 10px");
      $(".file-searchbar").css("opacity", "0");
      $(".file-searchbar").css("pointer-events", "none");
    } else {
      // wrap (Grid)
      document.querySelector(".explorer-container").style.width = "100%";
      document.querySelectorAll(".directory-list").forEach((list) => {
        if (IsShowDisks == false) {
          list.style.gridTemplateColumns =
            "repeat(auto-fill, minmax(80px, 1fr))";
          list.style.rowGap = "15px";
        } else {
          list.style.rowGap = "15px";
        }
      });
      document.querySelector(".miller-container").style.display = "none";
      document.querySelector(".explorer-container").style.display = "block";
      document.querySelector(".non-dual-pane-container").style.display = "block";
      document
        .querySelectorAll(".item-button")
        .forEach((item) => (item.style.display = "flex"));
      document
        .querySelectorAll(".item-button-list")
        .forEach((item) => (item.style.display = "none"));
      document.querySelector(".list-column-header").style.display = "none";
      $(".explorer-container")?.css("padding", "85px 20px 20px 20px");
      $(".file-searchbar").css("opacity", "1");
      $(".file-searchbar").css("pointer-events", "all");
    }
    await invoke("switch_view", { viewMode: ViewMode });
  }
  if (IsShowDisks === false) {
    await listDirectories();
  }
}

// Roving tabindex for view mode group
document.querySelector(".view-mode-group").addEventListener("keydown", (e) => {
  const buttons = [...document.querySelectorAll(".view-mode-btn")];
  const current = document.activeElement;
  const index = buttons.indexOf(current);
  if (index === -1) return;

  let next;
  if (e.key === "ArrowRight") next = buttons[(index + 1) % buttons.length];
  else if (e.key === "ArrowLeft") next = buttons[(index - 1 + buttons.length) % buttons.length];
  else if (e.key === "Home") next = buttons[0];
  else if (e.key === "End") next = buttons[buttons.length - 1];
  else return;

  e.preventDefault();
  next.focus();
});

async function switchToDualPane() {
  if (IsDualPaneEnabled == false) {
    OrgViewMode = ViewMode;
    IsDualPaneEnabled = true;
    ViewMode = "column";
    document.querySelector(".view-mode-group").classList.add("disabled");
    document.querySelector(".miller-container").style.display = "none";
    if (Platform == "darwin") {
      $(".header-nav").css("padding-left", "85px");
    }
    document
      .querySelectorAll(".item-button")
      .forEach((item) => (item.style.display = "none"));
    document
      .querySelectorAll(".item-button-list")
      .forEach((item) => (item.style.display = "flex"));
    document.querySelector(".switch-dualpane-view-button").innerHTML =
      `<i class="fa-regular fa-rectangle-xmark"></i>`;
    await setCurrentDir(await getCurrentDir(), "", false);
    await invoke("list_dirs").then(async (items) => {
      await showItems(items, "left");
      await showItems(items, "right");
      goUp(false, true);
    });
    document.querySelector(".site-nav-bar").style.width = "0px";
    document.querySelector(".site-nav-bar").style.minWidth = "0";
    if (Platform == "darwin") {
      $(".site-nav-bar").css("padding", "55px 0 0 0");
    } else {
      $(".site-nav-bar").css("padding", "0");
    }
    $(".list-column-header").css("height", "0");
    $(".list-column-header").css("padding", "0");
    $(".list-column-header").css("border", "none");
    $(".dual-pane-container").css("opacity", "1");
    $(".dual-pane-container").css("height", "100%");
    $(".dual-pane-container").css("padding-top", "90px"); // --> 55px from nav bar and 15px from toolbar
    $(".non-dual-pane-container").css("width", "0");
    $(".non-dual-pane-container").css("opacity", "0");
    $(".non-dual-pane-container").css("height", "0px");
    $(".non-dual-pane-container").css("overflow", "hidden");
    $(".explorer-container").css("padding", "0");
    $(".file-searchbar").css("opacity", "0");
    $(".file-searchbar").css("pointer-events", "none");
    $(".switch-view-button").css("opacity", "0");
    $(".switch-view-button").css("pointer-events", "none");
    document.querySelectorAll(".item-button-list").forEach((item) => {
      item.children[0].style.textOverflow = "none";
    });
  } else {
    IsDualPaneEnabled = false;
    document.querySelector(".view-mode-group").classList.remove("disabled");
    $(".non-dual-pane-container")?.css("width", "calc(100vw - 150px)");
    $(".non-dual-pane-container")?.css("opacity", "1");
    $(".non-dual-pane-container")?.css("height", "100%");
    $(".non-dual-pane-container")?.css("padding", "10px 20px");
    $(".non-dual-pane-container").css("overflow-y", "auto");
    $(".site-nav-bar")?.css("width", "150px");
    $(".site-nav-bar")?.css("min-width", "150px");
    if (Platform == "darwin") {
      $(".site-nav-bar")?.css("padding", "55px 10px 10px 10px");
    } else {
      $(".site-nav-bar")?.css("padding", "10px");
    }
    $(".explorer-container").css("padding", "10px");
    $(".list-column-header")?.css("height", "35px");
    $(".list-column-header")?.css("padding", "5px");
    $(".list-column-header")?.css(
      "border-bottom",
      "1px solid var(--tertiaryColor)",
    );
    $(".dual-pane-container")?.css("opacity", "0");
    $(".dual-pane-container")?.css("height", "0");
    $(".dual-pane-container")?.css("padding-top", "0");
    $(".header-nav-right-container")?.css("opacity", "1");
    $(".header-nav-right-container").css("pointer-events", "all");
    $(".file-searchbar").css("opacity", "1");
    $(".file-searchbar").css("pointer-events", "all");
    $(".switch-view-button").css("opacity", "1");
    $(".switch-view-button").css("pointer-events", "all");
    if (Platform == "darwin") {
      $(".header-nav")?.css("padding-left", "10px");
    }
    await applyPlatformFeatures();
    document.querySelector(".switch-dualpane-view-button").innerHTML =
      `<i class="fa-solid fa-table-columns"></i>`;
    await switchView(OrgViewMode);
    if (typeof clearComparison === "function") {
      clearComparison();
    }
  }
  await saveConfig(false, false);
}

function switchHiddenFiles() {
  if (IsShowHiddenFiles) {
    IsShowHiddenFiles = false;
    document.querySelector(".switch-hidden-files-button").innerHTML =
      `<i class="fa-solid fa-eye"></i>`;
  } else {
    IsShowHiddenFiles = true;
    document.querySelector(".switch-hidden-files-button").innerHTML =
      `<i class="fa-solid fa-eye-slash"></i>`;
  }
  listDirectories();
}

let closeSettingsTimeout;

function openSettings() {
  if (IsPopUpOpen == false) {
    if (closeSettingsTimeout) clearTimeout(closeSettingsTimeout);
    showSettingsTab('general', document.querySelector('.settings-sidebar-button'));
    $(".settings-ui").css("display", "flex");
    $(".settings-ui").addClass("active");
    IsDisableShortcuts = true;
    IsPopUpOpen = true;
  }
}

async function closeSettings() {
  $(".settings-ui").removeClass("active");
  if (closeSettingsTimeout) clearTimeout(closeSettingsTimeout);
  closeSettingsTimeout = setTimeout(() => {
    $(".settings-ui").css("display", "none");
  }, 300);
  IsDisableShortcuts = false;
  IsPopUpOpen = false;
}

function showSettingsTab(tabName, btn) {
  // Update sidebar buttons
  document.querySelectorAll('.settings-sidebar-button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Update content tabs
  document.querySelectorAll('.settings-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('settings-tab-' + tabName).classList.add('active');
}

async function saveConfig(isToReload = true, isVerbose = true) {
  let configuredPathOne = (ConfiguredPathOne = document.querySelector(
    ".configured-path-one-input",
  ).value);
  let configuredPathTwo = (ConfiguredPathTwo = document.querySelector(
    ".configured-path-two-input",
  ).value);
  let configuredPathThree = (ConfiguredPathThree = document.querySelector(
    ".configured-path-three-input",
  ).value);
  let isOpenInTerminal = false; // document.querySelector(".openin-terminal-checkbox").checked;
  let isDualPaneEnabled = document.querySelector(
    ".show-dual-pane-checkbox",
  ).checked;
  let launchPath = document.querySelector(".launch-path-input").value;
  let isDualPaneActive = IsDualPaneEnabled;
  let searchDepth = parseInt(
    document.querySelector(".search-depth-input").value,
  ) || 10;
  let maxItems = parseInt(document.querySelector(".max-items-input").value) || 1000;
  let isImagePreview = (IsImagePreview = document.querySelector(
    ".image-preview-checkbox",
  ).checked);
  let isSelectMode = (IsSelectMode = $("#choose-interaction-mode").is(
    ":checked",
  ));
  let currentTheme = $(".theme-select").val();
  let fontSize = parseInt(document.querySelector(".font-size-slider").value) || 12;
  let isWindowTransparency = document.querySelector(
    ".window-transparency-checkbox",
  ).checked;

  if (isOpenInTerminal == true) {
    isOpenInTerminal = "1";
  } else {
    isOpenInTerminal = "0";
  }
  if (isDualPaneEnabled == true) {
    isDualPaneEnabled = "1";
  } else {
    isDualPaneEnabled = "0";
  }
  if (isDualPaneActive == true) {
    isDualPaneActive = "1";
  } else {
    isDualPaneActive = "0";
  }
  if (isImagePreview == true) {
    isImagePreview = "1";
  } else {
    isImagePreview = "0";
  }
  if (isSelectMode == true) {
    isSelectMode = "1";
  } else {
    isSelectMode = "0";
  }
  if (isWindowTransparency == true) {
    isWindowTransparency = "1";
  } else {
    isWindowTransparency = "0";
  }

  // Apply font size immediately
  document.documentElement.style.setProperty("--fontSize", fontSize + "px");

  // Apply window transparency
  if (isWindowTransparency == "1") {
    document.body.style.opacity = "0.78";
  } else {
    document.body.style.opacity = "1.0";
  }

  await invoke("save_config", {
    configuredPathOne,
    configuredPathTwo,
    configuredPathThree,
    isOpenInTerminal,
    isDualPaneEnabled,
    launchPath,
    isDualPaneActive,
    searchDepth,
    maxItems,
    isImagePreview,
    isSelectMode,
    currentTheme,
    arrFavorites: ArrFavorites,
    fontSize,
    isWindowTransparency,
  });
  if (isVerbose === true) {
    showToast("Settings have been saved", ToastType.INFO);
  }
  if (isToReload == true) {
    await checkAppConfig();
  }
}

async function resetSettingsToDefaults() {
  if (!confirm("Reset all settings to their default values?")) return;

  document.querySelector(".theme-select").value = "0";
  document.querySelector("#choose-interaction-mode").checked = true;
  document.querySelector(".image-preview-checkbox").checked = true;
  document.querySelector(".configured-path-one-input").value = "";
  document.querySelector(".configured-path-two-input").value = "";
  document.querySelector(".configured-path-three-input").value = "";
  document.querySelector(".search-depth-input").value = "10";
  document.querySelector(".max-items-input").value = "1000";
  document.querySelector(".launch-path-input").value = "";
  document.querySelector(".show-dual-pane-checkbox").checked = false;
  document.querySelector(".font-size-slider").value = 12;
  document.getElementById("font-size-value").textContent = "12px";
  document.querySelector(".window-transparency-checkbox").checked = false;

  await saveConfig(true, true);
  showToast("Settings reset to defaults", ToastType.INFO);
}

async function addFavorite(path) {
  if (!ArrFavorites.includes(path)) {
    ArrFavorites.push(path);
    await saveConfig(false, false);
    await insertSiteNavButtons();
  }
}

async function removeFavorite(path) {
  ArrFavorites = ArrFavorites.filter((f) => f !== path);
  await saveConfig(false, false);
  await insertSiteNavButtons();
}

function getExtDescription(file_extension) {
  return fileExtensions[file_extension.replace(".", "").toUpperCase()];
}

async function showProperties(item) {
  let itemsToProcess = [];
  if (ArrSelectedItems.length > 1) {
    itemsToProcess = ArrSelectedItems;
  } else if (item != null) {
    itemsToProcess = [item];
  } else {
    let dummyItem = document.createElement("div");
    dummyItem.setAttribute("itemname", CurrentDir);
    dummyItem.setAttribute("itempath", CurrentDir);
    dummyItem.setAttribute("itemext", "");
    dummyItem.setAttribute("itemisdir", "1");
    itemsToProcess = [dummyItem];
  }

  if (IsPopUpOpen !== false) return;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);
  const escJs = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const isMulti = itemsToProcess.length > 1;
  const first = itemsToProcess[0];
  const name = isMulti
    ? `${itemsToProcess.length} items selected`
    : first.getAttribute("itemname");
  const path = isMulti ? null : first.getAttribute("itempath");
  const ext = isMulti ? "" : (first.getAttribute("itemext") || "");
  const isDir = !isMulti && first.getAttribute("itemisdir") === "1";
  const modifiedAt = isMulti ? null : first.getAttribute("itemmodified");
  const extDesc = ext ? getExtDescription(ext) : undefined;

  let kindLabel;
  let iconHtml;
  let chipHtml = "";
  if (isMulti) {
    kindLabel = "Mixed selection";
    iconHtml = `<i class="fa-solid fa-layer-group"></i>`;
  } else if (isDir) {
    kindLabel = "Folder";
    iconHtml = `<i class="fa-solid fa-folder"></i>`;
  } else {
    const extUpper = ext ? ext.replace(".", "").toUpperCase() : "";
    kindLabel = extDesc || (extUpper ? `${extUpper} file` : "File");
    iconHtml = `<i class="fa-regular fa-file-lines"></i>`;
    if (extUpper) chipHtml = `<span class="props-card__chip">${escHtml(extUpper)}</span>`;
  }

  const popup = document.createElement("div");
  popup.className = "item-properties-popup props-card";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Item properties");

  const locationRow = path
    ? `
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-regular fa-folder-open"></i>Location</dt>
        <dd class="props-card__value">
          <button class="props-card__copy" title="Copy path to clipboard"
            onclick="writeText('${escJs(path)}'); showToast('Copied path to clipboard', ToastType.INFO);">
            <span class="props-card__path">${escHtml(path)}</span>
            <i class="fa-regular fa-copy props-card__copy-icon"></i>
          </button>
        </dd>
      </div>`
    : `
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-regular fa-folder-open"></i>Location</dt>
        <dd class="props-card__value props-card__value--muted">Multiple paths</dd>
      </div>`;

  const modifiedRow = modifiedAt
    ? `
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-regular fa-clock"></i>Modified</dt>
        <dd class="props-card__value">${escHtml(modifiedAt)}</dd>
      </div>`
    : "";

  popup.innerHTML = `
    <section class="props-card__hero">
      <div class="props-card__thumb">${iconHtml}</div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(name)}">${escHtml(name)}</h2>
        <div class="props-card__meta">
          <span class="props-card__kind">${escHtml(kindLabel)}</span>
          ${chipHtml}
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      ${locationRow}
      ${modifiedRow}
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-database"></i>Size</dt>
        <dd class="props-card__value">
          <span class="properties-item-size props-card__size">
            <span class="props-card__skeleton"></span>
          </span>
        </dd>
      </div>
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" onclick="closeInfoProperties()">
        <i class="fa-solid fa-xmark"></i>
        <span>Close</span>
      </button>
    </footer>
  `;

  document.querySelector("body").append(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;
  const propertiesUpdateId = startPropertiesSizeCalculation();

  if (!isMulti) {
    try {
      await getSimpleDirInfo(
        first.getAttribute("itempath"),
        ".properties-item-size",
        isDir,
        propertiesUpdateId
      );
      finishPropertiesSizeCalculation(propertiesUpdateId);
    } catch (error) {
      if (!isPropertiesSizeUpdateCurrent(propertiesUpdateId)) return;
      finishPropertiesSizeCalculation(propertiesUpdateId);
      writeLog(error);
      $(".properties-item-size").html("Unable to calculate size");
    }
  } else {
    const paths = itemsToProcess.map((i) => i.getAttribute("itempath"));
    setSizeCalculationLoading(".properties-item-size");
    try {
      const totalSize = await invoke("get_selection_size", { paths, updateId: propertiesUpdateId });
      if (!isPropertiesSizeUpdateCurrent(propertiesUpdateId)) return;
      finishPropertiesSizeCalculation(propertiesUpdateId);
      $(".properties-item-size").html(formatBytes(totalSize, 2));
    } catch (error) {
      if (!isPropertiesSizeUpdateCurrent(propertiesUpdateId)) return;
      finishPropertiesSizeCalculation(propertiesUpdateId);
      writeLog(error);
      $(".properties-item-size").html("Unable to calculate size");
    }
  }
}

function closeInfoProperties() {
  finishPropertiesSizeCalculation(activePropertiesSizeUpdateId);
  invoke("cancel_size_calculation");
  let popup = document.querySelector(".item-properties-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsItemPreviewOpen = false;
    }, { once: true });
  } else {
    IsPopUpOpen = false;
    IsItemPreviewOpen = false;
  }
}

async function showItemPreview(item, isOverride = false) {
  let fadeTime = 200;
  if (isOverride) {
    $(".item-preview-popup")?.fadeOut(fadeTime);
    $(".item-properties-popup").remove();
    IsPopUpOpen = false;
  }
  let name = item.getAttribute("itemname");
  let ext = item.getAttribute("itemext");
  let path = item.getAttribute("itempath");
  let popup = document.createElement("div");
  popup.className = "item-preview-popup";
  IsItemPreviewOpen = true;
  let module = "";
  let moduleImgId = crypto.randomUUID();
  switch (ext.toLowerCase()) {
    case ".png":
    case ".icns":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".svg":
    case ".webp":
    case ".ico":
    case ".jfif":
    case ".avif":
      module = `
      <div class="module-container">
      <img class="${moduleImgId}" decoding="async" src="resources/preloader_big.gif" width="100%" height="100%" />
      </div>
      `;
      break;
    case ".pdf":
    case ".html":
    case ".xhtml":
    case ".htm":
      popup.style.backgroundColor = "white";
      module = `<iframe decoding="async" src="${convertFileSrc(path)}" />>`;
      break;
    case ".mp4":
    case ".mkv":
    case ".mov":
    case ".avi":
    case ".webm":
    case ".mp3":
    case ".wav":
    case ".ogg":
    case ".flac":
    case ".aac":
    case ".m4a":
    case ".wma":
    case ".ape":
    case ".flv":
    case ".wmv":
      module = `
      <div class="module-container">
      <video decoding="async" src="${convertFileSrc(path)}" autoplay controls></video>
      </div>
      `;
      break;
    case ".txt":
    case ".json":
    case ".sh":
    case ".py":
    case ".css":
    case ".js":
    case ".ts":
    case ".sql":
    case ".mts":
    case ".jsx":
    case ".tsx":
    case ".mjs":
    case ".php":
    case ".c":
    case ".cpp":
    case ".cs":
    case ".java":
    case ".md":
    case ".xml":
    case ".yaml":
    case ".yml":
    case ".toml":
    case ".lock":
    case ".ini":
    case ".cfg":
    case ".log":
    case ".env":
    case ".gitignore":
      popup.style.maxWidth = "50%";
      module = `
      <div class="module-container"><pre class="item-preview-file-content" style="padding: 20px; font-size: 12px;">${await invoke("get_file_content", { path })}</pre></div>
      `;
      break;
    default:
      showProperties(item);
      return;
  }
  popup.innerHTML = `
    ${module}
    `;
  IsPopUpOpen = true;
  document.querySelector("body").append(popup);
  $(popup).fadeIn(fadeTime);
  let img = popup.querySelector("img");
  if (img) {
    img.src = convertFileSrc(item.getAttribute("itempath"));
  }
  popup.children[0].addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.target.blur();
    }
  });
}

function showMultiRenamePopup() {
  IsPopUpOpen = true;
  let popup = document.createElement("div");
  popup.className = "uni-popup multi-rename-popup";
  popup.innerHTML = `
    <h3 class="multi-rename-popup-header">
  		<div style="display: flex; gap: 10px; align-items: center;">
  		<i class="fa-solid fa-pen-to-square text" style="padding-right: 5px;"></i>
  		<h4 class="text">Multi-Rename</h4>
  		</div>
    </h3>
    <div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor); display: flex; flex-flow: column; gap: 5px;">
  		<h4 class="text">Options</h4>
  		<p class="text-small">If no extension is supplied the extension won't be changed</p>
    </div>
    <div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor);">
    <div style="display: flex; flex-flow: row; gap: 10px;">
  		<div style="display: flex; flex-flow: column; gap: 5px; width: 55%;">
  		<p class="text-small">New name</p>
  		<input class="text-input multi-rename-input multi-rename-newname" placeholder="Name" />
  		</div>
  		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
  		<p class="text-small">Start at</p>
  		<input class="text-input multi-rename-input multi-rename-startat" placeholder="0" value="0" type="number" />
  		</div>
  		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
  		<p class="text-small">Step by</p>
  		<input class="text-input multi-rename-input multi-rename-stepby" placeholder="1" value="1" type="number" />
  		</div>
  		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
  		<p class="text-small">Digits</p>
  		<input class="text-input multi-rename-input multi-rename-ndigits" placeholder="1" value="1" type="number" />
  		</div>
  		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
  		<p class="text-small">Extension</p>
		  <input class="text-input multi-rename-input multi-rename-ext" placeholder=".txt" type="text" />
  		</div>
  		</div>
    </div>
    <h4 class="text" style="padding: 10px; background-color: var(--secondaryColor);">Selected items to rename</h4>
    `;
  let arrItemsToRename = ArrSelectedItems;
  let list = document.createElement("div");
  list.className = "list";
  for (let i = 0; i < arrItemsToRename.length; i++) {
    let item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `${arrItemsToRename[i].getAttribute("itemname")}`;
    list.append(item);
  }
  popup.append(list);
  let popupControls = document.createElement("div");
  popupControls.className = "popup-controls";
  popupControls.innerHTML = `
    <button class="icon-button" onclick="closeMultiRenamePopup()">
  		<div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
  		Cancel
    </button>
    <button class="icon-button multi-rename-button-run">
  		<div class="button-icon"><i class="fa-solid fa-pencil"></i></div>
  		Rename
    </button>
    `;
  popup.append(popupControls);
  document.querySelector("body").append(popup);
  popup.classList.add("popup-enter");
  $(".multi-rename-newname").focus();
  document.querySelectorAll(".multi-rename-input").forEach((input) =>
    input.addEventListener("keyup", async (e) => {
      if (
        ((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
        e.key === "Enter"
      ) {
        await renameItemsWithFormat(
          arrItemsToRename.map((item) => item.getAttribute("itempath")),
          $(".multi-rename-newname").val(),
          $(".multi-rename-startat").val(),
          $(".multi-rename-stepby").val(),
          $(".multi-rename-ndigits").val(),
          $(".multi-rename-ext").val(),
        );
      }
    }),
  );
  document
    .querySelector(".multi-rename-button-run")
    .addEventListener("click", async () => {
      await renameItemsWithFormat(
        arrItemsToRename.map((item) => item.getAttribute("itempath")),
        $(".multi-rename-newname").val(),
        $(".multi-rename-startat").val(),
        $(".multi-rename-stepby").val(),
        $(".multi-rename-ndigits").val(),
        $(".multi-rename-ext").val(),
      );
    });
}

async function renameItemsWithFormat(
  arrElements = [],
  newName = "",
  startAt = 0,
  stepBy = 1,
  nDigits = 1,
  ext = "",
) {
  startAt = parseInt(startAt);
  stepBy = parseInt(stepBy);
  nDigits = parseInt(nDigits);
  closeMultiRenamePopup();
  await invoke("rename_elements_with_format", {
    arrElements,
    newName,
    startAt,
    stepBy,
    nDigits,
    ext,
  });
  await listDirectories();
  scheduleDiskUsageRefresh();
}

function closeMultiRenamePopup() {
  let popup = document.querySelector(".multi-rename-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
    }, { once: true });
  } else {
    IsPopUpOpen = false;
  }
}

async function closeItemPreview() {
  $(".item-preview-popup").fadeOut(200, () => {
    $(".item-preview-popup")?.remove();
  });
  let propsPopup = document.querySelector(".item-properties-popup");
  if (propsPopup) {
    propsPopup.classList.add("popup-exit");
    propsPopup.addEventListener("animationend", () => propsPopup?.remove(), { once: true });
  }
  IsPopUpOpen = false;
  IsItemPreviewOpen = false;
}

function evalCurrentLoad(available, total) {
  available = parseFloat(
    available
      .replace("TB", "")
      .replace("GB", "")
      .replace("MB", "")
      .replace("KB", "")
      .replace("B", "")
      .trim(),
  );
  total = parseFloat(
    total
      .replace("TB", "")
      .replace("GB", "")
      .replace("MB", "")
      .replace("KB", "")
      .replace("B", "")
      .trim(),
  );
  let result = 100 - (100 / total) * available;
  return result.toFixed(0);
}

async function showFtpConfig() {
  if (IsPopUpOpen == false) {
    document.querySelector(".ftp-connect-container").style.display = "block";
    IsPopUpOpen = true;
    document.querySelectorAll(".ftp-popup-input").forEach(
      (input) =>
        (input.onkeyup = (e) => {
          if (e.key === "Enter") {
            connectToFtp();
          }
        }),
    );
  }
}

function closeFtpConfig() {
  $(".ftp-connect-container").css("display", "none");
  $(".ftp-loader").css("display", "none");
  IsPopUpOpen = false;
}

async function connectToFtp() {
  let hostname = $(".ftp-hostname-input").val();
  let username = $(".ftp-username-input").val();
  let password = $(".ftp-password-input").val();
  let remotePath = $(".ftp-path-input").val();
  let name = $(".ftp-dirname-input").val();
  // let sudoPassword = await showPopup(
  //   "Enter sudo password",
  //   PopupType.PROMPT,
  //   "The sshfs process to mount the network drive requires your users admin password.",
  // );
  $(".ftp-loader").css("display", "flex");
  await openFTP(hostname, username, password, remotePath, name);
}

async function openFTP(
  hostname,
  username,
  password,
  remotePath = "/",
  name = "",
) {
  try {
    await invoke("mount_sshfs", {
      hostname,
      username,
      password,
      remotePath,
      name,
    }).then(async (mountedPath) => {
      // await openDirAndSwitch(mountedPath);
    });
  } catch (error) {
    console.error(error);
  }
  closeFtpConfig();
}

async function sortItems(sortMethod) {
  if (IsShowDisks == false) {
    let arr = [...DirectoryList.children];
    arr = getFDirObjectListFromDirectoryList(arr);
    if (sortMethod == "size") {
      IsFilteredByDate = false;
      IsFilteredByName = false;
      if (IsFilteredBySize == true) {
        arr.sort((a, b) => {
          return parseInt(a.size) - parseInt(b.size);
        });
        IsFilteredBySize = false;
      } else {
        arr.sort((a, b) => {
          return parseInt(b.size) - parseInt(a.size);
        });
        IsFilteredBySize = true;
      }
    }
    if (sortMethod == "name") {
      IsFilteredByDate = false;
      IsFilteredBySize = false;
      if (IsFilteredByName == true) {
        arr.sort((a, b) => {
          return b.name.localeCompare(a.name);
        });
        IsFilteredByName = false;
      } else {
        arr.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
        IsFilteredByName = true;
      }
    }
    if (sortMethod == "date") {
      IsFilteredBySize = false;
      IsFilteredByName = false;
      if (IsFilteredByDate == true) {
        arr.sort((a, b) => {
          return new Date(a.last_modified) - new Date(b.last_modified);
        });
        IsFilteredByDate = false;
      } else {
        arr.sort((a, b) => {
          return new Date(b.last_modified) - new Date(a.last_modified);
        });
        IsFilteredByDate = true;
      }
    }
    await showItems(arr);
  }
}

function getFDirObjectListFromDirectoryList(arrElements) {
  return arrElements.map((item) => {
    return {
      name: item.getAttribute("itemname"),
      size: item.getAttribute("itemrawsize"),
      path: item.getAttribute("itempath"),
      extension: item.getAttribute("itemext"),
      last_modified: item.getAttribute("itemmodified"),
      is_dir: item.getAttribute("itemisdir"),
    };
  });
}

function checkColorMode(appConfig) {
  var r = document.querySelector(":root");
  let themeId = parseInt(CurrentTheme);
  r.style.setProperty(
    "--primaryColor",
    appConfig.themes[themeId].primary_color,
  );
  r.style.setProperty(
    "--secondaryColor",
    appConfig.themes[themeId].secondary_color,
  );
  r.style.setProperty(
    "--tertiaryColor",
    appConfig.themes[themeId].tertiary_color,
  );
  r.style.setProperty(
    "--transparentColor",
    appConfig.themes[themeId].transparent_color,
  );
  r.style.setProperty(
    "--transparentColorActive",
    appConfig.themes[themeId].transparent_color_active,
  );
  r.style.setProperty("--textColor", appConfig.themes[themeId].text_color);
  r.style.setProperty("--textColor2", appConfig.themes[themeId].text_color2);
  r.style.setProperty(
    "--textColor3",
    appConfig.themes[themeId].text_color3.replace('"', "").replace('"', ""),
  );
  r.style.setProperty(
    "--siteBarColor",
    appConfig.themes[themeId].site_bar_color,
  );
  r.style.setProperty(
    "--sidebarTopBlurOverlayColor",
    appConfig.themes[themeId].sidebar_top_blur_overlay_color ||
      appConfig.themes[themeId].site_bar_color,
  );
  r.style.setProperty("--navBarColor", appConfig.themes[themeId].nav_bar_color);
}

async function open_with(filePath, appPath) {
  cdCtMenu.hide();
  await invoke("open_with", { filePath: filePath, appPath: appPath });
}

async function getSetInstalledApplications(ext = "") {
  await invoke("get_installed_apps", { extension: ext }).then(
    (apps) => (Applications = apps),
  );
}

function showFindDuplicates(item) {
  cdCtMenu.hide();
  let popup = document.createElement("div");
  popup.className = "uni-popup find-duplicates-popup";
  popup.innerHTML = `
    <div class="popup-header">
    <h3>Duplicates</h3>
    </div>
    <div class="popup-body" style="display: flex; justify-content: space-between; align-items: center;">
    <div>
    <p>Selected folder:</p>
    <p class="text-2">${item.getAttribute("itempath")}</p>
    </div>
    <div>
    <p class="text-2" style="margin-bottom: 5px;">Search depth</p>
    <input style="width: 100px;" type="number" class="text-input duplicates-search-depth-input" value="1">
    </div>
    </div>
    <div class="popup-header">
    <h4>Found duplicates</h4>
    </div>
    `;
  let list = document.createElement("div");
  list.className = "list duplicates-list";
  popup.append(list);
  let popupControls = document.createElement("div");
  popupControls.className = "popup-controls";
  popupControls.innerHTML = `
    <button class="icon-button" onclick="closeFindDuplicatesPopup()">
    <div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
    Cancel
    </button>
    <button class="icon-button duplicate-button-run">
    <div class="button-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
    Search
    </button>
    `;
  popup.append(popupControls);
  document.querySelector("body").append(popup);
  popup.classList.add("popup-enter");
  document
    .querySelector(".duplicates-search-depth-input")
    .addEventListener("focus", () => (IsInputFocused = true));
  document
    .querySelector(".duplicates-search-depth-input")
    .addEventListener("blur", () => (IsInputFocused = false));
  document
    .querySelector(".duplicate-button-run")
    .addEventListener("click", async () => {
      await findDuplicates(
        item,
        document.querySelector(".duplicates-search-depth-input").value,
      );
    });
  IsPopUpOpen = true;
}

function closeFindDuplicatesPopup() {
  let popup = document.querySelector(".find-duplicates-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
      cancelOperation();
    }, { once: true });
  } else {
    IsPopUpOpen = false;
    cancelOperation();
  }
}

async function findDuplicates(item, depth) {
  showLoadingPopup("Searching for duplicates ...");
  document.querySelector(".list").innerHTML = "";
  IsPopUpOpen = true;
  await invoke("find_duplicates", {
    appWindow: appWindow,
    path: item.getAttribute("itempath"),
    depth: parseInt(depth),
  });
  closeLoadingPopup();
}

async function showYtDownload(url = "https://youtube.com/watch?v=dQw4w9WgXcQ") {
  IsPopUpOpen = true;
  let popup = document.createElement("div");
  popup.className = "uni-popup yt-download-popup";
  popup.innerHTML = `
    <div class="popup-header">
    <h3>Download</h3>
    </div>
    <div class="popup-body">
    <div class="popup-body-row-section">
    <div class="popup-body-col-section" style="width: 100%;">
    <p>URL</p>
    <input type="text" class="text-input yt-url-input" style='width: 100%;' placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ" value="${url}" />
    </div>
    </div>
    <div class="popup-body-row-section">
    <div class="popup-body-col-section">
    <p>Type</p>
    <select class="text-input select yt-quality-input" style="width: 100%;">
    <option value="highestvideo">Highest video</option>
    <option value="highestaudio">Highest audio</option>
    <option value="lowestvideo">Lowest video</option>
    <option value="lowestaudio">Lowest audio</option>
    </select>
    </div>
    </div>
    </div>
    <div class="popup-controls">
    <button class="icon-button" onclick="closeYtDownloadPopup()">
    <div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
    Cancel
    </button>
    <button class="icon-button yt-download-button-run">
    <div class="button-icon"><i class="fa-solid fa-download"></i></div>
    Download
    </button>
    </div>
    `;
  document.querySelector("body").append(popup);
  popup.classList.add("popup-enter");
  document
    .querySelector(".yt-url-input")
    .addEventListener("focus", () => (IsInputFocused = true));
  document
    .querySelector(".yt-url-input")
    .addEventListener("blur", () => (IsInputFocused = false));
  document
    .querySelector(".yt-download-button-run")
    .addEventListener("click", async () => {
      await startYtDownload(
        document.querySelector(".yt-url-input").value,
        document.querySelector(".yt-quality-input").value,
      );
    });
}

async function startYtDownload(
  url = "https://youtube.com/watch?v=dQw4w9WgXcQ",
  quality = "highvideo",
) {
  closeYtDownloadPopup();
  await invoke("download_yt_video", { appWindow, url, quality });
  finishProgressBar();
  await listDirectories();
  scheduleDiskUsageRefresh();
}

async function closeYtDownloadPopup() {
  let popup = document.querySelector(".yt-download-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      IsPopUpOpen = false;
      cancelOperation();
    }, { once: true });
  } else {
    IsPopUpOpen = false;
    cancelOperation();
  }
}

async function cancelOperation() {
  await invoke("cancel_operation");
}

async function showExtraContextMenu(e, item) {
  $(".extra-c-menu")?.remove();
  let contextMenu = document.createElement("div");
  contextMenu.className = "extra-c-menu context-menu";

  for (let i = 1; i <= item.children.length; i++) {
    let cButton = document.createElement("button");
    cButton.className = "context-item";
    cButton.innerHTML = `Keep ${i}.`;
    cButton.onclick = async () => {
      let excessItems = [];
      for (let j = 0; j < item.children.length; j++) {
        if (j != i - 1) {
          excessItems.push(item.getAttribute("itempath-" + j));
        }
      }
      item.remove();
      contextMenu.remove();
      await invoke("arr_delete_items", { arrItems: excessItems });
      scheduleDiskUsageRefresh();
    };
    contextMenu.append(cButton);
  }

  contextMenu.style.left = e.clientX + "px";
  contextMenu.style.top = e.clientY + "px";
  document.querySelector("body").append(contextMenu);
}

async function addMillerCol(millerCol) {
  CurrentMillerCol = millerCol;
  if (document.querySelector(".miller-col-" + millerCol) != null) return;
  let prevMillerCol = document.querySelector(
    ".miller-col-" + (parseInt(millerCol) - 1),
  );
  let newMillerCol = prevMillerCol.cloneNode(true);
  newMillerCol.className =
    "explorer-container miller-column miller-col-" + millerCol;
  newMillerCol.innerHTML = "";
  newMillerCol.style.boxShadow = "none";
  newMillerCol.onclick = () => setMillerColActive(newMillerCol);
  document.querySelector(".miller-container").appendChild(newMillerCol);
  document
    .querySelector(".miller-container")
    .scrollTo(document.querySelector(".miller-container").scrollWidth, 0);
}

async function removeExcessMillerCols(millerCol) {
  let millerColCount =
    document.querySelector(".miller-container").children.length;
  for (let i = millerCol + 1; i <= millerColCount; i++) {
    if (i > millerCol) {
      $(".miller-col-" + i).remove();
    }
  }
}

async function setMillerColActive(millerColElement, millerCol = 1) {
  document
    .querySelectorAll(".miller-column")
    .forEach((item) => (item.style.boxShadow = "none"));
  if (millerColElement == null) {
    document.querySelector(".miller-col-" + millerCol).style.boxShadow =
      "inset 0px 0px 30px 1px var(--transparentColor)";
  } else {
    millerColElement.style.boxShadow =
      "inset 0px 0px 30px 1px var(--transparentColor)";
  }
}

async function getDir(number) {
  let dirPath = "";
  await invoke("get_df_dir", { number: number }).then(
    (path) => (dirPath = path),
  );
  return dirPath;
}

function toggleCollapseSection(sectionEl) {
  const sectionKey = sectionEl.dataset.section;
  const content = sectionEl.querySelector(".collapse-content");
  const header = sectionEl.querySelector(".collapse-header");
  const isCollapsed = sectionEl.classList.contains("collapsed");

  if (isCollapsed) {
    sectionEl.classList.remove("collapsed");
    content.style.maxHeight = content.scrollHeight + "px";
    header.setAttribute("aria-expanded", "true");
    content.addEventListener("transitionend", function handler() {
      if (!sectionEl.classList.contains("collapsed")) {
        content.style.maxHeight = "none";
      }
      content.removeEventListener("transitionend", handler);
    });
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    content.offsetHeight;
    sectionEl.classList.add("collapsed");
    header.setAttribute("aria-expanded", "false");
  }

  localStorage.setItem(
    "sidebar-section-" + sectionKey,
    isCollapsed ? "expanded" : "collapsed",
  );
}

function restoreCollapseState(sectionEl) {
  const sectionKey = sectionEl.dataset.section;
  const saved = localStorage.getItem("sidebar-section-" + sectionKey);
  if (saved === "collapsed") {
    const content = sectionEl.querySelector(".collapse-content");
    const header = sectionEl.querySelector(".collapse-header");
    sectionEl.classList.add("collapsed");
    content.style.maxHeight = "0";
    header.setAttribute("aria-expanded", "false");
  }
}

function markSelectedDisk(path) {
  document.querySelectorAll(".disk-site-nav-button").forEach((button) => {
    button.classList.remove("active");
  });
}

function displayDiskName(rawName = "") {
  let name = rawName != null && rawName !== "" ? String(rawName) : "/";
  if (name.length >= 2) {
    let first = name[0];
    let last = name[name.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return name.slice(1, -1) || "/";
    }
  }
  return name;
}

function getDiskUsedPercentage(mount) {
  let capacity = parseFloat(mount?.capacity);
  let avail = parseFloat(mount?.avail);
  let rawUsedPercentage = 100 - (100 / capacity) * avail;
  return Number.isFinite(rawUsedPercentage)
    ? Math.min(100, Math.max(0, rawUsedPercentage))
    : 0;
}

function updateSidebarDiskButtonUsage(button, mount) {
  let usedPercentage = getDiskUsedPercentage(mount).toFixed(2);
  let displayName = displayDiskName(mount?.name);
  let nameLabel = button.querySelector(".disk-nav-name");
  let usageLabel = button.querySelector(".disk-nav-usage");
  let progressFill = button.querySelector(".disk-nav-progress-fill");

  if (nameLabel) nameLabel.textContent = displayName;
  if (usageLabel) usageLabel.textContent = `${usedPercentage}%`;
  if (progressFill) progressFill.style.width = `${usedPercentage}%`;
  button.title = `${displayName} • ${usedPercentage}% used`;
}

let DiskUsageRefreshTimer = null;

function scheduleDiskUsageRefresh(delay = 250) {
  clearTimeout(DiskUsageRefreshTimer);
  DiskUsageRefreshTimer = setTimeout(() => {
    refreshDiskSidebarUsage();
  }, delay);
}

async function refreshDiskSidebarUsage() {
  try {
    let disks = await invoke("list_disks");
    let disksByPath = new Map(disks.map((disk) => [disk.path, disk]));
    document.querySelectorAll(".disk-site-nav-button").forEach((button) => {
      let path = button.dataset.itempath || button.getAttribute("itempath") || "";
      let mount = disksByPath.get(path);
      if (mount) updateSidebarDiskButtonUsage(button, mount);
    });
  } catch (error) {
    writeLog(`Failed to refresh disk usage: ${error}`);
  }
}

window.scheduleDiskUsageRefresh = scheduleDiskUsageRefresh;

function createSidebarDiskButton(mount, pathOverride = "") {
  const path = pathOverride || mount.path || "";
  const name = displayDiskName(mount.name);
  const usedPercentage = getDiskUsedPercentage(mount).toFixed(2);
  const diskButton = document.createElement("button");

  diskButton.dataset.itempath = path;
  diskButton.setAttribute("itempath", path);
  diskButton.className = "site-nav-bar-button disk-site-nav-button";
  diskButton.title = `${name} • ${usedPercentage}% used`;

  const treeElbow = document.createElement("span");
  treeElbow.className = "disk-tree-elbow";
  treeElbow.setAttribute("aria-hidden", "true");

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-hard-drive disk-nav-icon";
  icon.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = "disk-nav-copy";

  const nameLabel = document.createElement("span");
  nameLabel.className = "disk-nav-name";
  nameLabel.textContent = name;

  const usageLabel = document.createElement("span");
  usageLabel.className = "disk-nav-usage";
  usageLabel.textContent = `${usedPercentage}%`;

  const usageRow = document.createElement("span");
  usageRow.className = "disk-nav-usage-row";

  const progressTrack = document.createElement("span");
  progressTrack.className = "disk-nav-progress-track";
  progressTrack.setAttribute("aria-hidden", "true");

  const progressFill = document.createElement("span");
  progressFill.className = "disk-nav-progress-fill";
  progressFill.style.width = `${usedPercentage}%`;

  progressTrack.append(progressFill);
  usageRow.append(usageLabel, progressTrack);
  copy.append(nameLabel, usageRow);
  diskButton.append(treeElbow, icon, copy);

  diskButton.onclick = async () => {
    await openDirAndSwitch(path);
    await listDirectories();
    markSelectedDisk(path);
  };

  if (mount.format.includes("SSHFS") || mount.is_removable == true) {
    diskButton.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCustomContextMenu(e, [
        {
          name: "Unmount",
          icon: "fa-solid fa-eject",
          onclick: () =>
            mount.format.includes("SSHFS")
              ? unmountNetworkDrive(mount)
              : unmountDrive(mount),
        },
      ]);
    };
  }

  return diskButton;
}

async function insertSiteNavButtons() {
  // Clear current stack of dynamic elements in sidebar
  $(".site-nav-bar-button").remove();
  $(".site-nav-bar-button-fav").remove();
  $(".site-nav-bar-title").remove();
  $(".site-nav-bar > .horizontal-seperator").remove();
  $(".collapse-section").remove();
  $(".site-nav-bar > .disk-container").remove();

  let disks = await invoke("list_disks");
  let siteNavButtons = [
    Platform.includes("darwin")
      ? [
          "Applications",
          "/Applications",
          "fa-solid fa-rocket",
          async () => await openDirAndSwitch("/Applications"),
        ]
      : [],
    [
      "Desktop",
      await getDir(0),
      "fa-solid fa-desktop",
      async () => await goToDir(0),
    ],
    [
      "Downloads",
      await getDir(1),
      "fa-solid fa-download",
      async () => await goToDir(1),
    ],
    [
      "Documents",
      await getDir(2),
      "fa-solid fa-file",
      async () => await goToDir(2),
    ],
    [
      "Pictures",
      await getDir(3),
      "fa-solid fa-image",
      async () => await goToDir(3),
    ],
    [
      "Videos",
      await getDir(4),
      "fa-solid fa-video",
      async () => await goToDir(4),
    ],
    [
      "Music",
      await getDir(5),
      "fa-solid fa-music",
      async () => await goToDir(5),
    ],
    // No sshfs implemenation for windows *yet*
    // Currently disabled
    // Platform.includes("win") && Platform != "darwin"
    //   ? []
    //   : ["SSHFS", "", "fa-solid fa-globe", showFtpConfig],
  ];

  for (let i = 0; i < siteNavButtons.length; i++) {
    if (siteNavButtons[i].length == 0) continue;
    let button = document.createElement("button");
    button.className = "site-nav-bar-button";
    button.innerHTML = `<i class="${siteNavButtons[i][2]}"></i> ${siteNavButtons[i][0]}`;
    button.setAttribute("itempath", siteNavButtons[i][1]);
    button.onclick = siteNavButtons[i][3];
    button.ondragover = (e) => {
      button.style.border = "1px solid var(--tertiaryColor)";
      button.style.backgroundColor = "var(--sidebarHover)";
      button.style.scale = "1.05";
      DraggedOverElement = button;
      MousePos = [e.clientX, e.clientY];
    };
    button.ondragleave = () => {
      button.style.border = "1px solid transparent";
      button.style.backgroundColor = "transparent";
      button.style.scale = "1";
    };
    document.querySelector(".site-nav-bar").append(button);
  }

  // Favorites collapsible section
  if (ArrFavorites.length > 0) {
    const favSection = document.createElement("div");
    favSection.className = "collapse-section";
    favSection.dataset.section = "favorites";

    const favHeader = document.createElement("button");
    favHeader.className = "collapse-header";
    favHeader.innerHTML = `
        <div class="collapse-header-left">
            <i class="fa-solid fa-thumbtack" style="color: var(--textColor2); font-size: 9px;" aria-hidden="true"></i>
            <span>FAVORITES</span>
        </div>
        <i class="fa-solid fa-chevron-up collapse-chevron" aria-hidden="true"></i>
    `;
    favHeader.setAttribute("aria-expanded", "true");
    favHeader.setAttribute("aria-controls", "favorites-content");
    favHeader.onclick = () => toggleCollapseSection(favSection);

    const favContent = document.createElement("div");
    favContent.className = "collapse-content";
    favContent.id = "favorites-content";
    favContent.setAttribute("role", "region");

    ArrFavorites.forEach((path) => {
      let button = document.createElement("button");
      button.className = "site-nav-bar-button-fav";
      let name = path.split(/[\\\/]/).pop() || path;
      button.innerHTML = `<p>${name}</p>`;
      button.setAttribute("itempath", path);
      button.title = path;
      button.onclick = async () => {
        await openDirAndSwitch(path);
        await listDirectories();
      };
      button.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCustomContextMenu(e, [
          {
            name: "Remove from Favorites",
            onclick: () => removeFavorite(path),
          },
        ]);
      };
      button.ondragover = (e) => {
        button.style.border = "1px solid var(--tertiaryColor)";
        button.style.backgroundColor = "var(--sidebarHover)";
        DraggedOverElement = button;
        MousePos = [e.clientX, e.clientY];
      };
      button.ondragleave = () => {
        button.style.border = "1px solid transparent";
        button.style.backgroundColor = "transparent";
      };
      favContent.append(button);
    });

    favSection.append(favHeader);
    favSection.append(favContent);
    document.querySelector(".site-nav-bar").append(favSection);
    restoreCollapseState(favSection);
  }

  // Disks collapsible section
  const diskSection = document.createElement("div");
  diskSection.className = "collapse-section disk-collapse-section";
  diskSection.dataset.section = "disks";

  const diskHeader = document.createElement("button");
  diskHeader.className = "collapse-header";
  diskHeader.innerHTML = `
      <div class="collapse-header-left">
          <i class="fa-solid fa-hard-drive" aria-hidden="true"></i>
          <span>DISKS</span>
      </div>
      <i class="fa-solid fa-chevron-up collapse-chevron" aria-hidden="true"></i>
  `;
  diskHeader.setAttribute("aria-expanded", "true");
  diskHeader.setAttribute("aria-controls", "disks-content");
  diskHeader.onclick = () => toggleCollapseSection(diskSection);

  const diskContent = document.createElement("div");
  diskContent.className = "collapse-content";
  diskContent.id = "disks-content";
  diskContent.setAttribute("role", "region");

  let diskContainer = document.createElement("div");
  diskContainer.className = "disk-container";

  if (disks.length > 0) {
    disks.forEach((mount) => {
      diskContainer.append(createSidebarDiskButton(mount));
    });
  }

  diskContent.append(diskContainer);
  diskSection.append(diskHeader);
  diskSection.append(diskContent);
  document.querySelector(".site-nav-bar").append(diskSection);
  restoreCollapseState(diskSection);
}

/* File operation context menu */
async function fileOperationContextMenu() {
  let contextMenu = document.createElement("div");
  contextMenu.className = "uni-popup context-menu";
  contextMenu.innerHTML = `
    <button class="context-item">Copy</button>
    <button class="context-item">Move</button>
    `;
  contextMenu.children[0].onclick = () => (FileOperation = "copy");
  contextMenu.children[1].onclick = () => (FileOperation = "move");
  contextMenu.style.left = MousePos[0] + "px";
  contextMenu.style.top = MousePos[1] + "px";
  contextMenu.style.right = "unset";
  contextMenu.style.bottom = "unset";
  document.body.appendChild(contextMenu);
  await new Promise((resolve) => {
    document.body.addEventListener(
      "click",
      (e) => {
        resolve(e);
      },
      { once: true },
    );
    document.body.addEventListener(
      "keyup",
      (e) => {
        if (e.key === "Escape") {
          resolve(e);
        }
      },
      { once: true },
    );
  });
  contextMenu.remove();
  resetBackButton();
  return FileOperation;
}

async function openDirAndSwitch(path) {
  const isSwitched = await invoke("open_dir", { path });
  if (isSwitched !== true) {
    alert("Could not open directory");
    return;
  }

  await configBackButton(CurrentDir);
  await setCurrentDir(path, "", false);
  await listDirectories();
  await unSelectAllItems();
}

async function openConfigLocation() {
  let dir = await invoke("get_config_location");
  await openDirAndSwitch(dir);
  resetEverything();
}

async function showPopup(
  message = "Nothing to see here!",
  type = PopupType.CONTINUE,
  subtitle = "",
) {
  let confirmationButton = "";
  switch (type) {
    case PopupType.CONTINUE:
      confirmationButton = `
      <button class="icon-button">
      <div class="button-icon"><i class="fa-solid fa-check"></i></div>
      Confirm
      </button>
      `;
      break;
    case PopupType.EXTRACT:
      confirmationButton = `
      <button class="icon-button">
      <div class="button-icon"><i class="fa-solid fa-maximize"></i></div>
      Extract
      </button>
      `;
      break;
    case PopupType.DELETE:
      confirmationButton = `
      <button class="icon-button delete-button">
      <div class="button-icon"><i class="fa-solid fa-trash"></i></div>
      Delete
      </button>
      `;
      break;
    case PopupType.PROMPT:
      confirmationButton = `
      <button class="icon-button">
      <div class="button-icon"><i class="fa-solid fa-check"></i></div>
      Confirm
      </button>
      `;
      break;
  }
  let popup = document.createElement("div");
  popup.className = "uni-popup confirm-popup";
  popup.innerHTML = `
    <div class="popup-header">
    <div style="display: flex; gap: 10px; align-items: center;">
    <i class="fa-solid fa-check"></i>
    <h3>Confirm</h3>
    </div>
    </div>
    <div class="popup-body">
    <p class="popup-body-content">${message}</p>
    ${subtitle ? `<p class="popup-body-content popup-body-subtitle">${subtitle}</p>` : ""}
    <br/>
    ${type === PopupType.PROMPT ? `<input type="password" class="text-input popup-prompt-input" placeholder="Password">` : ""}
    </div>
    <div class="popup-controls">
    <button class="icon-button">
    <div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
    Cancel
    </button>
    ${confirmationButton}
    </div>
    `;
  document.querySelector(".main-container").appendChild(popup);
  popup.classList.add("popup-enter");
  if (type === PopupType.PROMPT) {
    document.querySelector(".confirm-popup input").focus();
  } else {
    document.querySelector(".confirm-popup button:last-child").focus();
  }
  IsPopUpOpen = true;
  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1")); // Workaround to trigger opacity transition
  return new Promise((resolve) => {
    let input = document.querySelector(".popup-prompt-input");
    if (input) {
      input.onkeyup = (event) => {
        if (event.key === "Enter") {
          if (type === PopupType.PROMPT) {
            resolve($(".popup-prompt-input").val());
          } else {
            resolve(true);
          }
          closeConfirmPopup();
        }
      };
    }
    document.querySelector(".confirm-popup button:first-child").onclick =
      () => {
        if (type === PopupType.PROMPT) {
          resolve("");
        } else {
          resolve(false);
        }
        closeConfirmPopup();
      };
    document.querySelector(".confirm-popup button:last-child").onclick = () => {
      if (type === PopupType.PROMPT) {
        resolve($(".popup-prompt-input").val());
      } else {
        resolve(true);
      }
      closeConfirmPopup();
    };
  });
}

function closeConfirmPopup() {
  let popup = document.querySelector(".confirm-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    popup.addEventListener("animationend", () => {
      popup?.remove();
      $(".popup-background").css("display", "none");
      $(".popup-background").css("opacity", "0");
      IsPopUpOpen = false;
    }, { once: true });
  } else {
    $(".popup-background").css("display", "none");
    $(".popup-background").css("opacity", "0");
    IsPopUpOpen = false;
  }
}

function resetContextMenu() {
  cdCtMenu.setSelectedItem(null);
  cdCtMenu.hide();
  cdCtMenu.hideSubMenu();
}

function showCustomContextMenu(e, contextMenuItems = [{}]) {
  let customContextMenu = document.createElement("div");
  customContextMenu.className = "custom-context-menu";
  contextMenuItems.map((item) => {
    let newButton = document.createElement("button");
    newButton.className = "c-item-custom";
    if (item.icon) {
      let icon = document.createElement("i");
      icon.className = `c-item-custom-icon ${item.icon}`;
      icon.setAttribute("aria-hidden", "true");

      let label = document.createElement("span");
      label.textContent = item.name;

      newButton.append(icon, label);
    } else {
      newButton.textContent = item.name;
    }
    newButton.onclick = () => {
      item.onclick();
      closeCustomContextMenu();
    };
    customContextMenu.appendChild(newButton);
  });
  customContextMenu.style.position = "absolute";
  customContextMenu.style.top = `${e.clientY}px`;
  customContextMenu.style.left = `${e.clientX}px`;
  document.querySelector("body").append(customContextMenu);
}

function closeCustomContextMenu() {
  $(".custom-context-menu").remove();
}

async function unmountNetworkDrive(networkDrive) {
  let sudoPassword = await showPopup("Enter sudo password", PopupType.PROMPT);
  await invoke("unmount_network_drive", {
    path: networkDrive.path.replaceAll('"', ""), // replaceAll('"', "") -> otherwise the path could be invalid
    sudoPassword,
  });
}

function unmountDrive(disk) {
  invoke("unmount_drive", { path: disk.path });
}

async function configBackButton(path = "") {
  let button = document.querySelector(".go-back-button");
  button.setAttribute("itempath", path);
  button.ondragover = (e) => {
    button.style.border = "1px solid var(--selectColor2)";
    button.style.backgroundColor = "var(--transparentColor)";
    button.style.scale = "1.05";
    DraggedOverElement = button;
    MousePos = [e.clientX, e.clientY];
  };
  button.ondragleave = () => {
    resetBackButton();
  };
}

function resetBackButton() {
  let button = document.querySelector(".go-back-button");
  button.style.opacity = "1";
  button.style.border = "1px solid transparent";
  button.style.backgroundColor = "initial";
  button.style.scale = "1";
}

async function handleMountChanges() {
  await insertSiteNavButtons();
}

async function addNewMount(payload) {
  let path = payload.paths[0];
  let mount = await invoke("get_disk_info", { path });
  document.querySelector(".disk-container")?.append(createSidebarDiskButton(mount, path));
}

async function removeMount(mount) {
  let path = mount.paths[0];
  let diskButton = Array.from(document.querySelectorAll(".disk-site-nav-button")).find(
    (button) => button.dataset.itempath === path,
  );
  if (!diskButton) return;
  diskButton.remove();
}

// --- Dual Pane Directory Comparison & Sync Features ---
var comparisonActive = false;
var comparisonResults = null;

function compareDualPanes() {
  if (!IsDualPaneEnabled) return;
  
  // Get all items in left and right panes
  const leftItems = Array.from(document.querySelectorAll(".dual-pane-left .item-link"));
  const rightItems = Array.from(document.querySelectorAll(".dual-pane-right .item-link"));
  
  // Clear any previous badges / classes
  clearComparisonVisuals();
  
  if (leftItems.length === 0 && rightItems.length === 0) {
    showToast("No items to compare.", ToastType.INFO);
    return;
  }
  
  // Store results for sync operation
  comparisonResults = {
    leftOnly: [],     // Paths of items only in left pane
    rightOnly: [],    // Paths of items only in right pane
    different: [],    // Paths of items in left pane that are different from right pane
    identical: []     // Paths of identical items
  };
  
  // Map right items by name for quick lookup
  const rightMap = new Map();
  rightItems.forEach(item => {
    const name = item.getAttribute("itemname");
    const isDir = item.getAttribute("itemisdir");
    const rawSize = parseInt(item.getAttribute("itemrawsize")) || 0;
    const modified = item.getAttribute("itemmodified");
    const path = item.getAttribute("itempath");
    if (name && name !== "..") {
      rightMap.set(name + "|" + isDir, { item, rawSize, modified, path });
    }
  });
  
  // Map left items by name for quick lookup
  const leftMap = new Map();
  leftItems.forEach(item => {
    const name = item.getAttribute("itemname");
    const isDir = item.getAttribute("itemisdir");
    const rawSize = parseInt(item.getAttribute("itemrawsize")) || 0;
    const modified = item.getAttribute("itemmodified");
    const path = item.getAttribute("itempath");
    if (name && name !== "..") {
      leftMap.set(name + "|" + isDir, { item, rawSize, modified, path });
    }
  });
  
  // 1. Process Left Items
  leftItems.forEach(item => {
    const name = item.getAttribute("itemname");
    const isDir = item.getAttribute("itemisdir");
    const leftRawSize = parseInt(item.getAttribute("itemrawsize")) || 0;
    const leftModified = item.getAttribute("itemmodified");
    const leftPath = item.getAttribute("itempath");
    
    if (!name || name === "..") return;
    
    const key = name + "|" + isDir;
    if (rightMap.has(key)) {
      const rightItem = rightMap.get(key);
      const isSizeDiff = leftRawSize !== rightItem.rawSize;
      const isModifiedDiff = leftModified !== rightItem.modified;
      
      if (isSizeDiff || isModifiedDiff) {
        // Different / Mismatched
        markItem(item, "different", "Mismatch");
        markItem(rightItem.item, "different", "Mismatch");
        comparisonResults.different.push({
          leftPath: leftPath,
          rightPath: rightItem.path,
          name: name,
          isDir: isDir === "1",
          leftSize: leftRawSize,
          rightSize: rightItem.rawSize,
          leftModified: leftModified,
          rightModified: rightItem.modified
        });
      } else {
        // Identical
        markItem(item, "identical");
        markItem(rightItem.item, "identical");
        comparisonResults.identical.push({ leftPath, rightPath: rightItem.path });
      }
    } else {
      // Left only
      markItem(item, "left-only", "New");
      comparisonResults.leftOnly.push({
        path: leftPath,
        name: name,
        isDir: isDir === "1"
      });
    }
  });
  
  // 2. Process Right Items for Right-Only
  rightItems.forEach(item => {
    const name = item.getAttribute("itemname");
    const isDir = item.getAttribute("itemisdir");
    const rightPath = item.getAttribute("itempath");
    
    if (!name || name === "..") return;
    
    const key = name + "|" + isDir;
    if (!leftMap.has(key)) {
      // Right only
      markItem(item, "right-only", "New");
      comparisonResults.rightOnly.push({
        path: rightPath,
        name: name,
        isDir: isDir === "1"
      });
    }
  });
  
  comparisonActive = true;
  document.getElementById("dual-pane-clear-btn").style.display = "inline-flex";
  
  // Enable/disable sync button depending on results
  const hasDiffs = comparisonResults.leftOnly.length > 0 || 
                   comparisonResults.rightOnly.length > 0 || 
                   comparisonResults.different.length > 0;
                     
  const syncBtn = document.getElementById("dual-pane-sync-btn");
  if (syncBtn) {
    if (hasDiffs) {
      syncBtn.removeAttribute("disabled");
      syncBtn.classList.remove("disabled");
      showToast(`Comparison complete. Found differences to sync.`, ToastType.SUCCESS);
    } else {
      syncBtn.setAttribute("disabled", "true");
      syncBtn.classList.add("disabled");
      showToast(`Comparison complete. Directories are identical!`, ToastType.SUCCESS);
    }
  }
}

function markItem(itemEl, type, label = "") {
  const rowEl = itemEl.querySelector(".dual-pane-list-item");
  if (!rowEl) return;
  
  rowEl.classList.add(`compare-${type}`);
  
  if (label) {
    if (rowEl.querySelector(".compare-badge")) return;
    
    // Find the first span (where name is located)
    const nameSpan = rowEl.querySelector(".item-button-list-info-span");
    if (nameSpan) {
      const badge = document.createElement("span");
      badge.className = `compare-badge badge-${type}`;
      badge.innerHTML = label;
      nameSpan.appendChild(badge);
    }
  }
}

function clearComparisonVisuals() {
  const items = document.querySelectorAll(".dual-pane-container .dual-pane-list-item");
  items.forEach(item => {
    item.classList.remove("compare-left-only", "compare-right-only", "compare-different", "compare-identical");
    const badge = item.querySelector(".compare-badge");
    if (badge) badge.remove();
  });
}

function clearComparison() {
  clearComparisonVisuals();
  comparisonActive = false;
  comparisonResults = null;
  
  const syncBtn = document.getElementById("dual-pane-sync-btn");
  if (syncBtn) {
    syncBtn.setAttribute("disabled", "true");
    syncBtn.classList.add("disabled");
  }
  
  const clearBtn = document.getElementById("dual-pane-clear-btn");
  if (clearBtn) {
    clearBtn.style.display = "none";
  }
  showToast("Comparison highlights cleared.", ToastType.INFO);
}

function showSyncPopup() {
  if (!comparisonResults) return;
  
  // Set paths
  document.getElementById("sync-left-path").innerText = LeftDualPanePath;
  document.getElementById("sync-left-path").setAttribute("title", LeftDualPanePath);
  document.getElementById("sync-right-path").innerText = RightDualPanePath;
  document.getElementById("sync-right-path").setAttribute("title", RightDualPanePath);
  
  // Set stats
  document.getElementById("sync-stat-left-only").innerText = comparisonResults.leftOnly.length;
  document.getElementById("sync-stat-right-only").innerText = comparisonResults.rightOnly.length;
  document.getElementById("sync-stat-different").innerText = comparisonResults.different.length;
  
  // Set default checkbox state
  document.getElementById("sync-delete-extraneous").checked = false;
  
  // Handle select changed
  const modeSelect = document.getElementById("sync-direction-select");
  const deleteCheckbox = document.getElementById("sync-delete-extraneous");
  
  const handleModeChange = () => {
    if (modeSelect.value === "two-way") {
      deleteCheckbox.checked = false;
      deleteCheckbox.setAttribute("disabled", "true");
    } else {
      deleteCheckbox.removeAttribute("disabled");
    }
  };
  
  modeSelect.addEventListener("change", handleModeChange);
  handleModeChange();
  
  // Open dialog with smooth transitions
  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1"));
  
  document.querySelector(".sync-directory-container").style.display = "flex";
  IsPopUpOpen = true;
  IsDisableShortcuts = true;
}

function closeSyncPopup() {
  document.querySelector(".sync-directory-container").style.display = "none";
  $(".popup-background").css("display", "none");
  $(".popup-background").css("opacity", "0");
  IsPopUpOpen = false;
  IsDisableShortcuts = false;
}

async function executeSync() {
  if (!comparisonResults) {
    showToast("Please run comparison first.", ToastType.ERROR);
    return;
  }
  
  const mode = document.getElementById("sync-direction-select").value;
  const deleteExtraneous = document.getElementById("sync-delete-extraneous").checked;
  
  const itemsToCopy = [];
  const itemsToDelete = [];
  
  if (mode === "left-to-right") {
    // 1. Copy leftOnly items to right
    comparisonResults.leftOnly.forEach(item => {
      itemsToCopy.push({
        source_path: item.path,
        destination_path: RightDualPanePath + "/" + item.name,
        policy: "replace"
      });
    });
    
    // 2. Copy different items from left to right
    comparisonResults.different.forEach(item => {
      itemsToCopy.push({
        source_path: item.leftPath,
        destination_path: item.rightPath,
        policy: "replace"
      });
    });
    
    // 3. Delete rightOnly items if deleteExtraneous
    if (deleteExtraneous) {
      comparisonResults.rightOnly.forEach(item => {
        itemsToDelete.push(item.path);
      });
    }
  } else if (mode === "right-to-left") {
    // 1. Copy rightOnly items to left
    comparisonResults.rightOnly.forEach(item => {
      itemsToCopy.push({
        source_path: item.path,
        destination_path: LeftDualPanePath + "/" + item.name,
        policy: "replace"
      });
    });
    
    // 2. Copy different items from right to left
    comparisonResults.different.forEach(item => {
      itemsToCopy.push({
        source_path: item.rightPath,
        destination_path: item.leftPath,
        policy: "replace"
      });
    });
    
    // 3. Delete leftOnly items if deleteExtraneous
    if (deleteExtraneous) {
      comparisonResults.leftOnly.forEach(item => {
        itemsToDelete.push(item.path);
      });
    }
  } else if (mode === "two-way") {
    // 1. Copy leftOnly items to right
    comparisonResults.leftOnly.forEach(item => {
      itemsToCopy.push({
        source_path: item.path,
        destination_path: RightDualPanePath + "/" + item.name,
        policy: "replace"
      });
    });
    
    // 2. Copy rightOnly items to left
    comparisonResults.rightOnly.forEach(item => {
      itemsToCopy.push({
        source_path: item.path,
        destination_path: LeftDualPanePath + "/" + item.name,
        policy: "replace"
      });
    });
    
    // 3. Compare modification date of different items, and copy the newer one
    comparisonResults.different.forEach(item => {
      let leftTime = Date.parse(item.leftModified) || 0;
      let rightTime = Date.parse(item.rightModified) || 0;
      
      if (leftTime >= rightTime) {
        itemsToCopy.push({
          source_path: item.leftPath,
          destination_path: item.rightPath,
          policy: "replace"
        });
      } else {
        itemsToCopy.push({
          source_path: item.rightPath,
          destination_path: item.leftPath,
          policy: "replace"
        });
      }
    });
  }

  closeSyncPopup();

  // Perform deletions first
  if (itemsToDelete.length > 0) {
    try {
      window.IsDeletingItems = true;
      await invoke("arr_delete_items", { arrItems: itemsToDelete });
      showToast(`Successfully deleted ${itemsToDelete.length} extraneous items.`, ToastType.SUCCESS);
    } catch (err) {
      showToast(`Failed to delete extraneous items: ${err}`, ToastType.ERROR);
      window.IsDeletingItems = false;
      return;
    } finally {
      window.IsDeletingItems = false;
    }
  }
  
  // Perform copies
  if (itemsToCopy.length > 0) {
    try {
      const result = await invoke("arr_copy_paste_resolved", { items: itemsToCopy });
      let copiedSources = Array.isArray(result) ? result : (result?.copied_sources ?? []);
      let errors = Array.isArray(result) ? [] : (result?.errors ?? []);
      
      if (errors.length > 0) {
        showToast(`${errors.length} item(s) failed to sync.`, ToastType.ERROR);
      } else {
        showToast(`Synchronization complete! Synced ${copiedSources.length} item(s).`, ToastType.SUCCESS);
      }
    } catch (err) {
      showToast(`Synchronization failed: ${err}`, ToastType.ERROR);
    }
  } else {
    showToast("Nothing to sync.", ToastType.INFO);
  }

  // Clear state and refresh
  clearComparisonVisuals();
  comparisonActive = false;
  comparisonResults = null;
  
  const syncBtn = document.getElementById("dual-pane-sync-btn");
  if (syncBtn) {
    syncBtn.setAttribute("disabled", "true");
    syncBtn.classList.add("disabled");
  }
  document.getElementById("dual-pane-clear-btn").style.display = "none";
  
  await refreshBothViews("left");
}

(async () => {
  await getSetInstalledApplications();
  await checkAppConfig();
  await insertSiteNavButtons();
  cdCtMenu.setupItems();
})();
