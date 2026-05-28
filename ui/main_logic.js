const TAURI = window.__TAURI__;
const { invoke } = TAURI.core;
const { confirm } = TAURI.dialog;
const { message } = TAURI.dialog;
const { open } = TAURI.dialog;
const appWindow = window.__TAURI__.webviewWindow.getCurrentWebviewWindow();
const { writeText } = TAURI.clipboardManager;
const { getTauriVersion } = TAURI.app;
const { getVersion } = TAURI.app;
const { getMatches } = TAURI.cli;
const { platform } = TAURI.os;
const { arch } = TAURI.os;
const convertFileSrc = TAURI.core.convertFileSrc;
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

  const channel = new TAURI.core.Channel();
  channel.onmessage = (event) => {
    if (onEvent) onEvent(event);
  };

  try {
    await invoke("plugin:drag|start_drag", {
      item: options.item,
      image: dragIcon,
      onEvent: channel,
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
let ShiftAnchorElement = null;
let IsLShiftDown = false;
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
let IsAiEnabled = false;
let AiProvider = "gemini";
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
let CurrentSortMethod = "name";
let CurrentSortAscending = true;
let SelectedItemToOpen = null;
let DefaultFileIcon = "";
let DefaultFolderIcon = "";
const IconThemes = ["Prestige Glass", "Minimalist Outline", "Golden Luxury", "Lucide Default"];

function getVectorIconAndColor(item, themeName) {
  let isDir = item.is_dir == 1;
  let name = (item.name || "").toLowerCase();
  let ext = (item.extension || "").toLowerCase();

  let iconClass = "fa-solid fa-file";
  let iconColor = "var(--textColor2)";
  let customStyle = "";

  let customColor = localStorage.getItem("icon-color-" + themeName);

  if (themeName === "Minimalist Outline") {
    let baseColor = customColor || "var(--textColor2)";
    iconColor = baseColor;
    if (isDir) {
      iconClass = "fa-regular fa-folder";
      switch (name) {
        case "downloads": iconClass = "fa-regular fa-circle-down"; break;
        case "desktop": iconClass = "fa-solid fa-desktop"; break;
        case "dokumente":
        case "documents":
        case "docs":
          iconClass = "fa-regular fa-file-lines";
          break;
        case "musik":
        case "music":
          iconClass = "fa-solid fa-music";
          break;
        case "bilder":
        case "photos":
        case "pictures":
        case "images":
          iconClass = "fa-regular fa-image";
          break;
        case "videos":
        case "video":
        case "movies":
          iconClass = "fa-regular fa-file-video";
          break;
        case "coding":
        case "code":
          iconClass = "fa-solid fa-code";
          break;
        case "tools":
          iconClass = "fa-solid fa-wrench";
          break;
        case "games":
          iconClass = "fa-solid fa-gamepad";
          break;
      }
    } else {
      switch (ext) {
        case ".rs":
        case ".js":
        case ".jsx":
        case ".ts":
        case ".tsx":
        case ".py":
        case ".go":
        case ".c":
        case ".cs":
        case ".html":
        case ".css":
        case ".json":
        case ".xml":
        case ".php":
        case ".dart":
          iconClass = "fa-regular fa-file-code";
          break;
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp":
        case ".svg":
          iconClass = "fa-regular fa-file-image";
          break;
        case ".mp3":
        case ".wav":
        case ".ogg":
        case ".opus":
          iconClass = "fa-regular fa-file-audio";
          break;
        case ".mp4":
        case ".mkv":
        case ".avi":
        case ".mov":
        case ".webm":
          iconClass = "fa-regular fa-file-video";
          break;
        case ".pdf":
          iconClass = "fa-regular fa-file-pdf";
          break;
        case ".docx":
        case ".doc":
          iconClass = "fa-regular fa-file-word";
          break;
        case ".xlsx":
          iconClass = "fa-regular fa-file-excel";
          break;
        case ".zip":
        case ".rar":
        case ".tar":
        case ".7z":
        case ".zst":
        case ".zstd":
        case ".gz":
        case ".xz":
        case ".bz2":
        case ".lz":
        case ".lz4":
        case ".lzma":
        case ".lzo":
        case ".z":
        case ".br":
        case ".brotli":
        case ".density":
        case ".tgz":
        case ".tbz2":
        case ".txz":
          iconClass = "fa-regular fa-file-zipper";
          break;
        case ".txt":
        case ".md":
          iconClass = "fa-regular fa-file-lines";
          break;
        default:
          iconClass = "fa-regular fa-file";
          break;
      }
    }
  } else if (themeName === "Golden Luxury") {
    if (isDir) {
      iconClass = "fa-solid fa-folder";
      iconColor = customColor || "#d4af37";
      customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
      switch (name) {
        case "downloads": 
          iconClass = "fa-solid fa-circle-down"; 
          iconColor = customColor || "#f3e5ab"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`; 
          break;
        case "desktop": 
          iconClass = "fa-solid fa-desktop"; 
          iconColor = customColor || "#d4af37"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`; 
          break;
        case "dokumente":
        case "documents":
        case "docs":
          iconClass = "fa-solid fa-file-invoice"; 
          iconColor = customColor || "#c5a059"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "musik":
        case "music":
          iconClass = "fa-solid fa-music"; 
          iconColor = customColor || "#b8860b"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "bilder":
        case "photos":
        case "pictures":
        case "images":
          iconClass = "fa-solid fa-image"; 
          iconColor = customColor || "#ffd700"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "videos":
        case "video":
        case "movies":
          iconClass = "fa-solid fa-video"; 
          iconColor = customColor || "#b76e79"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "coding":
        case "code":
          iconClass = "fa-solid fa-code"; 
          iconColor = customColor || "#f0e68c"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "tools":
          iconClass = "fa-solid fa-screwdriver-wrench"; 
          iconColor = customColor || "#cd7f32"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
        case "games":
          iconClass = "fa-solid fa-gamepad"; 
          iconColor = customColor || "#ffdf00"; 
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.4)};`;
          break;
      }
    } else {
      switch (ext) {
        case ".rs":
        case ".js":
        case ".jsx":
        case ".ts":
        case ".tsx":
        case ".py":
        case ".go":
        case ".c":
        case ".cs":
        case ".html":
        case ".css":
        case ".json":
        case ".xml":
        case ".php":
        case ".dart":
          iconClass = "fa-solid fa-file-code";
          iconColor = "#f3e5ab";
          customStyle = "--glow-color: rgba(243, 229, 171, 0.35);";
          break;
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp":
        case ".svg":
          iconClass = "fa-solid fa-file-image";
          iconColor = "#ffd700";
          customStyle = "--glow-color: rgba(255, 215, 0, 0.35);";
          break;
        case ".mp3":
        case ".wav":
        case ".ogg":
        case ".opus":
          iconClass = "fa-solid fa-file-audio";
          iconColor = "#b8860b";
          customStyle = "--glow-color: rgba(184, 134, 11, 0.35);";
          break;
        case ".mp4":
        case ".mkv":
        case ".avi":
        case ".mov":
        case ".webm":
          iconClass = "fa-solid fa-file-video";
          iconColor = "#b76e79";
          customStyle = "--glow-color: rgba(183, 110, 121, 0.35);";
          break;
        case ".pdf":
          iconClass = "fa-solid fa-file-pdf";
          iconColor = "#ffd700";
          customStyle = "--glow-color: rgba(255, 215, 0, 0.35);";
          break;
        case ".docx":
        case ".doc":
          iconClass = "fa-solid fa-file-word";
          iconColor = "#c5a059";
          customStyle = "--glow-color: rgba(197, 160, 89, 0.35);";
          break;
        case ".xlsx":
          iconClass = "fa-solid fa-file-excel";
          iconColor = "#ffd700";
          customStyle = "--glow-color: rgba(255, 215, 0, 0.35);";
          break;
        case ".zip":
        case ".rar":
        case ".tar":
        case ".7z":
        case ".zst":
        case ".zstd":
        case ".gz":
        case ".xz":
        case ".bz2":
        case ".lz":
        case ".lz4":
        case ".lzma":
        case ".lzo":
        case ".z":
        case ".br":
        case ".brotli":
        case ".density":
        case ".tgz":
        case ".tbz2":
        case ".txz":
          iconClass = "fa-solid fa-file-zipper";
          iconColor = "#aa7c11";
          customStyle = "--glow-color: rgba(170, 124, 17, 0.35);";
          break;
        case ".txt":
        case ".md":
          iconClass = "fa-solid fa-file-lines";
          iconColor = "#f5f5dc";
          customStyle = "--glow-color: rgba(245, 245, 220, 0.3);";
          break;
        default:
          iconClass = "fa-solid fa-file";
          iconColor = customColor || "#d4af37";
          customStyle = `--glow-color: ${hexToRgba(iconColor, 0.3)};`;
          break;
      }
    }
  } else if (themeName === "Lucide Default") {
    if (isDir) {
      iconClass = "fa-solid fa-folder lucide-generic-folder";
      iconColor = customColor || "#6E6E80";
      customStyle = "";
      switch (name) {
        case "downloads":
          iconClass = "lucide icon-download";
          customStyle = "";
          break;
        case "desktop":
          iconClass = "lucide icon-monitor";
          customStyle = "";
          break;
        case "dokumente":
        case "documents":
        case "docs":
          iconClass = "lucide icon-files";
          customStyle = "";
          break;
        case "musik":
        case "music":
          iconClass = "lucide icon-music";
          customStyle = "";
          break;
        case "bilder":
        case "photos":
        case "pictures":
        case "images":
          iconClass = "lucide icon-image";
          customStyle = "";
          break;
        case "videos":
        case "video":
        case "movies":
          iconClass = "lucide icon-video";
          customStyle = "";
          break;
        case "coding":
        case "code":
          iconClass = "lucide icon-code-2";
          customStyle = "";
          break;
        case "tools":
          iconClass = "lucide icon-wrench";
          customStyle = "";
          break;
        case "games":
          iconClass = "lucide icon-gamepad-2";
          customStyle = "";
          break;
      }
    } else {
      iconColor = customColor || "var(--textColor2)";
      switch (ext) {
        case ".rs":
        case ".js":
        case ".jsx":
        case ".ts":
        case ".tsx":
        case ".py":
        case ".go":
        case ".c":
        case ".cs":
        case ".html":
        case ".css":
        case ".json":
        case ".xml":
        case ".php":
        case ".dart":
          iconClass = "lucide icon-file-code";
          break;
        case ".png":
        case ".jpg":
        case ".jpeg":
        case ".gif":
        case ".webp":
        case ".svg":
          iconClass = "lucide icon-file-image";
          break;
        case ".mp3":
        case ".wav":
        case ".ogg":
        case ".opus":
          iconClass = "lucide icon-file-audio";
          break;
        case ".mp4":
        case ".mkv":
        case ".avi":
        case ".mov":
        case ".webm":
          iconClass = "lucide icon-file-video";
          break;
        case ".pdf":
          iconClass = "lucide icon-file-text";
          break;
        case ".docx":
        case ".doc":
          iconClass = "lucide icon-file-text";
          break;
        case ".xlsx":
          iconClass = "lucide icon-file-spreadsheet";
          break;
        case ".zip":
        case ".rar":
        case ".tar":
        case ".7z":
        case ".zst":
        case ".zstd":
        case ".gz":
        case ".xz":
        case ".bz2":
        case ".lz":
        case ".lz4":
        case ".lzma":
        case ".lzo":
        case ".z":
        case ".br":
        case ".brotli":
        case ".density":
        case ".tgz":
        case ".tbz2":
        case ".txz":
          iconClass = "lucide icon-file-archive";
          break;
        case ".txt":
        case ".md":
          iconClass = "lucide icon-file-text";
          break;
        default:
          iconClass = "lucide icon-file";
          break;
      }
    }
  }

  return { iconClass, iconColor, customStyle };
}

let IsFileOpIntern = false;
let DraggedOverElement = null;
let MousePos = [];
let FileOperation = "";
let IsFirstRun = true;
const TIMETORESET = 500;
let CurrentQuickSearch = "";
let ActiveFilter = "";
let CurrentQuickSearchTime = 100;
let CurrentQuickSearchTimer = null;

/* Colors  */
let PrimaryColor = "#3f4352";
let SecondaryColor = "rgb(56, 59, 71)";
let SelectedColor = "rgba(0, 0, 0, 0.5)";
let TransparentColor = "rgba(0, 0, 0, 0.1)";
let CurrentTheme = "0";
let IsEditingTheme = false;
let ThemeToEditOriginalName = "";

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

// Global focus delegation to keep IsInputFocused perfectly in sync
document.addEventListener("focusin", (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
    IsInputFocused = true;
  }
});
document.addEventListener("focusout", (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
    IsInputFocused = false;
  }
});

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
document.querySelector(".search-bar-input").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    e.target.blur();
  }
});

document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
  updateFileSearchbarState();
  if (e.keyCode === 13) {
    let fileName = $(".search-bar-input").val();
    searchFor(fileName);
  }
});

/* Quicksearch for dual pane view */

async function startFullSearch() {
  if (IsFullSearching == false) {
    IsFullSearching = true;
    $(".full-searching-loader").css("display", "inline-flex");
    $(".fullsearch-progress-row").css("display", "grid");
    $(".fullsearch-search-button").html(`
      <i class="fa-solid fa-stop"></i><span>Stop</span>
      `);
    document
      .querySelector(".fullsearch-search-button")
      .addEventListener("click", async () => {
        await stopFullSearch();
      });
    let fileName = document.querySelector(".full-dualpane-search-input").value;
    let maxItems = parseInt(
      document.querySelector(".full-search-max-items-input").value,
    ) || 1000;
    maxItems = Math.max(1, Math.min(1000, maxItems));
    document.querySelector(".full-search-max-items-input").value = maxItems;
    let searchDepth = parseInt(
      document.querySelector(".full-search-search-depth-input").value,
    ) || 10;
    searchDepth = Math.max(1, Math.min(100, searchDepth));
    document.querySelector(".full-search-search-depth-input").value = searchDepth;
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
  $(".fullsearch-progress-row").css("display", "none");
  $(".fullsearch-current-file").html("");
  $(".fullsearch-search-button").html(`
    <i class="fa-solid fa-magnifying-glass"></i><span>Search</span>
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
    let wasQuickSearching = CurrentQuickSearch !== "" || ActiveFilter !== "";
    let hasActiveSearch = IsSearching || IsFullSearching || wasQuickSearching || IsQuickSearchOpen ||
                          (document.querySelector(".search-bar-input") && document.querySelector(".search-bar-input").value !== "") ||
                          (document.querySelector(".dualpane-search-input") && document.querySelector(".dualpane-search-input").value !== "");

    console.log("[Escape Debug] Global keydown Escape. hasActiveSearch:", hasActiveSearch, "CurrentDir:", CurrentDir);

    if (hasActiveSearch) {
      if (document.querySelector(".search-bar-input")) {
        document.querySelector(".search-bar-input").value = "";
        document.querySelector(".search-bar-input").blur();
      }
      if (document.querySelector(".dualpane-search-input")) {
        document.querySelector(".dualpane-search-input").value = "";
        document.querySelector(".dualpane-search-input").blur();
      }
      
      await clearQuickSearch(false);
      IsSearching = false;
      IsFullSearching = false;
      IsQuickSearchOpen = false;

      updateFileSearchbarState();
      await stopSearching();
      closeSearchBar();

      if (DraggedOverElement != null) {
        DraggedOverElement.style.opacity = "1";
      }
      document.querySelectorAll(".site-nav-bar-button").forEach((item) => {
        item.style.opacity = "1";
      });

      if (IsDualPaneEnabled === true) {
        await refreshBothViews(SelectedItemPaneSide);
      } else {
        await refreshView();
      }
    } else {
      await resetEverything();
      if (DraggedOverElement != null) {
        DraggedOverElement.style.opacity = "1";
      }
      document.querySelectorAll(".site-nav-bar-button").forEach((item) => {
        item.style.opacity = "1";
      });

      if (IsDualPaneEnabled === true) {
        await refreshBothViews(SelectedItemPaneSide);
      } else {
        await refreshView();
      }
    }
  }

  // Intercept Backspace if quick search is active
  if (e.key === "Backspace" && CurrentQuickSearch !== "") {
    const activeEl = document.activeElement;
    const isFormElementFocused =
      activeEl &&
      /^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName) &&
      !activeEl.disabled &&
      !activeEl.classList.contains("instant-search-input");
    if (IsInputFocused === false && IsPopUpOpen === false && isFormElementFocused === false) {
      e.preventDefault();
      e.stopPropagation();
      CurrentQuickSearch = CurrentQuickSearch.slice(0, -1);
      if (CurrentQuickSearch === "") {
        await clearQuickSearch(true);
      } else {
        ActiveFilter = CurrentQuickSearch;
        $(".instant-search-input").val(CurrentQuickSearch);
        await searchFor(CurrentQuickSearch, 999999, 1, true);

        // Reset timer countdown
        CurrentQuickSearchTime = TIMETORESET;
        clearInterval(CurrentQuickSearchTimer);
        resetQuickSearch();
      }
      return;
    }
  }

  // :quicksearch :instantsearch
  const activeEl = document.activeElement;
  const isFormElementFocused =
    activeEl &&
    /^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName) &&
    !activeEl.disabled &&
    !activeEl.classList.contains("instant-search-input");
  const isPrintable = e.key.length === 1;
  if (
    IsInputFocused === false &&
    IsPopUpOpen === false &&
    isFormElementFocused === false &&
    !e.metaKey &&
    !e.ctrlKey &&
    isPrintable &&
    !isShortcut(e.key) &&
    (e.key !== " " || CurrentQuickSearch !== "")
  ) {
    e.preventDefault();
    e.stopPropagation();
    CurrentQuickSearch += e.key;
    ActiveFilter = CurrentQuickSearch;
    $(".instant-search-input").css("display", "block");
    $(".instant-search-input").val(CurrentQuickSearch);
    await searchFor(CurrentQuickSearch, 999999, 1, true);

    // Reset timer countdown
    CurrentQuickSearchTime = TIMETORESET;
    clearInterval(CurrentQuickSearchTimer);
    resetQuickSearch();
  }
});

async function clearQuickSearch(shouldRefresh = false) {
  if (CurrentQuickSearchTimer) {
    clearInterval(CurrentQuickSearchTimer);
    CurrentQuickSearchTimer = null;
  }
  CurrentQuickSearchTime = TIMETORESET;
  CurrentQuickSearch = "";
  ActiveFilter = "";
  $(".instant-search-input").val("");
  $(".instant-search-input").css("display", "none");
  if (shouldRefresh) {
    if (IsDualPaneEnabled === true) {
      await refreshBothViews(SelectedItemPaneSide);
    } else {
      await refreshView();
    }
  }
}

function resetQuickSearch() {
  CurrentQuickSearchTimer = setInterval(() => {
    if (IsSearching === true) {
      CurrentQuickSearchTime = TIMETORESET;
      return;
    }
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
  closeUpscalePopup();
  closeInfoProperties();
  closeActiveActionsPopup();
  finishProgressBar();
  closeInputDialogs();
  unSelectAllItems();
  closeConfirmPopup();
  closeCustomContextMenu();
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
  await clearQuickSearch(false);
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
    !e.target.closest(".props-card") &&
    !e.target.closest(".delete-popup") &&
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
  if (!e.target.closest(".custom-context-menu")) {
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
  if (e.code === "ShiftLeft") IsLShiftDown = true;
  if (IsDisableShortcuts === true) return;

  // 1. Check custom slot paths shortcuts first
  if (matchShortcut("slot_1", e)) {
    if (ConfiguredPathOne != "") {
      openItem(null, SelectedItemPaneSide, ConfiguredPathOne);
      e.preventDefault(); e.stopPropagation();
    }
  }
  else if (matchShortcut("slot_2", e)) {
    if (ConfiguredPathTwo != "") {
      openItem(null, SelectedItemPaneSide, ConfiguredPathTwo);
      e.preventDefault(); e.stopPropagation();
    }
  }
  else if (matchShortcut("slot_3", e)) {
    if (ConfiguredPathThree != "") {
      openItem(null, SelectedItemPaneSide, ConfiguredPathThree);
      e.preventDefault(); e.stopPropagation();
    }
  }

  // Dual-pane explorer action contexts
  else if (IsDualPaneEnabled == true && IsPopUpOpen == false) {
    if (matchShortcut("pane_copy", e) && IsTabsEnabled == false) {
      e.preventDefault(); e.stopPropagation();
      let isToCopy = await showCopyMovePopup(false);
      if (isToCopy == true) {
        pasteItem();
      }
    }
    else if (matchShortcut("pane_move", e)) {
      e.preventDefault(); e.stopPropagation();
      let isToMove = await showCopyMovePopup(true);
      if (isToMove == true) {
        IsCopyToCut = true;
        await pasteItem();
      }
    }
    else if (matchShortcut("pane_switch", e)) {
      e.preventDefault(); e.stopPropagation();
      goToOtherPane();
    }
    else if (matchShortcut("disk_menu_left", e)) {
      e.preventDefault(); e.stopPropagation();
      let diskDropdown = document.querySelector(".left-disk-dropdown");
      let evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("mousedown");
      diskDropdown.dispatchEvent(evt);
    }
    else if (matchShortcut("disk_menu_right", e)) {
      e.preventDefault(); e.stopPropagation();
      SelectedItemPaneSide = "right";
      let diskDropdown = document.querySelector(".right-disk-dropdown");
      let evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("mousedown");
      diskDropdown.dispatchEvent(evt);
    }
  }

  // Now standard shortcuts
  if (matchShortcut("copy_dir_path", e)) {
    e.preventDefault(); e.stopPropagation();
    await writeText(CurrentDir);
    showToast("Current dir path copied", ToastType.SUCCESS);
  }
  else if (matchShortcut("focus_search", e)) {
    if (IsDualPaneEnabled != true) {
      $(".search-bar-input").focus();
      IsInputFocused = true;
      e.preventDefault(); e.stopPropagation();
    }
  }
  else if (matchShortcut("quick_preview", e) && SelectedElement != null && IsInputFocused === false && (IsPopUpOpen === false || IsItemPreviewOpen === true)) {
    e.preventDefault(); e.stopPropagation();
    if (IsPopUpOpen == false && IsItemPreviewOpen == false) {
      showItemPreview(SelectedElement);
    } else {
      closeItemPreview();
    }
  }

  // Actions allowed when popup is closed
  if (IsPopUpOpen == false) {
    if (matchShortcut("delete_item", e) && IsInputFocused == false) {
      e.preventDefault(); e.stopPropagation();
      await deleteItems();
      closeLoadingPopup();
      await listDirectories();
      goUp();
    }
    else if (matchShortcut("select_all", e) && IsInputFocused === false) {
      e.preventDefault(); e.stopPropagation();
      await selectAllExplorerItems();
    }
    else if (matchShortcut("rename_item", e) && IsInputFocused == false) {
      e.preventDefault(); e.stopPropagation();
      if (SelectedElement != null) {
        renameElementInputPrompt(SelectedElement);
      }
    }
    else if (matchShortcut("refresh_view", e)) {
      e.preventDefault(); e.stopPropagation();
      await clearQuickSearch(false);
      await unSelectAllItems();
      if (IsDualPaneEnabled === true) {
        refreshBothViews(SelectedItemPaneSide);
      } else {
        refreshView();
      }
    }
    else if (matchShortcut("copy_item", e) && IsInputFocused == false) {
      e.preventDefault(); e.stopPropagation();
      copyItem(SelectedElement);
    }
    else if (matchShortcut("cut_item", e) && IsInputFocused == false) {
      e.preventDefault(); e.stopPropagation();
      await copyItem(SelectedElement, true);
    }
    else if (matchShortcut("paste_item", e) && IsInputFocused == false) {
      e.preventDefault(); e.stopPropagation();
      pasteItem();
    }
    else if (matchShortcut("jump_to_path", e)) {
      e.preventDefault(); e.stopPropagation();
      showInputPopup("Input path to jump to");
    }
    else if (matchShortcut("new_folder", e)) {
      e.preventDefault(); e.stopPropagation();
      createFolderInputPrompt();
    }
    else if (matchShortcut("new_file", e)) {
      e.preventDefault(); e.stopPropagation();
      createFileInputPrompt();
    }
    else if (matchShortcut("search_files", e)) {
      e.preventDefault(); e.stopPropagation();
      openFullSearchContainer();
    }
    else if (matchShortcut("multi_rename", e) && ArrSelectedItems.length >= 1) {
      e.preventDefault(); e.stopPropagation();
      showMultiRenamePopup();
    }
    else if (matchShortcut("compress_item", e) && IsInputFocused === false && IsDualPaneEnabled === false && IsItemPreviewOpen === false) {
      e.preventDefault(); e.stopPropagation();
      showCompressPopup(ArrSelectedItems[0]);
    }
  }

  // Standard list navigations (ArrowUp, ArrowDown, Backspace, Return)
  if ((IsPopUpOpen == false || IsItemPreviewOpen == true) && IsInputFocused == false) {
    if (IsLShiftDown && (e.key === "ArrowUp" || e.key === "Up")) {
      e.preventDefault(); e.stopPropagation();
      handleShiftArrowNavigation("up", e);
    }
    else if (IsLShiftDown && (e.key === "ArrowDown" || e.key === "Down")) {
      e.preventDefault(); e.stopPropagation();
      handleShiftArrowNavigation("down", e);
    }
    else if (IsLShiftDown && ViewMode === "wrap" && (e.key === "ArrowLeft" || e.key === "Left")) {
      e.preventDefault(); e.stopPropagation();
      handleShiftArrowNavigation("left", e);
    }
    else if (IsLShiftDown && ViewMode === "wrap" && (e.key === "ArrowRight" || e.key === "Right")) {
      e.preventDefault(); e.stopPropagation();
      handleShiftArrowNavigation("right", e);
    }
    else if (matchShortcut("nav_up", e)) {
      e.preventDefault(); e.stopPropagation();
      if (SelectedElement == null) {
        goUp(false, true);
      } else if (ViewMode === "wrap") {
        goGridUp();
      } else {
        goUp();
      }
    }
    else if (matchShortcut("nav_down", e)) {
      e.preventDefault(); e.stopPropagation();
      if (SelectedElement == null) {
        goUp(false, true);
      } else if (ViewMode === "wrap") {
        goGridDown();
      } else {
        goDown();
      }
    }
    else if (matchShortcut("nav_left", e)) {
      e.preventDefault(); e.stopPropagation();
      goLeft();
    }
    else if (matchShortcut("nav_right", e)) {
      e.preventDefault(); e.stopPropagation();
      goRight();
    }
    else if (e.keyCode == 13 && !e.altKey) {
      e.preventDefault(); e.stopPropagation();
      if (Platform === "darwin" && IsDualPaneEnabled === false) {
        if (SelectedElement != null) {
          renameElementInputPrompt(SelectedElement);
        }
      } else {
        await openSelectedItem();
      }
    }
    else if (e.keyCode == 8 && ArrSelectedItems.length == 0) {
      e.preventDefault(); e.stopPropagation();
      goBack(e);
    }
  }
};

document.onkeyup = (e) => {
  if (e.key == "G" || e.key == "g") IsGDown = false;
  if (e.code === "ShiftLeft") IsLShiftDown = false;
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
async function showItems(items, dualPaneSide = "", millerCol = 1, isFromSort = false) {
  if (!isFromSort) {
    CurrentSortMethod = "name";
    CurrentSortAscending = true;
    IsFilteredBySize = false;
    IsFilteredByDate = false;
    IsFilteredByName = true;
  }
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

  // Unify styles based on the active ViewMode
  applyDirectoryListStyles(DirectoryList, ViewMode);

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
    itemLink.setAttribute("itemsize", item.is_dir ? "-" : formatBytes(item.size));
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

    itemLink.innerHTML = createItemInnerHtml(item, itemIconId, ViewMode, dualPaneSide);
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
      e.preventDefault();
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
    LeftPaneItemCollection = DirectoryList;
  } else {
    document.querySelector(".explorer-container").innerHTML = "";
    document.querySelector(".explorer-container").append(DirectoryList);
    LeftPaneItemCollection = DirectoryList;
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

async function writeToLocalStorage(key, value) {
  try {
    await cacheImage(key, value);
  } catch (error) {
    console.error("Error writing image to local storage:", error);
  }
}

async function readFromLocalStorage(key) {
  try {
    return await getCachedImage(key);
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
  itemLink.setAttribute("itemsize", item.is_dir ? "-" : formatBytes(item.size));
  itemLink.setAttribute("itemrawsize", item.size);
  itemLink.setAttribute("itemmodified", item.last_modified);
  itemLink.setAttribute("draggable", true);
  itemLink.setAttribute("itemformillercol", parseInt(millerCol) + 1);

  let fileIcon = "resources/file-icon.png"; // Default
  let iconSize = "56px";
  fileIcon = getIconForFile(item, 1);

  itemLink.setAttribute("itemicon", fileIcon);
  itemLink.className = "item-link directory-entry";

  itemLink.innerHTML = createItemInnerHtml(item, itemIconId, ViewMode, dualPaneSide);
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
    e.preventDefault();
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
      let list = document.querySelector(".dual-pane-left .directory-list-dual-pane");
      if (list) {
        list.append(itemLink);
        LeftPaneItemCollection = list;
      } else {
        let pane = document.querySelector(".dual-pane-left");
        let newList = document.createElement("div");
        newList.className = "directory-list-dual-pane";
        pane.append(newList);
        newList.append(itemLink);
        LeftPaneItemCollection = newList;
      }
      goUp(false, true);
    } else if (dualPaneSide === "right") {
      let list = document.querySelector(".dual-pane-right .directory-list-dual-pane");
      if (list) {
        list.append(itemLink);
        RightPaneItemCollection = list;
      } else {
        let pane = document.querySelector(".dual-pane-right");
        let newList = document.createElement("div");
        newList.className = "directory-list-dual-pane";
        pane.append(newList);
        newList.append(itemLink);
        RightPaneItemCollection = newList;
      }
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

    if (currentDir !== CurrentDir) {
      await clearQuickSearch(false);
    }

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

    let isFtp = currentDir.startsWith("ftp://");
    let currentPathTracker = "/";
    if (Platform != "darwin" && Platform.includes("win")) {
      currentPathTracker = "";
    }

    if (isFtp) {
      currentPathTracker = "ftp://";
    }

    if (currentDir.endsWith("/") && currentDir !== "ftp://") {
      currentDir = currentDir.substring(0, currentDir.length - 1);
    }

    if (!isFtp) {
      if (currentDir.startsWith("/")) {
        currentDir = currentDir.substring(1);
      }
    } else {
      currentDir = currentDir.substring(6); // remove "ftp://"
    }

    let counter = 0;

    currentDir.split("/").forEach((path) => {
      if (path == "") return;
      let pathItem = document.createElement("button");
      pathItem.textContent = path;
      pathItem.className = "path-item";

      if (isFtp && counter == 0) {
        currentPathTracker += path; // e.g. ftp://connectionName
      } else if (currentPathTracker === "") {
        currentPathTracker = path;
      } else {
        currentPathTracker += (currentPathTracker.endsWith("/") ? "" : "/") + path;
      }

      pathItem.setAttribute(
        "itempath",
        currentPathTracker
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
  if (!ArrSelectedItems.length) return;
  // Cache the paths immediately before they could be cleared or modified
  let arr = ArrSelectedItems.map((item) => item.getAttribute("itempath"));
  const isConfirm = await showDeletePopup();
  if (isConfirm === true) {
    let actionId = new Date().getMilliseconds();
    createNewAction(actionId, "Deleting", "Delete Items", "Delete Items");
    window.IsDeletingItems = true;
    try {
      let failedDeletions = [];
      for (let i = 0; i < arr.length; i++) {
        let actFileName = arr[i];
        try {
          await invoke("delete_item", { actFileName });
          handleDynamicRemove(actFileName);
        } catch (error) {
          failedDeletions.push({ path: actFileName, error });
          showToast(`Failed to delete "${actFileName.split("/").pop()}": ${error}`, ToastType.ERROR, 4000);
        }
      }
      IsCopyToCut = false;
      ArrSelectedItems = [];
      if (failedDeletions.length === 0) {
        showToast("Deletion of items is done", ToastType.INFO);
      } else {
        showToast(`Completed with ${failedDeletions.length} error(s)`, ToastType.ERROR, 4000);
      }
    } finally {
      window.IsDeletingItems = false;
      removeAction(actionId);
      scheduleDiskUsageRefresh();
    }
  }
}

async function showDeletePopup() {
  if (IsPopUpOpen !== false) return false;
  if (!ArrSelectedItems.length) return false;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  const items = ArrSelectedItems;
  const count = items.length;
  const fileCount = items.filter(i => i.getAttribute("itemisdir") !== "1").length;
  const folderCount = count - fileCount;

  const heroName = count === 1
    ? items[0].getAttribute("itemname")
    : `${count} items`;
  const heroMeta = count === 1
    ? (items[0].getAttribute("itemisdir") === "1" ? "Folder" : "File")
    : [
        folderCount > 0 ? `${folderCount} folder${folderCount > 1 ? "s" : ""}` : "",
        fileCount > 0 ? `${fileCount} file${fileCount > 1 ? "s" : ""}` : ""
      ].filter(Boolean).join(", ");

  const heroIcon = count === 1 && items[0].getAttribute("itemisdir") === "1"
    ? "fa-solid fa-folder"
    : "fa-solid fa-trash-can";

  const itemsListHtml = `<ul class="props-card__items-list">
    ${items.map((item) => {
      const name = item.getAttribute("itemname");
      const isDir = item.getAttribute("itemisdir") === "1";
      const ext = (item.getAttribute("itemext") || "").replace(".", "").toUpperCase();
      const size = item.getAttribute("itemsize") || "—";
      const modified = item.getAttribute("itemmodified") || "";
      const icon = isDir ? "fa-solid fa-folder" : "fa-regular fa-file";
      return `<li class="props-card__item-li" title="${escHtml(name)}">
        <div class="props-card__item-row">
          <i class="${icon} props-card__item-icon"></i>
          <span class="props-card__item-name">${escHtml(name)}</span>
          <span class="props-card__item-meta">${isDir ? "Folder" : escHtml(ext)}</span>
          <span class="props-card__item-size">${escHtml(size)}</span>
        </div>
      </li>`;
    }).join("")}
  </ul>`;

  const popup = document.createElement("div");
  popup.className = "delete-popup props-card";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Delete items");
  popup.innerHTML = `
    <section class="props-card__hero delete-popup__hero">
      <div class="props-card__thumb delete-popup__thumb"><i class="${heroIcon}"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(heroName)}">${escHtml(heroName)}</h2>
        <div class="props-card__meta">
          <span>${escHtml(heroMeta)}</span>
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-weight-hanging"></i>Total size</dt>
        <dd class="props-card__value"><span class="props-card__size"><span class="props-card__skeleton"></span></span></dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-regular fa-folder-open"></i>Location</dt>
        <dd class="props-card__value">
          <span class="props-card__path">${escHtml(CurrentDir)}</span>
        </dd>
      </div>
      <div class="props-card__row props-card__row--block">
        <dt class="props-card__label"><i class="fa-regular fa-rectangle-list"></i>Items</dt>
        <dd class="props-card__value">${itemsListHtml}</dd>
      </div>
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" data-delete-cancel>
        <i class="fa-solid fa-xmark"></i><span>Cancel</span>
      </button>
      <button class="props-card__btn props-card__btn--danger" data-delete-confirm>
        <i class="fa-solid fa-trash"></i><span>Delete</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  const deleteUpdateId = startDeleteSizeCalculation();

  // Calculate size in the background
  (async () => {
    if (count === 1) {
      const isDir = items[0].getAttribute("itemisdir") === "1";
      try {
        await getSimpleDirInfo(
          items[0].getAttribute("itempath"),
          ".props-card__size",
          isDir,
          deleteUpdateId
        );
        finishDeleteSizeCalculation(deleteUpdateId);
      } catch (error) {
        if (isDeleteSizeUpdateCurrent(deleteUpdateId)) {
          finishDeleteSizeCalculation(deleteUpdateId);
          writeLog(error);
          $(".props-card__size").html("Unable to calculate size");
        }
      }
    } else {
      const paths = items.map((i) => i.getAttribute("itempath"));
      setSizeCalculationLoading(".props-card__size");
      try {
        const totalSize = await invoke("get_selection_size", { paths, updateId: deleteUpdateId });
        if (isDeleteSizeUpdateCurrent(deleteUpdateId)) {
          finishDeleteSizeCalculation(deleteUpdateId);
          $(".props-card__size").html(formatBytes(totalSize, 2));
        }
      } catch (error) {
        if (isDeleteSizeUpdateCurrent(deleteUpdateId)) {
          finishDeleteSizeCalculation(deleteUpdateId);
          writeLog(error);
          $(".props-card__size").html("Unable to calculate size");
        }
      }
    }
  })();

  return new Promise((resolve) => {
    let isClosed = false;
    const finish = (ok) => {
      if (isClosed) return;
      isClosed = true;
      finishDeleteSizeCalculation(deleteUpdateId);
      invoke("cancel_size_calculation");
      popup.classList.add("popup-exit");
      safeAnimationEnd(popup, () => {
        popup.remove();
        IsPopUpOpen = false;
        resolve(ok);
      });
    };
    popup.querySelector("[data-delete-cancel]").onclick = () => finish(false);
    popup.querySelector("[data-delete-confirm]").onclick = () => finish(true);
    popup.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      if (e.key === "Enter")  { e.preventDefault(); finish(true);  }
    });
    popup.querySelector("[data-delete-confirm]").focus();
  });
}

let currentCopyMoveSizeRequestId = 0;
let activeCopyMoveSizeUpdateId = null;
let isCopyMoveSizeCalculationActive = false;

function startCopyMoveSizeCalculation() {
  activeCopyMoveSizeUpdateId = `copymove-${++currentCopyMoveSizeRequestId}`;
  isCopyMoveSizeCalculationActive = true;
  return activeCopyMoveSizeUpdateId;
}

function finishCopyMoveSizeCalculation(updateId) {
  if (activeCopyMoveSizeUpdateId === updateId) {
    isCopyMoveSizeCalculationActive = false;
    activeCopyMoveSizeUpdateId = null;
  }
}

function isCopyMoveSizeUpdateCurrent(updateId) {
  return activeCopyMoveSizeUpdateId === updateId && isCopyMoveSizeCalculationActive;
}

async function showCopyMovePopup(isMove = false) {
  if (IsPopUpOpen !== false) return false;
  if (!ArrSelectedItems.length) return false;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  const items = ArrSelectedItems;
  const count = items.length;
  const fileCount = items.filter(i => i.getAttribute("itemisdir") !== "1").length;
  const folderCount = count - fileCount;

  // Determine source and destination paths based on the selected side
  const sourceDir = CurrentDir;
  let targetDir = "";
  if (IsDualPaneEnabled === true) {
    if (SelectedItemPaneSide === "left") {
      targetDir = RightDualPanePath;
    } else if (SelectedItemPaneSide === "right") {
      targetDir = LeftDualPanePath;
    }
  } else {
    targetDir = CurrentDir;
  }

  const actionName = isMove ? "Move" : "Copy";
  const heroName = count === 1
    ? `${actionName} "${items[0].getAttribute("itemname")}"`
    : `${actionName} ${count} items`;
  const heroMeta = count === 1
    ? (items[0].getAttribute("itemisdir") === "1" ? "Folder" : "File")
    : [
        folderCount > 0 ? `${folderCount} folder${folderCount > 1 ? "s" : ""}` : "",
        fileCount > 0 ? `${fileCount} file${fileCount > 1 ? "s" : ""}` : ""
      ].filter(Boolean).join(", ");

  const heroIcon = isMove
    ? "fa-solid fa-arrows-left-right"
    : "fa-solid fa-copy";

  const itemsListHtml = `<ul class="props-card__items-list">
    ${items.map((item) => {
      const name = item.getAttribute("itemname");
      const isDir = item.getAttribute("itemisdir") === "1";
      const ext = (item.getAttribute("itemext") || "").replace(".", "").toUpperCase();
      const size = item.getAttribute("itemsize") || "—";
      const icon = isDir ? "fa-solid fa-folder" : "fa-regular fa-file";
      return `<li class="props-card__item-li" title="${escHtml(name)}">
        <div class="props-card__item-row">
          <i class="${icon} props-card__item-icon"></i>
          <span class="props-card__item-name">${escHtml(name)}</span>
          <span class="props-card__item-meta">${isDir ? "Folder" : escHtml(ext)}</span>
          <span class="props-card__item-size">${escHtml(size)}</span>
        </div>
      </li>`;
    }).join("")}
  </ul>`;

  const popup = document.createElement("div");
  popup.className = "copy-move-popup props-card";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", `${actionName} items`);
  popup.innerHTML = `
    <section class="props-card__hero copy-move-popup__hero">
      <div class="props-card__thumb copy-move-popup__thumb"><i class="${heroIcon}"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(heroName)}">${escHtml(heroName)}</h2>
        <div class="props-card__meta">
          <span>${escHtml(heroMeta)}</span>
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-folder-open"></i>From</dt>
        <dd class="props-card__value">
          <span class="props-card__path" title="${escHtml(sourceDir)}">${escHtml(sourceDir)}</span>
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-folder-open"></i>To</dt>
        <dd class="props-card__value">
          <span class="props-card__path" title="${escHtml(targetDir)}">${escHtml(targetDir)}</span>
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-weight-hanging"></i>Total size</dt>
        <dd class="props-card__value"><span class="props-card__size"><span class="props-card__skeleton"></span></span></dd>
      </div>
      <div class="props-card__row props-card__row--block">
        <dt class="props-card__label"><i class="fa-regular fa-rectangle-list"></i>Items</dt>
        <dd class="props-card__value">${itemsListHtml}</dd>
      </div>
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" data-copy-move-cancel>
        <i class="fa-solid fa-xmark"></i><span>Cancel</span>
      </button>
      <button class="props-card__btn props-card__btn--primary" data-copy-move-confirm>
        <i class="${heroIcon}"></i><span>${actionName}</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  const copyMoveUpdateId = startCopyMoveSizeCalculation();

  // Calculate size in the background
  (async () => {
    if (count === 1) {
      const isDir = items[0].getAttribute("itemisdir") === "1";
      try {
        await getSimpleDirInfo(
          items[0].getAttribute("itempath"),
          ".copy-move-popup .props-card__size",
          isDir,
          copyMoveUpdateId
        );
        finishCopyMoveSizeCalculation(copyMoveUpdateId);
      } catch (error) {
        if (isCopyMoveSizeUpdateCurrent(copyMoveUpdateId)) {
          finishCopyMoveSizeCalculation(copyMoveUpdateId);
          writeLog(error);
          $(".copy-move-popup .props-card__size").html("Unable to calculate size");
        }
      }
    } else {
      const paths = items.map((i) => i.getAttribute("itempath"));
      setSizeCalculationLoading(".copy-move-popup .props-card__size");
      try {
        const totalSize = await invoke("get_selection_size", { paths, updateId: copyMoveUpdateId });
        if (isCopyMoveSizeUpdateCurrent(copyMoveUpdateId)) {
          finishCopyMoveSizeCalculation(copyMoveUpdateId);
          $(".copy-move-popup .props-card__size").html(formatBytes(totalSize, 2));
        }
      } catch (error) {
        if (isCopyMoveSizeUpdateCurrent(copyMoveUpdateId)) {
          finishCopyMoveSizeCalculation(copyMoveUpdateId);
          writeLog(error);
          $(".copy-move-popup .props-card__size").html("Unable to calculate size");
        }
      }
    }
  })();

  return new Promise((resolve) => {
    let isClosed = false;
    const finish = (ok) => {
      if (isClosed) return;
      isClosed = true;
      finishCopyMoveSizeCalculation(copyMoveUpdateId);
      invoke("cancel_size_calculation");
      popup.classList.add("popup-exit");
      safeAnimationEnd(popup, () => {
        popup.remove();
        IsPopUpOpen = false;
        resolve(ok);
      });
    };
    popup.querySelector("[data-copy-move-cancel]").onclick = () => finish(false);
    popup.querySelector("[data-copy-move-confirm]").onclick = () => finish(true);
    popup.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      if (e.key === "Enter")  { e.preventDefault(); finish(true);  }
    });
    popup.querySelector("[data-copy-move-confirm]").focus();
  });
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

  let paths = ArrCopyItems.map((element) => element.getAttribute("itempath")).filter(Boolean);
  try {
    await invoke("write_clipboard_files", { files: paths });
  } catch (err) {
    console.error("Failed to write files to system clipboard:", err);
  }

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
      safeAnimationEnd(popup, () => {
        popup.remove();
        IsPopUpOpen = false;
        resolve(ok);
      });
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
         ${arrCompressItems.map((item) => {
           const name = item.getAttribute("itemname");
           const isDir = item.getAttribute("itemisdir") === "1";
           const ext = (item.getAttribute("itemext") || "").replace(".", "").toUpperCase();
           const size = item.getAttribute("itemsize") || "—";
           const icon = isDir ? "fa-solid fa-folder" : "fa-regular fa-file";
           return `<li class="props-card__item-li" title="${escHtml(name)}">
             <div class="props-card__item-row">
               <i class="${icon} props-card__item-icon"></i>
               <span class="props-card__item-name">${escHtml(name)}</span>
               <span class="props-card__item-meta">${isDir ? "Folder" : escHtml(ext)}</span>
               <span class="props-card__item-size">${escHtml(size)}</span>
             </div>
           </li>`;
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

  window.IsCompressingActive = true;
  let currentSessionId = crypto.randomUUID();
  window.CompressionSessionId = currentSessionId;
  
  if (typeof FileOpProgressActionId !== "undefined") {
    FileOpProgressActionId = null;
  }

  if (arrItems.length > 1) {
    var filePath = CurrentDir + "/compressed_items_archive." + (compressionType === "br" ? "tar.br" : compressionType);
  } else {
    var filePath =
      arrItems[0].getAttribute("itempath") +
      (compressionType == "br" ? ".tar" : "") +
      "." +
      compressionType;
  }
  let isCompressingDone = false;
  await invoke("reset_compression_cancelled").catch(() => {});
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

  let isSuccess = false;
  const compressStartTime = Date.now();

  try {
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
    isSuccess = true;
    const elapsedSeconds = (Date.now() - compressStartTime) / 1000;
    finishProgressBar(elapsedSeconds);
  } catch (error) {
    console.error("Compression error:", error);
    if (!error.toString().includes("cancelled") && !error.toString().includes("Interrupted")) {
      showToast("Compression failed: " + error, ToastType.ERROR);
    } else {
      invoke("delete_item", { path: filePath }).catch(() => {});
    }

    // Immediately close progress modal on error or cancellation
    const modal = document.querySelector(".file-progress-modal");
    if (modal) {
      modal.classList.add("popup-exit");
      safeAnimationEnd(modal, () => {
        modal.remove();
        IsPopUpOpen = false;
      });
    }
  } finally {
    isCompressingDone = true;
    clearInterval(intervalId);
    
    removeAction(actionId);
    if (window.CompressionSessionId === currentSessionId) {
      if (!isSuccess) {
        if (typeof FileOpProgressActionId !== "undefined" && FileOpProgressActionId && FileOpProgressActionId !== "CANCELLED") {
          removeAction(FileOpProgressActionId);
        }
        FileOpProgressActionId = "CANCELLED";
      }
      window.IsCompressingActive = false;
    }
    scheduleDiskUsageRefresh();
  }
}

async function closeCompressPopup() {
  let popup = document.querySelector(".compression-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsInputFocused = false;
    });
  } else {
    IsPopUpOpen = false;
    IsInputFocused = false;
  }
}

async function showImageEditPopup(item) {
  if (IsPopUpOpen !== false) return;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  const editItem = item || ArrSelectedItems[0];
  if (!editItem) return;

  const path = editItem.getAttribute("itempath");
  const filename = editItem.getAttribute("itemname");

  let width = 0;
  let height = 0;

  const getActiveApiKey = () => {
    if (AiProvider === "openai") {
      return document.querySelector(".openai-api-key-input")?.value.trim() || "";
    } else {
      return document.querySelector(".gemini-api-key-input")?.value.trim() || "";
    }
  };

  const providerName = AiProvider === "openai" ? "OpenAI" : "Gemini";

  const tabsHtml = `
    <!-- Navigation Tabs -->
    <div class="modal-tabs" style="display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--tertiaryColor); margin-bottom: 10px;">
      <button class="modal-tab-button active" data-tab="upscale" style="background: rgba(255, 255, 255, 0.08); border: none; padding: 8px 16px; border-radius: 6px 6px 0 0; color: var(--textColor); cursor: pointer; font-weight: bold; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid var(--selectColor2); margin-bottom: -1px; transition: all 0.15s ease;">
        <i class="fa-solid fa-expand"></i><span>Image Upscale</span>
      </button>
      ${IsAiEnabled ? `
      <button class="modal-tab-button" data-tab="enhance" style="background: transparent; border: none; padding: 8px 16px; border-radius: 6px 6px 0 0; color: var(--textColor2); cursor: pointer; font-weight: normal; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s ease;">
        <i class="fa-solid fa-wand-magic-sparkles"></i><span>AI Enhancement</span>
      </button>
      <button class="modal-tab-button" data-tab="style" style="background: transparent; border: none; padding: 8px 16px; border-radius: 6px 6px 0 0; color: var(--textColor2); cursor: pointer; font-weight: normal; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s ease;">
        <i class="fa-solid fa-palette"></i><span>Edit Style</span>
      </button>
      ` : ''}
      <button class="modal-tab-button" data-tab="compress" style="background: transparent; border: none; padding: 8px 16px; border-radius: 6px 6px 0 0; color: var(--textColor2); cursor: pointer; font-weight: normal; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.15s ease;">
        <i class="fa-solid fa-compress"></i><span>Compress Image</span>
      </button>
    </div>
  `;

  const aiMethodOption = IsAiEnabled ? `
              <option value="ai">AI Super-Resolution</option>
  ` : '';

  const popup = document.createElement("div");
  popup.className = "upscale-popup props-card props-card--wide";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Image edit");
  popup.innerHTML = `
    <section class="props-card__hero">
      <div class="props-card__thumb"><i class="fa-solid fa-image-portrait"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(filename)}">${escHtml(filename)}</h2>
        <div class="props-card__meta">
          <span>Image Edit & Creative Enhancement</span>
        </div>
      </div>
    </section>

    ${tabsHtml}

    <!-- Image Upscale Tab View -->
    <div class="upscale-tab-view">
      <dl class="props-card__list">
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-wand-magic-sparkles"></i>Method</dt>
          <dd class="props-card__value">
            <select class="props-card__input upscale-method-select" style="cursor: pointer;">
              <option value="standard" selected>Standard (Algorithms)</option>
              ${aiMethodOption}
            </select>
          </dd>
        </div>

        <!-- Standard options -->
        <div class="props-card__row upscale-standard-row">
          <dt class="props-card__label"><i class="fa-solid fa-expand"></i>Scale</dt>
          <dd class="props-card__value">
            <select class="props-card__input upscale-scale-select" style="cursor: pointer;">
              <option value="2">2x</option>
              <option value="4" selected>4x</option>
              <option value="8">8x</option>
            </select>
          </dd>
        </div>
        <div class="props-card__row upscale-standard-row">
          <dt class="props-card__label"><i class="fa-solid fa-sliders"></i>Algorithm</dt>
          <dd class="props-card__value">
            <select class="props-card__input upscale-algorithm-select" style="cursor: pointer;">
              <option value="lanczos3" selected>Lanczos3 (High Quality, Sharp)</option>
              <option value="catmull_rom">Catmull-Rom (High Quality, Smooth)</option>
              <option value="nearest">Nearest Neighbor (Pixel Art)</option>
              <option value="triangle">Bilinear (Fast)</option>
              <option value="gaussian">Gaussian (Smooth)</option>
            </select>
          </dd>
        </div>

        <!-- AI options (hidden by default) -->
        <div class="props-card__row upscale-ai-row" style="display: none;">
          <dt class="props-card__label"><i class="fa-solid fa-vector-square"></i>Aspect Ratio</dt>
          <dd class="props-card__value">
            <select class="props-card__input upscale-aspect-select" style="cursor: pointer;">
              <option value="1:1" selected>1:1 Square (1024x1024)</option>
              <option value="16:9">16:9 Widescreen (1024x576)</option>
              <option value="9:16">9:16 Portrait (576x1024)</option>
              <option value="4:3">4:3 Standard (1024x768)</option>
              <option value="3:4">3:4 Tall (768x1024)</option>
            </select>
          </dd>
        </div>

        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-file-signature"></i>Filename</dt>
          <dd class="props-card__value">
            <input type="text" class="props-card__input upscale-filename-input" value="" />
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-arrows-left-right"></i>Size</dt>
          <dd class="props-card__value upscale-resolution-preview" style="font-family: monospace; font-size: 12px; color: var(--textColor2);">
            Fetching dimensions...
          </dd>
        </div>
        <div class="upscale-api-key-warning" style="display: none; padding: 8px 12px; margin: 4px 8px; border-radius: 6px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);">
          <p style="font-size: 11px; color: #f87171; margin: 0 0 6px 0; line-height: 1.4;">
            <i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i>${providerName} API Key is not configured.
          </p>
          <button class="props-card__btn" style="padding: 2px 8px; font-size: 11px; height: auto;" onclick="closeUpscalePopup(); openSettings(); showSettingsTab('ai', document.querySelector('.settings-sidebar button[onclick*=\\'ai\\']'));">
            <i class="fa-solid fa-key" style="font-size: 10px;"></i>Configure Key
          </button>
        </div>
      </dl>
    </div>

    <!-- AI Enhancement Tab View -->
    <div class="enhance-tab-view" style="display: none;">
      <dl class="props-card__list">
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-vector-square"></i>Aspect Ratio</dt>
          <dd class="props-card__value">
            <select class="props-card__input enhance-aspect-select" style="cursor: pointer;">
              <option value="1:1" selected>1:1 Square (1024x1024)</option>
              <option value="16:9">16:9 Widescreen (1024x576)</option>
              <option value="9:16">9:16 Portrait (576x1024)</option>
              <option value="4:3">4:3 Standard (1024x768)</option>
              <option value="3:4">3:4 Tall (768x1024)</option>
            </select>
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-file-signature"></i>Filename</dt>
          <dd class="props-card__value">
            <input type="text" class="props-card__input enhance-filename-input" value="" />
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-info-circle"></i>Method</dt>
          <dd class="props-card__value" style="font-size: 12px; color: var(--textColor2); line-height: 1.4;">
            Analyzes and creatively regenerates a high-fidelity, high-resolution counterpart of your image using ${providerName} AI.
          </dd>
        </div>
        <div class="enhance-api-key-warning" style="display: none; padding: 8px 12px; margin: 4px 8px; border-radius: 6px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);">
          <p style="font-size: 11px; color: #f87171; margin: 0 0 6px 0; line-height: 1.4;">
            <i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i>${providerName} API Key is not configured.
          </p>
          <button class="props-card__btn" style="padding: 2px 8px; font-size: 11px; height: auto;" onclick="closeUpscalePopup(); openSettings(); showSettingsTab('ai', document.querySelector('.settings-sidebar button[onclick*=\\'ai\\']'));">
            <i class="fa-solid fa-key" style="font-size: 10px;"></i>Configure Key
          </button>
        </div>
      </dl>
    </div>

    <!-- Edit Style Tab View -->
    <div class="style-tab-view" style="display: none;">
      <dl class="props-card__list">
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-wand-magic-sparkles"></i>Style Instructions</dt>
          <dd class="props-card__value">
            <input type="text" class="props-card__input style-prompt-input" placeholder="e.g. Convert to cyberpunk oil painting" value="" />
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-file-signature"></i>Filename</dt>
          <dd class="props-card__value">
            <input type="text" class="props-card__input style-filename-input" value="" />
          </dd>
        </div>
        <div class="style-api-key-warning" style="display: none; padding: 8px 12px; margin: 4px 8px; border-radius: 6px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);">
          <p style="font-size: 11px; color: #f87171; margin: 0 0 6px 0; line-height: 1.4;">
            <i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i>${providerName} API Key is not configured.
          </p>
          <button class="props-card__btn" style="padding: 2px 8px; font-size: 11px; height: auto;" onclick="closeUpscalePopup(); openSettings(); showSettingsTab('ai', document.querySelector('.settings-sidebar button[onclick*=\\'ai\\']'));">
            <i class="fa-solid fa-key" style="font-size: 10px;"></i>Configure Key
          </button>
        </div>
      </dl>
    </div>

    <!-- Compress Image Tab View -->
    <div class="compress-tab-view" style="display: none;">
      <dl class="props-card__list">
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-file-image"></i>Format</dt>
          <dd class="props-card__value">
            <select class="props-card__input compress-format-select" style="cursor: pointer;">
              <option value="jpeg" selected>JPEG (Lossy, Very Small)</option>
              <option value="webp">WEBP (Lossless, Modern)</option>
              <option value="png">PNG (Lossless, High Quality)</option>
            </select>
          </dd>
        </div>
        <div class="props-card__row compress-quality-row">
          <dt class="props-card__label"><i class="fa-solid fa-sliders"></i>Quality</dt>
          <dd class="props-card__value" style="display: flex; align-items: center; gap: 12px;">
            <input type="range" class="props-card__input compress-quality-slider" min="10" max="100" value="80" style="flex: 1; height: 6px; cursor: pointer;" />
            <span class="compress-quality-badge" style="font-family: monospace; font-size: 13px; font-weight: bold; min-width: 32px; text-align: right; color: var(--textColor);">80%</span>
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-expand"></i>Resize</dt>
          <dd class="props-card__value">
            <select class="props-card__input compress-resize-select" style="cursor: pointer;">
              <option value="1.0" selected>100% (Original Dimensions)</option>
              <option value="0.75">75% Dimensions</option>
              <option value="0.5">50% Dimensions</option>
              <option value="0.25">25% Dimensions</option>
              <option value="custom">Custom Width / Height</option>
            </select>
          </dd>
        </div>
        <div class="props-card__row compress-custom-dims-row" style="display: none;">
          <dt class="props-card__label"><i class="fa-solid fa-arrows-left-right"></i>Dimensions</dt>
          <dd class="props-card__value" style="display: flex; align-items: center; gap: 8px;">
            <input type="number" class="props-card__input compress-width-input" placeholder="Width" style="width: 80px; text-align: center;" />
            <span style="color: var(--textColor2);">x</span>
            <input type="number" class="props-card__input compress-height-input" placeholder="Height" style="width: 80px; text-align: center;" />
            <button class="props-card__btn compress-aspect-lock-btn" title="Lock aspect ratio" style="padding: 4px 8px; font-size: 12px; height: auto; background: rgba(255, 255, 255, 0.15);">
              <i class="fa-solid fa-lock"></i>
            </button>
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-file-signature"></i>Filename</dt>
          <dd class="props-card__value">
            <input type="text" class="props-card__input compress-filename-input" value="" />
          </dd>
        </div>
        <div class="props-card__row">
          <dt class="props-card__label"><i class="fa-solid fa-info-circle"></i>Target Size</dt>
          <dd class="props-card__value compress-resolution-preview" style="font-family: monospace; font-size: 12px; color: var(--textColor2);">
            Fetching dimensions...
          </dd>
        </div>
      </dl>
    </div>

    <footer class="props-card__footer">
      <button class="props-card__btn" onclick="closeUpscalePopup()">
        <i class="fa-solid fa-xmark"></i><span>Close</span>
      </button>
      <button class="props-card__btn props-card__btn--primary upscale-item-button">
        <i class="fa-solid fa-arrows-up-to-line"></i><span>Upscale</span>
      </button>
      <button class="props-card__btn props-card__btn--primary enhance-item-button" style="display: none;">
        <i class="fa-solid fa-wand-magic-sparkles"></i><span>Enhance</span>
      </button>
      <button class="props-card__btn props-card__btn--primary style-item-button" style="display: none;">
        <i class="fa-solid fa-palette"></i><span>Apply Style</span>
      </button>
      <button class="props-card__btn props-card__btn--primary compress-image-action-btn" style="display: none;">
        <i class="fa-solid fa-compress"></i><span>Compress</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  const scaleSelect = popup.querySelector(".upscale-scale-select");
  const filenameInput = popup.querySelector(".upscale-filename-input");
  const enhanceFilenameInput = popup.querySelector(".enhance-filename-input");
  const styleFilenameInput = popup.querySelector(".style-filename-input");
  const resPreview = popup.querySelector(".upscale-resolution-preview");
  const methodSelect = popup.querySelector(".upscale-method-select");

  const dotIndex = filename.lastIndexOf(".");
  const baseName = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
  const extName = dotIndex !== -1 ? filename.substring(dotIndex) : "";
  filenameInput.value = `${baseName}_4x${extName}`;
  enhanceFilenameInput.value = `${baseName}_ai_enhanced${extName}`;
  styleFilenameInput.value = `${baseName}_styled${extName}`;

  const compressFormatSelect = popup.querySelector(".compress-format-select");
  const compressQualitySlider = popup.querySelector(".compress-quality-slider");
  const compressQualityBadge = popup.querySelector(".compress-quality-badge");
  const compressResizeSelect = popup.querySelector(".compress-resize-select");
  const compressWidthInput = popup.querySelector(".compress-width-input");
  const compressHeightInput = popup.querySelector(".compress-height-input");
  const compressAspectLockBtn = popup.querySelector(".compress-aspect-lock-btn");
  const compressFilenameInput = popup.querySelector(".compress-filename-input");
  const compressResPreview = popup.querySelector(".compress-resolution-preview");

  const updateCompressFilename = () => {
    const format = compressFormatSelect.value;
    const ext = format === "jpeg" ? "jpg" : format;
    compressFilenameInput.value = `${baseName}_compressed.${ext}`;
  };
  updateCompressFilename();

  const updateCompressResolutionPreview = () => {
    let scale = parseFloat(compressResizeSelect.value);
    let targetWidth = width;
    let targetHeight = height;

    if (compressResizeSelect.value === "custom") {
      targetWidth = parseInt(compressWidthInput.value) || width;
      targetHeight = parseInt(compressHeightInput.value) || height;
    } else {
      targetWidth = Math.round(width * scale);
      targetHeight = Math.round(height * scale);
    }

    if (width && height) {
      compressResPreview.innerHTML = `${width}x${height} &rarr; <span style="color: var(--textColor); font-weight: bold;">${targetWidth}x${targetHeight}</span>`;
    } else {
      compressResPreview.textContent = "Fetching dimensions...";
    }
  };

  compressFormatSelect.addEventListener("change", () => {
    const format = compressFormatSelect.value;
    const qualityRow = popup.querySelector(".compress-quality-row");
    if (format === "png") {
      qualityRow.style.display = "none";
    } else {
      qualityRow.style.display = "grid";
    }
    updateCompressFilename();
  });

  compressQualitySlider.addEventListener("input", () => {
    compressQualityBadge.textContent = `${compressQualitySlider.value}%`;
  });

  compressResizeSelect.addEventListener("change", () => {
    if (compressResizeSelect.value === "custom") {
      popup.querySelector(".compress-custom-dims-row").style.display = "grid";
      compressWidthInput.value = width;
      compressHeightInput.value = height;
    } else {
      popup.querySelector(".compress-custom-dims-row").style.display = "none";
    }
    updateCompressResolutionPreview();
  });

  let isAspectLocked = true;
  compressAspectLockBtn.addEventListener("click", () => {
    isAspectLocked = !isAspectLocked;
    if (isAspectLocked) {
      compressAspectLockBtn.innerHTML = '<i class="fa-solid fa-lock"></i>';
      compressAspectLockBtn.style.background = "rgba(255, 255, 255, 0.15)";
    } else {
      compressAspectLockBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
      compressAspectLockBtn.style.background = "transparent";
    }
  });

  compressWidthInput.addEventListener("input", () => {
    if (isAspectLocked && width && height) {
      const val = parseInt(compressWidthInput.value);
      if (val) {
        compressHeightInput.value = Math.round(val * (height / width));
      }
    }
    updateCompressResolutionPreview();
  });

  compressHeightInput.addEventListener("input", () => {
    if (isAspectLocked && width && height) {
      const val = parseInt(compressHeightInput.value);
      if (val) {
        compressWidthInput.value = Math.round(val * (width / height));
      }
    }
    updateCompressResolutionPreview();
  });

  const updateMethodFields = () => {
    const method = methodSelect.value;
    const standardRows = popup.querySelectorAll(".upscale-standard-row");
    const aiRows = popup.querySelectorAll(".upscale-ai-row");
    const apiKeyWarning = popup.querySelector(".upscale-api-key-warning");

    if (method === "ai") {
      standardRows.forEach(r => r.style.display = "none");
      aiRows.forEach(r => r.style.display = "grid");

      const apiKey = getActiveApiKey();
      if (!apiKey) {
        apiKeyWarning.style.display = "block";
        popup.querySelector(".upscale-item-button").disabled = true;
      } else {
        apiKeyWarning.style.display = "none";
        popup.querySelector(".upscale-item-button").disabled = false;
      }

      resPreview.innerHTML = `<span style="color: var(--textColor); font-weight: bold;"><i class="fa-solid fa-expand" style="margin-right: 6px; color: var(--selectColor2);"></i>AI Super-Resolution (Fidelity-preserving)</span>`;
      filenameInput.value = `${baseName}_ai_upscaled${extName}`;
    } else {
      standardRows.forEach(r => r.style.display = "grid");
      aiRows.forEach(r => r.style.display = "none");
      apiKeyWarning.style.display = "none";
      popup.querySelector(".upscale-item-button").disabled = false;
      updateResolutionPreview();
    }
  };

  methodSelect.addEventListener("change", updateMethodFields);

  // Tabs switching logic
  popup.querySelectorAll(".modal-tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");

      popup.querySelectorAll(".modal-tab-button").forEach(b => {
        b.classList.remove("active");
        b.style.color = "var(--textColor2)";
        b.style.fontWeight = "normal";
        b.style.backgroundColor = "transparent";
        b.style.borderBottom = "2px solid transparent";
      });

      btn.classList.add("active");
      btn.style.color = "var(--textColor)";
      btn.style.fontWeight = "bold";
      btn.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
      btn.style.borderBottom = "2px solid var(--selectColor2)";

      if (tabName === "upscale") {
        popup.querySelector(".upscale-tab-view").style.display = "block";
        popup.querySelector(".enhance-tab-view").style.display = "none";
        popup.querySelector(".style-tab-view").style.display = "none";
        popup.querySelector(".compress-tab-view").style.display = "none";

        popup.querySelector(".upscale-item-button").style.display = "inline-flex";
        popup.querySelector(".enhance-item-button").style.display = "none";
        popup.querySelector(".style-item-button").style.display = "none";
        popup.querySelector(".compress-image-action-btn").style.display = "none";
        updateMethodFields();
      } else if (tabName === "enhance") {
        popup.querySelector(".upscale-tab-view").style.display = "none";
        popup.querySelector(".enhance-tab-view").style.display = "block";
        popup.querySelector(".style-tab-view").style.display = "none";
        popup.querySelector(".compress-tab-view").style.display = "none";

        popup.querySelector(".upscale-item-button").style.display = "none";
        popup.querySelector(".enhance-item-button").style.display = "inline-flex";
        popup.querySelector(".style-item-button").style.display = "none";
        popup.querySelector(".compress-image-action-btn").style.display = "none";

        // Validate API key for Enhance tab
        const apiKey = getActiveApiKey();
        const enhanceWarning = popup.querySelector(".enhance-api-key-warning");
        if (!apiKey) {
          enhanceWarning.style.display = "block";
          popup.querySelector(".enhance-item-button").disabled = true;
        } else {
          enhanceWarning.style.display = "none";
          popup.querySelector(".enhance-item-button").disabled = false;
        }
      } else if (tabName === "style") {
        popup.querySelector(".upscale-tab-view").style.display = "none";
        popup.querySelector(".enhance-tab-view").style.display = "none";
        popup.querySelector(".style-tab-view").style.display = "block";
        popup.querySelector(".compress-tab-view").style.display = "none";

        popup.querySelector(".upscale-item-button").style.display = "none";
        popup.querySelector(".enhance-item-button").style.display = "none";
        popup.querySelector(".style-item-button").style.display = "inline-flex";
        popup.querySelector(".compress-image-action-btn").style.display = "none";

        // Check API key for Style tab
        const apiKey = getActiveApiKey();
        const styleWarning = popup.querySelector(".style-api-key-warning");
        if (!apiKey) {
          styleWarning.style.display = "block";
          popup.querySelector(".style-item-button").disabled = true;
        } else {
          styleWarning.style.display = "none";
          popup.querySelector(".style-item-button").disabled = false;
        }
      } else if (tabName === "compress") {
        popup.querySelector(".upscale-tab-view").style.display = "none";
        popup.querySelector(".enhance-tab-view").style.display = "none";
        popup.querySelector(".style-tab-view").style.display = "none";
        popup.querySelector(".compress-tab-view").style.display = "block";

        popup.querySelector(".upscale-item-button").style.display = "none";
        popup.querySelector(".enhance-item-button").style.display = "none";
        popup.querySelector(".style-item-button").style.display = "none";
        popup.querySelector(".compress-image-action-btn").style.display = "inline-flex";

        updateCompressResolutionPreview();
      }
    });
  });

  const updateResolutionPreview = () => {
    const scale = parseFloat(scaleSelect.value);
    filenameInput.value = `${baseName}_${scale}x${extName}`;

    if (width && height) {
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      resPreview.innerHTML = `${width}x${height} &rarr; <span style="color: var(--textColor); font-weight: bold;">${newWidth}x${newHeight}</span>`;
    } else {
      resPreview.textContent = "Fetching dimensions...";
    }
  };

  scaleSelect.addEventListener("change", updateResolutionPreview);

  filenameInput.addEventListener("focus", () => (IsInputFocused = true));
  filenameInput.addEventListener("blur", () => (IsInputFocused = false));

  if (IsAiEnabled) {
    enhanceFilenameInput.addEventListener("focus", () => (IsInputFocused = true));
    enhanceFilenameInput.addEventListener("blur", () => (IsInputFocused = false));
    styleFilenameInput.addEventListener("focus", () => (IsInputFocused = true));
    styleFilenameInput.addEventListener("blur", () => (IsInputFocused = false));

    const promptInput = popup.querySelector(".style-prompt-input");
    promptInput.addEventListener("focus", () => (IsInputFocused = true));
    promptInput.addEventListener("blur", () => (IsInputFocused = false));
    promptInput.addEventListener("keyup", (e) => {
      if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
        popup.querySelector(".style-item-button").click();
      }
    });

    enhanceFilenameInput.addEventListener("keyup", (e) => {
      if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
        popup.querySelector(".enhance-item-button").click();
      }
    });
  }

  filenameInput.addEventListener("keyup", (e) => {
    if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
      popup.querySelector(".upscale-item-button").click();
    }
  });

  compressFilenameInput.addEventListener("focus", () => (IsInputFocused = true));
  compressFilenameInput.addEventListener("blur", () => (IsInputFocused = false));
  compressFilenameInput.addEventListener("keyup", (e) => {
    if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
      popup.querySelector(".compress-image-action-btn").click();
    }
  });

  compressWidthInput.addEventListener("focus", () => (IsInputFocused = true));
  compressWidthInput.addEventListener("blur", () => (IsInputFocused = false));
  compressWidthInput.addEventListener("keyup", (e) => {
    if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
      popup.querySelector(".compress-image-action-btn").click();
    }
  });

  compressHeightInput.addEventListener("focus", () => (IsInputFocused = true));
  compressHeightInput.addEventListener("blur", () => (IsInputFocused = false));
  compressHeightInput.addEventListener("keyup", (e) => {
    if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
      popup.querySelector(".compress-image-action-btn").click();
    }
  });



  popup.querySelector(".upscale-item-button").addEventListener("click", async () => {
    const method = methodSelect.value;
    const outName = filenameInput.value.trim();
    if (!outName) {
      alert("Please enter an output filename");
      return;
    }

    const dir = path.substring(0, path.lastIndexOf('/'));
    const outputPath = dir + "/" + outName;

    closeUpscalePopup();

    let actionId = crypto.randomUUID();

    if (method === "ai") {
      const apiKey = getActiveApiKey();
      const aspectRatio = popup.querySelector(".upscale-aspect-select").value;

      createNewAction(
        actionId,
        "AI Upscaling",
        `${filename} via ${providerName} AI (as-is)`,
        path
      );

      try {
        await invoke("ai_upscale_image", {
          aiProvider: AiProvider,
          apiKey,
          fromPath: path,
          aspectRatio,
          outputPath,
          creative: false,
        });
        showToast("AI Upscaling completed successfully", ToastType.SUCCESS);
        const existing = document.querySelector(`[itempath="${outputPath}"]`);
        if (existing) {
          await handleDynamicUpdate(outputPath);
        } else {
          await handleDynamicCreate(outputPath);
        }
      } catch (error) {
        showToast(`AI Upscaling failed: ${error}`, ToastType.ERROR);
      } finally {
        removeAction(actionId);
        scheduleDiskUsageRefresh();
      }
    } else {
      const scaleFactor = parseFloat(scaleSelect.value);
      const filterType = popup.querySelector(".upscale-algorithm-select").value;

      createNewAction(
        actionId,
        "Upscaling",
        `${filename} to ${scaleFactor}x`,
        path
      );

      try {
        await invoke("upscale_image", {
          fromPath: path,
          scaleFactor: scaleFactor,
          filterType: filterType,
          outputPath: outputPath,
        });
        showToast("Upscaling completed", ToastType.SUCCESS);
        const existing = document.querySelector(`[itempath="${outputPath}"]`);
        if (existing) {
          await handleDynamicUpdate(outputPath);
        } else {
          await handleDynamicCreate(outputPath);
        }
      } catch (error) {
        showToast(`Upscaling failed: ${error}`, ToastType.ERROR);
      } finally {
        removeAction(actionId);
        scheduleDiskUsageRefresh();
      }
    }
  });

  if (IsAiEnabled) {
    popup.querySelector(".enhance-item-button").addEventListener("click", async () => {
      const outName = enhanceFilenameInput.value.trim();
      if (!outName) {
        alert("Please enter an output filename");
        return;
      }

      const dir = path.substring(0, path.lastIndexOf('/'));
      const outputPath = dir + "/" + outName;

      closeUpscalePopup();

      let actionId = crypto.randomUUID();
      const apiKey = getActiveApiKey();
      const aspectRatio = popup.querySelector(".enhance-aspect-select").value;

      createNewAction(
        actionId,
        "AI Enhancing",
        `${filename} via ${providerName} AI (creative)`,
        path
      );

      try {
        await invoke("ai_upscale_image", {
          aiProvider: AiProvider,
          apiKey,
          fromPath: path,
          aspectRatio,
          outputPath,
          creative: true,
        });
        showToast("AI Enhancement completed successfully", ToastType.SUCCESS);
        const existing = document.querySelector(`[itempath="${outputPath}"]`);
        if (existing) {
          await handleDynamicUpdate(outputPath);
        } else {
          await handleDynamicCreate(outputPath);
        }
      } catch (error) {
        showToast(`AI Enhancement failed: ${error}`, ToastType.ERROR);
      } finally {
        removeAction(actionId);
        scheduleDiskUsageRefresh();
      }
    });

    popup.querySelector(".style-item-button").addEventListener("click", async () => {
      const prompt = popup.querySelector(".style-prompt-input").value.trim();
      if (!prompt) {
        alert("Please enter a style prompt");
        return;
      }
      const outName = styleFilenameInput.value.trim();
      if (!outName) {
        alert("Please enter an output filename");
        return;
      }

      const dir = path.substring(0, path.lastIndexOf('/'));
      const outputPath = dir + "/" + outName;

      closeUpscalePopup();

      let actionId = crypto.randomUUID();
      const apiKey = getActiveApiKey();

      createNewAction(
        actionId,
        "Styling Image",
        `${filename} to ${prompt}`,
        path
      );

      try {
        await invoke("ai_style_image", {
          aiProvider: AiProvider,
          apiKey,
          fromPath: path,
          prompt,
          outputPath,
        });
        showToast("Image styling completed successfully", ToastType.SUCCESS);
        const existing = document.querySelector(`[itempath="${outputPath}"]`);
        if (existing) {
          await handleDynamicUpdate(outputPath);
        } else {
          await handleDynamicCreate(outputPath);
        }
      } catch (error) {
        showToast("Image styling failed: " + error, ToastType.ERROR);
      } finally {
        removeAction(actionId);
        scheduleDiskUsageRefresh();
      }
    });
  }

  popup.querySelector(".compress-image-action-btn").addEventListener("click", async () => {
    const outName = compressFilenameInput.value.trim();
    if (!outName) {
      alert("Please enter an output filename");
      return;
    }

    const dir = path.substring(0, path.lastIndexOf('/'));
    const outputPath = dir + "/" + outName;

    closeUpscalePopup();

    let actionId = crypto.randomUUID();
    const format = compressFormatSelect.value;
    const quality = parseInt(compressQualitySlider.value);

    let targetWidth = width;
    let targetHeight = height;

    if (compressResizeSelect.value === "custom") {
      targetWidth = parseInt(compressWidthInput.value) || width;
      targetHeight = parseInt(compressHeightInput.value) || height;
    } else {
      const scale = parseFloat(compressResizeSelect.value);
      targetWidth = Math.round(width * scale);
      targetHeight = Math.round(height * scale);
    }

    createNewAction(
      actionId,
      "Compressing Image",
      `${filename} (${targetWidth}x${targetHeight})`,
      path
    );

    try {
      await invoke("compress_image", {
        fromPath: path,
        targetWidth: targetWidth,
        targetHeight: targetHeight,
        format: format,
        quality: quality,
        outputPath: outputPath,
      });
      showToast("Image compression completed successfully", ToastType.SUCCESS);
      const existing = document.querySelector(`[itempath="${outputPath}"]`);
      if (existing) {
        await handleDynamicUpdate(outputPath);
      } else {
        await handleDynamicCreate(outputPath);
      }
    } catch (error) {
      showToast(`Image compression failed: ${error}`, ToastType.ERROR);
    } finally {
      removeAction(actionId);
      scheduleDiskUsageRefresh();
    }
  });



  try {
    const dims = await invoke("get_image_dimensions", { path });
    width = dims[0];
    height = dims[1];
    updateResolutionPreview();
    updateCompressResolutionPreview();
  } catch (err) {
    resPreview.textContent = "Unable to read image dimensions";
    compressResPreview.textContent = "Unable to read image dimensions";
    console.error("Failed to load image dimensions", err);
  }
}

async function showUpscalePopup(item) {
  await showImageEditPopup(item);
}

async function closeUpscalePopup() {
  let popup = document.querySelector(".upscale-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsInputFocused = false;
    });
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
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
    });
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
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
    });
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
  popup.className = "destination-conflict-popup props-card";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-labelledby", "destination-conflict-title");
  popup.setAttribute("aria-describedby", "destination-conflict-desc");
  popup.innerHTML = `
    <section class="props-card__hero destination-conflict-hero">
      <div class="props-card__thumb"><i class="fa-solid fa-triangle-exclamation" style="color: #f5a623; font-size: 18px;"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" id="destination-conflict-title">Item already exists</h2>
        <div class="props-card__meta">
          <span class="props-card__chip">Conflict ${index} of ${total}</span>
        </div>
      </div>
    </section>
    <div class="props-card__list destination-conflict-body" style="display: flex; flex-direction: column; gap: 14px; padding: 4px 14px 14px 14px;">
      <p id="destination-conflict-desc" class="popup-body-content" style="margin: 0; font-size: var(--fontSize); color: var(--textColor); line-height: 1.4;">“${escapeHtml(conflict.item.name)}” already exists in the destination.</p>
      <div class="destination-conflict-comparison" aria-label="Item comparison">
        <section class="destination-conflict-card">
          <h4>Incoming item</h4>
          <p class="destination-conflict-name" title="${escapeHtml(conflict.item.name)}">${escapeHtml(conflict.item.name)}</p>
          <p class="text-2"><i class="fa-regular fa-clock" style="font-size: 11px;"></i> ${escapeHtml(formatConflictMeta(conflict.item))}</p>
          <p class="text-2" title="${escapeHtml(conflict.item.path)}"><i class="fa-solid fa-folder-open" style="font-size: 11px;"></i> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">From: ${escapeHtml(normalizePath(conflict.item.path).split("/").slice(0, -1).join("/") || "/")}</span></p>
        </section>
        <section class="destination-conflict-card">
          <h4>Existing item</h4>
          <p class="destination-conflict-name" title="${escapeHtml(conflict.existing.name)}">${escapeHtml(conflict.existing.name)}</p>
          <p class="text-2"><i class="fa-regular fa-clock" style="font-size: 11px;"></i> ${escapeHtml(formatConflictMeta(conflict.existing))}</p>
          <p class="text-2" title="${escapeHtml(conflict.destinationPath)}"><i class="fa-solid fa-location-dot" style="font-size: 11px;"></i> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">In: ${escapeHtml(normalizePath(conflict.destinationPath).split("/").slice(0, -1).join("/") || "/")}</span></p>
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
    <footer class="props-card__footer destination-conflict-controls">
      <button class="props-card__btn destination-conflict-cancel"><i class="fa-solid fa-xmark"></i><span>Cancel</span></button>
      <button class="props-card__btn destination-conflict-skip"><i class="fa-solid fa-forward-step"></i><span>Skip</span></button>
      <button class="props-card__btn props-card__btn--primary destination-conflict-confirm"><i class="fa-solid fa-check"></i><span>Continue</span></button>
    </footer>`;
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
      safeAnimationEnd(popup, () => {
        popup?.remove();
        $(".popup-background").css("display", "none");
        $(".popup-background").css("opacity", "0");
        IsPopUpOpen = false;
        IsDisableShortcuts = false;
        if (previouslyFocused && typeof previouslyFocused.focus === "function") {
          previouslyFocused.focus();
        }
        resolve({ action: action ?? selected, applyToAll });
      });
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

async function pasteItem(copyToPath = "", isCopyToCut = false, forceItems = null) {
  let arr = [];
  let isSystemClipboard = false;
  let isMove = false;

  if (forceItems) {
    arr = forceItems;
  } else {
    // Try to retrieve files from the system clipboard
    try {
      let sysFiles = await invoke("get_clipboard_files");
      if (sysFiles && sysFiles.length > 0) {
        arr = sysFiles;
        isSystemClipboard = true;
      }
    } catch (err) {
      console.error("Failed to read system clipboard:", err);
    }
  }

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

  if (!isSystemClipboard) {
    if (!forceItems) {
      // If no system files, try to save an image from the system clipboard!
      try {
        let savedImage = await invoke("save_clipboard_image", { targetDir: targetPath });
        if (savedImage) {
          showToast("Pasted screenshot from clipboard", ToastType.SUCCESS);
          if (IsDualPaneEnabled === true) {
            refreshBothViews(SelectedItemPaneSide);
          } else {
            await listDirectories();
          }
          scheduleDiskUsageRefresh();
          return;
        }
      } catch (err) {
        console.log("No image in system clipboard:", err);
      }

      if (IsDualPaneEnabled == true) {
        arr = ArrSelectedItems;
      } else {
        arr = ArrCopyItems;
      }
      arr = arr.map(toCopyModel);
    }
    isMove = (isCopyToCut == true || IsCopyToCut == true);
  } else {
    // If it's from the system clipboard, determine if it was a cut operation
    if (IsCopyToCut && ArrCopyItems.length > 0) {
      let internalPaths = ArrCopyItems.map((item) => item.getAttribute("itempath"));
      let sysPaths = arr.map((item) => item.path);
      if (internalPaths.length === sysPaths.length && internalPaths.every((val, i) => val === sysPaths[i])) {
        isMove = true;
      }
    }
  }

  if (arr.length === 0) {
    return;
  }

  if (isMove) {
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

async function copyDiagnosticsInfo() {
  try {
    const appVer = await getVersion();
    const tauriVer = await getTauriVersion();
    const sysArch = await arch();
    const sysPlatform = await platform();
    
    const diagnostics = `CoDriver Diagnostic Information:
- App Version: ${appVer}
- Tauri Version: ${tauriVer}
- Platform: ${sysPlatform}
- Architecture: ${sysArch}
- Developer: Ricky Dane
- Mode: Production Desktop`;
    
    await writeText(diagnostics);
    showToast("Diagnostics copied to clipboard", ToastType.SUCCESS);
  } catch (err) {
    showToast("Failed to copy diagnostics: " + err, ToastType.ERROR);
  }
}

async function checkAppConfig() {
  await applyPlatformFeatures();
  await invoke("check_app_config").then(async (appConfig) => {
    let viewMode = appConfig.view_mode.replaceAll('"', "");
    if (!viewMode || viewMode === "null") {
      viewMode = "wrap";
    }
    if (IsFirstRun) {
      await switchView(viewMode);
    }

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
    CurrentTheme = appConfig.current_theme || "Default Dark";
    ArrFavorites = appConfig.arr_favorites || [];

    // Load custom user themes from the backend
    try {
      LoadedUserThemes = await invoke("get_themes");
    } catch (err) {
      console.error("Failed to load user themes:", err);
      LoadedUserThemes = [];
    }

    // Rework themeSelect population to be name-based
    let themeSelect = document.querySelector(".theme-select");
    themeSelect.innerHTML = "";

    // 1. Add built-in themes
    Object.keys(BuiltInThemes).forEach(themeName => {
      let themeOption = document.createElement("option");
      themeOption.value = themeName;
      themeOption.textContent = themeName;
      themeSelect.appendChild(themeOption);
    });

    // 2. Add custom loaded themes
    LoadedUserThemes.forEach(theme => {
      // Avoid duplicating built-in names
      if (!BuiltInThemes[theme.name]) {
        let themeOption = document.createElement("option");
        themeOption.value = theme.name;
        themeOption.textContent = theme.name;
        themeSelect.appendChild(themeOption);
      }
    });

    // Set current theme in select dropdown
    if (themeSelect.querySelector(`option[value="${CurrentTheme}"]`)) {
      themeSelect.value = CurrentTheme;
    } else {
      CurrentTheme = "Default Dark";
      themeSelect.value = CurrentTheme;
    }

    // Toggle delete/edit button visibility based on whether the theme is built-in
    if (BuiltInThemes[CurrentTheme]) {
      $(".delete-theme-btn").css("display", "none");
      $(".edit-theme-btn").css("display", "none");
    } else {
      $(".delete-theme-btn").css("display", "block");
      $(".edit-theme-btn").css("display", "block");
    }

    // Set active icon theme card matching localStorage
    let savedIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
    document.querySelectorAll(".icon-theme-card").forEach(card => {
      if (card.getAttribute("data-theme") === savedIconTheme) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });

    // Wire and load icon scale settings
    let savedIconScale = localStorage.getItem("current-icon-scale") || "100";
    let iconSlider = document.querySelector(".icon-size-slider");
    if (iconSlider) {
      iconSlider.value = savedIconScale;
    }
    changeIconSize(savedIconScale);
    initIconColorSettings();

    checkColorMode(appConfig);

    // Populate Info/About section dynamically
    try {
      const appVer = await getVersion();
      const tauriVer = await getTauriVersion();
      const sysArch = await arch();
      const sysPlatform = await platform();
      
      const appVerEl = document.getElementById("info-app-version");
      const tauriVerEl = document.getElementById("info-tauri-version");
      const archEl = document.getElementById("info-arch");
      const platformEl = document.getElementById("info-platform");

      if (appVerEl) appVerEl.textContent = appVer;
      if (tauriVerEl) tauriVerEl.textContent = tauriVer;
      if (archEl) archEl.textContent = sysArch;
      if (platformEl) platformEl.textContent = sysPlatform;
    } catch (err) {
      console.error("Failed to load environment diagnostics:", err);
    }

    // Keyboard Shortcuts Initialization
    ConfiguredShortcuts = { ...DefaultShortcuts, ...(appConfig.shortcuts || {}) };
    populateShortcutsUI();

    // General configurations
    document.querySelector(".configured-path-one-input").value =
      ConfiguredPathOne = appConfig.configured_path_one;
    document.querySelector(".configured-path-two-input").value =
      ConfiguredPathTwo = appConfig.configured_path_two;
    document.querySelector(".configured-path-three-input").value =
      ConfiguredPathThree = appConfig.configured_path_three;
    document.querySelector(".launch-path-input").value = appConfig.launch_path;
    let loadedDepth = parseInt(appConfig.search_depth) || 10;
    loadedDepth = Math.max(1, Math.min(100, loadedDepth));
    document.querySelector(".search-depth-input").value = SettingsSearchDepth = loadedDepth;

    let loadedMaxItems = parseInt(appConfig.max_items) || 1000;
    loadedMaxItems = Math.max(1, Math.min(1000, loadedMaxItems));
    document.querySelector(".max-items-input").value = SettingsMaxItems = loadedMaxItems;

    // New settings
    let fontSize = parseInt(appConfig.font_size) || 12;
    document.querySelector(".font-size-slider").value = fontSize;
    document.getElementById("font-size-value").textContent = fontSize + "px";
    document.documentElement.style.setProperty("--fontSize", fontSize + "px");

    document.querySelector(".gemini-api-key-input").value = appConfig.gemini_api_key || "";
    document.querySelector(".openai-api-key-input").value = appConfig.openai_api_key || "";

    const geminiTextVal = appConfig.gemini_text_model || "gemini-3.1-flash-lite-preview";
    const geminiTextInput = document.querySelector(".gemini-text-model-input");
    if (geminiTextInput) {
      geminiTextInput.value = geminiTextVal;
    }

    const geminiImageVal = appConfig.gemini_image_model || "gemini-3.1-flash-image-preview";
    const geminiImageSelect = document.querySelector(".gemini-image-model-select");
    const geminiImageCustom = document.querySelector(".gemini-image-model-custom-input");
    if (geminiImageSelect) {
      const isKnownModel = ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"].includes(geminiImageVal);
      if (isKnownModel) {
        geminiImageSelect.value = geminiImageVal;
        if (geminiImageCustom) {
          geminiImageCustom.value = "";
          geminiImageCustom.style.display = "none";
        }
      } else {
        geminiImageSelect.value = "custom";
        if (geminiImageCustom) {
          geminiImageCustom.value = geminiImageVal;
          geminiImageCustom.style.display = "block";
        }
      }
    }

    const openaiTextVal = appConfig.openai_text_model || "gpt-4o";
    const openaiTextInput = document.querySelector(".openai-text-model-input");
    if (openaiTextInput) {
      openaiTextInput.value = openaiTextVal;
    }

    const openaiImageVal = appConfig.openai_image_model || "gpt-image-2";
    const openaiImageSelect = document.querySelector(".openai-image-model-select");
    const openaiImageCustom = document.querySelector(".openai-image-model-custom-input");
    if (openaiImageSelect) {
      const isKnownModel = ["gpt-image-2"].includes(openaiImageVal);
      if (isKnownModel) {
        openaiImageSelect.value = openaiImageVal;
        if (openaiImageCustom) {
          openaiImageCustom.value = "";
          openaiImageCustom.style.display = "none";
        }
      } else {
        openaiImageSelect.value = "custom";
        if (openaiImageCustom) {
          openaiImageCustom.value = openaiImageVal;
          openaiImageCustom.style.display = "block";
        }
      }
    }

    AiProvider = appConfig.ai_provider || "gemini";
    const providerSelect = document.querySelector(".ai-provider-select");
    if (providerSelect) {
      providerSelect.value = AiProvider;
    }

    if (appConfig.is_ai_enabled && appConfig.is_ai_enabled.includes("1")) {
      document.querySelector(".ai-enabled-checkbox").checked = true;
      IsAiEnabled = true;
    } else {
      document.querySelector(".ai-enabled-checkbox").checked = false;
      IsAiEnabled = false;
    }

    toggleAiProviderRows();

    if (appConfig.is_window_transparency && appConfig.is_window_transparency.includes("1")) {
      document.querySelector(".window-transparency-checkbox").checked = true;
      document.body.style.opacity = "0.78";
    } else {
      document.querySelector(".window-transparency-checkbox").checked = false;
      document.body.style.opacity = "1.0";
    }

    if (IsFirstRun == true) {
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
      } else if (appConfig.launch_path.length >= 1) {
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
    }
  });
  await configBackButton();
  await unSelectAllItems();
  IsFirstRun = false;
}

async function refreshThemesOnly() {
  try {
    LoadedUserThemes = await invoke("get_themes");
  } catch (err) {
    console.error("Failed to load user themes:", err);
    LoadedUserThemes = [];
  }

  let themeSelect = document.querySelector(".theme-select");
  if (themeSelect) {
    let currentVal = themeSelect.value;
    themeSelect.innerHTML = "";

    // 1. Add built-in themes
    Object.keys(BuiltInThemes).forEach(themeName => {
      let themeOption = document.createElement("option");
      themeOption.value = themeName;
      themeOption.textContent = themeName;
      themeSelect.appendChild(themeOption);
    });

    // 2. Add custom loaded themes
    LoadedUserThemes.forEach(theme => {
      if (!BuiltInThemes[theme.name]) {
        let themeOption = document.createElement("option");
        themeOption.value = theme.name;
        themeOption.textContent = theme.name;
        themeSelect.appendChild(themeOption);
      }
    });

    // Restore selection
    if (themeSelect.querySelector(`option[value="${currentVal}"]`)) {
      themeSelect.value = currentVal;
    } else if (themeSelect.querySelector(`option[value="${CurrentTheme}"]`)) {
      themeSelect.value = CurrentTheme;
    } else {
      themeSelect.value = "Default Dark";
    }
  }
  showToast("Themes refreshed", ToastType.INFO);
}

function openAppChangelog() {
  invoke("open_item", { path: "https://github.com/RickyDane/CoDriver/releases" });
}

async function applyPlatformFeatures() {
  Platform = await platform();
  if (Platform === "macos") {
    Platform = "darwin";
  } else if (Platform === "windows") {
    Platform = "win32";
  }
  // Check for macOS and position titlebar buttons on the left
  if (Platform == "darwin") {
    document.body.classList.add("darwin");
    let headerNav = document.querySelector(".header-nav");
    // headerNav.style.borderBottom = "none";
    headerNav.style.boxShadow = "none";
    $(".site-nav-bar").css("padding-top", "50px");
    $(".file-searchbar-shortcut").text("⌘F");
    $(".ftp-keychain-hint").css("display", "flex");
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
        $(".explorer-container")?.css("padding", "30px 20px 20px 20px");
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
  if (path.startsWith("ftp://") || path.includes("sshfs") || path.startsWith("/tmp/codriver-sshfs-mount")) return true;
  if (Platform === "darwin") {
    return item.is_removable === true && path.startsWith("/Volumes/");
  }
  return item.is_removable === true;
}

async function listDirectories(fromDualPaneCopy = false) {
  const backendDir = await getCurrentDir();

  if (backendDir !== CurrentDir) {
    await clearQuickSearch(false);
  }

  const isFtp = backendDir && backendDir.startsWith("ftp://");
  let side = SelectedItemPaneSide;
  if (IsDualPaneEnabled && fromDualPaneCopy) {
    side = (SelectedItemPaneSide === "left") ? "right" : "left";
  }

  if (isFtp) {
    showFtpLoader(side);
  }

  if (ActiveFilter !== "" && !fromDualPaneCopy) {
    try {
      await searchFor(ActiveFilter, 999999, 1, true);
      return;
    } catch (e) {
      console.error("Failed to run quicksearch during listDirectories:", e);
    }
  }

  try {
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
    } else {
      // Sync current directory state from the backend before showing items
      const backendDir = await getCurrentDir();
      console.log("[Escape Debug] listDirectories (non-dual pane) - CurrentDir before sync:", CurrentDir, "backendDir from backend:", backendDir);
      await setCurrentDir(backendDir, "", false);
      await showItems(lsItems, "", CurrentMillerCol);
    }
  } catch (error) {
    console.error("Failed to list directories:", error);
    if (isFtp) {
      hideFtpLoader(side);
    }
    showToast("Failed to list directory: " + error, ToastType.ERROR);
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
  const isCtrl = e ? e.ctrlKey : (window.event ? window.event.ctrlKey : false);
  const isShift = e ? e.shiftKey : (window.event ? window.event.shiftKey : false);

  // Interaction mode: Select
  if (
    element != null &&
    element != SelectedItemToOpen &&
    IsSelectMode == true &&
    (isDir == 0 || ViewMode != "miller" || isMeta == true || isCtrl == true)
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
    (isDir == 1 && ViewMode == "miller" && isMeta == false && isCtrl == false)
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
      let isFtp = path && path.startsWith("ftp://");
      if (isFtp) {
        showFtpLoader(dualPaneSide);
      }
      try {
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
          if (isFtp) {
            hideFtpLoader(dualPaneSide);
          }
          return;
        }
      } catch (error) {
        console.error("openItem failed:", error);
        if (isFtp) {
          hideFtpLoader(dualPaneSide);
        }
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

  if (isShift === false) {
    ShiftAnchorElement = element;
  }

  if ((isMeta || isCtrl) && ArrSelectedItems.includes(element)) {
    deSelectItem(element);
    return;
  }

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
  } else if (id === activeDeleteSizeUpdateId && isDeleteSizeCalculationActive) {
    setSizeCalculationLoading(".props-card__size", formatBytes(size, 2));
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

let currentDeleteSizeRequestId = 0;
let activeDeleteSizeUpdateId = null;
let isDeleteSizeCalculationActive = false;

function startDeleteSizeCalculation() {
  activeDeleteSizeUpdateId = `delete-${++currentDeleteSizeRequestId}`;
  isDeleteSizeCalculationActive = true;
  return activeDeleteSizeUpdateId;
}

function finishDeleteSizeCalculation(updateId) {
  if (activeDeleteSizeUpdateId === updateId) {
    isDeleteSizeCalculationActive = false;
    activeDeleteSizeUpdateId = null;
  }
}

function isDeleteSizeUpdateCurrent(updateId) {
  return activeDeleteSizeUpdateId === updateId && isDeleteSizeCalculationActive;
}

let currentSelectionRequestId = 0;
async function updateSelectionInfo() {
  let selectionInfo = document.querySelector(".selection-info");
  if (!selectionInfo) return;
  if (ArrSelectedItems.length == 0) {
    selectionInfo.textContent = "";
    return;
  }

  // Cancel any existing background selection size calculation
  await invoke("cancel_selection_size_calculation");

  if (ArrSelectedItems.length == 1) {
    let item = ArrSelectedItems[0];
    if (item.getAttribute("itemisdir") == "1") {
      selectionInfo.textContent = item.getAttribute("itemname");
    } else {
      let size = item.getAttribute("itemsize");
      let rawSize = item.getAttribute("itemrawsize");
      let displaySize = rawSize ? formatSizeWithLimit(rawSize, 2) : size;
      selectionInfo.textContent =
        item.getAttribute("itemname") + (displaySize ? " (" + displaySize + ")" : "");
    }
  } else {
    selectionInfo.textContent = ArrSelectedItems.length + " items selected";
  }
}

function deSelectItem(item) {
  if (IsDualPaneEnabled) {
    item.children[0]?.classList.remove("selected-item");
  } else if (ViewMode == "column" || ViewMode == "miller") {
    if (IsShowDisks == true) {
      (item.children[1] ?? item.children[0])?.classList.remove("selected-item");
    } else {
      item.children[0]?.classList.remove("selected-item");
    }
  } else {
    if (IsShowDisks == true) {
      item.children[0]?.classList.remove("selected-item");
    } else {
      item.children[0]?.children[0]?.classList.remove("selected-item");
      item.children[0]?.children[1]?.classList.remove("selected-item-min");
    }
  }
  var index = ArrSelectedItems.indexOf(item);
  if (index !== -1) {
    ArrSelectedItems.splice(index, 1);
  }
  item.setAttribute("itemisselected", false);
  if (SelectedElement === item) {
    SelectedElement = ArrSelectedItems.length > 0 ? ArrSelectedItems[ArrSelectedItems.length - 1] : null;
    SelectedItemPath = SelectedElement ? SelectedElement.getAttribute("itempath") : "";
  }
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
  ShiftAnchorElement = null;
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

function handleShiftArrowNavigation(direction, e) {
  let container;
  if (IsDualPaneEnabled === true) {
    container = SelectedItemPaneSide === "left" ? LeftPaneItemCollection : RightPaneItemCollection;
  } else {
    container = DirectoryList;
  }

  if (!container) return;

  const items = Array.from(container.querySelectorAll(".item-link"));
  if (items.length === 0) return;

  let currentIndex = -1;
  if (SelectedElement != null) {
    currentIndex = items.indexOf(SelectedElement);
  }
  if (currentIndex === -1) {
    currentIndex = 0;
  }

  if (!ShiftAnchorElement) {
    ShiftAnchorElement = SelectedElement || items[0];
  }
  const anchorIndex = items.indexOf(ShiftAnchorElement);

  let step = 1;
  if (ViewMode === "wrap") {
    const rowlen = Array.prototype.reduce.call(
      items,
      function (prev, next) {
        if (!prev[2]) {
          var ret = next.getBoundingClientRect().left;
          if (!(prev[0] > -1 && ret < prev[1])) {
            prev[0]++;
          } else {
            prev[2] = 1;
          }
        }
        return [prev[0], ret, prev[2]];
      },
      [0, null, 0],
    )[0];
    step = rowlen || 1;
  }

  let targetIndex;
  if (direction === "up") {
    targetIndex = currentIndex - step;
  } else if (direction === "down") {
    targetIndex = currentIndex + step;
  } else if (direction === "left") {
    targetIndex = currentIndex - 1;
  } else if (direction === "right") {
    targetIndex = currentIndex + 1;
  }

  if (targetIndex < 0) targetIndex = 0;
  if (targetIndex >= items.length) targetIndex = items.length - 1;

  if (targetIndex === currentIndex) return;

  const savedAnchor = ShiftAnchorElement;
  
  unSelectAllItems();

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  for (let i = start; i <= end; i++) {
    if (i !== targetIndex) {
      selectItem(items[i], SelectedItemPaneSide, true, false, e);
    }
  }
  
  selectItem(items[targetIndex], SelectedItemPaneSide, true, true, e);

  ShiftAnchorElement = savedAnchor;

  items[targetIndex].scrollIntoView({ block: "nearest", inline: "nearest" });

  if (SelectedItemPaneSide === "left") {
    LeftPaneItemIndex = targetIndex;
  } else if (SelectedItemPaneSide === "right") {
    RightPaneItemIndex = targetIndex;
  }
}

function goUp(isSwitched = false, toFirst = false) {
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
    } else {
      SelectedItemPaneSide = "left";
      if (SelectedItemPaneSide == "right") {
        RightPaneItemIndex = 0;
        element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
      } else {
        LeftPaneItemIndex = 0;
        element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
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
  }

  if (element != null && element != SelectedElement) {
    if (SelectedElement != null) {
      SelectedElement.style.backgroundColor = "transparent";
      if (SelectedElement.children[0]) {
        SelectedElement.children[0].style.backgroundColor = "transparent";
      }
    }
    element.onclick();
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
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

  if (element != null && element != SelectedElement) {
    if (SelectedElement != null) {
      SelectedElement.style.backgroundColor = "transparent";
      if (SelectedElement.children[0]) {
        SelectedElement.children[0].style.backgroundColor = "transparent";
      }
    }
    element.onclick();
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
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
  // Release focus from the select dropdown so quick search works instantly
  document.querySelector(".left-disk-dropdown")?.blur();
  document.querySelector(".right-disk-dropdown")?.blur();
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

  const format = item?.getAttribute("itemformat") || "";
  if (format.includes("FTP") || path.startsWith("ftp://")) {
    await ejectFTP({ path });
    return;
  } else if (format.includes("SSHFS") || path.includes("sshfs") || path.startsWith("/tmp/codriver-sshfs-mount")) {
    await unmountNetworkDrive({ path });
    return;
  }

  try {
    if (format) {
      await invoke("unmount_drive", { path });
      await insertSiteNavButtons();
      if (IsShowDisks) {
        await listDisks();
      }
      const currentDir = await invoke("get_current_dir");
      if (currentDir.startsWith(path)) {
        await goHome();
      }
      return;
    }

    const message = await invoke("eject_disk", { path });
    showToast(message || "Disk ejected", ToastType.SUCCESS);
    await insertSiteNavButtons();
    if (IsShowDisks) {
      await listDisks();
    }
    const currentDir = await invoke("get_current_dir");
    if (currentDir.startsWith(path)) {
      await goHome();
    }
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
  if (IsSearching === true) {
    if (isQuickSearch === true) {
      await stopSearching();
      await new Promise((resolve) => setTimeout(resolve, 50));
      IsSearching = false;
    } else {
      return;
    }
  }
  if (fileName.length > 1 || isQuickSearch == true) {
    $(".is-file-searching").css("display", "block");
    updateFileSearchbarState(true);
    if (IsDualPaneEnabled === true) {
      if (SelectedItemPaneSide === "left") {
        let list = document.querySelector(".dual-pane-left .directory-list-dual-pane");
        if (list) {
          list.innerHTML = "";
        } else {
          $(".dual-pane-left").html("");
          let newList = document.createElement("div");
          newList.className = "directory-list-dual-pane";
          document.querySelector(".dual-pane-left").append(newList);
        }
      } else {
        let list = document.querySelector(".dual-pane-right .directory-list-dual-pane");
        if (list) {
          list.innerHTML = "";
        } else {
          $(".dual-pane-right").html("");
          let newList = document.createElement("div");
          newList.className = "directory-list-dual-pane";
          document.querySelector(".dual-pane-right").append(newList);
        }
      }
    } else {
      $(".directory-list").html("");
    }
    IsSearching = true;
    FoundItemsCountIndex = 0;
    try {
      await invoke("search_for", {
        fileName,
        maxItems,
        searchDepth,
        fileContent,
        isQuickSearch,
      });
    } catch (error) {
      console.error("Search invocation failed:", error);
      showToast("Search failed: " + error, ToastType.ERROR);
    } finally {
      IsSearching = false;
      IsFullSearching = false;
    }
    setTimeout(() => {
      ds.setSettings({
        selectables: ArrDirectoryItems,
      });
    }, 250);
  } else {
    stopFullSearch();
    alert("Type in a minimum of 2 characters");
  }
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
    } else if (e.key === "Escape") {
      await cancelSearch(true);
      closeSearchBar();
    } else if (
      IsQuickSearchOpen == true &&
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

async function cancelSearch(shouldRefresh = false) {
  document.querySelector(".cancel-search-button").classList.remove("is-visible");
  document.querySelector(".search-bar-input").value = "";
  updateFileSearchbarState();
  if (IsSearching || IsFullSearching) {
    await invoke("stop_searching");
    IsSearching = false;
    IsFullSearching = false;
  }
  if (shouldRefresh) {
    if (IsDualPaneEnabled === true) {
      await refreshBothViews(SelectedItemPaneSide);
    } else {
      await refreshView();
    }
  }
}

async function switchView(newMode = null) {
  if (IsDualPaneEnabled == false) {
    if (newMode && ["wrap", "column", "miller"].includes(newMode)) {
      ViewMode = newMode;
    } else if (newMode === null) {
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
        applyDirectoryListStyles(list, "column");
      });
      document
        .querySelectorAll(".item-button")
        .forEach((item) => (item.style.display = "none"));
      document
        .querySelectorAll(".item-button-list")
        .forEach((item) => (item.style.display = "flex"));
      document.querySelector(".list-column-header").style.display = "flex";
      $(".explorer-container")?.css("padding", "45px 10px 10px 10px");
      document.querySelector(".miller-container").style.display = "none";
      document.querySelector(".non-dual-pane-container").style.display = "block";
      $(".file-searchbar").css("opacity", "1");
      $(".file-searchbar").css("pointer-events", "all");
    } else if (ViewMode == "miller") {
      document.querySelectorAll(".directory-list").forEach((list) => {
        applyDirectoryListStyles(list, "miller");
      });
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
        applyDirectoryListStyles(list, "wrap");
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
      $(".explorer-container")?.css("padding", "30px 20px 20px 20px");
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
    document.body.classList.add("dual-pane-mode");
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
    $(".dual-pane-container").css("padding-top", "35px"); // --> 35px from toolbar (height 35px, top 0px absolute inside main-container which starts at top 55px)
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
    document.body.classList.remove("dual-pane-mode");
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
  if (typeof renderActiveActionsPill === "function") {
    renderActiveActionsPill();
  }
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
  await checkAppConfig();
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
  searchDepth = Math.max(1, Math.min(100, searchDepth));
  document.querySelector(".search-depth-input").value = searchDepth;

  let maxItems = parseInt(document.querySelector(".max-items-input").value) || 1000;
  maxItems = Math.max(1, Math.min(1000, maxItems));
  document.querySelector(".max-items-input").value = maxItems;
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
  let geminiApiKey = document.querySelector(".gemini-api-key-input").value.trim();
  let openaiApiKey = document.querySelector(".openai-api-key-input").value.trim();
  let aiProvider = document.querySelector(".ai-provider-select")?.value || "gemini";
  let isAiEnabled = document.querySelector(".ai-enabled-checkbox").checked;

  let geminiTextModel = document.querySelector(".gemini-text-model-input")?.value?.trim() || "gemini-3.1-flash-lite-preview";
  let geminiImageSelect = document.querySelector(".gemini-image-model-select");
  let geminiImageModel = (geminiImageSelect?.value === "custom"
    ? document.querySelector(".gemini-image-model-custom-input")?.value?.trim()
    : geminiImageSelect?.value) || "gemini-3.1-flash-image-preview";

  let openaiTextModel = document.querySelector(".openai-text-model-input")?.value?.trim() || "gpt-4o";
  let openaiImageSelect = document.querySelector(".openai-image-model-select");
  let openaiImageModel = (openaiImageSelect?.value === "custom"
    ? document.querySelector(".openai-image-model-custom-input")?.value?.trim()
    : openaiImageSelect?.value) || "gpt-image-2";

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
  if (isAiEnabled == true) {
    isAiEnabled = "1";
    IsAiEnabled = true;
  } else {
    isAiEnabled = "0";
    IsAiEnabled = false;
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
    geminiApiKey,
    openaiApiKey,
    isAiEnabled,
    aiProvider,
    geminiTextModel,
    geminiImageModel,
    openaiTextModel,
    openaiImageModel,
    shortcuts: ConfiguredShortcuts,
  });
  if (isVerbose === true) {
    showToast("Settings have been saved", ToastType.INFO);
  }
  if (isToReload == true) {
    await checkAppConfig();
  }
}

async function resetSettingsToDefaults() {
  const confirmed = await confirm("Reset all settings to their default values?");
  if (!confirmed) return;

  document.querySelector(".theme-select").value = "Default Dark";
  selectIconTheme("Prestige Glass");
  changeIconSize("100");
  if (document.querySelector(".icon-size-slider")) {
    document.querySelector(".icon-size-slider").value = "100";
  }
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
  document.querySelector(".gemini-api-key-input").value = "";
  document.querySelector(".openai-api-key-input").value = "";

  const geminiTxtInput = document.querySelector(".gemini-text-model-input");
  if (geminiTxtInput) geminiTxtInput.value = "gemini-3.1-flash-lite-preview";
  const geminiImgSelect = document.querySelector(".gemini-image-model-select");
  if (geminiImgSelect) geminiImgSelect.value = "gemini-3.1-flash-image-preview";
  const geminiImgCustom = document.querySelector(".gemini-image-model-custom-input");
  if (geminiImgCustom) {
    geminiImgCustom.value = "";
    geminiImgCustom.style.display = "none";
  }

  const openaiTxtInput = document.querySelector(".openai-text-model-input");
  if (openaiTxtInput) openaiTxtInput.value = "gpt-4o";
  const openaiImgSelect = document.querySelector(".openai-image-model-select");
  if (openaiImgSelect) openaiImgSelect.value = "gpt-image-2";
  const openaiImgCustom = document.querySelector(".openai-image-model-custom-input");
  if (openaiImgCustom) {
    openaiImgCustom.value = "";
    openaiImgCustom.style.display = "none";
  }

  const advancedContainer = document.querySelector(".advanced-ai-settings-container");
  if (advancedContainer) advancedContainer.style.display = "none";
  const chevron = document.querySelector(".advanced-ai-chevron");
  if (chevron) chevron.style.transform = "rotate(0deg)";

  const providerSelect = document.querySelector(".ai-provider-select");
  if (providerSelect) {
    providerSelect.value = "gemini";
  }
  document.querySelector(".ai-enabled-checkbox").checked = false;

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

  const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".tiff", ".avif", ".jfif"];
  const isImage = !isMulti && !isDir && ext && imageExts.includes(ext.toLowerCase()) && path && !path.startsWith("ftp://");
  const resolutionRow = isImage
    ? `
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-image"></i>Resolution</dt>
        <dd class="props-card__value">
          <button class="props-card__copy" title="Copy resolution to clipboard" onclick="copyPropertiesSizeRow(this)">
            <span class="properties-item-resolution">
              <span class="props-card__skeleton"></span>
            </span>
            <i class="fa-regular fa-copy props-card__copy-icon"></i>
          </button>
        </dd>
      </div>`
    : "";

  const isArchive = !isMulti && ['.zip', '.7z', '.tar', '.density', '.rar', '.br', '.zst', '.zstd'].includes(ext.toLowerCase());
  const archiveOriginalSizeRow = isArchive
    ? `
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-expand"></i>Original Size</dt>
        <dd class="props-card__value">
          <button class="props-card__copy" title="Copy original size to clipboard" onclick="copyPropertiesSizeRow(this)">
            <span class="properties-item-original-size">
              <span class="props-card__skeleton"></span>
            </span>
            <i class="fa-regular fa-copy props-card__copy-icon"></i>
          </button>
        </dd>
      </div>`
    : "";

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
          <button class="props-card__copy" title="Copy size to clipboard" onclick="copyPropertiesSizeRow(this)">
            <span class="properties-item-size props-card__size">
              <span class="props-card__skeleton"></span>
            </span>
            <i class="fa-regular fa-copy props-card__copy-icon"></i>
          </button>
        </dd>
      </div>
      ${resolutionRow}
      ${archiveOriginalSizeRow}
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
  popup.dataset.updateId = propertiesUpdateId;

  if (!isMulti) {
    if (isImage) {
      (async () => {
        try {
          const dims = await invoke("get_image_dimensions", { path });
          const currentPopup = document.querySelector(".item-properties-popup");
          if (!currentPopup || currentPopup.dataset.updateId !== propertiesUpdateId) return;

          $(".properties-item-resolution").html(`${dims[0]} × ${dims[1]}`);
        } catch (err) {
          const currentPopup = document.querySelector(".item-properties-popup");
          if (!currentPopup || currentPopup.dataset.updateId !== propertiesUpdateId) return;
          console.error("Failed to get image dimensions:", err);
          $(".properties-item-resolution").html("<span style='color: var(--textColor2); opacity: 0.7;'>Unavailable</span>");
        }
      })();
    }

    try {
      const info = await getSimpleDirInfo(
        first.getAttribute("itempath"),
        ".properties-item-size",
        isDir,
        propertiesUpdateId
      );
      finishPropertiesSizeCalculation(propertiesUpdateId);

      if (isArchive && info && info.size) {
        (async () => {
          try {
            const originalBytes = await invoke("get_archive_original_size", { path });
            const currentPopup = document.querySelector(".item-properties-popup");
            if (!currentPopup || currentPopup.dataset.updateId !== propertiesUpdateId) return;

            const originalSizeStr = formatBytes(originalBytes, 2);
            let ratioText = "";
            if (originalBytes > 0) {
              const ratio = ((info.size / originalBytes) * 100).toFixed(1);
              ratioText = ` <span style="font-size: 10.5px; color: #4caf50; font-weight: 600; margin-left: 6px;">(${ratio}% of original size)</span>`;
            }
            $(".properties-item-original-size").html(`${originalSizeStr}${ratioText}`);
          } catch (err) {
            const currentPopup = document.querySelector(".item-properties-popup");
            if (!currentPopup || currentPopup.dataset.updateId !== propertiesUpdateId) return;
            console.error("Failed to get archive original size:", err);
            $(".properties-item-original-size").html("<span style='color: var(--textColor2); opacity: 0.7;'>Unavailable</span>");
          }
        })();
      }
    } catch (error) {
      const currentPopup = document.querySelector(".item-properties-popup");
      if (!currentPopup || currentPopup.dataset.updateId !== propertiesUpdateId) return;
      finishPropertiesSizeCalculation(propertiesUpdateId);
      writeLog(error);
      $(".properties-item-size").html("Unable to calculate size");
      if (isArchive) {
        $(".properties-item-original-size").html("<span style='color: var(--textColor2); opacity: 0.7;'>Unavailable</span>");
      }
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
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsItemPreviewOpen = false;
    });
  } else {
    IsPopUpOpen = false;
    IsItemPreviewOpen = false;
  }
}

function copyPropertiesSizeRow(btn) {
  let textSpan = btn.querySelector(".properties-item-size, .properties-item-original-size, .properties-item-resolution");
  let text = "";
  if (textSpan) {
    text = textSpan.innerText.trim();
  } else {
    text = btn.innerText.trim();
  }
  if (!text || text.includes("Calculating") || btn.querySelector(".props-card__skeleton")) {
    return;
  }
  text = text.replace(/[\r\n]+/g, " ").trim();

  if (textSpan) {
    if (textSpan.classList.contains("properties-item-size")) {
      if (text.includes(" - ")) {
        text = text.split(" - ")[0].trim();
      }
    } else if (textSpan.classList.contains("properties-item-original-size")) {
      if (text.includes("(")) {
        text = text.split("(")[0].trim();
      }
    }
  }

  writeText(text);
  showToast(`Copied "${text}" to clipboard`, ToastType.INFO);
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
  let isFtp = path.startsWith("ftp://");
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
    case ".tiff":
    case ".avif":
      if (isFtp) {
        module = `
        <div class="image-loader-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 300px; min-height: 300px; gap: 15px; color: var(--textColor);">
          <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px;"></div>
          <span style="font-size: var(--fontSize); opacity: 0.8;">Loading image...</span>
        </div>
        <div class="module-container" style="display: none;">
          <img class="${moduleImgId}" decoding="async" width="100%" height="100%" />
        </div>
        `;
      } else {
        module = `
        <div class="module-container">
        <img class="${moduleImgId}" decoding="async" src="resources/preloader_big.gif" width="100%" height="100%" />
        </div>
        `;
      }
      break;
    case ".pdf":
      module = `
      <div class="pdf-loader-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 40vw; height: 60vh; gap: 15px; color: var(--textColor);">
        <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px;"></div>
        <span style="font-size: var(--fontSize); opacity: 0.8;">Loading ...</span>
      </div>
      <iframe class="pdf-preview-iframe" decoding="async" style="display: none; width: 40vw; height: 60vh; border: none;"></iframe>
      `;
      break;
    case ".html":
    case ".xhtml":
    case ".htm":
      if (isFtp) {
        module = `
        <div class="html-loader-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 40vw; height: 60vh; gap: 15px; color: var(--textColor);">
          <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px;"></div>
          <span style="font-size: var(--fontSize); opacity: 0.8;">Loading HTML...</span>
        </div>
        <iframe class="html-preview-iframe" decoding="async" style="display: none; width: 40vw; height: 60vh; border: none;"></iframe>
        `;
      } else {
        popup.style.backgroundColor = "white";
        module = `<iframe decoding="async" src="${convertFileSrc(path)}"></iframe>`;
      }
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
      if (isFtp) {
        module = `
        <div class="media-loader-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 400px; min-height: 300px; gap: 15px; color: var(--textColor);">
          <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px;"></div>
          <span style="font-size: var(--fontSize); opacity: 0.8;">Loading media...</span>
        </div>
        <div class="module-container" style="display: none;">
          <video decoding="async" autoplay controls style="max-width: 80vw; max-height: 80vh;"></video>
        </div>
        `;
      } else {
        module = `
        <div class="module-container">
        <video decoding="async" src="${convertFileSrc(path)}" autoplay controls></video>
        </div>
        `;
      }
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
      <div class="text-loader-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 40vw; height: 50vh; gap: 15px; color: var(--textColor);">
        <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px;"></div>
        <span style="font-size: var(--fontSize); opacity: 0.8;">Loading text content...</span>
      </div>
      <div class="module-container" style="display: none;">
        <pre class="item-preview-file-content" style="padding: 20px; font-size: 12px;"></pre>
      </div>
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

  if (isFtp) {
    if ([".png", ".icns", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".jfif", ".avif"].includes(ext.toLowerCase())) {
      const img = popup.querySelector("img");
      const loader = popup.querySelector(".image-loader-container");
      const container = popup.querySelector(".module-container");
      if (img && loader && container) {
        invoke("get_ftp_temp_file", { path })
          .then((tempPath) => {
            img.src = convertFileSrc(tempPath);
            img.onload = () => {
              loader.style.display = "none";
              container.style.display = "block";
            };
          })
          .catch((error) => {
            writeLog("Failed to load FTP image: " + error);
            loader.innerHTML = `<span style="font-size: var(--fontSize); color: red; text-align: center;">Failed to load image</span>`;
          });
      }
    } else if ([".html", ".xhtml", ".htm"].includes(ext.toLowerCase())) {
      const iframe = popup.querySelector(".html-preview-iframe");
      const loader = popup.querySelector(".html-loader-container");
      if (iframe && loader) {
        invoke("get_ftp_temp_file", { path })
          .then((tempPath) => {
            popup.style.backgroundColor = "white";
            iframe.src = convertFileSrc(tempPath);
            iframe.onload = () => {
              loader.style.display = "none";
              iframe.style.display = "block";
            };
          })
          .catch((error) => {
            writeLog("Failed to load FTP HTML: " + error);
            loader.innerHTML = `<span style="font-size: var(--fontSize); color: red; text-align: center;">Failed to load HTML</span>`;
          });
      }
    } else if ([".mp4", ".mkv", ".mov", ".avi", ".webm", ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".ape", ".flv", ".wmv"].includes(ext.toLowerCase())) {
      const video = popup.querySelector("video");
      const loader = popup.querySelector(".media-loader-container");
      const container = popup.querySelector(".module-container");
      if (video && loader && container) {
        invoke("get_ftp_temp_file", { path })
          .then((tempPath) => {
            video.src = convertFileSrc(tempPath);
            video.onloadeddata = () => {
              loader.style.display = "none";
              container.style.display = "block";
            };
          })
          .catch((error) => {
            writeLog("Failed to load FTP media: " + error);
            loader.innerHTML = `<span style="font-size: var(--fontSize); color: red; text-align: center;">Failed to load media</span>`;
          });
      }
    }
  } else {
    let img = popup.querySelector("img");
    if (img) {
      img.src = convertFileSrc(item.getAttribute("itempath"));
    }
  }

  if (ext.toLowerCase() === ".pdf") {
    const iframe = popup.querySelector(".pdf-preview-iframe");
    const loader = popup.querySelector(".pdf-loader-container");
    if (iframe && loader) {
      invoke("get_file_base64", { path })
        .then((base64Data) => {
          iframe.src = "data:application/pdf;base64," + base64Data;
          loader.style.display = "none";
          iframe.style.display = "block";
          popup.style.backgroundColor = "white";
        })
        .catch((error) => {
          writeLog("Failed to load PDF preview: " + error);
          loader.innerHTML = `<span style="font-size: var(--fontSize); color: red; text-align: center;">Failed to load PDF preview</span>`;
        });
    }
  }

  const textExtensions = [
    ".txt", ".json", ".sh", ".py", ".css", ".js", ".ts", ".sql", ".mts",
    ".jsx", ".tsx", ".mjs", ".php", ".c", ".cpp", ".cs", ".java", ".md",
    ".xml", ".yaml", ".yml", ".toml", ".lock", ".ini", ".cfg", ".log",
    ".env", ".gitignore"
  ];
  if (textExtensions.includes(ext.toLowerCase())) {
    const textContainer = popup.querySelector(".module-container");
    const loader = popup.querySelector(".text-loader-container");
    const pre = popup.querySelector(".item-preview-file-content");
    if (textContainer && loader && pre) {
      invoke("get_file_content", { path })
        .then((content) => {
          pre.textContent = content;
          loader.style.display = "none";
          textContainer.style.display = "flex";
        })
        .catch((error) => {
          writeLog("Failed to load text preview: " + error);
          loader.innerHTML = `<span style="font-size: var(--fontSize); color: red; text-align: center;">Failed to load text preview</span>`;
        });
    }
  }
  popup.children[0].addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.target.blur();
    }
  });
}

function showMultiRenamePopup() {
  IsPopUpOpen = true;
  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let arrItemsToRename = ArrSelectedItems;
  const itemsListHtml = `<ul class="props-card__items-list">
    ${arrItemsToRename.map((item) => {
      const name = item.getAttribute("itemname");
      const isDir = item.getAttribute("itemisdir") === "1";
      const ext = (item.getAttribute("itemext") || "").replace(".", "").toUpperCase();
      const size = item.getAttribute("itemsize") || "—";
      const icon = isDir ? "fa-solid fa-folder" : "fa-regular fa-file";
      return `<li class="props-card__item-li" title="${escHtml(name)}">
        <div class="props-card__item-row">
          <i class="${icon} props-card__item-icon"></i>
          <span class="props-card__item-name">${escHtml(name)}</span>
          <span class="props-card__item-meta">${isDir ? "Folder" : escHtml(ext)}</span>
          <span class="props-card__item-size">${escHtml(size)}</span>
        </div>
      </li>`;
    }).join("")}
  </ul>`;

  let popup = document.createElement("div");
  popup.className = "props-card multi-rename-popup props-card--wide";
  popup.style.display = "flex";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Multi-Rename");

  popup.innerHTML = `
    <section class="props-card__hero">
      <div class="props-card__thumb"><i class="fa-solid fa-pen-to-square"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name">Multi-Rename</h2>
        <div class="props-card__meta">
          <span class="props-card__chip">Batch Operation</span>
        </div>
      </div>
    </section>

    <dl class="props-card__list">
      <div class="props-card__row props-card__row--full">
        <dt class="props-card__label"><i class="fa-solid fa-signature"></i>New name</dt>
        <dd class="props-card__value">
          <input class="props-card__input multi-rename-input multi-rename-newname" placeholder="Name" />
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-arrow-down-1-9"></i>Start at</dt>
        <dd class="props-card__value">
          <input class="props-card__input multi-rename-input multi-rename-startat" placeholder="0" value="0" type="number" />
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-stairs"></i>Step by</dt>
        <dd class="props-card__value">
          <input class="props-card__input multi-rename-input multi-rename-stepby" placeholder="1" value="1" type="number" />
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-hashtag"></i>Digits</dt>
        <dd class="props-card__value">
          <input class="props-card__input multi-rename-input multi-rename-ndigits" placeholder="1" value="1" type="number" />
        </dd>
      </div>
      <div class="props-card__row">
        <dt class="props-card__label"><i class="fa-solid fa-file-code"></i>Extension</dt>
        <dd class="props-card__value">
          <input class="props-card__input multi-rename-input multi-rename-ext" placeholder=".txt" type="text" />
        </dd>
      </div>
      <div class="props-card__row props-card__row--block" style="margin-top: -2px; margin-bottom: 2px;">
        <div style="font-size: 11px; color: var(--textColor2); display: flex; align-items: center; gap: 6px; opacity: 0.85;">
          <i class="fa-solid fa-circle-info" style="font-size: 10px;"></i>
          <span>If no extension is supplied the extension won't be changed</span>
        </div>
      </div>
      <div class="props-card__row props-card__row--block" style="margin-top: 4px;">
        <dt class="props-card__label"><i class="fa-regular fa-rectangle-list"></i>Selected items to rename</dt>
        <dd class="props-card__value">${itemsListHtml}</dd>
      </div>
    </dl>

    <footer class="props-card__footer">
      <button class="props-card__btn" onclick="closeMultiRenamePopup()">
        <i class="fa-solid fa-xmark"></i><span>Cancel</span>
      </button>
      <button class="props-card__btn props-card__btn--primary multi-rename-button-run">
        <i class="fa-solid fa-pencil"></i><span>Rename</span>
      </button>
    </footer>
  `;

  document.querySelector("body").append(popup);
  popup.classList.add("popup-enter");
  $(".multi-rename-newname").focus();

  document.querySelectorAll(".multi-rename-input").forEach((input) => {
    input.addEventListener("focus", () => {
      IsInputFocused = true;
    });
    input.addEventListener("blur", () => {
      IsInputFocused = false;
    });
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
    });
    input.addEventListener("keyup", async (e) => {
      e.stopPropagation();
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
    });
  });

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
  scheduleDiskUsageRefresh();
}

function closeMultiRenamePopup() {
  let popup = document.querySelector(".multi-rename-popup");
  if (popup) {
    popup.classList.add("popup-exit");
    safeAnimationEnd(popup, () => {
      popup?.remove();
      IsPopUpOpen = false;
      IsInputFocused = false;
    });
  } else {
    IsPopUpOpen = false;
    IsInputFocused = false;
  }
}

async function closeItemPreview() {
  $(".item-preview-popup").fadeOut(200, () => {
    $(".item-preview-popup")?.remove();
  });
  let propsPopup = document.querySelector(".item-properties-popup");
  if (propsPopup) {
    propsPopup.classList.add("popup-exit");
    safeAnimationEnd(propsPopup, () => propsPopup?.remove());
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

let activeFtpTab = "discovered";

function switchFtpTab(tabName) {
  activeFtpTab = tabName;
  $(".ftp-tab-btn").removeClass("active");
  $(`.ftp-tab-btn[data-target="${tabName}"]`).addClass("active");

  if (tabName === "discovered") {
    $(".ftp-discovery-section").css("display", "flex");
    $(".ftp-saved-section").css("display", "none");
  } else {
    $(".ftp-discovery-section").css("display", "none");
    $(".ftp-saved-section").css("display", "flex");
  }
}

async function showFtpConfig() {
  if (IsPopUpOpen == false) {
    let popup = document.querySelector(".ftp-connect-container");
    popup.style.display = "flex";
    popup.classList.add("popup-enter");
    IsPopUpOpen = true;
    IsDisableShortcuts = true;
    IsInputFocused = true;

    // Reset Save Profile checkbox when opening the modal
    $("#ftp-save-checkbox").prop("checked", false);

    document.querySelectorAll(".ftp-popup-input").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
      });
      input.addEventListener("keyup", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          connectToFtp();
        }
      });
      input.addEventListener("focus", () => {
        IsInputFocused = true;
      });
      input.addEventListener("blur", () => {
        IsInputFocused = false;
      });
    });

    // Reset FTP Tabs on open
    switchFtpTab("discovered");

    // Automatically trigger FTP Discovery and load Saved Profiles when opening the modal
    startFtpDiscovery();
    loadSavedFtpConnections();
  }
}

let isFtpScanning = false;

async function startFtpDiscovery(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (isFtpScanning) return;
  isFtpScanning = true;

  const refreshBtn = $(".ftp-discovery-refresh-btn");
  const listContainer = $(".ftp-discovery-list");

  refreshBtn.addClass("scanning");
  $(".ftp-discovery-section").removeClass("is-empty");

  // Show premium glassmorphic loader
  listContainer.html(`
    <div class="ftp-discovery-loader">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>Scanning local network for active FTP hosts...</span>
    </div>
  `);

  try {
    const servers = await invoke("discover_ftp_servers");
    if (!servers || servers.length === 0) {
      $(".ftp-discovery-section").addClass("is-empty");
      listContainer.html(`
        <div class="ftp-discovery-empty">
          <i class="fa-solid fa-satellite-dish"></i>
          <span>No active FTP servers detected on local subnet</span>
        </div>
      `);
    } else {
      $(".ftp-discovery-section").removeClass("is-empty");
      let listHtml = "";
      servers.forEach((server) => {
        const name = escapeHtml(server.name || "");
        const host = escapeHtml(server.hostname || "");
        const port = parseInt(server.port) || 21;
        const nameEscaped = name.replace(/'/g, "\\'");
        listHtml += `
          <div class="ftp-discovery-item" onclick="selectDiscoveredServer(event, '${nameEscaped}', '${host}', ${port})">
            <div class="ftp-discovery-item-info">
              <span class="ftp-discovery-item-name">${name}</span>
              <span class="ftp-discovery-item-host">
                <i class="fa-solid fa-network-wired"></i> ${host}:${port}
              </span>
            </div>
            <div class="ftp-discovery-item-action">
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </div>
        `;
      });
      listContainer.html(listHtml);
    }
  } catch (error) {
    console.error("FTP Discovery failed:", error);
    $(".ftp-discovery-section").addClass("is-empty");
    listContainer.html(`
      <div class="ftp-discovery-empty">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--errorColor);"></i>
        <span>Scan failed: ${escapeHtml(error.toString())}</span>
      </div>
    `);
  } finally {
    isFtpScanning = false;
    refreshBtn.removeClass("scanning");
  }
}

function selectDiscoveredServer(event, name, host, port) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  $(".ftp-dirname-input").val(name);
  $(".ftp-hostname-input").val(host);
  $(".ftp-port-input").val(port);

  // Cursor-focus the Username input field as specified
  const userField = $(".ftp-username-input");
  userField.focus();
  IsInputFocused = true;
}

async function loadSavedFtpConnections() {
  const savedSection = $(".ftp-saved-section");
  const listContainer = $(".ftp-saved-list");

  try {
    const connections = await invoke("get_saved_ftp_connections");
    if (!connections || connections.length === 0) {
      listContainer.html(`
        <div class="ftp-discovery-empty">
          <i class="fa-solid fa-bookmark"></i>
          <span>No saved FTP profiles yet</span>
        </div>
      `);
    } else {
      let listHtml = "";
      connections.forEach((conn) => {
        const name = escapeHtml(conn.name || "");
        const host = escapeHtml(conn.hostname || "");
        const port = parseInt(conn.port) || 21;
        const user = escapeHtml(conn.username || "");
        const path = escapeHtml(conn.remote_path || "/");

        const nameEscaped = name.replace(/'/g, "\\'");
        const hostEscaped = host.replace(/'/g, "\\'");
        const userEscaped = user.replace(/'/g, "\\'");
        const passwordEscaped = (conn.password || "").replace(/'/g, "\\'");
        const pathEscaped = path.replace(/'/g, "\\'");

        listHtml += `
          <div class="ftp-saved-item" onclick="selectSavedConnection(event, '${nameEscaped}', '${hostEscaped}', ${port}, '${userEscaped}', '${passwordEscaped}', '${pathEscaped}')">
            <div class="ftp-saved-item-info">
              <span class="ftp-saved-item-name">${name}</span>
              <span class="ftp-saved-item-host">
                <i class="fa-solid fa-network-wired"></i> ${host}:${port} (${user})
              </span>
            </div>
            <div class="ftp-saved-item-actions">
              <button class="ftp-delete-saved-btn" title="Delete Saved Profile" onclick="deleteSavedConnection(event, '${nameEscaped}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
              <i class="fa-solid fa-chevron-right"></i>
            </div>
          </div>
        `;
      });
      listContainer.html(listHtml);
    }
  } catch (error) {
    console.error("Failed to load saved FTP connections:", error);
    listContainer.html(`
      <div class="ftp-discovery-empty">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--errorColor);"></i>
        <span>Failed to load: ${escapeHtml(error.toString())}</span>
      </div>
    `);
  } finally {
    // Ensure display states are in-sync with current tab choice
    if (activeFtpTab === "saved") {
      savedSection.css("display", "flex");
      $(".ftp-discovery-section").css("display", "none");
    } else {
      savedSection.css("display", "none");
      $(".ftp-discovery-section").css("display", "flex");
    }
  }
}

function selectSavedConnection(event, name, host, port, username, password, remotePath) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  $(".ftp-dirname-input").val(name);
  $(".ftp-hostname-input").val(host);
  $(".ftp-port-input").val(port);
  $(".ftp-username-input").val(username);
  $(".ftp-password-input").val(password);
  $(".ftp-path-input").val(remotePath);

  // Check the Save Profile checkbox to maintain/overwrite credentials easily
  $("#ftp-save-checkbox").prop("checked", true);

  // Focus the Password input field as specified
  const passwordField = $(".ftp-password-input");
  passwordField.focus();
  IsInputFocused = true;
}

async function deleteSavedConnection(event, name) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    await invoke("delete_saved_ftp_connection", { name: name });
    showToast(`Deleted profile "${name}"`, ToastType.SUCCESS);
    await loadSavedFtpConnections();
    await insertSiteNavButtons();
  } catch (error) {
    console.error("Failed to delete saved connection:", error);
    showToast("Failed to delete profile: " + error, ToastType.ERROR);
  }
}

function showFtpLoader(paneSide) {
  const loaderHtml = `
    <div class="dir-preloader-container">
      <div class="preloader-invert"></div>
      <div style="margin-top: 15px; font-size: 13px; color: var(--textColor2); font-weight: 500; letter-spacing: 0.3px;">
        Loading FTP directory...
      </div>
    </div>
  `;
  if (IsDualPaneEnabled) {
    if (paneSide === "left") {
      $(".dual-pane-left").html(loaderHtml);
    } else if (paneSide === "right") {
      $(".dual-pane-right").html(loaderHtml);
    } else {
      $(".dual-pane-left").html(loaderHtml);
      $(".dual-pane-right").html(loaderHtml);
    }
  } else {
    if (ViewMode === "miller") {
      if (typeof CurrentMillerCol !== "undefined" && CurrentMillerCol) {
        $(".miller-col-" + CurrentMillerCol).html(loaderHtml);
      } else {
        $(".miller-container").html(loaderHtml);
      }
    } else {
      $(".non-dual-pane-container").html(loaderHtml);
    }
  }
}

function hideFtpLoader(paneSide) {
  if (IsDualPaneEnabled) {
    if (paneSide === "left") {
      $(".dual-pane-left").find(".dir-preloader-container").remove();
    } else if (paneSide === "right") {
      $(".dual-pane-right").find(".dir-preloader-container").remove();
    } else {
      $(".dual-pane-left").find(".dir-preloader-container").remove();
      $(".dual-pane-right").find(".dir-preloader-container").remove();
    }
  } else {
    if (ViewMode === "miller") {
      if (typeof CurrentMillerCol !== "undefined" && CurrentMillerCol) {
        $(".miller-col-" + CurrentMillerCol).find(".dir-preloader-container").remove();
      }
      $(".miller-container").find(".dir-preloader-container").remove();
    } else {
      $(".non-dual-pane-container").find(".dir-preloader-container").remove();
    }
  }
}

function closeFtpConfig() {
  let popup = document.querySelector(".ftp-connect-container");
  popup.classList.add("popup-exit");
  safeAnimationEnd(popup, () => {
    popup.style.display = "none";
    popup.classList.remove("popup-exit");
  });
  $(".ftp-loader").css("display", "none");
  IsPopUpOpen = false;
  IsDisableShortcuts = false;
  IsInputFocused = false;
}

async function connectToFtp() {
  let hostname = ($(".ftp-hostname-input").val() || "").trim();
  let username = ($(".ftp-username-input").val() || "").trim();
  let password = $(".ftp-password-input").val(); // Keep spaces in password
  let remotePath = ($(".ftp-path-input").val() || "").trim();
  let name = ($(".ftp-dirname-input").val() || "").trim();
  let port = ($(".ftp-port-input").val() || "").trim() || "21";

  $(".ftp-loader").css("display", "flex");
  await openFTP(hostname, username, password, remotePath, name, port);
}

async function openFTP(
  hostname,
  username,
  password,
  remotePath = "/",
  name = "",
  port = 21
) {
  try {
    const trimmedHostname = (hostname || "").trim();
    const trimmedUsername = (username || "").trim();
    const trimmedRemotePath = (remotePath || "").trim();
    const trimmedName = (name || "").trim();
    const parsedPort = parseInt(port) || 21;

    const result = await invoke("connect_ftp", {
      config: {
        name: trimmedName,
        hostname: trimmedHostname,
        port: parsedPort,
        username: trimmedUsername,
        password: password,
        remote_path: trimmedRemotePath || "/"
      }
    });
    showToast(result, ToastType.SUCCESS);

    // Save profile if the checkbox is checked and connection succeeded
    if ($("#ftp-save-checkbox").is(":checked")) {
      try {
        await invoke("save_ftp_connection", {
          config: {
            name: trimmedName,
            hostname: trimmedHostname,
            port: parsedPort,
            username: trimmedUsername,
            password: password,
            remote_path: trimmedRemotePath || "/"
          }
        });
      } catch (err) {
        console.error("Failed to save FTP profile:", err);
      }
    }

    await insertSiteNavButtons();
    await openDirAndSwitch(`ftp://${trimmedName}${trimmedRemotePath || "/"}`);
  } catch (error) {
    console.error(error);
    showToast("Failed to connect to FTP: " + error, ToastType.ERROR);
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
        CurrentSortMethod = "size";
        CurrentSortAscending = true;
      } else {
        arr.sort((a, b) => {
          return parseInt(b.size) - parseInt(a.size);
        });
        IsFilteredBySize = true;
        CurrentSortMethod = "size";
        CurrentSortAscending = false;
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
        CurrentSortMethod = "name";
        CurrentSortAscending = false;
      } else {
        arr.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
        IsFilteredByName = true;
        CurrentSortMethod = "name";
        CurrentSortAscending = true;
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
        CurrentSortMethod = "date";
        CurrentSortAscending = true;
      } else {
        arr.sort((a, b) => {
          return new Date(b.last_modified) - new Date(a.last_modified);
        });
        IsFilteredByDate = true;
        CurrentSortMethod = "date";
        CurrentSortAscending = false;
      }
    }
    await showItems(arr, SelectedItemPaneSide || "", CurrentMillerCol || 1, true);
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

const BuiltInThemes = {
  "Default Dark": {
    name: "Default Dark",
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
    sidebar_top_blur_overlay_color: "rgb(45, 47, 57)",
    select_color2: "rgba(11, 100, 253, 0.75)",
    select_color3: "rgba(11, 100, 253, 0.25)"
  },
  "Default Light": {
    name: "Default Light",
    primary_color: "#cbd0df",
    secondary_color: "rgba(244, 245, 248, 1)",
    tertiary_color: "#d0d4e3",
    text_color: "rgba(30, 30, 35, 0.9)",
    text_color2: "rgba(30, 30, 35, 0.6)",
    text_color3: "rgb(20, 20, 25)",
    transparent_color: "rgba(0, 0, 0, 0.05)",
    transparent_color_active: "rgba(0, 0, 0, 0.12)",
    site_bar_color: "rgb(230, 232, 238)",
    nav_bar_color: "rgba(220, 222, 228, 0.5)",
    sidebar_top_blur_overlay_color: "rgb(230, 232, 238)",
    select_color2: "rgba(11, 100, 253, 0.75)",
    select_color3: "rgba(11, 100, 253, 0.25)"
  }
};

let LoadedUserThemes = [];
let OriginalThemeBackup = null;

function hexToRgba(hex, alpha) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRgbComponents(colorStr) {
  let tempEl = document.createElement("div");
  tempEl.style.color = colorStr;
  document.body.appendChild(tempEl);
  let computedColor = window.getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);

  let match = computedColor.match(/\d+(\.\d+)?/g);
  if (match && match.length >= 3) {
    return {
      r: parseInt(match[0]),
      g: parseInt(match[1]),
      b: parseInt(match[2]),
      a: match[3] !== undefined ? parseFloat(match[3]) : 1.0
    };
  }
  return { r: 0, g: 0, b: 0, a: 1.0 };
}

function parseCssColor(colorStr) {
  let comps = getRgbComponents(colorStr);
  let r = comps.r.toString(16).padStart(2, "0");
  let g = comps.g.toString(16).padStart(2, "0");
  let b = comps.b.toString(16).padStart(2, "0");
  return {
    hex: `#${r}${g}${b}`,
    alpha: comps.a
  };
}

const DefaultIconColors = {
  "Minimalist Outline": "var(--textColor2)",
  "Golden Luxury": "#d4af37",
  "Lucide Default": "#6E6E80"
};

function initIconColorSettings() {
  let activeIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
  
  if (activeIconTheme === "Prestige Glass") {
    $(".icon-color-controls").css("display", "none");
    $(".icon-color-na-message").css("display", "block");
  } else {
    $(".icon-color-controls").css("display", "flex");
    $(".icon-color-na-message").css("display", "none");
    
    let customColor = localStorage.getItem("icon-color-" + activeIconTheme);
    let defaultColor = DefaultIconColors[activeIconTheme] || "var(--textColor2)";
    
    let displayColor = customColor || defaultColor;
    if (displayColor.startsWith("var(")) {
      displayColor = getComputedStyle(document.documentElement).getPropertyValue(displayColor.replace("var(", "").replace(")", "")).trim();
    }
    
    let hexColor = convertToHex(displayColor);
    
    $(".icon-accent-color-picker").val(hexColor);
    $(".icon-accent-color-text").val(customColor || hexColor);
  }
  
  updateIconThemePreviews();
}

function applyCustomIconColor(color) {
  let activeIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
  if (activeIconTheme === "Prestige Glass") return;
  
  let cleanedColor = color.trim();
  if (!cleanedColor) return;
  
  localStorage.setItem("icon-color-" + activeIconTheme, cleanedColor);
  
  let hexColor = convertToHex(cleanedColor);
  if (hexColor.startsWith("#") && hexColor.length === 7) {
    $(".icon-accent-color-picker").val(hexColor);
  }
  $(".icon-accent-color-text").val(cleanedColor);
  
  updateIconThemePreviews();
  
  if (IsDualPaneEnabled) {
    refreshBothViews(SelectedItemPaneSide);
  } else {
    listDirectories();
  }
}

function resetCustomIconColor() {
  let activeIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
  if (activeIconTheme === "Prestige Glass") return;
  
  localStorage.removeItem("icon-color-" + activeIconTheme);
  
  initIconColorSettings();
  
  if (IsDualPaneEnabled) {
    refreshBothViews(SelectedItemPaneSide);
  } else {
    listDirectories();
  }
}

function updateIconThemePreviews() {
  document.querySelectorAll(".icon-theme-card").forEach(card => {
    let themeName = card.getAttribute("data-theme");
    let customColor = localStorage.getItem("icon-color-" + themeName);
    
    let folderIcon = card.querySelector(".icon-preview-row i.fa-folder, .icon-preview-row i.fa-folder-open, .icon-preview-row i.icon-folder, .icon-preview-row img[src*='folder']");
    let fileCodeIcon = card.querySelector(".icon-preview-row i.fa-file-code, .icon-preview-row i.fa-code, .icon-preview-row i.icon-file-code, .icon-preview-row img[src*='code']");
    let fileImageIcon = card.querySelector(".icon-preview-row i.fa-file-image, .icon-preview-row i.icon-image, .icon-preview-row img[src*='img']");

    if (customColor) {
      if (folderIcon) {
        if (folderIcon.tagName !== "IMG") {
          folderIcon.style.color = customColor;
          if (themeName === "Golden Luxury") {
            folderIcon.style.setProperty("--glow-color", hexToRgba(customColor, 0.4));
            folderIcon.style.filter = `drop-shadow(0 0 6px ${hexToRgba(customColor, 0.4)})`;
          } else {
            folderIcon.style.filter = "none";
          }
        }
      }
      
      if (themeName === "Minimalist Outline" || themeName === "Lucide Default") {
        if (fileCodeIcon) fileCodeIcon.style.color = customColor;
        if (fileImageIcon) fileImageIcon.style.color = customColor;
      }
    } else {
      if (themeName === "Minimalist Outline") {
        if (folderIcon) folderIcon.style.color = "var(--textColor2)";
        if (fileCodeIcon) fileCodeIcon.style.color = "var(--textColor2)";
        if (fileImageIcon) fileImageIcon.style.color = "var(--textColor2)";
      } else if (themeName === "Golden Luxury") {
        if (folderIcon) {
          folderIcon.style.color = "#d4af37";
          folderIcon.style.filter = "drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))";
        }
      } else if (themeName === "Lucide Default") {
        if (folderIcon) {
          folderIcon.style.color = "#6E6E80";
          folderIcon.style.filter = "none";
        }
      }
    }
  });
}

function selectIconTheme(themeName) {
  // Update visual selection highlights in settings cards
  document.querySelectorAll(".icon-theme-card").forEach(card => {
    if (card.getAttribute("data-theme") === themeName) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  // Save selection
  localStorage.setItem("current-icon-theme", themeName);

  // Initialize color controls for the newly active icon theme
  initIconColorSettings();

  // Recalculate dynamic CSS variables for correct size weight scaling
  let savedScale = localStorage.getItem("current-icon-scale") || "100";
  changeIconSize(savedScale);

  // Apply immediately by refreshing directory contents
  if (IsDualPaneEnabled) {
    refreshBothViews(SelectedItemPaneSide);
  } else {
    listDirectories();
  }
}

function changeIconSize(scalePercent) {
  let scale = parseInt(scalePercent) / 100;

  // Set visual scale indicator text
  const indicator = document.getElementById("icon-size-value");
  if (indicator) {
    indicator.textContent = scalePercent + "%";
  }

  // Save scale to localStorage
  localStorage.setItem("current-icon-scale", scalePercent);

  // Check if current active icon theme is a Lucide theme
  let currentIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
  let isLucideTheme = currentIconTheme === "Lucide Default";

  // Determine base sizes with premium boosts for default PG and LD
  let baseListIcon = 24;
  let baseMillerIcon = 18;
  let baseGridIcon = 56;

  if (currentIconTheme === "Prestige Glass" || currentIconTheme === "Lucide Default") {
    baseListIcon = 28;
    baseMillerIcon = 21;
    baseGridIcon = 64;
  }

  // Boost base font size for thin outline vectors (Lucide) to align visual presence with solid vectors
  let baseListVector = isLucideTheme ? 17 : 13;
  let baseMillerVector = isLucideTheme ? 13 : 10;
  let baseGridVector = isLucideTheme ? 36 : 28;

  if (currentIconTheme === "Lucide Default") {
    baseListVector = 21;
    baseMillerVector = 16;
    baseGridVector = 44;
  }

  // Update dynamic CSS variables on :root
  let r = document.querySelector(":root");
  r.style.setProperty("--listIconSize", (baseListIcon * scale) + "px");
  r.style.setProperty("--listVectorFontSize", (baseListVector * scale) + "px");
  r.style.setProperty("--millerIconSize", (baseMillerIcon * scale) + "px");
  r.style.setProperty("--millerVectorFontSize", (baseMillerVector * scale) + "px");
  r.style.setProperty("--gridIconSize", (baseGridIcon * scale) + "px");
  r.style.setProperty("--gridVectorFontSize", (baseGridVector * scale) + "px");
}

function checkColorMode(appConfig) {
  var r = document.querySelector(":root");
  let activeThemeName = CurrentTheme || "Default Dark";

  // Find theme by name (either built-in or user-created loaded from backend)
  let activeTheme = BuiltInThemes[activeThemeName];
  if (!activeTheme && LoadedUserThemes) {
    activeTheme = LoadedUserThemes.find(t => t.name === activeThemeName);
  }

  // Fallback to Default Dark
  if (!activeTheme) {
    activeTheme = BuiltInThemes["Default Dark"];
  }

  r.style.setProperty("--primaryColor", activeTheme.primary_color);
  r.style.setProperty("--secondaryColor", activeTheme.secondary_color);
  r.style.setProperty("--tertiaryColor", activeTheme.tertiary_color);
  r.style.setProperty("--transparentColor", activeTheme.transparent_color);
  r.style.setProperty("--transparentColorActive", activeTheme.transparent_color_active);
  r.style.setProperty("--textColor", activeTheme.text_color);
  r.style.setProperty("--textColor2", activeTheme.text_color2);
  r.style.setProperty("--textColor3", activeTheme.text_color3.replace(/"/g, ""));
  r.style.setProperty("--siteBarColor", activeTheme.site_bar_color);
  r.style.setProperty("--sidebarTopBlurOverlayColor", activeTheme.sidebar_top_blur_overlay_color || activeTheme.site_bar_color);
  r.style.setProperty("--navBarColor", activeTheme.nav_bar_color);

  // Set custom selection accent colors
  r.style.setProperty("--selectColor2", activeTheme.select_color2 || "rgba(11, 100, 253, 0.75)");
  r.style.setProperty("--selectColor3", activeTheme.select_color3 || "rgba(11, 100, 253, 0.25)");

  // Update styling variables for glassmorphism popups to adapt perfectly to dark vs light mode!
  let isLight = !activeThemeName.toLowerCase().includes("dark") &&
                 (activeTheme.text_color.includes("rgba(30") ||
                  activeTheme.text_color.includes("#1e") ||
                  activeTheme.text_color.includes("rgba(0") ||
                  activeTheme.text_color.includes("#32") ||
                  activeTheme.text_color.startsWith("#0") ||
                  activeTheme.text_color.startsWith("#1") ||
                  activeTheme.text_color.startsWith("#2"));
  if (isLight) {
    r.style.setProperty("--glass-bg", "rgba(255, 255, 255, 0.7)");
    r.style.setProperty("--glass-header-bg", "rgba(240, 240, 245, 0.85)");
    r.style.setProperty("--glass-shadow", "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06)");
    r.style.setProperty("--glass-border", "1px solid rgba(0, 0, 0, 0.08)");
    r.style.setProperty("--glass-border-subtle", "1px solid rgba(0, 0, 0, 0.05)");
    document.body.classList.add("light-mode");
  } else {
    r.style.setProperty("--glass-bg", "color-mix(in srgb, var(--primaryColor) 85%, transparent)");
    r.style.setProperty("--glass-header-bg", "color-mix(in srgb, var(--secondaryColor) 80%, transparent)");
    r.style.setProperty("--glass-shadow", "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 0.5px 0 rgba(255, 255, 255, 0.06)");
    r.style.setProperty("--glass-border", "1px solid color-mix(in srgb, var(--tertiaryColor) 50%, transparent)");
    r.style.setProperty("--glass-border-subtle", "1px solid color-mix(in srgb, var(--tertiaryColor) 35%, transparent)");
    document.body.classList.remove("light-mode");
  }
}

async function applyTheme(themeName) {
  CurrentTheme = themeName;
  checkColorMode();
}

async function applyThemeFromSelect() {
  let themeName = $(".theme-select").val();
  CurrentTheme = themeName;
  checkColorMode();

  // Toggle delete/edit button visibility based on whether the theme is built-in
  if (BuiltInThemes[CurrentTheme]) {
    $(".delete-theme-btn").css("display", "none");
    $(".edit-theme-btn").css("display", "none");
  } else {
    $(".delete-theme-btn").css("display", "block");
    $(".edit-theme-btn").css("display", "block");
  }

  await saveConfig(false, false);
}

function openThemeCreator() {
  $("#theme-creator-popup").css("display", "flex");
  IsPopUpOpen = true;
  IsDisableShortcuts = true;

  // Backup currently active theme in case they click cancel
  OriginalThemeBackup = CurrentTheme;
  IsEditingTheme = false;

  $("#theme-creator-title").text("Create Theme");
  $(".theme-name-input").val("");

  // Initialize pickers and inputs with the currently active theme's colors
  let activeThemeName = CurrentTheme || "Default Dark";
  let activeTheme = BuiltInThemes[activeThemeName] || LoadedUserThemes.find(t => t.name === activeThemeName) || BuiltInThemes["Default Dark"];

  setThemeCreatorColorRow("primary-color", activeTheme.primary_color, "--primaryColor");
  setThemeCreatorColorRow("secondary-color", activeTheme.secondary_color, "--secondaryColor");
  setThemeCreatorColorRow("tertiary-color", activeTheme.tertiary_color, "--tertiaryColor");
  setThemeCreatorColorRow("accent-color", activeTheme.select_color2 || "rgba(11, 100, 253, 0.75)", "--selectColor2");
  setThemeCreatorColorRow("text-color", activeTheme.text_color, "--textColor");
  setThemeCreatorColorRow("text-color2", activeTheme.text_color2, "--textColor2");
  setThemeCreatorColorRow("text-color3", activeTheme.text_color3, "--textColor3");
  setThemeCreatorColorRow("sitebar-color", activeTheme.site_bar_color, "--siteBarColor");
  setThemeCreatorColorRow("navbar-color", activeTheme.nav_bar_color, "--navBarColor");
}

function editActiveTheme() {
  let activeThemeName = $(".theme-select").val();
  if (BuiltInThemes[activeThemeName]) {
    return; // Built-in themes are read-only
  }

  let activeTheme = LoadedUserThemes.find(t => t.name === activeThemeName);
  if (!activeTheme) return;

  $("#theme-creator-popup").css("display", "flex");
  IsPopUpOpen = true;
  IsDisableShortcuts = true;

  OriginalThemeBackup = CurrentTheme;
  IsEditingTheme = true;
  ThemeToEditOriginalName = activeThemeName;

  $("#theme-creator-title").text("Edit Theme");
  $(".theme-name-input").val(activeTheme.name);

  setThemeCreatorColorRow("primary-color", activeTheme.primary_color, "--primaryColor");
  setThemeCreatorColorRow("secondary-color", activeTheme.secondary_color, "--secondaryColor");
  setThemeCreatorColorRow("tertiary-color", activeTheme.tertiary_color, "--tertiaryColor");
  setThemeCreatorColorRow("accent-color", activeTheme.select_color2 || "rgba(11, 100, 253, 0.75)", "--selectColor2");
  setThemeCreatorColorRow("text-color", activeTheme.text_color, "--textColor");
  setThemeCreatorColorRow("text-color2", activeTheme.text_color2, "--textColor2");
  setThemeCreatorColorRow("text-color3", activeTheme.text_color3, "--textColor3");
  setThemeCreatorColorRow("sitebar-color", activeTheme.site_bar_color, "--siteBarColor");
  setThemeCreatorColorRow("navbar-color", activeTheme.nav_bar_color, "--navBarColor");
}

function setThemeCreatorColorRow(cssClass, colorVal, varName) {
  let parsed = parseCssColor(colorVal);

  $(`.theme-${cssClass}`).val(parsed.hex);
  $(`.theme-${cssClass}-text`).val(colorVal);
  $(`.theme-${cssClass}-opacity`).val(parsed.alpha);
  $(`.theme-${cssClass}-opacity-val`).text(parsed.alpha.toFixed(2));

  const updateFromControls = () => {
    let hex = $(`.theme-${cssClass}`).val();
    let alpha = parseFloat($(`.theme-${cssClass}-opacity`).val());
    $(`.theme-${cssClass}-opacity-val`).text(alpha.toFixed(2));

    let combinedColor = hex;
    if (alpha < 1) {
      combinedColor = hexToRgba(hex, alpha);
    }

    $(`.theme-${cssClass}-text`).val(combinedColor);
    previewThemeColor(varName, combinedColor);
  };

  $(`.theme-${cssClass}`).off("input").on("input", updateFromControls);
  $(`.theme-${cssClass}-opacity`).off("input").on("input", updateFromControls);

  $(`.theme-${cssClass}-text`).off("input").on("input", function() {
    let newVal = this.value.trim();
    if (!newVal) return;

    let parsed = parseCssColor(newVal);
    $(`.theme-${cssClass}`).val(parsed.hex);
    $(`.theme-${cssClass}-opacity`).val(parsed.alpha);
    $(`.theme-${cssClass}-opacity-val`).text(parsed.alpha.toFixed(2));

    previewThemeColor(varName, newVal);
  });
}

function convertToHex(colorStr) {
  if (colorStr.startsWith("#")) return colorStr;
  if (colorStr.startsWith("rgb")) {
    let parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      let r = parseInt(parts[0]).toString(16).padStart(2, "0");
      let g = parseInt(parts[1]).toString(16).padStart(2, "0");
      let b = parseInt(parts[2]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  return "#000000";
}

function previewThemeColor(varName, val) {
  document.documentElement.style.setProperty(varName, val);
  if (varName === "--primaryColor") {
    document.documentElement.style.setProperty("--glass-bg", `color-mix(in srgb, ${val} 85%, transparent)`);
  }
  if (varName === "--selectColor2") {
    let comps = getRgbComponents(val);
    let val3 = `rgba(${comps.r}, ${comps.g}, ${comps.b}, 0.25)`;
    document.documentElement.style.setProperty("--selectColor3", val3);
  }
}

function previewThemeColorText(varName, val) {
  previewThemeColor(varName, val);
}

function closeThemeCreator() {
  $("#theme-creator-popup").css("display", "none");
  IsPopUpOpen = false;
  IsDisableShortcuts = false;

  // Restore original theme since they canceled
  if (OriginalThemeBackup) {
    CurrentTheme = OriginalThemeBackup;
    checkColorMode();
  }
}

async function saveCustomTheme() {
  let name = $(".theme-name-input").val().trim();
  if (!name) {
    alert("Please enter a theme name");
    return;
  }

  // Only check conflicts if not editing the original theme name
  if ((!IsEditingTheme || name !== ThemeToEditOriginalName) && BuiltInThemes[name]) {
    alert("Theme name conflicts with a built-in theme. Please choose a different name.");
    return;
  }

  let selectColor2Val = $(".theme-accent-color-text").val().trim();
  let comps = getRgbComponents(selectColor2Val);
  let selectColor3Val = `rgba(${comps.r}, ${comps.g}, ${comps.b}, 0.25)`;

  let newTheme = {
    name: name,
    primary_color: $(".theme-primary-color-text").val().trim(),
    secondary_color: $(".theme-secondary-color-text").val().trim(),
    tertiary_color: $(".theme-tertiary-color-text").val().trim(),
    text_color: $(".theme-text-color-text").val().trim(),
    text_color2: $(".theme-text-color2-text").val().trim(),
    text_color3: $(".theme-text-color3-text").val().trim(),
    transparent_color: "rgba(0, 0, 0, 0.15)",
    transparent_color_active: "rgba(0, 0, 0, 0.25)",
    site_bar_color: $(".theme-sitebar-color-text").val().trim(),
    nav_bar_color: $(".theme-navbar-color-text").val().trim(),
    sidebar_top_blur_overlay_color: $(".theme-sitebar-color-text").val().trim(),
    select_color2: selectColor2Val,
    select_color3: selectColor3Val
  };

  try {
    // If editing and renamed, delete the old file
    if (IsEditingTheme && name !== ThemeToEditOriginalName) {
      await invoke("delete_theme", { themeName: ThemeToEditOriginalName });
    }

    await invoke("save_theme", { theme: newTheme });
    showToast("Theme saved successfully!", ToastType.SUCCESS);

    CurrentTheme = name;
    $("#theme-creator-popup").css("display", "none");
    IsPopUpOpen = false;
    IsDisableShortcuts = false;

    await checkAppConfig();
    await saveConfig(false, false);
  } catch (err) {
    alert("Failed to save custom theme: " + err);
  }
}

async function deleteActiveTheme() {
  let activeThemeName = $(".theme-select").val();
  if (BuiltInThemes[activeThemeName]) {
    alert("Cannot delete built-in default themes.");
    return;
  }
  const confirmed = await confirm(`Are you sure you want to delete the custom theme "${activeThemeName}"?`);
  if (!confirmed) {
    return;
  }

  try {
    await invoke("delete_theme", { themeName: activeThemeName });
    showToast("Theme deleted successfully!", ToastType.SUCCESS);

    CurrentTheme = "Default Dark";
    await checkAppConfig();
    await saveConfig(true, false);
  } catch (err) {
    alert("Failed to delete theme: " + err);
  }
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



async function cancelOperation() {
  await invoke("cancel_operation");
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
  const path = button.dataset.itempath || button.getAttribute("itempath") || "";
  const format = mount?.format || button.getAttribute("itemformat") || "";
  const isFtp = (format && format.includes("FTP")) || path.startsWith("ftp://");

  let displayName = displayDiskName(mount?.name);
  let nameLabel = button.querySelector(".disk-nav-name");
  if (nameLabel) nameLabel.textContent = displayName;

  if (isFtp) {
    button.title = `${displayName} • FTP`;
    let usageLabel = button.querySelector(".disk-nav-usage");
    let progressTrack = button.querySelector(".disk-nav-progress-track");
    let usageRow = button.querySelector(".disk-nav-usage-row");
    if (progressTrack) {
      progressTrack.remove();
    }
    if (!usageRow) {
      usageRow = document.createElement("span");
      usageRow.className = "disk-nav-usage-row";
      button.querySelector(".disk-nav-copy")?.append(usageRow);
    }
    if (!usageLabel) {
      usageLabel = document.createElement("span");
      usageLabel.className = "disk-nav-usage";
      usageRow.append(usageLabel);
    }
    usageLabel.textContent = "(FTP)";
  } else {
    let usedPercentage = getDiskUsedPercentage(mount).toFixed(2);
    let usageLabel = button.querySelector(".disk-nav-usage");
    let progressTrack = button.querySelector(".disk-nav-progress-track");
    let progressFill = button.querySelector(".disk-nav-progress-fill");
    let usageRow = button.querySelector(".disk-nav-usage-row");

    if (!usageRow) {
      usageRow = document.createElement("span");
      usageRow.className = "disk-nav-usage-row";
      button.querySelector(".disk-nav-copy")?.append(usageRow);
    }
    if (!usageLabel) {
      usageLabel = document.createElement("span");
      usageLabel.className = "disk-nav-usage";
      usageRow.append(usageLabel);
    }
    if (!progressTrack) {
      progressTrack = document.createElement("span");
      progressTrack.className = "disk-nav-progress-track";
      progressTrack.setAttribute("aria-hidden", "true");
      progressFill = document.createElement("span");
      progressFill.className = "disk-nav-progress-fill";
      progressTrack.append(progressFill);
      usageRow.append(progressTrack);
    }

    usageLabel.textContent = `${usedPercentage}%`;
    if (progressFill) progressFill.style.width = `${usedPercentage}%`;
    button.title = `${displayName} • ${usedPercentage}% used`;
  }
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
  diskButton.setAttribute("itemisdir", "1");
  diskButton.setAttribute("itemisdisk", "1");
  diskButton.setAttribute("itemname", name);
  const isRemovable = mount.is_removable == true || (mount.format && mount.format.includes("SSHFS")) || (mount.format && mount.format.includes("FTP")) ? "1" : "0";
  diskButton.setAttribute("itemisremovable", isRemovable);
  diskButton.setAttribute("itemformat", mount.format || "");
  diskButton.className = "site-nav-bar-button disk-site-nav-button";

  const isFtp = (mount.format && mount.format.includes("FTP")) || path.startsWith("ftp://");

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
  copy.append(nameLabel);

  const usageLabel = document.createElement("span");
  usageLabel.className = "disk-nav-usage";

  const usageRow = document.createElement("span");
  usageRow.className = "disk-nav-usage-row";

  if (isFtp) {
    diskButton.title = `${name} • FTP`;
    usageLabel.textContent = "(FTP)";
    usageRow.append(usageLabel);
    copy.append(usageRow);
  } else {
    diskButton.title = `${name} • ${usedPercentage}% used`;
    usageLabel.textContent = `${usedPercentage}%`;

    const progressTrack = document.createElement("span");
    progressTrack.className = "disk-nav-progress-track";
    progressTrack.setAttribute("aria-hidden", "true");

    const progressFill = document.createElement("span");
    progressFill.className = "disk-nav-progress-fill";
    progressFill.style.width = `${usedPercentage}%`;

    progressTrack.append(progressFill);
    usageRow.append(usageLabel, progressTrack);
    copy.append(usageRow);
  }

  diskButton.append(treeElbow, icon, copy);

  diskButton.onclick = async () => {
    await openDirAndSwitch(path);
    await listDirectories();
    markSelectedDisk(path);
  };

  diskButton.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    cdCtMenu.setSelectedItem(diskButton, e);
    cdCtMenu.show(e);
  };

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
    [
      "FTP",
      "",
      "fa-solid fa-server",
      showFtpConfig,
    ],
  ];

  for (let i = 0; i < siteNavButtons.length; i++) {
    if (siteNavButtons[i].length == 0) continue;
    let button = document.createElement("button");
    button.className = "site-nav-bar-button";
    button.innerHTML = `<i class="${siteNavButtons[i][2]}"></i> ${siteNavButtons[i][0]}`;
    button.setAttribute("itempath", siteNavButtons[i][1]);
    button.setAttribute("itemisdir", "1");
    button.setAttribute("itemname", siteNavButtons[i][0]);
    button.onclick = siteNavButtons[i][3];
    button.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cdCtMenu.setSelectedItem(button, e);
      cdCtMenu.show(e);
    };
    button.ondragover = (e) => {
      e.preventDefault();
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

    let favContainer = document.createElement("div");
    favContainer.className = "favorites-container";

    ArrFavorites.forEach((path) => {
      let button = document.createElement("button");
      button.className = "site-nav-bar-button-fav";
      let name = path.split(/[\\\/]/).pop() || path;
      button.setAttribute("itempath", path);
      button.setAttribute("itemisdir", "1");
      button.setAttribute("itemname", name);
      button.title = path;

      const treeElbow = document.createElement("span");
      treeElbow.className = "disk-tree-elbow";
      treeElbow.setAttribute("aria-hidden", "true");

      const icon = document.createElement("i");
      icon.className = "fa-solid fa-folder disk-nav-icon";
      icon.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.className = "disk-nav-copy";

      const nameLabel = document.createElement("span");
      nameLabel.className = "disk-nav-name";
      nameLabel.textContent = name;
      copy.append(nameLabel);

      button.append(treeElbow, icon, copy);

      button.onclick = async () => {
        await openDirAndSwitch(path);
        await listDirectories();
      };
      button.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cdCtMenu.setSelectedItem(button, e);
        cdCtMenu.show(e);
      };
      button.ondragover = (e) => {
        e.preventDefault();
        button.style.border = "1px solid var(--tertiaryColor)";
        button.style.backgroundColor = "var(--sidebarHover)";
        DraggedOverElement = button;
        MousePos = [e.clientX, e.clientY];
      };
      button.ondragleave = () => {
        button.style.border = "1px solid transparent";
        button.style.backgroundColor = "transparent";
      };
      favContainer.append(button);
    });

    favContent.append(favContainer);

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
  let isFtp = path && path.startsWith("ftp://");
  if (isFtp) {
    showFtpLoader(SelectedItemPaneSide);
  }
  try {
    const isSwitched = await invoke("open_dir", { path });
    if (isSwitched !== true) {
      alert("Could not open directory");
      if (isFtp) {
        hideFtpLoader(SelectedItemPaneSide);
      }
      return;
    }

    await configBackButton(CurrentDir);
    await setCurrentDir(path, "", false);
    await listDirectories();
    await unSelectAllItems();
  } catch (error) {
    console.error("openDirAndSwitch failed:", error);
    if (isFtp) {
      hideFtpLoader(SelectedItemPaneSide);
    }
  }
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
    safeAnimationEnd(popup, () => {
      popup?.remove();
      $(".popup-background").css("display", "none");
      $(".popup-background").css("opacity", "0");
      IsPopUpOpen = false;
    });
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

async function ejectFTP(disk) {
  try {
    const result = await invoke("eject_disk", { path: disk.path });
    showToast(result, ToastType.SUCCESS);
    await insertSiteNavButtons();
    if (IsShowDisks) {
      await listDisks();
    }
    const currentDir = await invoke("get_current_dir");
    if (currentDir.startsWith(disk.path)) {
      await goHome();
    }
  } catch (error) {
    showToast("Failed to disconnect FTP: " + error, ToastType.ERROR);
  }
}

async function configBackButton(path = "") {
  let button = document.querySelector(".go-back-button");
  button.setAttribute("itempath", path);
  button.ondragover = (e) => {
    e.preventDefault();
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

async function showDuplicateFinderPopup(path) {
  if (IsPopUpOpen !== false) return;

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  let fileName = path.split('/').pop() || path.split('\\').pop() || "Directory";

  const popup = document.createElement("div");
  popup.className = "duplicate-finder-popup props-card props-card--wide";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Duplicate Finder");
  popup.innerHTML = `
    <section class="props-card__hero" style="border-radius: var(--glass-radius) var(--glass-radius) 0 0;">
      <div class="props-card__thumb"><i class="fa-solid fa-copy"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(fileName)}">${escHtml(fileName)}</h2>
        <div class="props-card__meta">
          <span>Folder: ${escHtml(path)}</span>
        </div>
      </div>
    </section>

    <div class="duplicate-finder-actions-bar" style="display: none; padding: 10px 14px; gap: 8px; border-bottom: var(--glass-border-subtle); background: var(--glass-header-bg); align-items: center; flex-wrap: wrap;">
      <button class="props-card__btn props-card__btn--sm" id="btn-dup-select-newest" style="padding: 4px 10px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
        <i class="fa-solid fa-clock-rotate-left"></i><span>Keep Newest</span>
      </button>
      <button class="props-card__btn props-card__btn--sm" id="btn-dup-select-oldest" style="padding: 4px 10px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; background: none; border: 1px solid var(--tertiaryColor);">
        <i class="fa-solid fa-hourglass-start"></i><span>Keep Oldest</span>
      </button>
      <button class="props-card__btn props-card__btn--sm" id="btn-dup-deselect-all" style="padding: 4px 10px; font-size: 11px; background: none; border: 1px solid var(--tertiaryColor); cursor: pointer; display: flex; align-items: center; gap: 4px;">
        <i class="fa-solid fa-square-minus"></i><span>Deselect All</span>
      </button>
      <button class="props-card__btn props-card__btn--sm" id="btn-dup-rescan" style="padding: 4px 10px; font-size: 11px; background: none; border: 1px solid var(--tertiaryColor); cursor: pointer; margin-left: auto; display: flex; align-items: center; gap: 4px;">
        <i class="fa-solid fa-arrows-rotate"></i><span>Rescan</span>
      </button>
    </div>

    <div class="duplicate-finder-body" style="flex: 1 1 auto; overflow-y: auto; max-height: 520px; padding: 14px; display: flex; flex-direction: column; gap: 14px; border-bottom: var(--glass-border-subtle);">
      <!-- Rendered dynamically -->
    </div>

    <footer class="props-card__footer" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--glass-header-bg);">
      <div class="duplicate-reclaim-info" style="display: flex; flex-direction: column; gap: 2px;">
        <span id="dup-selected-count" style="font-size: 11px; opacity: 0.7;">Selected: 0 files</span>
        <span id="dup-reclaim-size" style="font-weight: 700; color: rgb(46, 204, 113); font-size: 13px;">Reclaimable: 0 Bytes</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="props-card__btn" data-dup-close style="cursor: pointer;">
          <i class="fa-solid fa-xmark"></i><span>Cancel</span>
        </button>
        <button class="props-card__btn props-card__btn--primary" id="btn-dup-stop-scan" style="display: none; background: rgba(220, 53, 69, 0.25); border-color: rgba(220, 53, 69, 0.4); box-shadow: 0 4px 10px rgba(220, 53, 69, 0.15); cursor: pointer;">
          <i class="fa-solid fa-stop" style="color: #ff6b6b;"></i><span>Stop Search</span>
        </button>
        <button class="props-card__btn props-card__btn--primary" id="btn-dup-delete" disabled style="opacity: 0.5; cursor: not-allowed;">
          <i class="fa-solid fa-trash"></i><span>Delete Selected</span>
        </button>
      </div>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1"));

  let selectedFilePaths = new Set();
  let filePathToSize = new Map();
  let currentDepthValue = 5;
  let currentUnlimitedChecked = false;
  let isSearching = false;

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatDate = (secs) => {
    if (!secs) return '';
    const d = new Date(secs * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const updateFooter = () => {
    let totalSize = 0;
    selectedFilePaths.forEach(file => {
      totalSize += filePathToSize.get(file) || 0;
    });

    popup.querySelector("#dup-selected-count").innerText = `Selected: ${selectedFilePaths.size} files`;
    popup.querySelector("#dup-reclaim-size").innerText = `Reclaimable: ${formatBytes(totalSize)}`;

    const deleteBtn = popup.querySelector("#btn-dup-delete");
    if (selectedFilePaths.size > 0) {
      deleteBtn.removeAttribute("disabled");
      deleteBtn.style.opacity = "1";
      deleteBtn.style.cursor = "pointer";
    } else {
      deleteBtn.setAttribute("disabled", "true");
      deleteBtn.style.opacity = "0.5";
      deleteBtn.style.cursor = "not-allowed";
    }
  };

  const closePopup = () => {
    IsPopUpOpen = false;
    if (isSearching) {
      invoke("cancel_duplicate_finder").catch(() => {});
    }
    popup.classList.add("popup-exit");
    $(".popup-background").css("opacity", "0");
    setTimeout(() => {
      $(".popup-background").css("display", "none");
    }, 150);
    safeAnimationEnd(popup, () => {
      popup.remove();
    });
  };

  popup.querySelectorAll("[data-dup-close]").forEach(el => {
    el.onclick = () => closePopup();
  });

  const stopScanBtn = popup.querySelector("#btn-dup-stop-scan");
  if (stopScanBtn) {
    stopScanBtn.onclick = async () => {
      try {
        await invoke("cancel_duplicate_finder");
      } catch (err) {
        showToast(`Failed to stop search: ${err}`, ToastType.ERROR);
      }
    };
  }

  popup.querySelector("#btn-dup-rescan").onclick = () => {
    renderSetupScreen();
  };

  const renderSetupScreen = () => {
    popup.querySelector(".duplicate-finder-actions-bar").style.display = "none";
    selectedFilePaths.clear();
    filePathToSize.clear();
    popup.querySelector("#dup-selected-count").innerText = "Selected: 0 files";
    popup.querySelector("#dup-reclaim-size").innerText = "Reclaimable: 0 Bytes";
    const deleteBtn = popup.querySelector("#btn-dup-delete");
    deleteBtn.setAttribute("disabled", "true");
    deleteBtn.style.opacity = "0.5";
    deleteBtn.style.cursor = "not-allowed";

    const cancelBtn = popup.querySelector("[data-dup-close]");
    const stopScanBtn = popup.querySelector("#btn-dup-stop-scan");
    if (cancelBtn) cancelBtn.style.display = "flex";
    if (deleteBtn) deleteBtn.style.display = "flex";
    if (stopScanBtn) stopScanBtn.style.display = "none";

    const body = popup.querySelector(".duplicate-finder-body");
    body.style.height = "";
    body.style.padding = "14px";
    body.style.position = "";
    body.innerHTML = `
      <div class="duplicate-finder-setup" style="display: flex; flex-direction: column; gap: 14px; padding: 18px 24px; align-items: center; justify-content: center; max-width: 440px; margin: 0 auto; width: 100%;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; margin-bottom: 0px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: color-mix(in srgb, var(--selectColor2) 15%, transparent); display: flex; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--selectColor2) 30%, transparent); margin-bottom: 2px; filter: drop-shadow(0 0 8px rgba(11, 100, 253, 0.25));">
            <i class="fa-solid fa-sliders" style="font-size: 18px; color: #4da3ff;"></i>
          </div>
          <h3 style="font-size: 14px; font-weight: 700; color: var(--textColor); letter-spacing: 0.5px;">Scan Configuration</h3>
          <p style="font-size: 11px; color: var(--textColor2); line-height: 1.4; max-width: 320px;">Configure directory recursion depth before starting search.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label for="dup-depth-input" style="font-size: 11px; font-weight: 600; color: var(--textColor3);">Search Depth Limit</label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; user-select: none; color: var(--textColor2);">
              <input type="checkbox" id="dup-depth-unlimited" ${currentUnlimitedChecked ? "checked" : ""} style="accent-color: var(--selectColor2); width: 14px; height: 14px; cursor: pointer;" />
              <span>Unlimited</span>
            </label>
          </div>

          <input type="number" id="dup-depth-input" min="1" value="${currentDepthValue}" class="props-card__input" style="width: 100%; padding: 8px 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--tertiaryColor); border-radius: 8px; color: var(--textColor); font-size: 13px; font-family: monospace; transition: all 0.2s;" />
          <span style="font-size: 10.5px; opacity: 0.5; line-height: 1.4; text-align: left;">Sets directory recursion depth. E.g., depth 1 scans only the root folder.</span>
        </div>

        <button class="props-card__btn props-card__btn--primary" id="btn-dup-start-scan" style="width: 100%; padding: 11px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; border-radius: 8px; margin-top: 2px; box-shadow: 0 4px 12px rgba(11, 100, 253, 0.25);">
          <i class="fa-solid fa-play"></i><span>Start Scanning</span>
        </button>
      </div>
    `;

    const depthInput = body.querySelector("#dup-depth-input");
    const unlimitedCb = body.querySelector("#dup-depth-unlimited");
    const startBtn = body.querySelector("#btn-dup-start-scan");

    const updateInputState = () => {
      if (unlimitedCb.checked) {
        depthInput.setAttribute("disabled", "true");
        depthInput.style.opacity = "0.4";
        depthInput.style.cursor = "not-allowed";
      } else {
        depthInput.removeAttribute("disabled");
        depthInput.style.opacity = "1";
        depthInput.style.cursor = "text";
      }
      currentUnlimitedChecked = unlimitedCb.checked;
    };

    unlimitedCb.onchange = updateInputState;
    depthInput.oninput = () => {
      currentDepthValue = parseInt(depthInput.value) || 5;
    };

    updateInputState(); // initialize

    startBtn.onclick = async () => {
      await startScan();
    };
  };

  const startScan = async () => {
    isSearching = true;
    let maxDepth = null;
    if (!currentUnlimitedChecked) {
      maxDepth = currentDepthValue;
    }

    const body = popup.querySelector(".duplicate-finder-body");

    // Hide close and delete, show stop in footer
    const cancelBtn = popup.querySelector("[data-dup-close]");
    const deleteBtn = popup.querySelector("#btn-dup-delete");
    const stopScanBtn = popup.querySelector("#btn-dup-stop-scan");
    if (cancelBtn) cancelBtn.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";
    if (stopScanBtn) stopScanBtn.style.display = "flex";

    // Transition body to scanning state
    body.innerHTML = `
      <div class="duplicate-finder-scanning" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 30px 0;">
        <div class="preloader-small-invert" style="width: 28px !important; height: 28px !important; min-width: 28px !important; min-height: 28px !important; border-width: 3px; margin-bottom: 8px;"></div>
        <span style="font-size: var(--fontSize); opacity: 0.85;">Scanning directory structure recursively...</span>
        <span style="font-size: 11px; opacity: 0.6; text-align: center; max-width: 80%; margin-bottom: 12px;">Evaluating files for duplicate content. Please wait.</span>
      </div>
    `;

    try {
      const results = await invoke("find_duplicates", { path, maxDepth });
      isSearching = false;

      const cancelBtn = popup.querySelector("[data-dup-close]");
      const deleteBtn = popup.querySelector("#btn-dup-delete");
      const stopScanBtn = popup.querySelector("#btn-dup-stop-scan");
      if (cancelBtn) cancelBtn.style.display = "flex";
      if (deleteBtn) deleteBtn.style.display = "flex";
      if (stopScanBtn) stopScanBtn.style.display = "none";

      if (!results || results.length === 0) {
        body.style.height = "";
        body.style.padding = "14px";
        body.style.position = "";
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(46, 204, 113, 0.15); border: 1px solid rgb(46, 204, 113); display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-check" style="font-size: 20px; color: rgb(46, 204, 113);"></i>
            </div>
            <div>
              <h3 style="font-weight: 700; margin-bottom: 4px; color: var(--textColor);">0 Duplicates Found</h3>
              <p style="font-size: var(--fontSize); opacity: 0.7; margin: 0; max-width: 80%; margin: auto; margin-bottom: 16px;">This directory is perfectly clean! No identical file contents were discovered.</p>
              <button class="props-card__btn props-card__btn--primary" id="btn-dup-rescan-empty" style="margin: auto; padding: 6px 14px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; justify-content: center;">
                <i class="fa-solid fa-arrows-rotate"></i><span>Configure & Rescan</span>
              </button>
            </div>
          </div>
        `;
        body.querySelector("#btn-dup-rescan-empty").onclick = () => {
          renderSetupScreen();
        };
      } else {
        popup.querySelector(".duplicate-finder-actions-bar").style.display = "flex";

        // Populate path to size map
        filePathToSize.clear();
        results.forEach(group => {
          group.files.forEach(f => {
            filePathToSize.set(f.path, group.size);
          });
        });

        // 1. Precalculate layout positions for virtual scrolling
        // Card height: 52px (header) + (num_files * 36px)
        // Margin-bottom: 14px
        let currentTop = 14; // start at 14px to act as padding-top
        const layouts = results.map(group => {
          const height = 52 + (group.files.length * 36);
          const layout = {
            top: currentTop,
            height: height,
            margin: 14
          };
          currentTop += height + 14;
          return layout;
        });
        const totalHeight = currentTop;

        // 2. Setup the DOM structure for virtual scroll inside 'body'
        body.style.position = "relative";
        body.style.padding = "0px";
        body.style.height = `${Math.min(520, totalHeight)}px`;
        body.innerHTML = `
          <div class="duplicate-scroll-spacer" style="height: ${totalHeight}px; width: 100%; pointer-events: none; position: absolute; top: 0; left: 0;"></div>
          <div class="duplicate-virtual-container" style="position: absolute; top: 0; left: 14px; right: 14px; width: calc(100% - 28px); pointer-events: none;"></div>
        `;

        const virtualContainer = body.querySelector(".duplicate-virtual-container");

        let lastStartIndex = -1;
        let lastEndIndex = -1;

        const renderVirtualWindow = () => {
          const scrollTop = body.scrollTop;
          const viewportHeight = body.clientHeight;

          // Expand range by 200px buffer top/bottom to prevent blinking
          const minVal = scrollTop - 200;
          const maxVal = scrollTop + viewportHeight + 200;

          let startIndex = 0;
          let endIndex = results.length - 1;

          for (let i = 0; i < results.length; i++) {
            const layout = layouts[i];
            if (layout.top + layout.height + layout.margin >= minVal) {
              startIndex = i;
              break;
            }
          }
          for (let i = startIndex; i < results.length; i++) {
            const layout = layouts[i];
            if (layout.top > maxVal) {
              endIndex = i;
              break;
            }
          }

          // Only re-render if visible window indices changed
          if (startIndex === lastStartIndex && endIndex === lastEndIndex) {
            return;
          }

          lastStartIndex = startIndex;
          lastEndIndex = endIndex;

          let html = "";
          for (let i = startIndex; i <= endIndex; i++) {
            const group = results[i];
            const layout = layouts[i];
            const firstPath = group.files[0].path;
            const baseName = firstPath.split('/').pop().split('\\').pop();

            let filesHtml = group.files.map((fileObj) => {
              const file = fileObj.path;
              const modified = fileObj.modified;
              const isChecked = selectedFilePaths.has(file);

              // Compute relative path from the scanned root folder
              let displayPath = file;
              if (file.toLowerCase().startsWith(path.toLowerCase())) {
                displayPath = file.substring(path.length);
                if (displayPath.startsWith("/") || displayPath.startsWith("\\")) {
                  displayPath = displayPath.substring(1);
                }
              }

              let folderPart = "";
              let filePart = displayPath;
              const lastSep = Math.max(displayPath.lastIndexOf("/"), displayPath.lastIndexOf("\\"));
              if (lastSep !== -1) {
                folderPart = displayPath.substring(0, lastSep + 1);
                filePart = displayPath.substring(lastSep + 1);
              }

              return `
                <div class="duplicate-file-row" style="height: 36px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.02); gap: 10px;">
                  <label style="display: flex; align-items: center; min-width: 0; flex: 1; cursor: pointer; margin: 0; gap: 10px;">
                    <input type="checkbox" class="dup-file-checkbox" data-path="${escHtml(file)}" data-group-index="${i}" style="cursor: pointer; flex-shrink: 0;" ${isChecked ? "checked" : ""} />
                    <span style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; flex: 1; min-width: 0;" title="${escHtml(file)}">
                      <span style="color: var(--textColor2); font-weight: normal;">${escHtml(folderPart)}</span><span style="color: var(--textColor); font-weight: 600;">${escHtml(filePart)}</span>
                    </span>
                  </label>
                  <span class="dup-file-date" title="Last Modified">${escHtml(formatDate(modified))}</span>
                  <button class="props-card__btn btn-dup-reveal" data-path="${escHtml(file)}" style="padding: 4px 8px; font-size: 11px; background: none; border: none; opacity: 0.7; cursor: pointer;" title="Reveal in CoDriver">
                    <i class="fa-solid fa-folder-open"></i>
                  </button>
                </div>
              `;
            }).join('');

            html += `
              <div class="duplicate-group-card" data-group-index="${i}" style="position: absolute; top: ${layout.top}px; left: 0; right: 0; height: ${layout.height}px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; pointer-events: auto;">
                <div class="duplicate-group-header" style="height: 52px; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--tertiaryColor);">
                  <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                    <span style="font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--textColor);" title="${escHtml(baseName)}">${escHtml(baseName)}</span>
                    <span style="font-size: 10.5px; opacity: 0.6; color: var(--textColor2); margin-top: 2px;">${formatBytes(group.size)} &bull; ${group.files.length} copies</span>
                  </div>
                  <button class="props-card__btn props-card__btn--sm btn-select-group-but-one" data-group-index="${i}" style="padding: 2px 8px; font-size: 11px; background: none; border: 1px solid var(--tertiaryColor); flex-shrink: 0; margin-left: 10px; cursor: pointer;">
                    Keep One
                  </button>
                </div>
                <div class="duplicate-group-files" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
                  ${filesHtml}
                </div>
              </div>
            `;
          }

          virtualContainer.innerHTML = html;
        };

        // Render initial view
        renderVirtualWindow();

        // Attach scroll listener
        body.onscroll = () => {
          renderVirtualWindow();
        };

        // 3. Set up Event Delegation on the popup once
        // Handle clicks: "Keep One" and "Reveal"
        popup.addEventListener("click", async (e) => {
          // Check for Keep One button
          const keepOneBtn = e.target.closest(".btn-select-group-but-one");
          if (keepOneBtn) {
            const groupIdx = parseInt(keepOneBtn.getAttribute("data-group-index"));
            const group = results[groupIdx];
            group.files.forEach((fileObj, idx) => {
              const file = fileObj.path;
              if (idx > 0) {
                selectedFilePaths.add(file);
              } else {
                selectedFilePaths.delete(file);
              }
            });
            // Update checkbox state in active DOM elements
            popup.querySelectorAll(`.dup-file-checkbox[data-group-index="${groupIdx}"]`).forEach((cb, idx) => {
              cb.checked = (idx > 0);
            });
            updateFooter();
            return;
          }

          // Check for Reveal button
          const revealBtn = e.target.closest(".btn-dup-reveal");
          if (revealBtn) {
            const filePath = revealBtn.getAttribute("data-path");
            let parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
            if (!parentPath && filePath.indexOf("\\") !== -1) {
              parentPath = filePath.substring(0, filePath.lastIndexOf("\\"));
            }
            if (parentPath) {
              closePopup();
              await openItem(null, SelectedItemPaneSide, parentPath);
            }
            return;
          }
        });

        // Handle Change: Checkboxes
        popup.addEventListener("change", (e) => {
          const checkbox = e.target.closest(".dup-file-checkbox");
          if (checkbox) {
            const file = checkbox.getAttribute("data-path");
            if (checkbox.checked) {
              selectedFilePaths.add(file);
            } else {
              selectedFilePaths.delete(file);
            }
            updateFooter();
          }
        });

        // Fast global selections: Keep Newest and Keep Oldest
        popup.querySelector("#btn-dup-select-newest").onclick = () => {
          results.forEach(group => {
            let newestFileObj = group.files[0];
            for (let i = 1; i < group.files.length; i++) {
              if (group.files[i].modified > newestFileObj.modified) {
                newestFileObj = group.files[i];
              }
            }
            group.files.forEach((fileObj) => {
              const file = fileObj.path;
              if (file === newestFileObj.path) {
                selectedFilePaths.delete(file);
              } else {
                selectedFilePaths.add(file);
              }
            });
          });
          // Sync only currently visible checkboxes in the DOM
          popup.querySelectorAll(".dup-file-checkbox").forEach(cb => {
            const file = cb.getAttribute("data-path");
            cb.checked = selectedFilePaths.has(file);
          });
          updateFooter();
        };

        popup.querySelector("#btn-dup-select-oldest").onclick = () => {
          results.forEach(group => {
            let oldestFileObj = group.files[0];
            for (let i = 1; i < group.files.length; i++) {
              if (group.files[i].modified < oldestFileObj.modified) {
                oldestFileObj = group.files[i];
              }
            }
            group.files.forEach((fileObj) => {
              const file = fileObj.path;
              if (file === oldestFileObj.path) {
                selectedFilePaths.delete(file);
              } else {
                selectedFilePaths.add(file);
              }
            });
          });
          // Sync only currently visible checkboxes in the DOM
          popup.querySelectorAll(".dup-file-checkbox").forEach(cb => {
            const file = cb.getAttribute("data-path");
            cb.checked = selectedFilePaths.has(file);
          });
          updateFooter();
        };

        popup.querySelector("#btn-dup-deselect-all").onclick = () => {
          selectedFilePaths.clear();
          // Sync only currently visible checkboxes in the DOM
          popup.querySelectorAll(".dup-file-checkbox").forEach(cb => {
            cb.checked = false;
          });
          updateFooter();
        };

        popup.querySelector("#btn-dup-delete").onclick = () => {
          const pathsToDelete = Array.from(selectedFilePaths);
          if (pathsToDelete.length === 0) return;

          const confirmOverlay = document.createElement("div");
          confirmOverlay.className = "dup-confirm-overlay";
          confirmOverlay.style.position = "absolute";
          confirmOverlay.style.inset = "0";
          confirmOverlay.style.background = "rgba(0,0,0,0.65)";
          confirmOverlay.style.backdropFilter = "blur(12px)";
          confirmOverlay.style.display = "flex";
          confirmOverlay.style.flexDirection = "column";
          confirmOverlay.style.alignItems = "center";
          confirmOverlay.style.justifyContent = "center";
          confirmOverlay.style.zIndex = "1000";
          confirmOverlay.style.padding = "20px";
          confirmOverlay.style.textAlign = "center";
          confirmOverlay.style.animation = "propsCardIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)";

          confirmOverlay.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 38px; color: var(--errorColor); margin-bottom: 14px;"></i>
            <h3 style="font-weight: 700; margin-bottom: 8px; font-size: 16px;">Delete Duplicate Files?</h3>
            <p style="font-size: 13px; opacity: 0.9; max-width: 85%; margin-bottom: 22px; line-height: 1.4;">
              Are you sure you want to permanently delete the <strong>${pathsToDelete.length}</strong> selected duplicate files? This action is irreversible.
            </p>
            <div style="display: flex; gap: 12px;">
              <button class="props-card__btn" id="btn-dup-confirm-cancel" style="cursor: pointer;">
                <i class="fa-solid fa-xmark"></i><span>Cancel</span>
              </button>
              <button class="props-card__btn props-card__btn--primary" id="btn-dup-confirm-delete" style="background: var(--errorColor); border-color: var(--errorColor); cursor: pointer;">
                <i class="fa-solid fa-trash"></i><span>Delete Permanently</span>
              </button>
            </div>
          `;

          popup.appendChild(confirmOverlay);

          confirmOverlay.querySelector("#btn-dup-confirm-cancel").onclick = () => {
            confirmOverlay.remove();
          };

          confirmOverlay.querySelector("#btn-dup-confirm-delete").onclick = async () => {
            confirmOverlay.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-width: 320px; gap: 14px; padding: 20px 10px;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 32px; color: #4da3ff; filter: drop-shadow(0 0 12px rgba(77, 163, 255, 0.8)); margin-bottom: 4px;"></i>
                <span style="font-weight: 700; font-size: 14px; color: var(--textColor);">Deleting duplicates...</span>

                <div style="width: 100%; background: rgba(255, 255, 255, 0.08); height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
                  <div id="dup-delete-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--selectColor2), #4da3ff); box-shadow: 0 0 8px rgba(77, 163, 255, 0.6); transition: width 0.15s ease-out; border-radius: 3px;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 11px; color: var(--textColor2); margin-top: -4px;">
                  <span id="dup-delete-progress-text">0% completed</span>
                  <span id="dup-delete-progress-count">0 / 0 files</span>
                </div>

                <div id="dup-delete-current-file" style="font-size: 10.5px; color: var(--textColor2); opacity: 0.6; max-width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: center; margin-top: 2px;">
                  Starting deletion...
                </div>
              </div>
            `;

            const total = pathsToDelete.length;
            const progressBar = confirmOverlay.querySelector("#dup-delete-progress-bar");
            const progressText = confirmOverlay.querySelector("#dup-delete-progress-text");
            const progressCount = confirmOverlay.querySelector("#dup-delete-progress-count");
            const currentFileEl = confirmOverlay.querySelector("#dup-delete-current-file");

            let successCount = 0;
            let failCount = 0;
            let completedCount = 0;
            let spaceReclaimed = 0;

            const concurrency = total > 50 ? 8 : 1; // Batch deletes concurrently for larger selections
            const delayMs = total > 50 ? 0 : Math.max(5, Math.min(60, 300 / total)); // Smooth dynamic animation delay for small deletions

            let lastUpdate = 0;
            const updateUI = (currentFile, force = false) => {
              const now = Date.now();
              if (force || now - lastUpdate >= 80 || completedCount === total) {
                lastUpdate = now;
                const percent = Math.round((completedCount / total) * 100);
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressText) progressText.innerText = `${percent}% completed`;
                if (progressCount) progressCount.innerText = `${completedCount} / ${total} files`;
                if (currentFileEl && currentFile) {
                  const parts = currentFile.split(/[/\\]/);
                  const filename = parts[parts.length - 1] || currentFile;
                  currentFileEl.innerText = `Deleting: ${filename}`;
                  currentFileEl.title = currentFile;
                }
              }
            };

            // Initial paint
            updateUI("", true);

            let nextIndex = 0;
            const worker = async () => {
              while (nextIndex < total) {
                const i = nextIndex++;
                if (i >= total) break;
                const file = pathsToDelete[i];

                try {
                  await invoke("delete_item", { actFileName: file });
                  successCount++;
                  spaceReclaimed += filePathToSize.get(file) || 0;
                } catch (err) {
                  console.error(`Failed to delete ${file}:`, err);
                  failCount++;
                }

                completedCount++;
                updateUI(file);

                if (delayMs > 0) {
                  await new Promise(r => setTimeout(r, delayMs));
                }
              }
            };

            // Spawn concurrent deletion workers
            const workers = [];
            const activeWorkers = Math.min(concurrency, total);
            for (let w = 0; w < activeWorkers; w++) {
              workers.push(worker());
            }
            await Promise.all(workers);

            // Final paint to guarantee 100% completion state
            updateUI("", true);

            if (failCount === 0) {
              showToast(`Deleted ${successCount} duplicate file(s)`, ToastType.SUCCESS);
            } else {
              showToast(`Deleted ${successCount} duplicate file(s) (${failCount} failed)`, ToastType.WARNING);
            }

            // Trigger list view refresh behind the popup immediately
            await listDirectories();

            // Transition the overlay to show stats and done button
            confirmOverlay.innerHTML = `
              <div class="dup-overview-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; max-width: 360px; width: 100%; padding: 10px; animation: propsCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: ${failCount === 0 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(230, 126, 34, 0.15)'}; border: 1px solid ${failCount === 0 ? 'rgb(46, 204, 113)' : 'rgb(230, 126, 34)'}; display: flex; align-items: center; justify-content: center; margin-bottom: 2px; filter: drop-shadow(0 0 10px ${failCount === 0 ? 'rgba(46, 204, 113, 0.25)' : 'rgba(230, 126, 34, 0.25)'});">
                  <i class="${failCount === 0 ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}" style="font-size: 24px; color: ${failCount === 0 ? 'rgb(46, 204, 113)' : 'rgb(230, 126, 34)'};"></i>
                </div>

                <div style="text-align: center;">
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--textColor); margin-bottom: 4px; letter-spacing: 0.5px;">
                    ${failCount === 0 ? 'Cleanup Completed' : 'Cleanup Finished'}
                  </h3>
                  <p style="font-size: 11.5px; color: var(--textColor2); line-height: 1.4;">
                    ${failCount === 0
                      ? 'All selected duplicate files have been successfully deleted.'
                      : 'The duplicate cleanup process finished with some errors.'
                    }
                  </p>
                </div>

                <div style="width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 4px 0;">
                  <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--tertiaryColor); border-radius: 8px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <i class="fa-solid fa-check" style="color: rgb(46, 204, 113); font-size: 11px;"></i>
                    <span style="font-size: 9px; color: var(--textColor2); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Deleted</span>
                    <span style="font-size: 14px; font-weight: 700; color: var(--textColor); font-family: monospace;">${successCount}</span>
                  </div>

                  <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--tertiaryColor); border-radius: 8px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <i class="fa-solid fa-xmark" style="color: ${failCount > 0 ? 'var(--errorColor)' : 'var(--textColor3)'}; font-size: 11px; opacity: ${failCount > 0 ? '1' : '0.4'};"></i>
                    <span style="font-size: 9px; color: var(--textColor2); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Failed</span>
                    <span style="font-size: 14px; font-weight: 700; color: ${failCount > 0 ? 'var(--errorColor)' : 'var(--textColor)'}; font-family: monospace;">${failCount}</span>
                  </div>

                  <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--tertiaryColor); border-radius: 8px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <i class="fa-solid fa-chart-pie" style="color: #4da3ff; font-size: 11px;"></i>
                    <span style="font-size: 9px; color: var(--textColor2); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">Reclaimed</span>
                    <span style="font-size: 12px; font-weight: 700; color: rgb(46, 204, 113); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${formatBytes(spaceReclaimed)}">${formatBytes(spaceReclaimed)}</span>
                  </div>
                </div>

                <div style="display: flex; gap: 8px; width: 100%; justify-content: center; margin-top: 4px;">
                  <button class="props-card__btn props-card__btn--primary" id="btn-dup-overview-close" style="width: 120px; padding: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border-radius: 6px;">
                    <i class="fa-solid fa-check"></i><span>Done</span>
                  </button>
                </div>
              </div>
            `;

            confirmOverlay.querySelector("#btn-dup-overview-close").onclick = () => {
              confirmOverlay.remove();
              closePopup();
            };
          };
        };
      }
    } catch (err) {
      isSearching = false;
      const cancelBtn = popup.querySelector("[data-dup-close]");
      const deleteBtn = popup.querySelector("#btn-dup-delete");
      const stopScanBtn = popup.querySelector("#btn-dup-stop-scan");
      if (cancelBtn) cancelBtn.style.display = "flex";
      if (deleteBtn) deleteBtn.style.display = "flex";
      if (stopScanBtn) stopScanBtn.style.display = "none";

      if (err === "Search cancelled" || (err && typeof err === "string" && err.includes("cancelled"))) {
        showToast("Search was stopped", ToastType.INFO);
        renderSetupScreen();
      } else {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
            <i class="fa-solid fa-circle-xmark" style="font-size: 32px; color: var(--errorColor);"></i>
            <span style="font-size: var(--fontSize); color: var(--errorColor); font-weight: 700;">Scanning Failed</span>
            <span style="font-size: 11px; opacity: 0.7; max-width: 80%;">${escHtml(err)}</span>
          </div>
        `;
      }
    }
  };

  renderSetupScreen();
}

function closeSmartOrganizerPopup() {
  const popup = document.querySelector(".smart-organizer-popup");
  if (popup) {
    IsPopUpOpen = false;
    popup.classList.add("popup-exit");
    $(".popup-background").css("opacity", "0");
    setTimeout(() => {
      $(".popup-background").css("display", "none");
    }, 150);
    safeAnimationEnd(popup, () => {
      popup.remove();
    });
  }
}

async function showSmartOrganizerPopup(path) {
  if (IsPopUpOpen !== false) return;
  if (!IsAiEnabled) {
    showToast("AI features are disabled in Settings", ToastType.ERROR);
    return;
  }

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[c]);

  let fileName = path.split('/').pop() || path.split('\\').pop() || "Directory";

  const popup = document.createElement("div");
  popup.className = "smart-organizer-popup props-card props-card--wide";
  popup.style.width = "min(480px, 95vw)";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-modal", "true");
  popup.setAttribute("aria-label", "Smart Folder Organizer");
  popup.innerHTML = `
    <section class="props-card__hero" style="border-radius: var(--glass-radius) var(--glass-radius) 0 0; padding: 12px 16px;">
      <div class="props-card__thumb"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
      <div class="props-card__heading">
        <h2 class="props-card__name" title="${escHtml(fileName)}">Smart Organizer</h2>
        <div class="props-card__meta">
          <span>Folder: ${escHtml(path)}</span>
        </div>
      </div>
    </section>

    <div class="smart-organizer-body" style="flex: 1 1 auto; overflow-y: auto; max-height: 480px; padding: 4px 20px 20px; display: flex; flex-direction: column; gap: 8px; border-bottom: var(--glass-border-subtle);">
      <div class="organizer-setup" style="display: flex; flex-direction: column; gap: 14px; padding: 18px 24px; align-items: center; justify-content: center; max-width: 440px; margin: 0 auto; width: 100%;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; margin-bottom: 0px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: color-mix(in srgb, var(--selectColor2) 15%, transparent); display: flex; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--selectColor2) 30%, transparent); margin-bottom: 2px; filter: drop-shadow(0 0 8px rgba(11, 100, 253, 0.25));">
            <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 18px; color: #4da3ff;"></i>
          </div>
          <h3 style="font-size: 14px; font-weight: 700; color: var(--textColor); letter-spacing: 0.5px;">AI Folder Organizer</h3>
          <p style="font-size: 11px; color: var(--textColor2); line-height: 1.4; max-width: 320px;">
            This tool uses AI to scan the files in this folder and automatically group them into logical, structured categories (like Documents, Images, Code, etc.).
          </p>
        </div>

        <button class="props-card__btn props-card__btn--primary" id="btn-org-start-scan" style="width: 100%; padding: 11px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; border-radius: 8px; margin-top: 2px; box-shadow: 0 4px 12px rgba(11, 100, 253, 0.25);">
          <i class="fa-solid fa-play"></i><span>Start</span>
        </button>
      </div>
    </div>

    <footer class="props-card__footer" style="padding: 10px 14px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: var(--glass-header-bg);">
      <button class="props-card__btn" id="btn-org-cancel" style="cursor: pointer;">
        <i class="fa-solid fa-xmark"></i><span>Cancel</span>
      </button>
      <button class="props-card__btn props-card__btn--primary" id="btn-org-apply" disabled style="opacity: 0.5; cursor: not-allowed;">
        <i class="fa-solid fa-folder-tree"></i><span>Organize Files</span>
      </button>
    </footer>
  `;

  document.body.appendChild(popup);
  popup.classList.add("popup-enter");
  IsPopUpOpen = true;

  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1"));

  popup.querySelector("#btn-org-cancel").onclick = () => closeSmartOrganizerPopup();

  const body = popup.querySelector(".smart-organizer-body");

  popup.querySelector("#btn-org-start-scan").onclick = async () => {
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
        <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.15));"></div>
        <span style="font-weight: 700; font-size: 14px; color: var(--textColor);">Consulting AI Organizer...</span>
        <span style="font-size: 11px; opacity: 0.6; max-width: 80%;">Analyzing files inside the directory and computing semantic folder layout...</span>
      </div>
    `;

    try {
      const suggestions = await invoke("ai_get_organizer_suggestions", { path });
      const directories = suggestions.directories || [];
      const mappings = suggestions.mappings || [];

      if (mappings.length === 0) {
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
            <i class="fa-solid fa-folder-open" style="font-size: 32px; color: var(--textColor3);"></i>
            <span style="font-weight: 700; font-size: 14px; color: var(--textColor);">No organization needed</span>
            <span style="font-size: 11px; opacity: 0.6; max-width: 80%;">All files in this directory seem perfectly organized or there are no files to sort.</span>
          </div>
        `;
        return;
      }

      popup.style.width = "min(740px, 95vw)";

      const grouped = {};
      directories.forEach(dir => {
        grouped[dir] = [];
      });

      mappings.forEach(map => {
        let targetDir = "";
        const lastSep = map.to.lastIndexOf("/");
        if (lastSep !== -1) {
          targetDir = map.to.substring(0, lastSep);
        }
        if (!grouped[targetDir]) {
          grouped[targetDir] = [];
        }
        grouped[targetDir].push(map);
      });

      let html = `
        <div style="font-size: 11.5px; opacity: 0.8; margin-top: 4px; margin-bottom: 6px; line-height: 1.4; color: var(--textColor2);">
          AI analyzed this folder and recommends creating <strong>${directories.length}</strong> new categories to organize <strong>${mappings.length}</strong> files. Uncheck any files you do not wish to move.
        </div>
        <div class="organizer-groups-list" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
      `;

      Object.keys(grouped).forEach((dir, dirIdx) => {
        const groupFiles = grouped[dir];
        if (groupFiles.length === 0) return;

        const groupHtml = groupFiles.map((fileMap, fileIdx) => {
          return `
            <div class="organizer-file-row" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.02); gap: 12px; font-size: 12px;">
              <label style="display: flex; align-items: center; min-width: 0; flex: 1 1 45%; cursor: pointer; margin: 0; gap: 8px; user-select: none;">
                <input type="checkbox" class="org-file-checkbox" data-from="${escHtml(fileMap.from)}" data-to="${escHtml(fileMap.to)}" data-dir-index="${dirIdx}" style="cursor: pointer; accent-color: var(--selectColor2);" checked />
                <span style="color: var(--textColor); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escHtml(fileMap.from)}">${escHtml(fileMap.from)}</span>
              </label>
              <i class="fa-solid fa-arrow-right-long" style="opacity: 0.4; font-size: 11px; flex-shrink: 0;"></i>
              <span style="color: var(--textColor2); font-family: monospace; font-size: 11px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 45%; min-width: 0;" title="${escHtml(fileMap.to)}">${escHtml(fileMap.to)}</span>
            </div>
          `;
        }).join('');

        html += `
          <div class="organizer-group-card" style="border: 1px solid var(--tertiaryColor); border-radius: 8px; background: rgba(255, 255, 255, 0.015); overflow: hidden; display: flex; flex-direction: column;">
            <div class="organizer-group-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                <i class="fa-solid fa-folder-open" style="color: #4da3ff; font-size: 14px;"></i>
                <span style="font-weight: 700; font-size: 13px; color: var(--textColor); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="New directory: ${escHtml(dir)}">${escHtml(dir)}</span>
                <span style="font-size: 10px; background: rgba(77, 163, 255, 0.15); border: 1px solid rgba(77, 163, 255, 0.3); border-radius: 12px; padding: 1px 6px; color: #4da3ff; font-weight: 600; flex-shrink: 0;">${groupFiles.length} files</span>
              </div>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; user-select: none; color: var(--textColor3); margin: 0;">
                <input type="checkbox" class="org-group-select-all" data-dir-index="${dirIdx}" style="cursor: pointer; accent-color: var(--selectColor2);" checked />
                <span>Select All</span>
              </label>
            </div>
            <div class="organizer-group-files-list" id="org-group-list-${dirIdx}" style="display: flex; flex-direction: column; padding: 4px 0;">
              ${groupHtml}
            </div>
          </div>
        `;
      });

      html += `</div>`;
      body.innerHTML = html;

      const applyBtn = popup.querySelector("#btn-org-apply");

      const updateApplyState = () => {
        const checkedCount = popup.querySelectorAll(".org-file-checkbox:checked").length;
        if (checkedCount > 0) {
          applyBtn.removeAttribute("disabled");
          applyBtn.style.opacity = "1";
          applyBtn.style.cursor = "pointer";
        } else {
          applyBtn.setAttribute("disabled", "true");
          applyBtn.style.opacity = "0.5";
          applyBtn.style.cursor = "not-allowed";
        }
      };

      updateApplyState();

      popup.querySelectorAll(".org-group-select-all").forEach(groupSelectAll => {
        groupSelectAll.onchange = (e) => {
          const dirIdx = groupSelectAll.getAttribute("data-dir-index");
          const list = popup.querySelector(`#org-group-list-${dirIdx}`);
          if (list) {
            list.querySelectorAll(".org-file-checkbox").forEach(cb => {
              cb.checked = groupSelectAll.checked;
            });
          }
          updateApplyState();
        };
      });

      popup.querySelectorAll(".org-file-checkbox").forEach(fileCb => {
        fileCb.onchange = () => {
          const dirIdx = fileCb.getAttribute("data-dir-index");
          const list = popup.querySelector(`#org-group-list-${dirIdx}`);
          const groupSelectAll = popup.querySelector(`.org-group-select-all[data-dir-index="${dirIdx}"]`);
          if (list && groupSelectAll) {
            const totalInGroup = list.querySelectorAll(".org-file-checkbox").length;
            const checkedInGroup = list.querySelectorAll(".org-file-checkbox:checked").length;
            groupSelectAll.checked = (totalInGroup === checkedInGroup);
          }
          updateApplyState();
        };
      });

      applyBtn.onclick = async () => {
        applyBtn.setAttribute("disabled", "true");
        applyBtn.style.opacity = "0.5";
        applyBtn.style.cursor = "not-allowed";

        const selectedMappings = [];
        popup.querySelectorAll(".org-file-checkbox:checked").forEach(cb => {
          selectedMappings.push({
            from: cb.getAttribute("data-from"),
            to: cb.getAttribute("data-to")
          });
        });

        const activeDirectories = new Set();
        selectedMappings.forEach(map => {
          let dir = "";
          const lastSep = map.to.lastIndexOf("/");
          if (lastSep !== -1) {
            dir = map.to.substring(0, lastSep);
          }
          if (dir) {
            let currentDir = "";
            const segments = dir.split("/");
            segments.forEach(seg => {
              if (currentDir) {
                currentDir += "/" + seg;
              } else {
                currentDir = seg;
              }
              activeDirectories.add(currentDir);
            });
          }
        });
        const directoriesToCreate = Array.from(activeDirectories);

        body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
            <div class="preloader-invert" style="width: 32px !important; height: 32px !important; border-width: 3px; border-top-width: 3px; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.15));"></div>
            <span style="font-weight: 700; font-size: 14px; color: var(--textColor);">Organizing and moving files...</span>
            <span style="font-size: 11px; opacity: 0.6; max-width: 80%;">Creating subdirectories and moving selected files safely...</span>
          </div>
        `;

        try {
          await invoke("ai_execute_organize", {
            parentPath: path,
            directories: directoriesToCreate,
            mappings: selectedMappings
          });

          showToast(`Successfully organized files!`, ToastType.SUCCESS);

          if (IsDualPaneEnabled === true) {
            refreshBothViews(SelectedItemPaneSide);
          } else {
            await listDirectories();
          }

          scheduleDiskUsageRefresh();
          closeSmartOrganizerPopup();
        } catch (err) {
          showToast(`Organization failed: ${err}`, ToastType.ERROR);
          closeSmartOrganizerPopup();
        }
      };

    } catch (err) {
      body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 40px 0; text-align: center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; color: var(--errorColor);"></i>
          <span style="font-weight: 700; font-size: 14px; color: var(--textColor);">AI Consultation Failed</span>
          <span style="font-size: 11px; opacity: 0.6; max-width: 80%;">${escHtml(err)}</span>
        </div>
      `;
    }
  };
}


(async () => {

  await getSetInstalledApplications();
  await checkAppConfig();
  await insertSiteNavButtons();
  cdCtMenu.setupItems();

  // Handle AI toggle visibility of API key row dynamically
  document.querySelector(".ai-enabled-checkbox")?.addEventListener("change", (e) => {
    toggleAiProviderRows();
  });

  // Set up validation / bounds clamping for depth and results inputs
  const clampInput = (inputSelector, maxVal, minVal = 1) => {
    const input = document.querySelector(inputSelector);
    if (!input) return;

    // Enforce limits as they type (only clamp if it exceeds max, to allow typing from scratch)
    input.addEventListener("input", (e) => {
      let val = parseInt(input.value);
      if (!isNaN(val)) {
        if (val > maxVal) {
          input.value = maxVal;
        }
      }
    });

    // Enforce limits on focus loss or change
    input.addEventListener("blur", (e) => {
      let val = parseInt(input.value);
      if (isNaN(val) || val < minVal) {
        input.value = minVal;
      } else if (val > maxVal) {
        input.value = maxVal;
      }
    });
  };

  clampInput(".search-depth-input", 100, 1);
  clampInput(".max-items-input", 1000, 1);
  clampInput(".full-search-search-depth-input", 100, 1);
  clampInput(".full-search-max-items-input", 1000, 1);

  // Check for updates in the background on startup
  checkUpdatesInBackground();
})();

// Helper functions for dynamic refreshing
function applyDirectoryListStyles(element, mode) {
  if (!element) return;
  if (mode === "wrap") {
    element.style.display = "grid";
    element.style.gridTemplateColumns = "repeat(auto-fill, minmax(90px, 1fr))";
    element.style.columnGap = "15px";
    element.style.rowGap = "15px";
  } else if (mode === "column") {
    element.style.display = "grid";
    element.style.gridTemplateColumns = "unset";
    element.style.columnGap = "unset";
    element.style.rowGap = "2px";
  } else if (mode === "miller") {
    element.style.display = "grid";
    element.style.gridTemplateColumns = "unset";
    element.style.columnGap = "unset";
    element.style.rowGap = "1px";
  }
}

function getParentPath(path) {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.length <= 1) return normalized;
  parts.pop();
  return parts.join('/') || '/';
}

function getTargetContainers(parentPath) {
  const normParent = parentPath.replace(/\\/g, '/').replace(/\/$/, '') || '/';
  let containers = [];

  if (IsDualPaneEnabled) {
    const normLeft = (LeftDualPanePath || "").replace(/\\/g, '/').replace(/\/$/, '') || '/';
    const normRight = (RightDualPanePath || "").replace(/\\/g, '/').replace(/\/$/, '') || '/';

    if (normLeft === normParent && LeftPaneItemCollection) {
      containers.push({ element: LeftPaneItemCollection, side: 'left', mode: 'column' });
    }
    if (normRight === normParent && RightPaneItemCollection) {
      containers.push({ element: RightPaneItemCollection, side: 'right', mode: 'column' });
    }
  } else if (ViewMode === 'miller') {
    document.querySelectorAll('.miller-column').forEach(col => {
      const colPath = (col.getAttribute('miller-col-path') || "").replace(/\\/g, '/').replace(/\/$/, '') || '/';
      if (colPath === normParent) {
        const dirList = col.querySelector('.directory-list, .directory-list-dual-pane') || col;
        const colClass = col.className.split(' ').find(c => c.startsWith('miller-col-'));
        const colNum = colClass ? parseInt(colClass.replace('miller-col-', '')) : 1;
        containers.push({ element: dirList, side: '', mode: 'miller', colNum: colNum });
      }
    });
  } else {
    const normCurrent = (CurrentDir || "").replace(/\\/g, '/').replace(/\/$/, '') || '/';
    if (normCurrent === normParent) {
      const dirList = document.querySelector('.explorer-container:not(.miller-column) > .directory-list') ||
                      document.querySelector('.explorer-container:not(.miller-column) > .directory-list-dual-pane') ||
                      document.querySelector('.directory-list');
      if (dirList) {
        containers.push({ element: dirList, side: '', mode: ViewMode });
      }
    }
  }
  return containers;
}

function createItemInnerHtml(item, itemIconId, viewMode, dualPaneSide) {
  let fileIcon = "resources/file-icon.png";
  let iconSize = "56px";
  let vectorFontSize = "28px";
  if (viewMode === "column") {
    iconSize = "24px";
    vectorFontSize = "13px";
  }
  if (viewMode === "miller") {
    iconSize = "18px";
    vectorFontSize = "10px";
  }
  fileIcon = getIconForFile(item, 1);

  // Normalize extension and check if it's .app (macOS application bundle)
  let ext = (item.extension || "").toLowerCase();
  if (ext && !ext.startsWith('.')) {
    ext = '.' + ext;
  }
  let isApp = ext === ".app";

  // Get active icon theme
  let currentIconTheme = localStorage.getItem("current-icon-theme") || "Prestige Glass";
  let isVectorTheme = currentIconTheme !== "Prestige Glass" && fileIcon.startsWith("resources/") && !isApp;

  // Boost initial font size for thin outline vectors (Lucide) to align visual presence with solid vectors
  if (isVectorTheme && currentIconTheme.startsWith("Lucide")) {
    if (viewMode === "wrap") vectorFontSize = "36px";
    else if (viewMode === "column") vectorFontSize = "17px";
    else if (viewMode === "miller") vectorFontSize = "13px";
  }

  let vectorHtml = "";
  if (isVectorTheme) {
    let vectorData = getVectorIconAndColor(item, currentIconTheme);
    let finalFontSize = vectorFontSize;
    let finalTransform = "";
    if (currentIconTheme === "Lucide Default" && vectorData.iconClass.includes("fa-folder")) {
      if (viewMode === "wrap") {
        finalFontSize = "29px !important";
        finalTransform = "transform: scale(0.68) !important;";
      } else if (viewMode === "column") {
        finalFontSize = "15px !important";
        finalTransform = "transform: scale(0.7) !important;";
      } else if (viewMode === "miller") {
        finalFontSize = "12px !important";
        finalTransform = "transform: scale(0.7) !important;";
      }
    }
    vectorHtml = `<i class="${vectorData.iconClass} item-icon vector-icon" style="color: ${vectorData.iconColor}; font-size: ${finalFontSize}; ${finalTransform} display: flex; align-items: center; justify-content: center; ${vectorData.customStyle}" id="${itemIconId}-vector"></i>`;
  }

  if (viewMode === "wrap") {
    return `
      <div class="item-button directory-entry">
        <div style="margin: 8px; ${fileIcon.startsWith("resources/") || isVectorTheme ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
        <img style="${fileIcon.startsWith("resources/") && !isVectorTheme ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="${iconSize}" height="${iconSize}" loading="lazy" />
        ${vectorHtml}
        <p class="item-button-text" style="text-align: left;">${item.name}</p>
      </div>
    `;
  } else if (viewMode === "column") {
    const className = (dualPaneSide != null && dualPaneSide !== "") ? "directory-entry dual-pane-list-item" : "item-button-list directory-entry";
    return `
      <div class="${className}">
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; min-width: 0; width: fit-content; max-width: 500px; overflow: visible;">
          <div style="margin: 8px; ${fileIcon.startsWith("resources/") || isVectorTheme ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
          <img style="${fileIcon.startsWith("resources/") && !isVectorTheme ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="${iconSize}" height="${iconSize}" loading="lazy"/>
          ${vectorHtml}
          <p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
        </span>
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: fit-content; justify-content: flex-end; padding-right: 5px;">
          <p class="item-button-list-text" style="width: 100%; text-align: right;">${item.last_modified}</p>
          <div class="item-button-list-text item-size-box" style="width: 115px; display: flex; gap: 10px; align-items: center; justify-content: space-around;">
               <span id="size-${item.path}">${item.is_dir ? "-" : formatBytes(parseInt(item.size), 2)}</span>
               <i class="fa-solid fa-cube"></i>
          </div>
        </span>
      </div>
    `;
  } else if (viewMode === "miller") {
    const className = (dualPaneSide != null && dualPaneSide !== "") ? "directory-entry dual-pane-list-item" : "item-button-list directory-entry";
    return `
      <div class="${className}">
        <span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: 200px; overflow: visible;">
          <div style="margin: 8px; ${fileIcon.startsWith("resources/") || isVectorTheme ? "display: none;" : ""}" class="preloader-small-invert preloader-${itemIconId}"></div>
          <img style="${fileIcon.startsWith("resources/") && !isVectorTheme ? "" : "display: none;"}" id="${itemIconId}" src="${fileIcon.startsWith("resources/") ? fileIcon : `resources/preloader.gif`}" decoding="async" class="item-icon" width="${iconSize}" height="${iconSize}" loading="lazy"/>
          ${vectorHtml}
          <p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
        </span>
      </div>
    `;
  }
  return "";
}

function getFDirFromElement(el) {
  return {
    name: el.getAttribute("itemname") || "",
    size: el.getAttribute("itemrawsize") || "0",
    last_modified: el.getAttribute("itemmodified") || "",
    path: el.getAttribute("itempath") || "",
    extension: el.getAttribute("itemext") || "",
    is_dir: el.getAttribute("itemisdir") === "1"
  };
}

function compareItems(itemA, itemB, sortBy, ascending) {
  if (sortBy === 'size') {
    const sizeA = parseInt(itemA.size) || 0;
    const sizeB = parseInt(itemB.size) || 0;
    return ascending ? (sizeA - sizeB) : (sizeB - sizeA);
  } else if (sortBy === 'date') {
    const dateA = new Date(itemA.last_modified);
    const dateB = new Date(itemB.last_modified);
    return ascending ? (dateA - dateB) : (dateB - dateA);
  } else {
    return ascending ? itemA.name.localeCompare(itemB.name) : itemB.name.localeCompare(itemA.name);
  }
}

function findInsertionIndex(container, fileInfo) {
  const children = Array.from(container.children);
  if (children.length === 0) return 0;

  let low = 0;
  let high = children.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midInfo = getFDirFromElement(children[mid]);
    const cmp = compareItems(fileInfo, midInfo, CurrentSortMethod, CurrentSortAscending);

    if (cmp < 0) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

async function handleDynamicCreate(path) {
  try {
    const parentPath = getParentPath(path);
    const targets = getTargetContainers(parentPath);
    if (targets.length === 0) return;

    let fileInfo;
    try {
      fileInfo = await invoke("get_single_item_info", { path });
    } catch (e) {
      const errStr = String(e);
      if (errStr.includes("No such file") || errStr.includes("os error 2")) {
        return; // Silent ignore, file was deleted before we could read its metadata
      }
      throw e;
    }
    if (!fileInfo) return;

    // Normalize extension to have a leading dot if it doesn't
    let ext = fileInfo.extension;
    if (ext && !ext.startsWith('.')) {
      ext = '.' + ext;
    }
    fileInfo.extension = ext;

    if (IsShowHiddenFiles === false) {
      if (fileInfo.name.startsWith(".") || fileInfo.name.toLowerCase().includes("desktop.ini")) {
        return;
      }
    }
    if (fileInfo.name.toLowerCase().includes("ntuser")) {
      return;
    }

    for (const target of targets) {
      const existing = target.element.querySelector(`[itempath="${path}"]`);
      if (existing) continue;

      applyDirectoryListStyles(target.element, target.mode);

      const itemLink = document.createElement("button");
      const itemIconId = crypto.randomUUID();
      itemLink.setAttribute("onclick", "interactWithItem(this, '" + target.side + "', null, event)");
      itemLink.setAttribute("itemiconid", itemIconId);
      itemLink.setAttribute("itempath", fileInfo.path);
      itemLink.setAttribute("itempaneside", target.side);
      itemLink.setAttribute("itemisdir", fileInfo.is_dir ? 1 : 0);
      itemLink.setAttribute("itemext", fileInfo.extension);
      itemLink.setAttribute("itemicon", getIconForFile(fileInfo, 1));
      itemLink.setAttribute("itemname", fileInfo.name);
      itemLink.setAttribute("itemsize", fileInfo.is_dir ? "-" : formatBytes(fileInfo.size));
      itemLink.setAttribute("itemrawsize", fileInfo.size);
      itemLink.setAttribute("itemmodified", fileInfo.last_modified);
      itemLink.setAttribute("draggable", true);
      itemLink.setAttribute("itemformillercol", target.colNum ? (parseInt(target.colNum) + 1) : 2);
      itemLink.setAttribute("itemisselected", false);
      itemLink.className = "item-link directory-entry";

      itemLink.innerHTML = createItemInnerHtml(fileInfo, itemIconId, target.mode, target.side);

      let extLower = (fileInfo.extension || "").toLowerCase();
      if (extLower && !extLower.startsWith('.')) {
        extLower = '.' + extLower;
      }
      if (extLower === ".app") {
        try {
          itemLink.querySelector("img").src = convertFileSrc(
            await invoke("get_app_icns", { path: fileInfo.path }),
          );
        } catch (e) {
          console.error("Failed to load app icon for dynamic create:", e);
        }
      }

      itemLink.ondragstart = (e) => {
        handleDragStart(e, itemLink);
      };
      itemLink.addEventListener("mousedown", (e) => {
        if (e.button === 0 && ds) {
          ds.break();
        }
      });
      itemLink.addEventListener("dragover", (e) => {
        e.preventDefault();
        MousePos = [e.clientX, e.clientY];
        if (itemLink.getAttribute("itemisdir") == "1") {
          if (!ArrSelectedItems.includes(itemLink)) {
            itemLink.style.border = "1px solid var(--selectColor2)";
            itemLink.style.backgroundColor = "var(--selectColor3)";
            itemLink.style.scale = "1";
            DraggedOverElement = itemLink;
          }
        }
      });
      itemLink.addEventListener("dragleave", () => {
        itemLink.style.border = "1px solid transparent";
        itemLink.style.backgroundColor = "1px solid var(--transparentColor)";
        itemLink.style.scale = "1";
      });
      itemLink.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cdCtMenu.setSelectedItem(itemLink, e);
        cdCtMenu.show(e);
      });

      const insertionIndex = findInsertionIndex(target.element, fileInfo);
      if (insertionIndex >= target.element.children.length) {
        target.element.appendChild(itemLink);
      } else {
        target.element.insertBefore(itemLink, target.element.children[insertionIndex]);
      }

      let idx = 0;
      Array.from(target.element.children).forEach(child => {
        child.setAttribute("itemindex", idx++);
      });

      if (ArrDirectoryItems.indexOf(itemLink) === -1) {
        ArrDirectoryItems.push(itemLink);
      }

      arrLoadItemImage([itemLink], true);
    }

    ds.setSettings({
      selectables: document.querySelectorAll(".item-link"),
    });
  } catch (error) {
    console.error("Error handling dynamic create:", error);
  }
}

function handleDynamicRemove(path) {
  try {
    const parentPath = getParentPath(path);
    const targets = getTargetContainers(parentPath);
    if (targets.length === 0) return;

    for (const target of targets) {
      const existing = target.element.querySelector(`[itempath="${path}"]`);
      if (existing) {
        existing.remove();

        let idx = 0;
        Array.from(target.element.children).forEach(child => {
          child.setAttribute("itemindex", idx++);
        });

        ArrDirectoryItems = ArrDirectoryItems.filter(item => item !== existing);
      }
    }

    ds.setSettings({
      selectables: document.querySelectorAll(".item-link"),
    });
  } catch (error) {
    console.error("Error handling dynamic remove:", error);
  }
}

async function handleDynamicUpdate(path) {
  try {
    const parentPath = getParentPath(path);
    const targets = getTargetContainers(parentPath);
    if (targets.length === 0) return;

    let fileInfo;
    try {
      fileInfo = await invoke("get_single_item_info", { path });
    } catch (e) {
      const errStr = String(e);
      if (errStr.includes("No such file") || errStr.includes("os error 2")) {
        return; // Silent ignore, file was deleted before we could read its metadata
      }
      throw e;
    }
    if (!fileInfo) return;

    // Normalize extension to have a leading dot if it doesn't
    let ext = fileInfo.extension;
    if (ext && !ext.startsWith('.')) {
      ext = '.' + ext;
    }
    fileInfo.extension = ext;

    for (const target of targets) {
      const existing = target.element.querySelector(`[itempath="${path}"]`);
      if (existing) {
        existing.setAttribute("itemsize", fileInfo.is_dir ? "-" : formatBytes(fileInfo.size));
        existing.setAttribute("itemrawsize", fileInfo.size);
        existing.setAttribute("itemmodified", fileInfo.last_modified);
        existing.setAttribute("itemext", fileInfo.extension);
        existing.setAttribute("itemicon", getIconForFile(fileInfo, 1));
        existing.setAttribute("itemisdir", fileInfo.is_dir ? 1 : 0);

        const itemIconId = existing.getAttribute("itemiconid") || crypto.randomUUID();
        existing.setAttribute("itemiconid", itemIconId);
        existing.innerHTML = createItemInnerHtml(fileInfo, itemIconId, target.mode, target.side);

        let extLower = (fileInfo.extension || "").toLowerCase();
        if (extLower && !extLower.startsWith('.')) {
          extLower = '.' + extLower;
        }
        if (extLower === ".app") {
          try {
            existing.querySelector("img").src = convertFileSrc(
              await invoke("get_app_icns", { path: fileInfo.path }),
            );
          } catch (e) {
            console.error("Failed to load app icon for dynamic update:", e);
          }
        }

        arrLoadItemImage([existing], true);
      }
    }
  } catch (error) {
    console.error("Error handling dynamic update:", error);
  }
}

/* Custom Keyboard Shortcuts Customization Engine */
const DefaultShortcuts = {
  "copy_item": "CmdOrCtrl+c",
  "cut_item": "CmdOrCtrl+x",
  "paste_item": "CmdOrCtrl+v",
  "delete_item": "Delete",
  "rename_item": "F2",
  "select_all": "CmdOrCtrl+a",
  "quick_preview": "Space",
  "new_folder": "F7",
  "new_file": "F6",
  "search_files": "F8",
  "refresh_view": "CmdOrCtrl+r",
  "jump_to_path": "CmdOrCtrl+g",
  "multi_rename": "CmdOrCtrl+Shift+m",
  "compress_item": "CmdOrCtrl+k",
  "focus_search": "CmdOrCtrl+f",
  "copy_dir_path": "CmdOrCtrl+Shift+c",
  "pane_copy": "F5",
  "pane_move": "Shift+F5",
  "pane_switch": "Tab",
  "disk_menu_left": "Alt+F1",
  "disk_menu_right": "Alt+F2",
  "slot_1": "Alt+1",
  "slot_2": "Alt+2",
  "slot_3": "Alt+3",
  "nav_up": "ArrowUp",
  "nav_down": "ArrowDown",
  "nav_left": "ArrowLeft",
  "nav_right": "ArrowRight"
};

const ShortcutLabels = {
  "copy_item": { name: "Copy Item", desc: "Copy the currently selected item(s)" },
  "cut_item": { name: "Cut Item", desc: "Cut the currently selected item(s)" },
  "paste_item": { name: "Paste Item", desc: "Paste the copied or cut item(s) here" },
  "delete_item": { name: "Delete Item", desc: "Delete the currently selected item(s)" },
  "rename_item": { name: "Rename Item", desc: "Rename the currently selected item" },
  "select_all": { name: "Select All", desc: "Select all items in the current directory" },
  "quick_preview": { name: "Quick Preview", desc: "Open or close a quick visual preview of the selected file" },
  "new_folder": { name: "New Folder", desc: "Create a new directory" },
  "new_file": { name: "New File", desc: "Create a new empty file" },
  "search_files": { name: "Search Files", desc: "Open the search modal to look for files recursively" },
  "refresh_view": { name: "Refresh View", desc: "Refresh the current folder listing" },
  "jump_to_path": { name: "Jump to Path", desc: "Open the path input popup to jump to any local path" },
  "multi_rename": { name: "Multi-Rename", desc: "Perform batch rename on all selected items" },
  "compress_item": { name: "Compress Item", desc: "Compress the selected item(s) into an archive" },
  "focus_search": { name: "Focus Search Input", desc: "Place the cursor in the file name filter bar" },
  "copy_dir_path": { name: "Copy Folder Path", desc: "Copy the current directory's absolute path to the clipboard" },
  "pane_copy": { name: "Pane Copy (Dual)", desc: "Copy selected items to the other side folder in dual-pane" },
  "pane_move": { name: "Pane Move (Dual)", desc: "Move selected items to the other side folder in dual-pane" },
  "pane_switch": { name: "Pane Focus Switch (Dual)", desc: "Toggle keyboard focus between the left and right dual panes" },
  "disk_menu_left": { name: "Left Disk Dropdown (Dual)", desc: "Open the disk selection list for the left pane" },
  "disk_menu_right": { name: "Right Disk Dropdown (Dual)", desc: "Open the disk selection list for the right pane" },
  "slot_1": { name: "Quick Access Slot 1", desc: "Quickly navigate to path configured in settings Slot 1" },
  "slot_2": { name: "Quick Access Slot 2", desc: "Quickly navigate to path configured in settings Slot 2" },
  "slot_3": { name: "Quick Access Slot 3", desc: "Quickly navigate to path configured in settings Slot 3" },
  "nav_up": { name: "Navigate Up", desc: "Move selection up in active file list" },
  "nav_down": { name: "Navigate Down", desc: "Move selection down in active file list" },
  "nav_left": { name: "Navigate Left", desc: "Navigate to parent directory or left column" },
  "nav_right": { name: "Navigate Right", desc: "Open directory or navigate to right column" }
};

let ConfiguredShortcuts = {};
let RecordingAction = null;

function matchShortcut(actionName, e) {
  let binding = ConfiguredShortcuts[actionName];
  if (!binding) return false;

  let resolvedBinding = binding;
  if (binding.includes("CmdOrCtrl")) {
    if (Platform === "darwin") {
      resolvedBinding = binding.replace("CmdOrCtrl", "Cmd");
    } else {
      resolvedBinding = binding.replace("CmdOrCtrl", "Ctrl");
    }
  }

  let bindingParts = resolvedBinding.split("+");
  let hasCmd = bindingParts.includes("Cmd");
  let hasMeta = bindingParts.includes("Meta");
  let hasCtrl = bindingParts.includes("Ctrl");
  let hasAlt = bindingParts.includes("Alt");
  let hasShift = bindingParts.includes("Shift");

  if (hasCmd || hasMeta) {
    if (!e.metaKey) return false;
  } else {
    if (e.metaKey) return false;
  }

  if (hasCtrl) {
    if (!e.ctrlKey) return false;
  } else {
    if (e.ctrlKey) return false;
  }

  if (hasAlt) {
    if (!e.altKey) return false;
  } else {
    if (e.altKey) return false;
  }

  if (hasShift) {
    if (!e.shiftKey) return false;
  } else {
    if (e.shiftKey) return false;
  }

  let keyVal = e.key;
  if (keyVal === " ") {
    keyVal = "Space";
  } else if (keyVal.length === 1) {
    keyVal = keyVal.toLowerCase();
  }

  let bindKey = bindingParts[bindingParts.length - 1];
  if (bindKey.length === 1) {
    bindKey = bindKey.toLowerCase();
  }

  if (bindKey.startsWith("digit") || /^\d$/.test(bindKey)) {
    let digitStr = bindKey.replace("digit", "");
    return keyVal === digitStr || e.code === bindKey || e.code === "Digit" + digitStr;
  }

  return keyVal === bindKey;
}

function formatShortcutForDisplay(binding) {
  if (!binding) return "None";
  let parts = binding.split("+");
  let resolvedParts = parts.map(part => {
    if (part === "CmdOrCtrl") {
      return Platform === "darwin" ? "⌘" : "Ctrl";
    }
    if (part === "Cmd") return "⌘";
    if (part === "Shift") return Platform === "darwin" ? "⇧" : "Shift";
    if (part === "Alt") return Platform === "darwin" ? "⌥" : "Alt";
    if (part === "Ctrl") return "Ctrl";
    if (part === "Space") return "Space";
    if (part.startsWith("Digit")) return part.replace("Digit", "");
    if (part.length === 1) return part.toUpperCase();
    return part;
  });
  return resolvedParts.join(" + ");
}

function startRecordingShortcut(actionName, element) {
  RecordingAction = actionName;

  let btn = $(element);
  btn.addClass("recording").text("Press keys...");

  IsDisableShortcuts = true;
  IsInputFocused = true;

  let recordKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let parts = [];
    if (e.metaKey) parts.push(Platform === "darwin" ? "Cmd" : "Meta");
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    let keyVal = e.key;
    if (keyVal === " ") {
      keyVal = "Space";
    } else if (keyVal.length === 1) {
      keyVal = keyVal.toLowerCase();
    }

    if (!["control", "shift", "alt", "meta"].includes(e.key.toLowerCase())) {
      parts.push(keyVal);
    }

    let combo = parts.join("+");
    btn.text(formatShortcutForDisplay(combo));

    if (!["control", "shift", "alt", "meta"].includes(e.key.toLowerCase())) {
      ConfiguredShortcuts[actionName] = combo;
      stopRecording(combo);
    }
  };

  let stopRecording = (finalCombo) => {
    window.removeEventListener("keydown", recordKeyDown, true);
    RecordingAction = null;
    IsDisableShortcuts = false;
    IsInputFocused = false;
    btn.removeClass("recording").text(formatShortcutForDisplay(finalCombo));
  };

  window.addEventListener("keydown", recordKeyDown, true);
}

function populateShortcutsUI() {
  let container = $(".shortcuts-list-container");
  container.html("");

  let actionKeys = Object.keys(DefaultShortcuts);
  actionKeys.forEach((actionName, index) => {
    let currentShortcut = ConfiguredShortcuts[actionName] || DefaultShortcuts[actionName];
    let label = ShortcutLabels[actionName] || { name: actionName, desc: "" };

    let row = document.createElement("div");
    row.className = "shortcut-row";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "10px 8px";
    if (index === actionKeys.length - 1) {
      row.style.borderBottom = "none";
    } else {
      row.style.borderBottom = "1px solid var(--tertiaryColor)";
    }
    row.style.gap = "10px";
    row.setAttribute("data-action", actionName);

    row.innerHTML = `
      <div class="shortcut-info" style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;">
        <span class="shortcut-name" style="font-size: 12px; font-weight: 600; color: var(--textColor);">${label.name}</span>
        <span class="shortcut-desc" style="font-size: 10px; color: var(--textColor2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label.desc}</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="settings-action-btn secondary shortcut-record-btn" onclick="startRecordingShortcut('${actionName}', this)" style="min-width: 90px; height: 26px; padding: 0 10px; font-size: 10px; border-radius: 6px; font-family: monospace;">
          ${formatShortcutForDisplay(currentShortcut)}
        </button>
        <button class="settings-action-btn secondary shortcut-row-reset-btn" onclick="resetSingleShortcut('${actionName}', this)" title="Reset to default" style="width: 26px; height: 26px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
          <i class="fa-solid fa-rotate-left" style="font-size: 10px;"></i>
        </button>
      </div>
    `;

    container.append(row);
  });
}

function filterShortcuts(query) {
  let q = query.toLowerCase().trim();
  let visibleRows = [];
  $(".shortcut-row").each(function() {
    let actionName = $(this).attr("data-action");
    let label = ShortcutLabels[actionName] || { name: "", desc: "" };
    if (label.name.toLowerCase().includes(q) || label.desc.toLowerCase().includes(q)) {
      $(this).css("display", "flex");
      $(this).css("border-bottom", "1px solid var(--tertiaryColor)");
      visibleRows.push(this);
    } else {
      $(this).css("display", "none");
    }
  });
  if (visibleRows.length > 0) {
    $(visibleRows[visibleRows.length - 1]).css("border-bottom", "none");
  }
}

function resetSingleShortcut(actionName, btn) {
  ConfiguredShortcuts[actionName] = DefaultShortcuts[actionName];
  let recordBtn = $(btn).siblings(".shortcut-record-btn");
  recordBtn.text(formatShortcutForDisplay(ConfiguredShortcuts[actionName]));
}

async function resetAllShortcuts() {
  const confirmed = await confirm("Are you sure you want to reset all keyboard shortcuts to their defaults?");
  if (confirmed) {
    ConfiguredShortcuts = { ...DefaultShortcuts };
    populateShortcutsUI();
  }
}

async function selectAllExplorerItems() {
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

function toggleAiProviderRows() {
  const isEnabled = document.querySelector(".ai-enabled-checkbox")?.checked;
  const provider = document.querySelector(".ai-provider-select")?.value;

  const providerRow = document.querySelector(".ai-provider-row");
  const geminiRow = document.querySelector(".gemini-api-key-row");
  const openaiRow = document.querySelector(".openai-api-key-row");

  const advancedToggle = document.querySelector(".settings-advanced-ai-toggle-container");
  const advancedContainer = document.querySelector(".advanced-ai-settings-container");

  if (providerRow) {
    providerRow.style.display = isEnabled ? "flex" : "none";
  }
  if (geminiRow) {
    geminiRow.style.display = (isEnabled && provider === "gemini") ? "flex" : "none";
  }
  if (openaiRow) {
    openaiRow.style.display = (isEnabled && provider === "openai") ? "flex" : "none";
  }

  if (advancedToggle) {
    advancedToggle.style.display = isEnabled ? "block" : "none";
  }

  if (advancedContainer) {
    if (!isEnabled) {
      advancedContainer.style.display = "none";
      const chevron = document.querySelector(".advanced-ai-chevron");
      if (chevron) chevron.style.transform = "rotate(0deg)";
    } else {
      // Toggle individual model group visibility based on provider
      const geminiModels = document.querySelectorAll(".gemini-models-row");
      const openaiModels = document.querySelectorAll(".openai-models-row");
      geminiModels.forEach(row => row.style.display = provider === "gemini" ? "flex" : "none");
      openaiModels.forEach(row => row.style.display = provider === "openai" ? "flex" : "none");

      // Clean up the borders of the visible model settings rows dynamically
      const modelRows = advancedContainer.querySelectorAll(".settings-row");
      const visibleRows = [];
      modelRows.forEach(row => {
        if (row.style.display !== "none") {
          row.style.borderBottom = "1px solid var(--tertiaryColor)";
          visibleRows.push(row);
        }
      });
      if (visibleRows.length > 0) {
        visibleRows[visibleRows.length - 1].style.borderBottom = "none";
      }
    }
  }
}

function toggleAdvancedAiSettings() {
  const container = document.querySelector(".advanced-ai-settings-container");
  const chevron = document.querySelector(".advanced-ai-chevron");
  if (container) {
    if (container.style.display === "none") {
      container.style.display = "flex";
      if (chevron) chevron.style.transform = "rotate(90deg)";
    } else {
      container.style.display = "none";
      if (chevron) chevron.style.transform = "rotate(0deg)";
    }
  }
}

function onGeminiImageModelChange() {
  const select = document.querySelector(".gemini-image-model-select");
  const customInput = document.querySelector(".gemini-image-model-custom-input");
  if (select && customInput) {
    customInput.style.display = select.value === "custom" ? "block" : "none";
  }
}

function onOpenAiImageModelChange() {
  const select = document.querySelector(".openai-image-model-select");
  const customInput = document.querySelector(".openai-image-model-custom-input");
  if (select && customInput) {
    customInput.style.display = select.value === "custom" ? "block" : "none";
  }
}

// ==========================================================================
// CDVisualInnovations: Disk Space Analyzer Orchestrator
// ==========================================================================

let DiskAnalyzerRootNode = null;
let ActiveAnalyzerNode = null;
let DiskAnalyzerStack = [];
let DiskAnalyzerIsScanning = false;
let DiskAnalyzerIsBackground = false;
let DiskAnalyzerUserCancelled = false;
let DiskAnalyzerPath = "";
let DiskAnalyzerMaxDepth = 5;
let DiskAnalyzerLastPayload = null;

let DiskAnalyzerSelections = {}; // path -> boolean
let DiskAnalyzerChartData = [];
let DiskAnalyzerLastTotalSize = 0;
const DiskAnalyzerColors = [
  "rgba(11, 100, 253, 0.85)",
  "rgba(0, 200, 83, 0.85)",
  "rgba(255, 179, 0, 0.85)",
  "rgba(233, 30, 99, 0.85)",
  "rgba(156, 39, 176, 0.85)",
  "rgba(0, 188, 212, 0.85)",
  "rgba(244, 67, 54, 0.85)"
];

function isNodeSelected(path) {
  let currentPath = path;
  while (true) {
    if (DiskAnalyzerSelections[currentPath] !== undefined) {
      return DiskAnalyzerSelections[currentPath];
    }
    let lastSlash = currentPath.lastIndexOf("/");
    if (lastSlash === -1 || currentPath === "/") {
      break;
    }
    let parentPath = currentPath.substring(0, lastSlash);
    if (parentPath === "") {
      parentPath = "/";
    }
    currentPath = parentPath;
  }
  return false;
}

function clearNestedOverrides(parentPath) {
  const prefix = parentPath.endsWith("/") ? parentPath : parentPath + "/";
  for (const key in DiskAnalyzerSelections) {
    if (key.startsWith(prefix)) {
      delete DiskAnalyzerSelections[key];
    }
  }
}

function toggleNodeSelection(path) {
  const currentSelection = isNodeSelected(path);
  DiskAnalyzerSelections[path] = !currentSelection;
  clearNestedOverrides(path);
}

function hasDeselectedDescendants(parentPath) {
  const prefix = parentPath.endsWith("/") ? parentPath : parentPath + "/";
  for (const key in DiskAnalyzerSelections) {
    if (key.startsWith(prefix) && DiskAnalyzerSelections[key] === false) {
      return true;
    }
  }
  return false;
}

function hasSelectedDescendants(parentPath) {
  const prefix = parentPath.endsWith("/") ? parentPath : parentPath + "/";
  for (const key in DiskAnalyzerSelections) {
    if (key.startsWith(prefix) && DiskAnalyzerSelections[key] === true) {
      return true;
    }
  }
  return false;
}

function isNodeIndeterminate(node) {
  const isSelected = isNodeSelected(node.path);
  if (isSelected) {
    return hasDeselectedDescendants(node.path);
  } else {
    return hasSelectedDescendants(node.path);
  }
}

function updateDeleteButton() {
  const stats = getSelectedStats();
  const deleteBtn = document.getElementById("btn-disk-analyzer-delete");
  if (deleteBtn) {
    if (stats.plan.length > 0) {
      deleteBtn.style.display = "inline-flex";
      deleteBtn.querySelector("span").textContent = `Delete Selected (${formatBytes(stats.totalSize)})`;
    } else {
      deleteBtn.style.display = "none";
    }
  }
}

async function startAnalyzerDeletion() {
  const stats = getSelectedStats();
  if (stats.plan.length === 0) {
    showToast("No items selected for deletion.", ToastType.INFO);
    return;
  }

  const confirmed = await confirm(
    `Are you sure you want to permanently delete ${stats.plan.length} item(s) totalling ${formatBytes(stats.totalSize)}?\n\nThis action cannot be undone!`
  );
  if (!confirmed) {
    return;
  }

  // Visual transitions to loading state
  $("#disk-analyzer-content").hide();
  $("#btn-disk-analyzer-delete").hide();
  $("#disk-analyzer-back-btn").hide();
  $("#disk-analyzer-close-btn").hide();
  $("#disk-analyzer-total-size").text("Deleting items...");

  const loadingTitleEl = $("#disk-analyzer-loading p");
  const foldersStatEl = $("#disk-analyzer-progress-folders");
  const filesStatEl = $("#disk-analyzer-progress-files");
  
  const originalTitle = loadingTitleEl.text();
  loadingTitleEl.text("Deleting selected items...");
  foldersStatEl.parent().hide();
  filesStatEl.parent().hide();
  
  $("#disk-analyzer-progress-path").text("Executing deletion plan...");
  $("#disk-analyzer-progress-fill").css("width", "50%");
  $("#disk-analyzer-progress-percent").text("Working...");
  $("#disk-analyzer-loading").css("display", "flex");

  const pathsToDelete = stats.plan.map((item) => item.path);
  try {
    await invoke("arr_delete_items", { arrItems: pathsToDelete });
    
    // Restore loader title/stats layout secretly
    loadingTitleEl.text(originalTitle);
    foldersStatEl.parent().css("display", "inline");
    filesStatEl.parent().css("display", "inline");
    
    $("#disk-analyzer-loading").hide();

    // Populate summary statistics screen
    $("#disk-analyzer-summary-reclaimed").text(formatBytes(stats.totalSize));
    $("#disk-analyzer-summary-count").text(stats.plan.length.toLocaleString());

    const listContainer = document.getElementById("disk-analyzer-summary-list");
    if (listContainer) {
      listContainer.innerHTML = "";
      for (const item of stats.plan) {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
        div.style.padding = "4px 0";
        div.style.gap = "8px";
        
        const folderIcon = item.is_dir 
          ? '<i class="fa-solid fa-folder" style="opacity: 0.7; font-size: 10px; color: #4da3ff;"></i>' 
          : '<i class="fa-solid fa-file" style="opacity: 0.6; font-size: 10px;"></i>';
          
        div.innerHTML = `
          <span style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; font-weight: 550; color: var(--textColor); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${folderIcon} ${item.name}
          </span>
          <span style="font-weight: 600; color: var(--selectColor2); font-size: 11px; font-family: monospace; flex-shrink: 0;">
            ${formatBytes(item.size)}
          </span>
        `;
        listContainer.appendChild(div);
      }
    }

    $("#disk-analyzer-summary").css("display", "flex");
    $("#disk-analyzer-close-btn").show();
    $("#disk-analyzer-total-size").text("Reclaimed: " + formatBytes(stats.totalSize));
    showToast("Items successfully deleted.", ToastType.SUCCESS);

    // Refresh active explorer directory list
    await listDirectories();

  } catch (error) {
    console.error("Failed to delete selected analyzer items:", error);
    showToast("Deletion failed: " + error, ToastType.ERROR);
    
    // Restore loader title/stats layout
    loadingTitleEl.text(originalTitle);
    foldersStatEl.parent().css("display", "inline");
    filesStatEl.parent().css("display", "inline");
    
    $("#disk-analyzer-loading").hide();
    $("#disk-analyzer-close-btn").show();
    $("#disk-analyzer-content").css("display", "flex");
    renderDiskSpaceNode(ActiveAnalyzerNode);
  }
}



function getSelectedStats() {
  const plan = [];
  if (DiskAnalyzerRootNode) {
    collectDeletionPlan(DiskAnalyzerRootNode, false, plan);
  }
  
  let totalSize = 0;
  let foldersCount = 0;
  let filesCount = 0;
  
  for (const item of plan) {
    totalSize += item.size;
    if (item.is_dir) {
      foldersCount++;
    } else {
      filesCount++;
    }
  }
  
  return { plan, totalSize, foldersCount, filesCount };
}

function collectDeletionPlan(node, parentSelected, plan) {
  const isSelected = DiskAnalyzerSelections[node.path] !== undefined 
    ? DiskAnalyzerSelections[node.path] 
    : parentSelected;
    
  if (isSelected) {
    if (!hasDeselectedDescendants(node.path)) {
      plan.push(node);
    } else {
      for (const child of node.children) {
        collectDeletionPlan(child, true, plan);
      }
    }
  } else {
    for (const child of node.children) {
      collectDeletionPlan(child, false, plan);
    }
  }
}


function putDiskAnalyzerInBackground() {
  DiskAnalyzerIsBackground = true;
  IsPopUpOpen = false;
  
  const modal = document.getElementById("disk-analyzer-popup");
  if (modal) modal.style.display = "none";
  $(".popup-background").css("opacity", "0");
  setTimeout(() => $(".popup-background").css("display", "none"), 200);
  
  const actionId = "diskanalyzer-scan";
  const name = "Disk Analyzer";
  const folderName = DiskAnalyzerPath.split("/").pop() || DiskAnalyzerPath;
  const description = `Scanning ${folderName}`;
  
  let action = ArrActiveActions.find((a) => a.id === actionId);
  if (!action) {
    action = new ActiveAction(name, description, actionId, DiskAnalyzerPath, true);
    action.progress = 0;
    action.countLabel = "0 items";
    action.speedLabel = "Scanning...";
    ArrActiveActions.push(action);
  }
  
  renderActiveActionsPill();
  refreshActiveActionsPopup();
  showToast("Scan running in background.", ToastType.INFO);
}

async function triggerStopDiskAnalysis() {
  await invoke("stop_disk_analysis");
}

function reopenDiskAnalyzerModal() {
  DiskAnalyzerIsBackground = false;
  IsPopUpOpen = true;
  
  const modal = document.getElementById("disk-analyzer-popup");
  if (modal) {
    modal.style.display = "flex";
    if (!DiskAnalyzerIsScanning && DiskAnalyzerRootNode) {
      modal.style.width = "min(760px, 94vw)";
      modal.style.height = "min(500px, 85vh)";
    } else {
      modal.style.width = "min(450px, 94vw)";
      modal.style.height = "420px";
    }
  }
  
  $(".popup-background").css("display", "block");
  $(".popup-background").css("opacity", "1");
  
  removeAction("diskanalyzer-scan");

  if (!DiskAnalyzerIsScanning && DiskAnalyzerRootNode) {
    $("#disk-analyzer-setup").hide();
    $("#disk-analyzer-loading").hide();
    $("#disk-analyzer-summary").hide();
    $("#btn-disk-analyzer-background").hide();
    $("#btn-disk-analyzer-stop").hide();
    $("#disk-analyzer-close-btn").show();
    $("#disk-analyzer-content").css("display", "flex");
    renderDiskSpaceNode(ActiveAnalyzerNode);
  } else {
    $("#disk-analyzer-setup").hide();
    $("#disk-analyzer-content").hide();
    $("#disk-analyzer-close-btn").hide();
    $("#btn-disk-analyzer-background").css("display", "flex");
    $("#btn-disk-analyzer-stop").css("display", "flex");
    $("#disk-analyzer-loading").css("display", "flex");
    
    if (DiskAnalyzerLastPayload) {
      const { folders, files, percent, path } = DiskAnalyzerLastPayload;
      $("#disk-analyzer-progress-folders").text(folders.toLocaleString());
      $("#disk-analyzer-progress-files").text(files.toLocaleString());
      $("#disk-analyzer-progress-fill").css("width", percent + "%");
      $("#disk-analyzer-progress-percent").text(percent + "%");
      $("#disk-analyzer-progress-path").text(path);
    }
  }
}

async function showDiskAnalyzerPopup(path) {
  if (DiskAnalyzerIsScanning) {
    if (DiskAnalyzerPath === path) {
      reopenDiskAnalyzerModal();
      return;
    } else if (!DiskAnalyzerIsBackground) {
      DiskAnalyzerUserCancelled = true;
      await triggerStopDiskAnalysis();
    }
  }

  IsPopUpOpen = true;
  DiskAnalyzerStack = [];
  DiskAnalyzerRootNode = null;
  ActiveAnalyzerNode = null;
  DiskAnalyzerIsScanning = false;
  DiskAnalyzerIsBackground = false;
  DiskAnalyzerPath = path;
  DiskAnalyzerLastPayload = null;
  DiskAnalyzerSelections = {}; // Clear selections for the new scan
  
  $("#disk-analyzer-back-btn").hide();

  const chip = document.getElementById("disk-analyzer-path-chip");
  if (chip) chip.textContent = path.split("/").pop() || path;

  const modal = document.getElementById("disk-analyzer-popup");
  if (modal) {
    modal.style.display = "flex";
    modal.style.width = "min(450px, 94vw)";
    modal.style.height = "420px";
  }
  
  $(".popup-background").css("display", "block");
  setTimeout(() => $(".popup-background").css("opacity", "1"));

  $("#disk-analyzer-setup").css("display", "flex");
  $("#disk-analyzer-content").hide();
  $("#disk-analyzer-loading").hide();
  $("#disk-analyzer-summary").hide();
  $("#btn-disk-analyzer-delete").hide();
  $("#btn-disk-analyzer-background").hide();
  $("#btn-disk-analyzer-stop").hide();
  $("#disk-analyzer-close-btn").show();
  $("#disk-analyzer-total-size").text("Total Size: --");

  const depthInput = document.getElementById("disk-analyzer-depth-input");
  const unlimitedCheck = document.getElementById("disk-analyzer-depth-unlimited");
  const startBtn = document.getElementById("btn-disk-analyzer-start");
  const bgBtn = document.getElementById("btn-disk-analyzer-background");
  const stopBtn = document.getElementById("btn-disk-analyzer-stop");

  if (depthInput && unlimitedCheck) {
    unlimitedCheck.checked = false;
    depthInput.removeAttribute("disabled");
    depthInput.style.opacity = "1";
    depthInput.value = "5";

    unlimitedCheck.onchange = () => {
      if (unlimitedCheck.checked) {
        depthInput.setAttribute("disabled", "true");
        depthInput.style.opacity = "0.5";
      } else {
        depthInput.removeAttribute("disabled");
        depthInput.style.opacity = "1";
      }
    };
  }

  if (bgBtn) {
    bgBtn.onclick = () => {
      putDiskAnalyzerInBackground();
    };
  }

  if (stopBtn) {
    stopBtn.onclick = async () => {
      DiskAnalyzerUserCancelled = true;
      await triggerStopDiskAnalysis();
    };
  }

  if (startBtn) {
    startBtn.onclick = async () => {
      let maxDepth = 5;
      if (unlimitedCheck && unlimitedCheck.checked) {
        maxDepth = 15;
      } else if (depthInput) {
        maxDepth = Math.max(1, parseInt(depthInput.value) || 5);
      }
      
      DiskAnalyzerMaxDepth = maxDepth;
      DiskAnalyzerIsScanning = true;
      DiskAnalyzerIsBackground = false;

      $("#disk-analyzer-setup").hide();
      $("#disk-analyzer-progress-folders").text("0");
      $("#disk-analyzer-progress-files").text("0");
      $("#disk-analyzer-progress-path").text("Initializing scan...");
      $("#disk-analyzer-progress-fill").css("width", "0%");
      $("#disk-analyzer-progress-percent").text("0%");
      $("#disk-analyzer-close-btn").hide();
      $("#btn-disk-analyzer-background").css("display", "flex");
      $("#btn-disk-analyzer-stop").css("display", "flex");
      $("#disk-analyzer-loading").css("display", "flex");

      try {
        const rootNode = await invoke("get_disk_space_tree", { path, maxDepth });
        DiskAnalyzerRootNode = rootNode;
        ActiveAnalyzerNode = rootNode;
        DiskAnalyzerIsScanning = false;
        
        if (DiskAnalyzerIsBackground) {
          const action = ArrActiveActions.find((a) => a.id === "diskanalyzer-scan");
          if (action) {
            action.progress = 100;
            action.currentFile = "Scan completed! Click to view results.";
            action.countLabel = "100%";
            action.speedLabel = "Done";
            renderActiveActionsPill();
            refreshActiveActionsPopup();
          }
          showToast("Disk analysis complete! Click active action to view.", ToastType.SUCCESS);
        } else {
          $("#disk-analyzer-progress-fill").css("width", "100%");
          $("#disk-analyzer-progress-percent").text("100%");
          
          setTimeout(() => {
            const modal = document.getElementById("disk-analyzer-popup");
            if (modal) {
              modal.style.width = "min(760px, 94vw)";
              modal.style.height = "min(500px, 85vh)";
            }
            $("#disk-analyzer-loading").hide();
            $("#btn-disk-analyzer-background").hide();
            $("#btn-disk-analyzer-stop").hide();
            $("#disk-analyzer-close-btn").show();
            
            $("#disk-analyzer-content").css("display", "flex");
            renderDiskSpaceNode(ActiveAnalyzerNode);
          }, 300);
        }
      } catch (error) {
        if (DiskAnalyzerPath === path) {
          const wasScanning = DiskAnalyzerIsScanning;
          DiskAnalyzerIsScanning = false;
          removeAction("diskanalyzer-scan");
          
          $("#btn-disk-analyzer-background").hide();
          $("#btn-disk-analyzer-stop").hide();
          $("#disk-analyzer-close-btn").show();
          
          if (error === "Cancelled") {
            if (DiskAnalyzerUserCancelled) {
              showToast("Analysis stopped.", ToastType.INFO);
              DiskAnalyzerUserCancelled = false;
            }
            if (IsPopUpOpen) {
              const modal = document.getElementById("disk-analyzer-popup");
              if (modal) {
                modal.style.width = "min(450px, 94vw)";
                modal.style.height = "420px";
              }
              $("#disk-analyzer-loading").hide();
              $("#disk-analyzer-content").hide();
              $("#disk-analyzer-setup").css("display", "flex");
            }
          } else {
            console.error("Failed to analyze directory storage:", error);
            showToast("Analysis failed: " + error, ToastType.ERROR);
            closeDiskAnalyzerPopup();
          }
        } else {
          console.log("Silently ignored old cancelled scan for path:", path);
        }
      }
    };
  }
}

function closeDiskAnalyzerPopup() {
  if (DiskAnalyzerIsScanning && !DiskAnalyzerIsBackground) {
    DiskAnalyzerUserCancelled = true;
    triggerStopDiskAnalysis();
  }
  const modal = document.getElementById("disk-analyzer-popup");
  if (modal) modal.style.display = "none";
  
  $(".popup-background").css("opacity", "0");
  setTimeout(() => $(".popup-background").css("display", "none"), 200);
  IsPopUpOpen = false;
  
  DiskAnalyzerRootNode = null;
  ActiveAnalyzerNode = null;
  DiskAnalyzerStack = [];
}

function renderDiskSpaceNode(node) {
  if (!node) return;

  const chip = document.getElementById("disk-analyzer-path-chip");
  if (chip) {
    let visualPath = node.path;
    let parts = visualPath.split("/");
    if (parts.length > 2) {
      chip.textContent = ".../" + parts[parts.length - 2] + "/" + parts[parts.length - 1];
    } else {
      chip.textContent = visualPath;
    }
  }

  $("#disk-analyzer-total-size").text("Total Size: " + formatBytes(node.size));

  if (DiskAnalyzerStack.length > 0) {
    $("#disk-analyzer-back-btn").show();
  } else {
    $("#disk-analyzer-back-btn").hide();
  }

  drawDonutChart("disk-analyzer-svg", node.children, node.size);
  updateDeleteButton();
}

function navigateDiskAnalyzerBack() {
  if (DiskAnalyzerStack.length > 0) {
    ActiveAnalyzerNode = DiskAnalyzerStack.pop();
    renderDiskSpaceNode(ActiveAnalyzerNode);
  }
}

function drawDonutChart(svgId, nodes, totalSize) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";
  
  const rOut = 100;
  const rIn = 65;
  
  let chartData = [];
  let otherSize = 0;
  
  // Separate directories and files
  let directories = nodes.filter(n => n.is_dir);
  let files = nodes.filter(n => !n.is_dir);
  
  // Sort both by size descending
  directories.sort((a, b) => b.size - a.size);
  files.sort((a, b) => b.size - a.size);
  
  // All directories are individual items
  chartData.push(...directories);
  
  // Add up to 6 largest files individually, group the rest
  const maxFilesToShow = 6;
  for (let i = 0; i < files.length; i++) {
    if (i < maxFilesToShow) {
      chartData.push(files[i]);
    } else {
      otherSize += files[i].size;
    }
  }
  
  if (otherSize > 0) {
    chartData.push({
      name: "Other items",
      path: "",
      is_dir: false,
      size: otherSize,
      children: []
    });
  }
  
  // Sort the combined chartData descending by size for ordered rendering
  chartData.sort((a, b) => b.size - a.size);
  
  // Save globally for virtual scrolling
  DiskAnalyzerChartData = chartData;
  DiskAnalyzerLastTotalSize = totalSize;
  
  let cumulativeAngle = -Math.PI / 2;
  
  const centerName = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerName.setAttribute("class", "donut-center-name");
  centerName.setAttribute("text-anchor", "middle");
  centerName.setAttribute("y", "-8");
  centerName.setAttribute("fill", "var(--textColor)");
  centerName.setAttribute("font-size", "11px");
  centerName.setAttribute("font-weight", "600");
  centerName.style.pointerEvents = "none";
  centerName.textContent = "Total Folder";
  
  const centerSize = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerSize.setAttribute("class", "donut-center-size");
  centerSize.setAttribute("text-anchor", "middle");
  centerSize.setAttribute("y", "12");
  centerSize.setAttribute("fill", "var(--textColor2)");
  centerSize.setAttribute("font-size", "11px");
  centerSize.style.pointerEvents = "none";
  centerSize.textContent = formatBytes(totalSize);

  const centerPercent = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerPercent.setAttribute("class", "donut-center-percent");
  centerPercent.setAttribute("text-anchor", "middle");
  centerPercent.setAttribute("y", "28");
  centerPercent.setAttribute("fill", "var(--selectColor2)");
  centerPercent.setAttribute("font-size", "10px");
  centerPercent.setAttribute("font-weight", "700");
  centerPercent.style.pointerEvents = "none";
  centerPercent.textContent = "100%";

  svg.appendChild(centerName);
  svg.appendChild(centerSize);
  svg.appendChild(centerPercent);

  if (totalSize === 0) {
    centerName.textContent = "Empty Folder";
    centerSize.textContent = "0 B";
    centerPercent.textContent = "";
    
    // Clear virtual list as well
    const legend = document.getElementById("disk-analyzer-legend");
    if (legend) {
      const content = legend.querySelector(".virtual-scroll-content");
      const spacer = legend.querySelector(".virtual-scroll-spacer");
      if (content) content.innerHTML = "";
      if (spacer) spacer.style.height = "0px";
    }
    return;
  }

  chartData.forEach((item, index) => {
    const percentage = item.size / totalSize;
    if (percentage === 0) return;
    
    const angleDelta = percentage * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angleDelta;
    cumulativeAngle = endAngle;
    
    const x1 = rOut * Math.cos(startAngle);
    const y1 = rOut * Math.sin(startAngle);
    const x2 = rOut * Math.cos(endAngle);
    const y2 = rOut * Math.sin(endAngle);
    
    const x3 = rIn * Math.cos(endAngle);
    const y3 = rIn * Math.sin(endAngle);
    const x4 = rIn * Math.cos(startAngle);
    const y4 = rIn * Math.sin(startAngle);
    
    const largeArcFlag = angleDelta > Math.PI ? 1 : 0;
    
    const d = `
      M ${x1} ${y1}
      A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${rIn} ${rIn} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
    
    const color = DiskAnalyzerColors[index % DiskAnalyzerColors.length];
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d.trim());
    path.setAttribute("fill", color);
    path.setAttribute("class", `analyzer-arc arc-index-${index}`);
    path.setAttribute("opacity", "0.82");
    
    const itemPctStr = (percentage * 100).toFixed(1) + "%";
    const formattedSize = formatBytes(item.size);
    
    const highlightLegend = () => {
      path.setAttribute("opacity", "1");
      path.style.transform = "scale(1.03)";
      
      centerName.textContent = truncateString(item.name, 15);
      centerSize.textContent = formattedSize;
      centerPercent.textContent = itemPctStr;
      
      $(`.legend-row-${index}`).css({
        "background": "var(--transparentColorActive)",
        "border-color": "var(--selectColor2)",
        "transform": "none"
      });
    };
    
    const clearHighlight = () => {
      path.setAttribute("opacity", "0.82");
      path.style.transform = "none";
      
      centerName.textContent = "Total Folder";
      centerSize.textContent = formatBytes(totalSize);
      centerPercent.textContent = "100%";
      
      $(`.legend-row-${index}`).css({
        "background": "rgba(255, 255, 255, 0.02)",
        "border-color": "rgba(255, 255, 255, 0.03)",
        "transform": "none"
      });
    };
    
    path.addEventListener("mouseenter", highlightLegend);
    path.addEventListener("mouseleave", clearHighlight);
    
    if (item.is_dir && item.children && item.children.length > 0) {
      path.addEventListener("click", () => {
        DiskAnalyzerStack.push(ActiveAnalyzerNode);
        ActiveAnalyzerNode = item;
        renderDiskSpaceNode(ActiveAnalyzerNode);
      });
    } else {
      path.addEventListener("click", () => {
        if (item.is_dir) {
          showToast("This folder has no pre-calculated sub-elements (either it is empty or the analysis depth limit was reached).", ToastType.INFO);
        } else {
          showToast("This item is a file and does not contain sub-folders.", ToastType.INFO);
        }
      });
    }
    
    svg.appendChild(path);
  });
  
  // Virtual scrolling setup for legend
  const legend = document.getElementById("disk-analyzer-legend");
  if (legend) {
    legend.scrollTop = 0;
    if (!legend.dataset.scrollBound) {
      legend.addEventListener("scroll", () => {
        renderVirtualLegend();
      });
      legend.dataset.scrollBound = "true";
    }
    renderVirtualLegend();
  }
}

function renderVirtualLegend() {
  const legend = document.getElementById("disk-analyzer-legend");
  if (!legend) return;
  
  const content = legend.querySelector(".virtual-scroll-content");
  const spacer = legend.querySelector(".virtual-scroll-spacer");
  if (!content || !spacer) return;
  
  const totalItems = DiskAnalyzerChartData.length;
  const rowHeight = 32;
  const rowGap = 6;
  const rowSpacing = rowHeight + rowGap; // 38px
  
  const totalHeight = totalItems > 0 ? (totalItems * rowSpacing - rowGap) : 0;
  spacer.style.height = totalHeight + "px";
  
  const scrollTop = legend.scrollTop;
  const containerHeight = legend.clientHeight || 300;
  
  const startIndex = Math.floor(scrollTop / rowSpacing);
  const endIndex = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / rowSpacing));
  
  const bufferedStartIndex = Math.max(0, startIndex - 3);
  const bufferedEndIndex = Math.min(totalItems, endIndex + 3);
  
  content.innerHTML = "";
  content.style.transform = `translateY(${bufferedStartIndex * rowSpacing}px)`;
  
  const svg = document.getElementById("disk-analyzer-svg");
  
  for (let index = bufferedStartIndex; index < bufferedEndIndex; index++) {
    const item = DiskAnalyzerChartData[index];
    const percentage = item.size / DiskAnalyzerLastTotalSize;
    const itemPctStr = (percentage * 100).toFixed(1) + "%";
    const formattedSize = formatBytes(item.size);
    const color = DiskAnalyzerColors[index % DiskAnalyzerColors.length];
    
    const legendRow = document.createElement("div");
    legendRow.className = `analyzer-legend-row legend-row-${index}`;
    
    let folderIcon = item.is_dir ? '<i class="fa-solid fa-folder" style="opacity: 0.7; font-size: 10px;"></i>' : '<i class="fa-solid fa-file" style="opacity: 0.6; font-size: 10px;"></i>';
    if (item.name === "Other items") {
      folderIcon = '<i class="fa-solid fa-cubes" style="opacity: 0.7; font-size: 10px;"></i>';
    }

    let checkboxHtml = '';
    if (item.path && item.name !== "Other items") {
      const isChecked = isNodeSelected(item.path);
      const isIndeterminate = isNodeIndeterminate(item);
      const indeterminateClass = isIndeterminate ? ' indeterminate' : '';
      checkboxHtml = `<input type="checkbox" class="analyzer-item-checkbox${indeterminateClass}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />`;
    }

    legendRow.innerHTML = `
      <span style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
        <span class="analyzer-legend-color-box" style="background-color: ${color}; width: 8px; height: 8px;"></span>
        ${checkboxHtml}
        ${folderIcon}
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 550; color: var(--textColor);">${item.name}</span>
      </span>
      <span style="display: flex; gap: 8px; align-items: center; font-variant-numeric: tabular-nums;">
        <span style="color: var(--textColor2); opacity: 0.85;">${itemPctStr}</span>
        <span style="font-weight: 600; color: var(--selectColor2);">${formattedSize}</span>
      </span>
    `;
    
    const checkboxEl = legendRow.querySelector(".analyzer-item-checkbox");
    if (checkboxEl) {
      checkboxEl.onclick = (e) => {
        e.stopPropagation();
        toggleNodeSelection(item.path);
        renderDiskSpaceNode(ActiveAnalyzerNode);
      };
    }

    const highlightArc = () => {
      if (svg) {
        const pathEl = svg.querySelector(`.arc-index-${index}`);
        if (pathEl) {
          pathEl.setAttribute("opacity", "1");
          pathEl.style.transform = "scale(1.03)";
        }
        
        const centerName = svg.querySelector(".donut-center-name");
        const centerSize = svg.querySelector(".donut-center-size");
        const centerPercent = svg.querySelector(".donut-center-percent");
        
        if (centerName) centerName.textContent = truncateString(item.name, 15);
        if (centerSize) centerSize.textContent = formattedSize;
        if (centerPercent) centerPercent.textContent = itemPctStr;
      }
      
      $(`.legend-row-${index}`).css({
        "background": "var(--transparentColorActive)",
        "border-color": "var(--selectColor2)",
        "transform": "none"
      });
    };
    
    const clearHighlightArc = () => {
      if (svg) {
        const pathEl = svg.querySelector(`.arc-index-${index}`);
        if (pathEl) {
          pathEl.setAttribute("opacity", "0.82");
          pathEl.style.transform = "none";
        }
        
        const centerName = svg.querySelector(".donut-center-name");
        const centerSize = svg.querySelector(".donut-center-size");
        const centerPercent = svg.querySelector(".donut-center-percent");
        
        if (centerName) centerName.textContent = "Total Folder";
        if (centerSize) centerSize.textContent = formatBytes(DiskAnalyzerLastTotalSize);
        if (centerPercent) centerPercent.textContent = "100%";
      }
      
      $(`.legend-row-${index}`).css({
        "background": "rgba(255, 255, 255, 0.02)",
        "border-color": "rgba(255, 255, 255, 0.03)",
        "transform": "none"
      });
    };

    legendRow.addEventListener("mouseenter", highlightArc);
    legendRow.addEventListener("mouseleave", clearHighlightArc);
    
    if (item.is_dir && item.children && item.children.length > 0) {
      legendRow.onclick = () => {
        DiskAnalyzerStack.push(ActiveAnalyzerNode);
        ActiveAnalyzerNode = item;
        renderDiskSpaceNode(ActiveAnalyzerNode);
      };
    } else {
      legendRow.onclick = () => {
        if (item.is_dir) {
          showToast("This folder has no pre-calculated sub-elements (either it is empty or the analysis depth limit was reached).", ToastType.INFO);
        } else {
          showToast("This item is a file and does not contain sub-folders.", ToastType.INFO);
        }
      };
    }
    
    content.appendChild(legendRow);
  }
}

function truncateString(str, num) {
  return str.length > num ? str.slice(0, num) + "..." : str;
}

async function openItemByPath(path) {
  let isSwitched = await invoke("open_dir", { path });
  if (isSwitched) {
    if (IsDualPaneEnabled === false) {
      await setCurrentDir(path, "", false);
      await listDirectories();
    } else {
      await setCurrentDir(path, SelectedItemPaneSide, false);
      await listDirectories();
    }
  }
}

let isUpdateInProgress = false;
let LastCachedUpdate = null;

function showUpdateDetails(update) {
  $("#update-popup-icon").html('<i class="fa-solid fa-gift" style="color: #4ba3ff;"></i>');
  $("#update-popup-title").text("New Version!");
  $("#update-status-message").text("A new version of CoDriver is available!");
  $("#update-version-details").text(update.version);
  
  if (update.body) {
    $("#update-release-notes").html(renderMarkdown(update.body));
    $("#update-notes-row").show();
  } else {
    $("#update-notes-row").hide();
  }
  
  $("#update-version-row").show();
  $("#update-action-btn").show();
}

async function checkForUpdates(forceRefetch = false) {
  if (isUpdateInProgress) return;
  
  const popup = document.getElementById("update-status-popup");
  if (!popup) return;
  
  // Hide the notification tooltip immediately when opening the details popup
  $("#update-notification-tooltip").hide();
  
  popup.style.display = "flex";
  IsPopUpOpen = true;
  IsDisableShortcuts = true;
  
  if (!forceRefetch && LastCachedUpdate && LastCachedUpdate.available) {
    showUpdateDetails(LastCachedUpdate);
    return;
  }
  
  $("#update-popup-icon").html('<i class="fa-solid fa-spinner fa-spin"></i>');
  $("#update-popup-title").text("Checking Updates");
  $("#update-status-message").text("Checking for updates on GitHub...");
  $("#update-version-row").hide();
  $("#update-notes-row").hide();
  $("#update-progress-row").hide();
  $("#update-action-btn").hide();
  $("#update-close-btn").prop("disabled", false);
  
  try {
    const update = await invoke("check_for_updates");
    LastCachedUpdate = update;
    if (update.available) {
      showUpdateDetails(update);
      $("#header-update-btn").css("display", "flex");
    } else {
      $("#update-popup-icon").html('<i class="fa-solid fa-circle-check" style="color: #4cd964;"></i>');
      $("#update-popup-title").text("Up to Date");
      $("#update-status-message").text("You are running the latest version of CoDriver!");
      $("#update-version-row").hide();
      $("#update-notes-row").hide();
      $("#update-action-btn").hide();
      $("#header-update-btn").hide();
    }
  } catch (err) {
    $("#update-popup-icon").html('<i class="fa-solid fa-circle-exclamation" style="color: #ff3b30;"></i>');
    $("#update-popup-title").text("Check Failed");
    $("#update-status-message").text("Error checking updates: " + err);
    $("#update-version-row").hide();
    $("#update-notes-row").hide();
    $("#update-action-btn").hide();
  }
}

async function checkUpdatesInBackground() {
  try {
    const update = await invoke("check_for_updates");
    LastCachedUpdate = update;
    if (update.available) {
      console.log("Background check: New version is available:", update.version);
      $("#header-update-btn").css("display", "flex");
      
      // Trigger and display the update notification tooltip
      const tooltip = $("#update-notification-tooltip");
      tooltip.fadeIn(200);
      
      // Automatically hide the tooltip after exactly 5 seconds
      setTimeout(() => {
        tooltip.fadeOut(300);
      }, 5000);
    } else {
      console.log("Background check: CoDriver is up to date.");
      $("#header-update-btn").hide();
    }
  } catch (err) {
    console.error("Background check for updates failed:", err);
  }
}

function closeUpdatePopup() {
  if (isUpdateInProgress) return;
  const popup = document.getElementById("update-status-popup");
  if (popup) {
    popup.style.display = "none";
  }
  IsPopUpOpen = false;
  IsDisableShortcuts = false;
}

async function startUpdateDownload() {
  if (isUpdateInProgress) return;
  isUpdateInProgress = true;
  
  $("#update-close-btn").prop("disabled", true);
  $("#update-action-btn").hide();
  $("#update-progress-row").show();
  $("#update-progress-bar").css("width", "0%");
  $("#update-progress-text").text("0%");
  $("#update-status-message").text("Downloading and installing application update...");
  
  try {
    await invoke("download_and_install_update");
    $("#update-status-message").text("Update complete! Relaunching CoDriver...");
  } catch (err) {
    isUpdateInProgress = false;
    $("#update-close-btn").prop("disabled", false);
    $("#update-progress-row").hide();
    $("#update-popup-icon").html('<i class="fa-solid fa-circle-exclamation" style="color: #ff3b30;"></i>');
    $("#update-popup-title").text("Update Failed");
    $("#update-status-message").text("Failed to install update: " + err);
  }
}

