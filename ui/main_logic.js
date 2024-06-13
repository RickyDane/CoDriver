const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog;
const { message } = window.__TAURI__.dialog;
const { open } = window.__TAURI__.dialog;
const { appWindow } = window.__TAURI__.window;
const { writeText } = window.__TAURI__.clipboard;
const { writeFile } = window.__TAURI__.clipboard;
const { getTauriVersion } = window.__TAURI__.app;
const { getVersion } = window.__TAURI__.app;
const { getName } = window.__TAURI__.app;
const { getMatches } = window.__TAURI__.cli;
const { platform } = window.__TAURI__.os;
const { arch } = window.__TAURI__.os;
const { fetch } = window.__TAURI__.http;
const convertFileSrc = window.__TAURI__.convertFileSrc;
const { appDataDir } = window.__TAURI__.path;
const { resolveResource } = window.__TAURI__.path;
const { resourceDir } = window.__TAURI__.path;
const { BaseDirectory } = window.__TAURI__.fs;
const { readDir } = window.__TAURI__.fs;

async function startDrag(options, onEvent) {
	await invoke("plugin:drag|start_drag", {
		item: options.item,
		image: options.icon,
		onEventFn: onEvent ? transformCallback(onEvent) : null
	});
}

/* region Global Variables */
let ViewMode = "wrap";
let OrgViewMode = "wrap";

let DirectoryList;
let Applications = [];
let ArrDirectoryItems = [];
let DirectoryCount = document.querySelector(".directory-entries-count");
let ContextMenu = document.querySelector(".context-menu");
let CopyFileName = "";
let CopyFilePath = "";
let CurrentDir = "/Home";
let IsShowDisks = false;
let IsShowHiddenFiles = false;

let IsMetaDown = false;
let IsCtrlDown = false;
let IsShiftDown = false;

let IsQuickSearchOpen = false;
let ConfiguredPathOne = "";
let ConfiguredPathTwo = "";
let ConfiguredPathThree = "";
let IsTabs = false;
let TabCount = 0;
let CurrentActiveTab = 1;
let CurrentMillerCol = 0;
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
let IsPopUpOpen = false;
let SettingsSearchDepth = 10;
let SettingsMaxItems = 1000;
let IsFullSearching = false;

let ArrSelectedItems = [];
let ArrCopyItems = [];

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

/* Colors  */
let PrimaryColor = "#3f4352";
let SecondaryColor = "rgb(56, 59, 71)";
let SelectedColor = "rgba(0, 0, 0, 0.5)";
let TransparentColor = "rgba(0, 0, 0, 0.1)";
let CurrentTheme = "0";

/* endregion */

/* Upper right search bar logic */

document.querySelector(".search-bar-input").addEventListener("focusin", (e) => { IsInputFocused = true; });
document.querySelector(".search-bar-input").addEventListener("focusout", (e) => { IsInputFocused = false; });
document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		let fileName = document.querySelector(".search-bar-input").value;
		searchFor(fileName);
	}
	else if (e.keyCode === 27) {
		cancelSearch();
	}
});

/* Quicksearch for dual pane view */
document.querySelector(".fullsearch-search-button").onclick = async () => {
	if (IsFullSearching == false) {
		await startFullSearch();
	}
};
document.querySelectorAll(".trigger-for-full-search").forEach(item => item.addEventListener("keyup", async (e) => {
	if (e.keyCode === 13 && IsFullSearching == false) {
		await startFullSearch();
	}
}));

async function startFullSearch() {
	IsFullSearching = true;
	let fileName = document.querySelector(".full-dualpane-search-input").value;
	let maxItems = parseInt(document.querySelector(".full-search-max-items-input").value);
	maxItems = maxItems >= 1 ? maxItems : 9999999;
	let searchDepth = parseInt(document.querySelector(".full-search-search-depth-input").value);
	searchDepth = searchDepth >= 1 ? searchDepth : 9999999;
	let fileContent = document.querySelector(".full-dualpane-search-file-content-input").value;
	await searchFor(fileName, maxItems, searchDepth, false, fileContent);
}

document.addEventListener("keyup", (e) => {
	if (e.key === "Escape") {
		$(".search-bar-input").blur();
		// Close all popups etc.
		ContextMenu.style.display = "none";
		closeAllPopups();
		if (DraggedOverElement != null) {
			DraggedOverElement.style.opacity = "1";
		}
		document.querySelectorAll(".site-nav-bar-button").forEach(item => { item.style.opacity = "1"; });
	}
});

function closeAllPopups() {
	closeSearchBar();
	closeSettings();
	closeInputDialog();
	closeFullSearchContainer();
	closeFtpConfig();
	closeInputPopup();
	closeItemPreview();
	closeMultiRenamePopup();
	closeCompressPopup();
	closeYtDownloadPopup();
	closeLLMPromptInputPopup();
	unSelectAllItems();
	IsPopUpOpen = false;
	IsInputFocused = false;
}

// Close context menu or new folder input dialog when click elsewhere
document.addEventListener("click", (e) => {
	if (
		!e.target.classList.contains("context-item-icon") &&
		!e.target.classList.contains("context-item") &&
		!e.target.classList.contains("open-with-item") &&
		!e.target.classList.contains("input-dialog") &&
		!e.target.classList.contains("directory-item-entry") &&
		!e.target.classList.contains("directory-entry") &&
		!e.target.classList.contains("disk-item") &&
		!e.target.classList.contains("item-button") &&
		!e.target.classList.contains("item-button-list") &&
		!e.target.classList.contains("item-icon") &&
		!e.target.classList.contains("item-button-list-text") &&
		!e.target.classList.contains("item-button-list-info-span") &&
		!e.target.classList.contains("disk-item-top") &&
		!e.target.classList.contains("disk-info") &&
		!e.target.classList.contains("item-button-text")
	) {
		ContextMenu.style.display = "none";
		$(".extra-c-menu")?.remove();

		// Reset context menu
		ContextMenu.children[0].setAttribute("disabled", "true");
		ContextMenu.children[0].classList.add("c-item-disabled");
		ContextMenu.children[1].setAttribute("disabled", "true");
		ContextMenu.children[1].classList.add("c-item-disabled");
		ContextMenu.children[2].setAttribute("disabled", "true");
		ContextMenu.children[2].classList.add("c-item-disabled");
		ContextMenu.children[3].setAttribute("disabled", "true");
		ContextMenu.children[3].classList.add("c-item-disabled");
		ContextMenu.children[4].setAttribute("disabled", "true");
		ContextMenu.children[4].classList.add("c-item-disabled");
		ContextMenu.children[5].setAttribute("disabled", "true");
		ContextMenu.children[5].classList.add("c-item-disabled");
		ContextMenu.children[6].setAttribute("disabled", "true");
		ContextMenu.children[6].classList.add("c-item-disabled");
		ContextMenu.children[9].setAttribute("disabled", "true");
		ContextMenu.children[9].classList.add("c-item-disabled");
		// ContextMenu.children[10].setAttribute("disabled", "true");
		// ContextMenu.children[10].classList.add("c-item-disabled");

		document.querySelector(".c-item-duplicates").setAttribute("disabled", "true");
		document.querySelector(".c-item-duplicates").classList.add("c-item-disabled");

		unSelectAllItems();
		if (DraggedOverElement != null) {
			DraggedOverElement.style.filter = "none";
		}
	}
});

// Open context menu for pasting for example
// :context open
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	if (IsPopUpOpen == false) {
		ContextMenu.children[7].replaceWith(ContextMenu.children[7].cloneNode(true));

		positionContextMenu(e);

		ContextMenu.children[7].addEventListener("click", function () { createFileInputPrompt(e); }, { once: true },);

		if (CopyFilePath == "") {
			document.querySelector(".c-item-paste").setAttribute("disabled", "true");
			document.querySelector(".c-item-paste").classList.add("c-item-disabled");
		}
		else {
			document.querySelector(".c-item-paste").removeAttribute("disabled");
			document.querySelector(".c-item-paste").classList.remove("c-item-disabled");
		}
	}
	document.querySelector(".c-item-ytdownload").replaceWith(document.querySelector(".c-item-ytdownload").cloneNode(true));
	document.querySelector(".c-item-ytdownload").addEventListener("click", async () => { await showYtDownload(); }, { once: true })
});

// Position contextmenu
function positionContextMenu(e) {
	ContextMenu.style.display = "flex";
	if (ContextMenu.offsetHeight + e.clientY >= window.innerHeight) {
		ContextMenu.style.top = e.clientY - ContextMenu.offsetHeight + "px";
		ContextMenu.style.bottom = null;
	}
	else if (ContextMenu.offsetHeight - e.clientY <= window.innerHeight) {
		ContextMenu.style.bottom = null;
		ContextMenu.style.top = e.clientY + "px";
	}
	else {
		ContextMenu.style.bottom = null;
		ContextMenu.style.top = e.clientY / 2 + "px";
	}
	if (ContextMenu.clientWidth + e.clientX >= window.innerWidth) {
		ContextMenu.style.left = e.clientX - ContextMenu.clientWidth + "px";
	}
	else {
		ContextMenu.style.left = e.clientX + "px";
	}
}

/* Shortcuts configuration */

document.onkeydown = async (e) => {
	// Shortcut for jumping to configured directory
	if (e.metaKey && Platform == "darwin") {
		IsMetaDown = true;
	}
	if (e.ctrlKey && Platform != "darwin") {
		IsCtrlDown = true;
	}
	if (e.shiftKey) {
		IsShiftDown = false;
	}
	if (e.altKey && e.code == "Digit1") {
		if (ConfiguredPathOne == "") {
			return;
		}
		openItem(null, SelectedItemPaneSide, ConfiguredPathOne);
	}
	if (e.altKey && e.code == "Digit2") {
		if (ConfiguredPathTwo == "") {
			return;
		}
		openItem(null, SelectedItemPaneSide, ConfiguredPathTwo);
	}
	if (e.altKey && e.code == "Digit3") {
		if (ConfiguredPathThree == "") {
			return;
		}
		openItem(null, SelectedItemPaneSide, ConfiguredPathThree);
	}

	if (false) {
		//IsTabsEnabled == true) {
		// Check if ctrl + t or is pressed to open new tab
		if ((e.ctrlKey || e.keyCode == 91) && e.keyCode == 84) {
			if (TabCount < 5) {
				let tabCounter = 1;
				if (IsTabs == false) {
					IsTabs = true;
					document.querySelector(".tab-header").style.display = "flex";
					document.querySelectorAll(".explorer-container").forEach((item) => {
						if (ViewMode == "column") {
							item.style.marginTop = "35px";
							item.style.height = "calc(100vh - 135px)";
							item.style.paddingBottom = "10px";
						} else {
							item.style.height = "calc(100vh - 100px)";
							item.style.paddingBottom = "20px";
						}
					});
					createTab(1, true);
					TabCount++;
				}
				let checkTab = document.querySelector(".fx-tab-" + tabCounter);
				while (checkTab != null) {
					tabCounter++;
					checkTab = document.querySelector(".fx-tab-" + tabCounter);
				}
				createTab(tabCounter, false);
				TabCount++;
			}
		}

		// Remove current active tab when pressing ctrl + w
		if (e.ctrlKey && e.keyCode == 87) {
			closeTab();
		}
	}

	if (IsDualPaneEnabled == true && IsDisableShortcuts == false && IsPopUpOpen == false) {
		// check if lshift + f5 is pressed
		if (e.shiftKey && e.key == "F5") {
			e.preventDefault();
			e.stopPropagation();
			let isToMove = await confirm("Current selection will be moved over");
			if (isToMove == true) {
				moveTo(true);
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
		// check if backspace is pressed
		if (e.keyCode == 8 && IsPopUpOpen == false) {
			goBack();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if return is pressed
		if (!e.altKey && e.keyCode == 13) {
			openSelectedItem();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if arrow up is pressed
		if (e.keyCode == 38) {
			if (SelectedElement == null) {
				goUp(false, true);
			}
			else {
				goUp();
			}
			e.preventDefault();
			e.stopPropagation();
		}
		// check if arrow down is pressed
		if (e.keyCode == 40) {
			if (SelectedElement == null) {
				goUp(false, true);
			}
			else {
				goDown();
			}
			e.preventDefault();
			e.stopPropagation();
		}
		// check if tab is pressed
		if (e.keyCode == 9) {
			goToOtherPane();
			e.preventDefault();
			e.stopPropagation();
		}
		if (IsPopUpOpen == false) {
			// check if f8 is pressed
			if (e.keyCode == 119) {
				openFullSearchContainer();
				e.preventDefault();
				e.stopPropagation();
			}
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
	}
	else if (IsItemPreviewOpen == true) {
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
	if (((Platform != "darwin" && IsCtrlDown && e.altKey) || (Platform == "darwin" && e.shiftKey)) && e.key == "c") {
		await writeText(CurrentDir);
		showToast("Info", "Current dir path copied", "success");
		return;
		// alert("Current dir path copied!");
	}
	// Check if cmd / ctrl + k is pressed
	if (e.key == "k" && (e.ctrlKey || e.metaKey)) {
		$(".search-bar-input").focus();
		IsInputFocused = true;
	}
	// Check if space is pressed on selected item
	if (e.key == " " && SelectedElement != null) {
		if (IsPopUpOpen == false || IsItemPreviewOpen == true) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (IsPopUpOpen == false && IsItemPreviewOpen == false) {
			showItemPreview(SelectedElement);
		}
		else {
			closeItemPreview();
		}
	}

	if (IsPopUpOpen == false) {
		// check if del is pressed
		if (e.keyCode == 46 || (e.metaKey && e.keyCode == 8)) {
			await deleteItems();
			closeLoadingPopup();
			listDirectories();
			goUp();
			e.preventDefault();
			e.stopPropagation();
		}
		// Check if cmd / ctrl + a is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "a" && IsInputFocused == false) {
			if (IsDualPaneEnabled) {
				if (SelectedItemPaneSide == "left") {
					await unSelectAllItems();
					for (let i = 0; i < LeftPaneItemCollection.children.length; i++) {
						selectItem(LeftPaneItemCollection.children[i]);
					}
				}
				else {
					await unSelectAllItems();
					for (let i = 0; i < RightPaneItemCollection.children.length; i++) {
						selectItem(RightPaneItemCollection.children[i]);
					}
				}
			}
			else {
				await unSelectAllItems();
				for (let i = 0; i < DirectoryList.children.length; i++) {
					selectItem(DirectoryList.children[i]);
				}
			}
		}
		if ((e.altKey && e.key == "Enter") || e.key == "F2") {
			// check if alt + enter is pressed
			renameElementInputPrompt(SelectedElement);
		}
		// check if cmd / ctrl + r is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "r") {
			await unSelectAllItems();
			refreshView();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if cmd / ctrl + c is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "c" && IsInputFocused == false) {
			copyItem(SelectedElement);
			e.preventDefault();
			e.stopPropagation();
		}
		// check if cmd / ctrl + x is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "x" && IsInputFocused == false) {
			copyItem(SelectedElement, true);
			e.preventDefault();
			e.stopPropagation();
		}
		// check if cmd / ctrl + v is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "v" && IsInputFocused == false) {
			pasteItem();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if cmd / ctrl + g is pressed | Path input
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "g") {
			showInputPopup("Input path to jump to");
			e.preventDefault();
			e.stopPropagation();
		}
		// New folder input prompt when f7 is pressed
		if (e.key == "F7") {
			createFolderInputPrompt();
			e.preventDefault();
			e.stopPropagation();
		}
		// New file input prompt when f6 is pressed
		if (e.keyCode == 117) {
			createFileInputPrompt();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if ctrl / cmd + f is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.keyCode == 70 && IsShowDisks == false) {
			openSearchBar();
			e.preventDefault();
			e.stopPropagation();
		}

		// check if ctrl / cmd + m is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.shiftKey && (e.key == "M" || e.key == "m")) {
			showMultiRenamePopup();
			e.preventDefault();
			e.stopPropagation();
		}

		// Check if ctrl / cmd + p is pressed
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.shiftKey && (e.key == "P" || e.key == "p")) {
			showPromptInput();
			e.preventDefault();
			e.stopPropagation();
		}
	}
};

// Reset key toggle
document.onkeyup = (e) => {
	if (e.key == "G" || e.key == "g") {
		IsGDown = false;
	}
	if (e.keyCode === 91 && Platform == "darwin") {
		IsMetaDown = false;
	}
	if (e.key == "Control" && Platform != "darwin") {
		IsCtrlDown = false;
	}
	if (e.shiftKey) {
		IsShiftDown = false;
	}
};

/* End of shortcut config */

// check for click on one of the dual pane containers and set directory accordingly
document.querySelector(".dual-pane-left").addEventListener("click", () => {
	if (IsPopUpOpen == false && SelectedItemPaneSide != "left") {
		setCurrentDir(LeftDualPanePath, "left");
	}
});
document.querySelector(".dual-pane-left").addEventListener("contextmenu", () => {
	if (IsPopUpOpen == false && SelectedItemPaneSide != "left") {
		setCurrentDir(LeftDualPanePath, "left");
	}
});
document.querySelector(".dual-pane-right").addEventListener("click", () => {
	if (IsPopUpOpen == false && SelectedItemPaneSide != "right") {
		setCurrentDir(RightDualPanePath, "right");
	}
});
document.querySelector(".dual-pane-right").addEventListener("contextmenu", () => {
	if (IsPopUpOpen == false && SelectedItemPaneSide != "right") {
		setCurrentDir(RightDualPanePath, "right");
	}
});

// Main function to handle directory visualization
async function showItems(items, dualPaneSide = "", millerCol = 1) {
	await getCurrentDir();
	IsShowDisks = false;
	// Check which tab is currently active and write CurrentDir to TabOnePath and so on
	// Todo: Make more "dynamic friendly"
	switch (CurrentActiveTab) {
		case 1:
			TabOnePath = CurrentDir;
			break;
		case 2:
			TabTwoPath = CurrentDir;
			break;
		case 3:
			TabThreePath = CurrentDir;
			break;
		case 4:
			TabFourPath = CurrentDir;
			break;
		case 5:
			TabFivePath = CurrentDir;
			break;
	}
	window.scrollTo(0, 0);
	if (IsTabsEnabled == true) {
		document.querySelector(".tab-container-" + CurrentActiveTab).innerHTML = "";
	}
	if (IsDualPaneEnabled == true) {
		if (dualPaneSide == "left") {
			document.querySelector(".dual-pane-left").innerHTML = "";
			document.querySelector(".dual-pane-left").scrollTop = 0;
		}
		else if (dualPaneSide == "right") {
			document.querySelector(".dual-pane-right").innerHTML = "";
			document.querySelector(".dual-pane-right").scrollTop = 0;
		}
		else {
			document.querySelector(".dual-pane-left").innerHTML = "";
			document.querySelector(".dual-pane-right").innerHTML = "";
		}
	}
	document.querySelector(".normal-list-column-header").style.display = "block";
	document.querySelector(".disk-list-column-header").style.display = "none";

	let currentTab = document.querySelector(".fx-tab-" + CurrentActiveTab);
	if (currentTab != null) {
		currentTab.children[0].innerHTML = CurrentDir.split("/")[CurrentDir.split("/").length - 1];
	}
	delete currentTab;
	DirectoryList = document.createElement("div");
	if (IsDualPaneEnabled == true) {
		DirectoryList.className = "directory-list-dual-pane";
	}
	else {
		DirectoryList.className = "directory-list";
	}
	let hiddenItemsLength = items.filter((str) => str.name.startsWith(".")).length;
	if (!IsShowHiddenFiles) {
		items = items.filter((str) => !str.name.startsWith("."));
	}
	// DirectoryCount.innerHTML = "Objects: " + items.length + " / " + hiddenItemsLength;
	delete hiddenItemsLength;
	let counter = 0;
	items.forEach((item) => {
		let itemLink = document.createElement("button");
		itemLink.setAttribute("onclick", "interactWithItem(this, '" + dualPaneSide + "')");
		itemLink.setAttribute("itempath", item.path);
		itemLink.setAttribute("itemindex", counter++);
		itemLink.setAttribute("itempaneside", dualPaneSide);
		itemLink.setAttribute("itemisdir", item.is_dir);
		itemLink.setAttribute("itemext", item.extension);
		itemLink.setAttribute("itemname", item.name);
		itemLink.setAttribute("itemsize", formatBytes(item.size));
		itemLink.setAttribute("itemrawsize", item.size);
		itemLink.setAttribute("itemmodified", item.last_modified);
		itemLink.setAttribute("draggable", true);
		itemLink.setAttribute("id", "item-link");
		itemLink.setAttribute("itemformillercol", parseInt(millerCol) + 1);

		let newRow = document.createElement("div");
		newRow.className = "directory-item-entry";
		let fileIcon = "resources/file-icon.png"; // Default
		let iconSize = "48px";
		if (item.is_dir == 1) {
			fileIcon = "resources/folder-icon.png";
			// Check for dir name to apply custom icons
			if (item.name.toLowerCase().includes("downloads")) {
				fileIcon = "resources/folder-downloads.png";
			}
			else if (
				item.name.toLowerCase().includes("desktop") ||
				item.name.toLowerCase().includes("schreibtisch")
			) {
				fileIcon = "resources/folder-desktop.png";
			}
			else if (
				item.name.toLowerCase().includes("dokumente") ||
				item.name.toLowerCase().includes("documents") ||
				item.name.toLowerCase().includes("docs")
			) {
				fileIcon = "resources/folder-docs.png";
			}
			else if (
				item.name.toLowerCase().includes("musik") ||
				item.name.toLowerCase().includes("music")
			) {
				fileIcon = "resources/folder-music.png";
			}
			else if (
				item.name.toLowerCase().includes("bilder") ||
				item.name.toLowerCase().includes("pictures") ||
				item.name.toLowerCase().includes("images")
			) {
				fileIcon = "resources/folder-images.png";
			}
			else if (
				item.name.toLowerCase().includes("videos") ||
				item.name.toLowerCase().includes("movies") ||
				item.name.toLowerCase().includes("films") ||
				item.name.toLowerCase().includes("filme")
			) {
				fileIcon = "resources/folder-videos.png";
			}
			else if (
				item.name.toLowerCase().includes("coding") ||
				item.name.toLowerCase().includes("programming") ||
				item.name.toLowerCase().includes("programmieren") ||
				item.name.toLowerCase().includes("code")
			) {
				fileIcon = "resources/folder-coding.png";
			}
			else if (
				item.name.toLowerCase().includes("werkzeuge") ||
				item.name.toLowerCase().includes("tools")
			) {
				fileIcon = "resources/folder-tools.png";
			}
			else if (
				item.name.toLowerCase().includes("public") ||
				item.name.toLowerCase().includes("öffentlich") ||
				item.name.toLowerCase().includes("shared") ||
				item.name.toLowerCase().includes("geteilt")
			) {
				fileIcon = "resources/folder-public.png";
			}
			else if (
				item.name.toLowerCase().includes("games") ||
				item.name.toLowerCase().includes("spiele")
			) {
				fileIcon = "resources/folder-games.png";
			}
			else if (
				item.name.toLowerCase().includes("developer") ||
				item.name.toLowerCase().includes("development")
			) {
				fileIcon = "resources/folder-development.png";
			}
			// else if (item.name.toLowerCase().includes(".app") && Platform == "darwin") {
			// 	let path = item.path + "/Contents/Resources/AppIcon.icns";
			// 	fileIcon = window.__TAURI__.tauri.convertFileSrc("/Applications/Arc.app/Contents/Resources/AppIcon.icns");
			// 	// alert(fileIcon);
			// }
		}
		else {
			switch (item.extension.toLowerCase()) {
				case ".rs":
					fileIcon = "resources/rust-file.png";
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
				case ".pdf":
					if (IsImagePreview) {
						fileIcon = window.__TAURI__.tauri.convertFileSrc(item.path);// Beispiel für die Verwendung der Funktion
					}
					else {
						fileIcon = "resources/img-file.png";
					}
					break;
				case ".txt":
					fileIcon = "resources/text-file.png";
					break;
				case ".docx":
				case ".doc":
					fileIcon = "resources/word-file.png";
					break;
				case ".pdf":
					fileIcon = "resources/pdf-file.png";
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
		itemLink.className = "item-link directory-entry";
		let itemButton = document.createElement("div");
		itemButton.innerHTML = `
			<img decoding="async" class="item-icon" src="${fileIcon}" width="${iconSize}" height="${iconSize}" style="object-fit: cover;" />
			<p class="item-button-text" style="text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
			`;
		delete fileIcon;
		itemButton.className = "item-button directory-entry";
		let itemButtonList = document.createElement("div");
		itemButtonList.innerHTML = `
			<span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: 400px; overflow: hidden;">
			<img decoding="async" class="item-icon" src="${fileIcon}" width="24px" height="24px"/>
			<p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
			</span>
			<span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; width: 50%; justify-content: flex-end; padding-right: 5px;">
			<p class="item-button-list-text" style="width: auto; text-align: right;">${item.last_modified}</p>
			<p class="item-button-list-text" style="width: 75px; text-align: right;">${formatBytes(parseInt(item.size), 2)}</p>
			</span>
			`;
		if (dualPaneSide != null && dualPaneSide != "") {
			itemButtonList.className = "directory-entry dual-pane-list-item";
		}
		else {
			itemButtonList.className = "item-button-list directory-entry";
		}
		if (ViewMode == "column") {
			itemButton.style.display = "none";
			DirectoryList.style.gridTemplateColumns = "unset";
			DirectoryList.style.rowGap = "2px";
		}
		else if (ViewMode == "miller") {
			itemButton.style.display = "none";
			DirectoryList.style.gridTemplateColumns = "unset";
			DirectoryList.style.rowGap = "1px";
			itemButtonList.children[1].style.display = "none";
		}
		else {
			itemButtonList.style.display = "none";
			DirectoryList.style.gridTemplateColumns = "repeat(auto-fill, minmax(80px, 1fr))";
			DirectoryList.style.rowGap = "15px";
		}
		newRow.append(itemButton);
		newRow.append(itemButtonList);
		itemLink.append(newRow);
		DirectoryList.append(itemLink);
		ArrDirectoryItems.push(itemLink);
	});
	DirectoryList.querySelectorAll("#item-link").forEach((item) => {
		// Start dragging item
		item.ondragstart = async (e) => {
			e.preventDefault();
			IsFileOpIntern = true;
			let icon = DefaultFileIcon;
			if (item.getAttribute("itemisdir") == 1) {
				icon = DefaultFolderIcon;
			}
			if (ArrSelectedItems.find(itemOfArray => itemOfArray.getAttribute("itempath") == item.getAttribute("itempath")) == null || ArrSelectedItems.length == 0) {
				ArrSelectedItems.push(item);
			}
			let arr = ArrSelectedItems.map(item => item.getAttribute("itempath"));
			if (Platform != "darwin" && (Platform.includes("win") || Platform.includes("linux"))) {
				await startDrag({ item: arr, icon: "" });
				unSelectAllItems();
				IsFileOpIntern = true;
			}
			else {
				await startDrag({ item: arr, icon: icon });
				unSelectAllItems();
				IsFileOpIntern = true;
			}
		};
		// Accept file drop into folders
		item.addEventListener("dragover", (e) => {
			MousePos = [e.clientX, e.clientY];
			if (item.getAttribute("itemisdir") == "1") {
				item.style.opacity = "0.5";
				if (!ArrSelectedItems.includes(item)) {
					DraggedOverElement = item;
				}
			}
		});
		item.addEventListener("dragleave", () => {
			item.style.opacity = "1";
		});
		// :item_right_click :context_menu
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", async (e) => {
			e.preventDefault();
			if (ArrSelectedItems.length <= 1) {
				ArrSelectedItems = [];
				selectItem(item);
			}
			// selectItem(item);
			if (IsPopUpOpen == false) {
				let appsCMenu = document.querySelector(".context-open-item-with");
				appsCMenu.innerHTML = "";
				await getSetInstalledApplications(item.getAttribute("itemext"));
				if (Platform.includes("linux")) {
					appsCMenu.innerHTML = "<p>Not yet available on this platform</p>";
				}
				else if (Applications.length > 0) {
					Applications.forEach(app => {
						let newItem = document.createElement("button");
						newItem.innerHTML = app[0].split(".")[0];
						newItem.className = "context-item";
						newItem.setAttribute("appname", app[0].split(".")[0]);
						newItem.setAttribute("apppath", app[1]);
						newItem.addEventListener("click", () => open_with(item.getAttribute("itempath"), app[1]));
						appsCMenu.appendChild(newItem);
					});
				} else {
					appsCMenu.innerHTML = "<p>No applications found</p>";
				}

				// Reset so that the commands are not triggered multiple times
				ContextMenu.children[0].replaceWith(ContextMenu.children[0].cloneNode(true));
				ContextMenu.children[2].replaceWith(ContextMenu.children[2].cloneNode(true));
				ContextMenu.children[3].replaceWith(ContextMenu.children[3].cloneNode(true));
				ContextMenu.children[4].replaceWith(ContextMenu.children[4].cloneNode(true));
				ContextMenu.children[5].replaceWith(ContextMenu.children[5].cloneNode(true));
				ContextMenu.children[6].replaceWith(ContextMenu.children[6].cloneNode(true));
				ContextMenu.children[7].replaceWith(ContextMenu.children[7].cloneNode(true));
				ContextMenu.children[8].replaceWith(ContextMenu.children[8].cloneNode(true));
				ContextMenu.children[9].replaceWith(ContextMenu.children[9].cloneNode(true));
				ContextMenu.children[10].replaceWith(ContextMenu.children[10].cloneNode(true));
				ContextMenu.children[11].replaceWith(ContextMenu.children[11].cloneNode(true));
				document.querySelector(".c-item-ytdownload").replaceWith(document.querySelector(".c-item-ytdownload").cloneNode(true));

				ContextMenu.children[0].removeAttribute("disabled");
				ContextMenu.children[0].classList.remove("c-item-disabled");
				ContextMenu.children[1].removeAttribute("disabled");
				ContextMenu.children[1].classList.remove("c-item-disabled");
				ContextMenu.children[3].removeAttribute("disabled");
				ContextMenu.children[3].classList.remove("c-item-disabled");
				ContextMenu.children[4].removeAttribute("disabled");
				ContextMenu.children[4].classList.remove("c-item-disabled");
				ContextMenu.children[5].removeAttribute("disabled");
				ContextMenu.children[5].classList.remove("c-item-disabled");
				ContextMenu.children[6].removeAttribute("disabled");
				ContextMenu.children[6].classList.remove("c-item-disabled");
				ContextMenu.children[9].removeAttribute("disabled");
				ContextMenu.children[9].classList.remove("c-item-disabled");
				ContextMenu.children[10].removeAttribute("disabled");
				ContextMenu.children[10].classList.remove("c-item-disabled");
				ContextMenu.children[11].removeAttribute("disabled");
				ContextMenu.children[11].classList.remove("c-item-disabled")

				let extension = item.getAttribute("itemext");

				// Check if item is an supported archive
				if (extension != ".zip" && extension != ".rar" && extension != ".7z" && extension != ".tar" && extension != ".gz" && extension != ".br" && extension != ".bz2") {
					document.querySelector(".c-item-extract").setAttribute("disabled", "true");
					document.querySelector(".c-item-extract").classList.add("c-item-disabled");
				}
				else {
					document.querySelector(".c-item-extract").removeAttribute("disabled");
					document.querySelector(".c-item-extract").classList.remove("c-item-disabled");
				}

				// Check if item can be searched through for duplicates
				if (item.getAttribute("itemisdir") == "1") {
					document.querySelector(".c-item-duplicates").removeAttribute("disabled");
					document.querySelector(".c-item-duplicates").classList.remove("c-item-disabled");
				}
				else {
					document.querySelector(".c-item-duplicates").setAttribute("disabled", "true");
					document.querySelector(".c-item-duplicates").classList.add("c-item-disabled");
				}

				document.querySelector(".c-item-delete").addEventListener("click", async () => { await deleteItems(); }, { once: true });
				document.querySelector(".c-item-extract").addEventListener("click", async () => { await extractItem(item); }, { once: true });
				document.querySelector(".c-item-compress").addEventListener("click", async () => { await showCompressPopup(item); }, { once: true });
				document.querySelector(".c-item-copy").addEventListener("click", async () => { await copyItem(item); }, { once: true });
				document.querySelector(".c-item-moveto").addEventListener("click", async () => { await itemMoveTo(false) }, { once: true });
				document.querySelector(".c-item-newfile").addEventListener("click", () => { createFileInputPrompt(e); }, { once: true });
				document.querySelector(".c-item-rename").addEventListener("click", () => { renameElementInputPrompt(item); }, { once: true });
				document.querySelector(".c-item-properties").addEventListener("click", () => { showProperties(item); }, { once: true });
				document.querySelector(".c-item-duplicates").addEventListener("click", () => { showFindDuplicates(item); }, { once: true })
				document.querySelector(".c-item-ytdownload").addEventListener("click", async () => { await showYtDownload(); }, { once: true })

				positionContextMenu(e);
			}
		});
	});
	// if (IsTabsEnabled == true) {
	//   document.querySelector(".tab-container-" + CurrentActiveTab).append(DirectoryList);
	// }
	if (IsDualPaneEnabled == true) {
		if (dualPaneSide == "left") {
			document.querySelector(".dual-pane-left").append(DirectoryList);
			LeftDualPanePath = CurrentDir;
			LeftPaneItemCollection = DirectoryList;
		}
		else if (dualPaneSide == "right") {
			document.querySelector(".dual-pane-right").append(DirectoryList);
			RightDualPanePath = CurrentDir;
			RightPaneItemCollection = DirectoryList;
		}
		else {
			document.querySelector(".dual-pane-left").append(DirectoryList);
			document.querySelector(".dual-pane-right").append(DirectoryList.cloneNode(true));
			LeftDualPanePath = RightDualPanePath = CurrentDir;
		}
	}
	else if (ViewMode == "miller") {
		document.querySelector(".miller-col-" + millerCol).innerHTML = "";
		document.querySelector(".miller-col-" + millerCol).append(DirectoryList);
		document.querySelector(".miller-col-" + millerCol).setAttribute("miller-col-path", CurrentDir);
		CurrentMillerCol = millerCol;
	}
	else {
		document.querySelector(".explorer-container").innerHTML = "";
		document.querySelector(".explorer-container").append(DirectoryList);
	}
}

async function getCurrentDir() {
	await invoke("get_current_dir").then((path) => {
		setCurrentDir(path);
	});
}

async function setCurrentDir(currentDir, dualPaneSide = "") {
	CurrentDir = currentDir;
	if (dualPaneSide != "") {
		SelectedItemPaneSide = dualPaneSide;
	}

	await invoke("set_dir", { currentDir }).then(() => {
		let currentDirContainer = document.querySelector(".current-path");
		currentDirContainer.innerHTML = "";
		let currentPathTracker = "/";
		if (Platform != "darwin" && Platform.includes("win")) {
			currentPathTracker = "";
		}
		currentDir.split("/").forEach(path => {
			if (path == "") return;
			let pathItem = document.createElement("button");
			pathItem.textContent = path;
			pathItem.className = "path-item";
			currentPathTracker += path + "/";
			pathItem.setAttribute("itempath", currentPathTracker);
			pathItem.setAttribute("itempaneside", dualPaneSide);
			pathItem.setAttribute("itemisdir", 1);
			pathItem.setAttribute("onClick", "openItem(this, '" + dualPaneSide + "', '')");
			let divider = document.createElement("p");
			divider.textContent = "/";
			divider.style.color = "gray";
			currentDirContainer.appendChild(pathItem);
			currentDirContainer.appendChild(divider);
		});
		// document.querySelector(".current-path").textContent = CurrentDir;
	});

	if (dualPaneSide == "left") {
		document.querySelector(".dual-pane-left").style.boxShadow = "inset 0px 0px 30px 3px var(--transparentColorActive)";
		document.querySelector(".dual-pane-right").style.boxShadow = "none";
	}
	else if (dualPaneSide == "right") {
		document.querySelector(".dual-pane-left").style.boxShadow = "none";
		document.querySelector(".dual-pane-right").style.boxShadow = "inset 0px 0px 30px 3px var(--transparentColorActive)";
	}
}

async function deleteItems() {
	ContextMenu.style.display = "none";
	let msg = "Do you really want to delete: ";
	for (let i = 0; i < ArrSelectedItems.length; i++) {
		if (i == 0) {
			msg += ArrSelectedItems[i].getAttribute("itemname");
		}
		else {
			msg += ", " + ArrSelectedItems[i].getAttribute("itemname");
		}
	}
	let isConfirm = await confirm(msg);
	if (isConfirm == true) {
		showLoadingPopup("Items are being deleted");
		for (let i = 0; i < ArrSelectedItems.length; i++) {
			let actFileName = ArrSelectedItems[i].getAttribute("itempath");
			await invoke("delete_item", { actFileName });
		}
		IsCopyToCut = false;
		await listDirectories();
		ArrSelectedItems = [];
		showToast("Deletion", "Deletion of items is done", "success");
	}
	else {
		showToast("Deletion", "Deletion of items was canceled", "info");
	}
	closeLoadingPopup();
}

async function copyItem(item, toCut = false, fromInternal = false) {
	if (item == null) { return; }
	CopyFilePath = item?.getAttribute("itempath");
	let tempCopyFilePath = item?.getAttribute("itempath").split("/");
	CopyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
	if (fromInternal == false) {
		ArrCopyItems = [];
	}
	if (ArrSelectedItems.length > 0) {
		for (let i = 0; i < ArrSelectedItems.length; i++) {
			ArrCopyItems.push(ArrSelectedItems[i]);
		}
	}
	else {
		ArrCopyItems.push(item);
	}
	ContextMenu.style.display = "none";
	await writeText(CopyFilePath);
	if (toCut == true) {
		IsCopyToCut = true;
	}
}

async function extractItem(item) {
	let compressFilePath = item.getAttribute("itempath");
	let compressFileName = compressFilePath.split("/")[compressFilePath.split("/").length - 1].replace("'", "");
	let isExtracting = await confirm("Do you want to extract " + compressFileName + "?");
	if (isExtracting == true) {
		showLoadingPopup("Extracting item")
		ContextMenu.style.display = "none";
		let extractFilePath = item.getAttribute("itempath");
		let extractFileName = item.getAttribute("itemname");
		if (extractFileName != "") {
			let fromPath = extractFilePath.toString();
			await invoke("extract_item", { fromPath }).then(async (items) => {
				if (SelectedItemPaneSide != null && SelectedItemPaneSide != "") {
					await showItems(items.filter((str) => !str.name.startsWith(".")), SelectedItemPaneSide);
				}
				else {
					await showItems(items.filter((str) => !str.name.startsWith(".")));
				}
				showToast("Extraction", "Extraction done", "success")
			});
		}
	}
	closeLoadingPopup();
}

async function showCompressPopup(item) {
	IsPopUpOpen = true;
	ContextMenu.style.display = "none";
	let arrCompressItems = ArrSelectedItems;
	if (ArrSelectedItems.length > 1) {
		arrCompressItems = ArrSelectedItems;
	}
	else {
		arrCompressItems = [item];
	}
	let compressFileName = "";
	if (arrCompressItems.length > 1) {
		for (let i = 0; i < arrCompressItems.length; i++) {
			compressFileName += arrCompressItems[i].getAttribute("itemname") + "<br>";
		}
	}
	else {
		compressFileName = item.getAttribute("itemname");
	}
	if (compressFileName != "") {
		let popup = document.createElement("div");
		popup.innerHTML = `
			<h4 class="popup-header">
			<div style="display: flex; gap: 10px; align-items: center;">
			<i class="fa-solid fa-compress"></i>
			Compression options
			</div>
			</h4>
			<div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor);">
			<p class="text-2">Selected item</p>
			<h5>${compressFileName}</h5>
			</div>
			<div class="popup-body">
			<div class="popup-body-row-section">
			<div class="popup-body-col-section" style="width: 100%;">
			<p class="text-2">Level (-7 - 22)</p>
			<input class="text-input compression-popup-level-input" type="number" value="3" placeholder="-7-22" />
			</div>
			</div>
			</div>
			<div class="popup-controls">
			<button class="icon-button" onclick="closeCompressPopup()">
			<div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
			Cancel
			</button>
			<button class="icon-button compress-item-button">
			<div class="button-icon"><i class="fa-solid fa-minimize"></i></div>
			Compress
			</button>
			</div>
			`;
		popup.className = "uni-popup compression-popup";
		document.querySelector("body").append(popup);
		document.querySelector(".compress-item-button").addEventListener("click", async () => {
			await compressItem(arrCompressItems, $(".compression-popup-level-input").val());
		});
		$(".compression-popup-level-input").on("focus", () => IsInputFocused = true);
		$(".compression-popup-level-input").on("blur", () => IsInputFocused = false);
		$(".compression-popup-level-input").on("keyup", (e) => {
			if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key == "Enter") {
				$(".compress-item-button").click();
			}
		});
	}
}

async function compressItem(arrItems, compressionLevel = 3) {
	if (arrItems.length > 1) {
		showLoadingPopup("File is being compressed");
		ContextMenu.style.display = "none";
		await invoke("arr_compress_items", { arrItems: arrItems.map((item) => item.getAttribute("itempath")), compressionLevel: parseInt(compressionLevel) });
		closeLoadingPopup();
		await listDirectories();
		showToast("Compression", "Compressing done", "success");
	}
	else {
		let item = arrItems[0];
		let compressFilePath = item.getAttribute("itempath");
		let compressFileName = item.getAttribute("itemname");
		if (compressFileName != "") {
			// open compressing... popup
			showLoadingPopup("File is being compressed");
			ContextMenu.style.display = "none";
			SelectedItemPaneSide = item.getAttribute("itempaneside");
			await invoke("compress_item", { fromPath: compressFilePath, compressionLevel: parseInt(compressionLevel) });
			closeLoadingPopup();
			await listDirectories();
			showToast("Compression", "Compressing done", "success");
		}
	}
}

async function closeCompressPopup() {
	$(".compression-popup").remove();
	IsPopUpOpen = false;
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
	IsPopUpOpen = true;
}
function closeLoadingPopup() {
	$(".loading-popup").remove();
	IsPopUpOpen = false;
}

function showInputPopup(msg) {
	let body = document.querySelector("body");
	let popup = document.createElement("div");
	popup.innerHTML = `
		<h4>${msg}</h4>
		<input class="text-input" placeholder="/path/to/dir" autofocus/>
		`;
	popup.className = "input-popup";
	popup.children[1].addEventListener("keyup", async (e) => {
		if (e.keyCode == 13) {
			await invoke("open_dir", { path: popup.children[1].value }).then(
				async (items) => {
					await showItems(items);
					closeInputPopup();
				},
			);
		}
	});
	body.append(popup);
	IsPopUpOpen = true;
	popup.children[1].focus();
	IsInputFocused = true;
	popup.children[1].addEventListener("focusout", () => {
		closeAllPopups();
		IsInputFocused = false;
	});
}

function closeInputPopup() {
	$(".input-popup").remove();
	IsPopUpOpen = false;
}

async function itemMoveTo(isForDualPane = false) {
	ContextMenu.style.display = "none";
	let selectedPath = "";
	if (isForDualPane == false) {
		selectedPath = await open({ multiple: false, directory: true });
	}
	else {
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
	if (selectedPath != "" && selectedPath != null) {
		await invoke("arr_copy_paste", { appWindow, arrItems: ArrSelectedItems.map(item => item.getAttribute("itempath")), isForDualPane: isForDualPane ? "1" : "0", copyToPath: selectedPath })
			.then(async () => {
				await invoke("arr_delete_items", { arrItems: ArrSelectedItems.map(item => item.getAttribute("itempath")) });
				if (isForDualPane) {
					refreshBothViews(SelectedItemPaneSide);
				}
				else {
					refreshView();
				}
			});
	}
}

async function pasteItem() {
	let arr = [];
	if (IsDualPaneEnabled == true) {
		arr = ArrSelectedItems;
	}
	else {
		arr = ArrCopyItems;
	}

	arr = arr.map(item => ({
		name: item.getAttribute("itemname"),
		path: item.getAttribute("itempath"),
		is_dir: parseInt(item.getAttribute("itemisdir")),
		size: item.getAttribute("itemrawsize"),
		last_modified: item.getAttribute("itemmodified"),
		extension: item.getAttribute("itemext"),
	})),

		ContextMenu.style.display = "none";
	if (IsDualPaneEnabled == true) {
		if (SelectedItemPaneSide == "left") {
			await invoke("set_dir", { currentDir: RightDualPanePath });
			await invoke("arr_copy_paste", { appWindow, arrItems: arr, isForDualPane: "1", copyToPath: "" })
		}
		else if (SelectedItemPaneSide == "right") {
			await invoke("set_dir", { currentDir: LeftDualPanePath });
			await invoke("arr_copy_paste", { appWindow, arrItems: arr, isForDualPane: "1", copyToPath: "" })
		}
	}
	else {
		await invoke("arr_copy_paste", {
			appWindow,
			arrItems: arr,
			isForDualPane: "0",
			copyToPath: ""
		});
		ContextMenu.style.display = "none";
	}
	if (IsCopyToCut == true) {
		await invoke("arr_delete_items", { arrItems: arr });
		ArrCopyItems = [];
	}
	closeLoadingPopup();
	if (arr.length >= 1) {
		showToast("Copy", "Done copying some files", "success");
	}
	await listDirectories(true);
	await unSelectAllItems();
}

function resetProgressBar() {
	document.querySelector(".progress-bar-text").textContent = "";
	document.querySelector(".progress-bar-item-text").textContent = "";
	document.querySelector('.progress-bar-fill').style.width = '0px';
	document.querySelector('.progress-bar-container-popup').style.display = 'none';
	document.querySelector('.progress-bar-2-fill').style.width = '0px';
}

function createFolderInputPrompt() {
	document.querySelectorAll(".input-dialog").forEach((item) => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a name for your new folder.</h4>
		<input class="text-input" type="text" placeholder="New folder" autofocus>
		`;
	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
	nameInput.children[1].focus();
	IsInputFocused = true;
	IsDisableShortcuts = true;
	IsPopUpOpen = false;
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFolder(nameInput.children[1].value);
			closeAllPopups();
			nameInput.remove();
		}
	});
	IsPopUpOpen = true;
	nameInput.addEventListener("focusout", () => {
		closeAllPopups();
		IsInputFocused = false;
	});
}

function createFileInputPrompt(e) {
	document.querySelectorAll(".input-dialog").forEach((item) => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a name for your new file.</h4>
		<input class="text-input" type="text" placeholder="New document" autofocus>
		`;
	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
	nameInput.children[1].focus();
	IsInputFocused = true;
	IsDisableShortcuts = true;
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFile(nameInput.children[1].value);
			closeAllPopups();
			nameInput.remove();
		}
	});
	IsPopUpOpen = true;
	nameInput.addEventListener("focusout", () => {
		closeAllPopups();
		IsInputFocused = false;
	});
}

function closeInputDialog() {
	let newFolderInput = document.querySelector(".input-dialog");
	if (newFolderInput != null) {
		newFolderInput.remove();
	}
	IsDisableShortcuts = false;
	IsPopUpOpen = false;
}

function renameElementInputPrompt(item) {
	let tempFilePath = item.getAttribute("itempath");
	let tempRenameFilePath = item.getAttribute("itempath").split("/");
	let tempFileName = tempRenameFilePath[tempRenameFilePath.length - 1].replace(
		"'",
		"",
	);
	let nameInput = document.createElement("div");

	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a new name for this item.</h4>
		<input class="text-input" type="text" placeholder="document.txt" value="${tempFileName}" required pattern="[0-9]" autofocus>
		`;

	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
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
		closeAllPopups();
		IsInputFocused = false;
	});
	IsPopUpOpen = true;
}

async function createFolder(folderName) {
	let isDualPaneEnabled = IsDualPaneEnabled;
	await invoke("create_folder", { folderName, isDualPaneEnabled });
	listDirectories();
}

async function createFile(fileName) {

	await invoke("create_file", { fileName });
	listDirectories();
}

async function renameElement(path, newName) {
	await invoke("rename_element", { path, newName });
	IsInputFocused = false;
	await listDirectories();
}

async function showAppInfo() {
	alert(`
		App version: ${await getVersion()}
		Tauri version: ${await getTauriVersion()}
		Architecture: ${await arch()}
		Developer: Ricky Dane
		`);
}

async function checkAppConfig() {
	await invoke("check_app_config").then(async (appConfig) => {
		let viewMode = appConfig.view_mode.replaceAll('"', "");
		switch (viewMode) {
			case "wrap":
				ViewMode = "miller";
				break;
			case "column":
				ViewMode = "wrap";
				break;
			case "miller":
				ViewMode = "column";
				break;
		}
		await switchView();
		// if (appConfig.is_open_in_terminal.includes("1")) {
		// 	document.querySelector(".openin-terminal-checkbox").checked = true;
		// 	document.querySelector(".context-open-in-terminal").style.display = "flex";
		// }
		// else {
		// document.querySelector(".openin-terminal-checkbox").checked = false;
		document.querySelector(".context-open-in-terminal").style.display = "none";
		// }

		if (appConfig.is_dual_pane_enabled.includes("1")) {
			document.querySelector(".show-dual-pane-checkbox").checked = true;
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

		// Set current theme
		CurrentTheme = appConfig.current_theme;
		console.log(appConfig.current_theme);
		let themeSelect = document.querySelector(".theme-select");
		themeSelect.value = CurrentTheme;
		document.querySelector(".configured-path-one-input").value = ConfiguredPathOne = appConfig.configured_path_one;
		document.querySelector(".configured-path-two-input").value = ConfiguredPathTwo = appConfig.configured_path_two;
		document.querySelector(".configured-path-three-input").value = ConfiguredPathThree = appConfig.configured_path_three;
		document.querySelector(".launch-path-input").value = appConfig.launch_path;
		document.querySelector(".search-depth-input").value = SettingsSearchDepth = parseInt(appConfig.search_depth);
		document.querySelector(".max-items-input").value = SettingsMaxItems = parseInt(appConfig.max_items);

		if (appConfig.is_dual_pane_active.includes("1")) {
			if (IsDualPaneEnabled == false) {
				await switchToDualPane();
			}
		}
		else if (appConfig.launch_path.length >= 1 && IsFirstRun == true) {
			let path = appConfig.launch_path;
			await invoke("open_dir", { path }).then(async (items) => {
				await showItems(items);
			});
			IsFirstRun = false;
		}
		else if (IsFirstRun == false) {
			await refreshView();
		}

		checkColorMode(appConfig);
	});

	// DefaultFileIcon = await resolveResource("resources/file-icon.png");
	// DefaultFolderIcon = await resolveResource("resources/folder-icon.png");

	await applyPlatformFeatures();
}

async function applyPlatformFeatures() {
	Platform = await platform();
	// Check for macOS and position titlebar buttons on the left
	if (Platform == "darwin") {
		// $(".titlebar").css("flex-flow", "row-reverse");
		// $(".titlebar-buttons").remove();
		// $(".titlebar-buttons-macos").css("display", "flex");
		// document.querySelectorAll(".titlebar-button").forEach(item => item.style.display = "none");
		let headerNav = document.querySelector(".header-nav");
		headerNav.style.paddingLeft = "85px";
		// headerNav.style.borderBottom = "none";
		headerNav.style.boxShadow = "none";
	}
	else {
		// $(".titlebar-buttons").css("display", "flex");
		// $(".titlebar-buttons-macos").remove();
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
		// DirectoryCount.innerHTML = "Objects: " + disks.length;
		disks.forEach((item) => {
			let itemLink = document.createElement("button");
			itemLink.setAttribute("itempath", item.path.replace('"', '').replace('"', ''));
			itemLink.setAttribute("itemname", item.name.replace('"', '').replace('"', ''));
			itemLink.setAttribute("itemisdir", 1);
			itemLink.setAttribute("onclick", "interactWithItem(this, '')");
			let newRow = document.createElement("div");
			newRow.className = "directory-item-entry";
			itemLink.className = "item-link directory-entry";
			let itemButton = document.createElement("div");
			if (item.name == "") {
				item.name = "/";
			}
			itemButton.innerHTML = `
				<span class="disk-item-button">
				<div class="disk-item-top">
				<img decoding="async" class="item-icon" src="resources/disk-icon.png" width="56px" height="auto"/>
				<span class="disk-info">
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><b class="disk-info">Description:</b><b class="disk-info">${item.name}</b></span>
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><span class="disk-info">File-System:</span><span class="disk-info">${item.format.replace('"', "").replace('"', "")}</span></span>
				</span>
				<span class="disk-info">
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><b class="disk-info">Total space:</b><b class="disk-info"${formatBytes(item.capacity)}</b></span>
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><span class="disk-info">Available space:</span><span class="disk-info">${formatBytes(item.avail)}</span></span>
				</span>
				</div>
				<span class="disk-item-bot">
				<div class="disk-item-usage-bar" style="width: ${evalCurrentLoad(item.avail, item.capacity)}%;"></div>
				<p class="disk-info"><b class="disk-info">Usage:</b> ${formatBytes(item.capacity)} / ${formatBytes(item.avail)} available (${evalCurrentLoad(item.avail, item.capacity)}%)</p>
				</span>
				</span>
				`;
			itemButton.className = "disk-item-button-button directory-entry";
			let itemButtonList = document.createElement("div");
			itemButtonList.innerHTML = `
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center; width: 50%;">
				<img decoding="async" class="item-icon" src="resources/disk-icon.png" width="24px" height="24px"/>
				<p class="disk-info" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
				</span>
				<span class="disk-info" style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-right: 5px;">
				<p class="disk-info" style="width: auto; text-align: right;">${formatBytes(item.avail)}</p>
				<p class="disk-info" style="width: 75px; text-align: right;">${formatBytes(item.capacity)}</p>
				</span>
				`;
			itemButtonList.className = "item-button-list directory-entry";
			if (ViewMode == "column") {
				itemButton.style.display = "none";
				DirectoryList.style.gridTemplateColumns = "unset";
				DirectoryList.style.rowGap = "2px";
			}
			else {
				itemButtonList.style.display = "none";
				DirectoryList.style.gridTemplateColumns = "unset";
				DirectoryList.style.rowGap = "10px";
			}
			itemButton.style.width = "100%";
			itemButton.style.height = "100px";
			newRow.append(itemButton);
			newRow.append(itemButtonList);
			itemLink.append(newRow);
			DirectoryList.append(itemLink);
			document.querySelector(".current-path").textContent = "Disks/";
		});
	});
	document.querySelector(".tab-container-" + CurrentActiveTab).append(DirectoryList);
}

async function listDirectories(fromDualPaneCopy = false) {
	let lsItems = [];
	await invoke("list_dirs").then(async (items) => {
		lsItems = items;
	});
	if (IsDualPaneEnabled == true) {
		if (fromDualPaneCopy == true) {
			if (SelectedItemPaneSide == "left") {
				await showItems(lsItems, "right");
			}
			else if (SelectedItemPaneSide == "right") {
				await showItems(lsItems, "left");
			}
		}
		else {
			await showItems(lsItems, SelectedItemPaneSide);
		}
		goUp(false, true);
	}
	else {
		await showItems(lsItems, "", CurrentMillerCol);
	}
}

async function refreshView() {
	await listDirectories();
}

async function refreshBothViews(dualPaneSide = "") {
	switch (dualPaneSide) {
		case "left":
			await listDirectories();
			await setCurrentDir(RightDualPanePath, "right");
			await listDirectories();
			await setCurrentDir(LeftDualPanePath, "left");
			goUp(false, true);
			break;
		case "right":
			await listDirectories();
			await setCurrentDir(LeftDualPanePath, "left");
			await listDirectories();
			await setCurrentDir(RightDualPanePath, "right");
			goUp(false, true);
			break;
	}
}

async function interactWithItem(element = null, dualPaneSide = "", shortcutPath = null) {
	let isDir = element?.getAttribute("itemisdir");
	if (dualPaneSide == "left") {
		document.querySelector(".dual-pane-left").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
		document.querySelector(".dual-pane-right").style.boxShadow = "none";
	}
	else if (dualPaneSide == "right") {
		document.querySelector(".dual-pane-right").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
		document.querySelector(".dual-pane-left").style.boxShadow = "none";
	}
	// Interaction mode: Select
	if (element != null && element != SelectedItemToOpen && IsSelectMode == true && (isDir == 0 || ViewMode != "miller" || IsMetaDown == true)) {
		selectItem(element, dualPaneSide);
	}
	// Interaction mode: Open item
	else if (element != null && (element == SelectedItemToOpen || IsSelectMode == false) || (isDir == 1 && ViewMode == "miller" && IsMetaDown == false)) {
		await openItem(element, dualPaneSide, shortcutPath);
	}
	// Double click logic / reset after 500 ms to force double click to open
	setTimeout(() => {
		SelectedItemToOpen = null;
	}, 250);
}

async function openItem(element, dualPaneSide, shortcutDirPath = null) {
	let isDir = element != null ? parseInt(element.getAttribute("itemisdir")) : (shortcutDirPath != null ? 1 : 0);
	let path = element != null ? element.getAttribute("itempath") : shortcutDirPath;
	let millerCol = element != null ? element.getAttribute("itemformillercol") : null;
	if (IsPopUpOpen == false) {
		if (IsItemPreviewOpen == false && isDir == 1) {
			// Open directory
			await invoke("open_dir", { path }).then(async (items) => {
				if (ViewMode == "miller") {
					await removeExcessMillerCols(parseInt(millerCol));
					await addMillerCol(millerCol);
					await setMillerColActive(null, millerCol);
					await setCurrentDir(element.getAttribute("itempath"));
				}
				else {
					DirectoryList.innerHTML = `<img decoding="async" src="resources/preloader.gif" width="48px" height="auto" /><p>Loading ...</p>`;
					DirectoryList.classList.add("dir-preloader-container");
				}
				await showItems(items, dualPaneSide, millerCol);
				if (IsDualPaneEnabled == true && dualPaneSide != "") {
					// document.querySelector(".tab-container-" + CurrentActiveTab).innerHTML = ""; // Disabled tab functionality
					goUp(false, true);
				}
			});
			document.querySelector(".fullsearch-loader").style.display = "none";
			DirectoryList.classList.remove("dir-preloader-container");
		}
		else if (IsItemPreviewOpen == false) {
			await invoke("open_item", { path });
		}
	}
}

function selectItem(element, dualPaneSide = "") {
	let path = element?.getAttribute("itempath");
	let index = element?.getAttribute("itemindex");
	if (ViewMode == "miller") {
		unSelectAllItems();
	}
	// Reset colored selection
	if (SelectedElement != null && IsMetaDown == false && IsCtrlDown == false) {
		ArrSelectedItems.forEach(item => {
			if (IsDualPaneEnabled) {
				item.children[0].classList.remove("selected-item");
			}
			else if (ViewMode == "column" || ViewMode == "miller") {
				item.children[0].children[1].classList.remove("selected-item");
			}
			else {
				item.children[0].children[0].children[0].classList.remove("selected-item");
				item.children[0].children[0].children[1].classList.remove("selected-item-min");
			}
		});
		ArrSelectedItems = [];
	}
	SelectedElement = element; // Switch to new element / selection
	SelectedItemToOpen = element;
	if (IsDualPaneEnabled) {
		SelectedElement.children[0].classList.add("selected-item");
	}
	else if (ViewMode == "column" || ViewMode == "miller") {
		SelectedElement.children[0].children[1].classList.add("selected-item");
	}
	else {
		SelectedElement.children[0].children[0].children[0].classList.add("selected-item");
		SelectedElement.children[0].children[0].children[1].classList.add("selected-item-min");
	}
	SelectedItemPath = path;
	if (dualPaneSide != "" && dualPaneSide != null) {
		SelectedItemPaneSide = dualPaneSide;
	}
	if (dualPaneSide == "left") {
		LeftPaneItemIndex = index;
	}
	else if (dualPaneSide == "right") {
		RightPaneItemIndex = index;
	}
	// Switch item preview when already open
	if (IsItemPreviewOpen == true) {
		showItemPreview(SelectedElement, true);
	}
	ArrSelectedItems.push(SelectedElement);
	if (IsDualPaneEnabled == true) {
		switch (SelectedItemPaneSide) {
			case "left":
				setCurrentDir(LeftDualPanePath, "left");
				break;
			case "right":
				setCurrentDir(RightDualPanePath, "right");
				break;
		}
	}
}

function deSelectitem(item) {
	if (IsDualPaneEnabled) {
		item.children[0].classList.remove("selected-item");
	}
	else if (ViewMode == "column") {
		item.children[0].children[1].classList.remove("selected-item");
	}
	else {
		item.children[0].children[0].children[0].classList.remove("selected-item");
		item.children[0].children[0].children[1].classList.remove("selected-item-min");
	}
	let index = ArrSelectedItems.indexOf(item);
	ArrSelected.splice(index, index);
}

async function unSelectAllItems() {
	if (ArrSelectedItems.length > 0) {
		for (let i = 0; i < ArrSelectedItems.length; i++) {
			if (IsDualPaneEnabled) {
				ArrSelectedItems[i].children[0].classList.remove("selected-item");
			}
			else if (ViewMode == "column") {
				ArrSelectedItems[i].children[0].children[1].classList.remove("selected-item");
			}
			else {
				ArrSelectedItems[i].children[0].children[0].children[0].classList.remove("selected-item");
				ArrSelectedItems[i].children[0].children[0].children[1].classList.remove("selected-item-min");
			}
		}
	}
	SelectedElement = null;
	ArrSelectedItems = [];
	SelectedItemToOpen = null;
	$(".selected-item").removeClass("selected-item");
	$(".selected-item-min").removeClass("selected-item-min");
}

async function goHome() {
	await invoke("go_home").then(async (items) => {
		if (IsDualPaneEnabled == true) {
			await showItems(items, SelectedItemPaneSide);
		}
		else {
			await showItems(items);
		}
		if (IsDualPaneEnabled == true) {
			goUp(false, true);
		}
	});
}

async function goBack() {
	if (IsMetaDown == false) {
		await invoke("go_back").then(async (items) => {
			if (IsDualPaneEnabled == true) {
				await showItems(items, SelectedItemPaneSide);
				goUp(false, true);
			}
			else {
				await showItems(items);
			}
		});
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
					element = LeftPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
				}
				else if (parseInt(selectedItemIndex) < 1) {
					selectedItemIndex = 0;
					element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
				}
				else {
					selectedItemIndex = parseInt(selectedItemIndex) - 1;
					element = LeftPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
				}
				LeftPaneItemIndex = selectedItemIndex;
			}
			else if (SelectedItemPaneSide == "right") {
				selectedItemIndex = RightPaneItemIndex;
				if (RightPaneItemIndex > 0 && isSwitched == true) {
					selectedItemIndex = RightPaneItemIndex;
					element = RightPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
				}
				else if (parseInt(selectedItemIndex) - 1 < 1) {
					selectedItemIndex = 0;
					element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
				}
				else {
					selectedItemIndex = parseInt(selectedItemIndex) - 1;
					element = RightPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
				}
				RightPaneItemIndex = selectedItemIndex;
			}
			SelectedElement.style.backgroundColor = "transparent";
		}
		else {
			if (SelectedItemPaneSide == "left") {
				selectedItemIndex = 0;
				element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
				LeftPaneItemIndex = selectedItemIndex;
			}
			else if (SelectedItemPaneSide == "right") {
				selectedItemIndex = 0;
				element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
				RightPaneItemIndex = selectedItemIndex;
			}
		}
		if (element != SelectedElement && SelectedElement != null && element != null) {
			SelectedElement.style.backgroundColor = "transparent";
			element.onclick();
		}

		/* Scroll logic */
		if (SelectedItemPaneSide == "left") {
			if (
				parseInt(selectedItemIndex) * 36 -
				document.querySelector(".dual-pane-left").scrollTop <
				10
			) {
				document.querySelector(".dual-pane-left").scrollTop -= 36;
			}
		}
		else if (SelectedItemPaneSide == "right") {
			if (
				parseInt(selectedItemIndex) * 36 -
				document.querySelector(".dual-pane-right").scrollTop <
				10
			) {
				document.querySelector(".dual-pane-right").scrollTop -= 36;
			}
		}
	}
	else {
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
	}
	else {
		if (SelectedItemPaneSide == "left") {
			element = LeftPaneItemCollection.querySelectorAll(".item-link")[0];
			selectedItemIndex = 0;
			LeftPaneItemIndex = selectedItemIndex;
		}
		else if (SelectedItemPaneSide == "right") {
			element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
			selectedItemIndex = 0;
			RightPaneItemIndex = selectedItemIndex;
		}
	}
	if (element != null && element != SelectedElement && SelectedElement != null) {
		SelectedElement.children[0].style.backgroundColor = "transparent";
		element.onclick();
	}

	/* Scroll logic */
	if (SelectedItemPaneSide == "left") {
		if (parseInt(selectedItemIndex) * 36 - document.querySelector(".dual-pane-left").scrollTop > window.innerHeight - 200) {
			document.querySelector(".dual-pane-left").scrollTop += 36;
		}
	}
	else if (SelectedItemPaneSide == "right") {
		if (parseInt(selectedItemIndex) * 36 - document.querySelector(".dual-pane-right").scrollTop > window.innerHeight - 200) {
			document.querySelector(".dual-pane-right").scrollTop += 36;
		}
	}
}

async function goToOtherPane() {
	if (SelectedItemPaneSide == "right") {
		SelectedItemPaneSide = "left";
		await setCurrentDir(LeftDualPanePath, "left");
	}
	else {
		SelectedItemPaneSide = "right";
		await setCurrentDir(RightDualPanePath, "right");
	}
	goUp(true);
}

function openSelectedItem() {
	if (SelectedElement != null) {
		openItem(SelectedElement, SelectedItemPaneSide);
	}
}

async function goToDir(directory) {
	await invoke("go_to_dir", { directory }).then(async (items) => {
		if (IsDualPaneEnabled == true) {
			await showItems(items, SelectedItemPaneSide);
		}
		else {
			await showItems(items);
		}
	});
}

async function openFTP(hostname, username, password, remotePath = "/home", mountPoint = "/tmp/rdpFX") {
	await invoke("mount_sshfs", { hostname, username, password, remotePath, mountPoint }).then(
		async (items) => {
			await showItems(items);
		},
	);
}

async function openInTerminal() {
	await invoke("open_in_terminal");
	ContextMenu.style.display = "none";
}

async function searchFor(fileName = "", maxItems = SettingsMaxItems, searchDepth = SettingsSearchDepth, isQuickSearch = false, fileContent = "") {
	document.querySelector(".fullsearch-loader").style.display = "block";
	if (fileName.length > 1 || isQuickSearch == true) {
		document.querySelector(".cancel-search-button").style.display = "block";
		if (IsDualPaneEnabled == false) {
			DirectoryList.innerHTML = `<div class="preloader"></div><p>Loading ...</p>`;
			DirectoryList.classList.add("dir-preloader-container");
		}
		await invoke("search_for", { fileName, maxItems, searchDepth, fileContent }).then(async (items) => {
			if (IsDualPaneEnabled == true) {
				await showItems(items, SelectedItemPaneSide);
				goUp(false, true);
			}
			else {
				await showItems(items);
			}
		});
	}
	else {
		alert("Type in a minimum of 2 characters");
	}
	IsFullSearching = false;
	document.querySelector(".fullsearch-loader").style.display = "none";
	DirectoryList.classList.remove("dir-preloader-container");
}

function openFullSearchContainer() {
	document.querySelector(".search-full-container").style.display = "flex";
	document.querySelector(".full-dualpane-search-input").focus();
	IsInputFocused = true;
	IsPopUpOpen = true;
	IsDisableShortcuts = true;
}

function closeFullSearchContainer() {
	document.querySelector(".search-full-container").style.display = "none";
	IsPopUpOpen = false;
	IsDisableShortcuts = false;
	IsInputFocused = false;
}

document.querySelector(".dualpane-search-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		closeSearchBar();
	}
	else if (IsQuickSearchOpen == true) {
		searchFor($(".dualpane-search-input").val(), 999999, 1, true);
	}
});

function openSearchBar() {
	document.querySelector(".search-bar-container").style.display = "flex";
	document.querySelector(".dualpane-search-input").focus();
	IsInputFocused = true;
	IsDisableShortcuts = true;
	IsQuickSearchOpen = true;
	IsPopUpOpen = true;
	document.querySelector(".dualpane-search-input").addEventListener("focusout", () => {
		closeAllPopups();
		IsInputFocused = false;
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
	document.querySelector(".cancel-search-button").style.display = "none";
	document.querySelector(".search-bar-input").value = "";
	await listDirectories();
}

async function switchView() {
	if (IsDualPaneEnabled == false) {
		if (ViewMode == "wrap") {
			document.querySelector(".explorer-container").style.width = "100%";
			document.querySelectorAll(".directory-list").forEach((list) => {
				// list.style.flexFlow = "column";
				list.style.gridTemplateColumns = "unset";
				list.style.rowGap = "2px";
			});
			if (IsShowDisks == false) {
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-indent"></i>`;
			}
			else {
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
			}
			document.querySelectorAll(".item-button").forEach((item) => (item.style.display = "none"));
			document.querySelectorAll(".item-button-list").forEach((item) => (item.style.display = "flex"));
			document.querySelectorAll(".disk-item-button-button").forEach((item) => (item.style.display = "none"));
			document.querySelectorAll(".item-button-list").forEach(item => item.children[1].style.display = "flex");
			document.querySelectorAll(".explorer-container").forEach((item) => {
				item.style.height = "calc(100vh - 115px)";
				item.style.marginTop = "30px";
				item.style.padding = "10px";
			});
			document.querySelector(".list-column-header").style.display = "flex";
			ViewMode = "column";
		}
		else if (ViewMode == "column" && IsShowDisks == false) {
			if (IsShowDisks == false) {
				document.querySelector(".list-column-header").style.display = "none";
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
				document.querySelector(".miller-container").style.display = "flex";
				document.querySelector(".miller-column").style.display = "block";
				document.querySelector(".non-dual-pane-container").style.display = "none";
				document.querySelectorAll(".item-button-list").forEach(item => {
					item.children[0].style.textOverflow = "ellipsis";
					item.children[1].style.display = "none"
				});
				document.querySelectorAll(".explorer-container").forEach((item) => {
					item.style.height = "calc(100vh - 85px)";
					item.style.marginTop = "0";
					item.style.padding = "10px 20px";
				});
				document.querySelectorAll(".directory-list").forEach((list) => {
					// list.style.flexFlow = "column";
					list.style.gridTemplateColumns = "unset";
					list.style.rowGap = "2px";
				});
				ViewMode = "miller";
			}
		}
		else if (ViewMode == "miller" || IsShowDisks == true) {
			document.querySelector(".explorer-container").style.width = "100%";
			document.querySelectorAll(".directory-list").forEach((list) => {
				if (IsShowDisks == false) {
					list.style.gridTemplateColumns = "repeat(auto-fill, minmax(80px, 1fr))";
					list.style.rowGap = "15px";
				}
				else {
					list.style.rowGap = "15px";
				}
			});
			document.querySelector(".miller-container").style.display = "none";
			document.querySelector(".explorer-container").style.display = "block";
			document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-list"></i>`;
			document.querySelectorAll(".item-button").forEach((item) => (item.style.display = "flex"));
			document.querySelectorAll(".item-button-list").forEach((item) => (item.style.display = "none"));
			document.querySelectorAll(".disk-item-button-button").forEach((item) => (item.style.display = "flex"));
			document.querySelector(".list-column-header").style.display = "none";
			document.querySelectorAll(".explorer-container").forEach((item) => {
				item.style.height = "calc(100vh - 85px)";
				item.style.marginTop = "0";
				if (IsShowDisks == true) {
					item.style.padding = "10px";
				}
			});
			ViewMode = "wrap";
		}
		await invoke("switch_view", { viewMode: ViewMode });
	}
}

async function switchToDualPane() {
	if (IsDualPaneEnabled == false) {
		OrgViewMode = ViewMode;
		// disable tab functionality and show two panels side by side
		IsTabsEnabled = false;
		IsDualPaneEnabled = true;
		ViewMode = "column";
		document.querySelector(".list-column-header").style.display = "none";
		document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
		document.querySelector(".miller-container").style.display = "none";
		document.querySelector(".site-nav-bar").style.display = "none";
		document.querySelector(".file-searchbar").style.display = "none";
		document.querySelectorAll(".item-button").forEach((item) => (item.style.display = "none"));
		document.querySelectorAll(".item-button-list").forEach((item) => (item.style.display = "flex"));
		document.querySelector(".non-dual-pane-container").style.display = "none";
		document.querySelector(".dual-pane-container").style.display = "flex";
		document.querySelector(".switch-dualpane-view-button").innerHTML = `<i class="fa-regular fa-rectangle-xmark"></i>`;
		document.querySelector(".switch-view-button").style.display = "none";
		document.querySelector(".current-path").style.left = "0";
		document.querySelector(".current-path").style.width = "100%";
		await invoke("list_dirs").then(async (items) => {
			await showItems(items, "left");
			await showItems(items, "right");
			goUp(false, true);
		});
		document.querySelectorAll(".explorer-container").forEach((item) => {
			item.style.display = "none";
		});
		document.querySelectorAll(".item-button-list").forEach(item => {
			item.children[0].style.textOverflow = "none";
			item.children[1].style.display = "block";
		});
	}
	else {
		// re - enables tab functionality and show shows just one directory container
		IsTabsEnabled = true;
		IsDualPaneEnabled = false;
		document.querySelector(".site-nav-bar").style.display = "flex";
		document.querySelector(".file-searchbar").style.display = "flex";
		document.querySelector(".non-dual-pane-container").style.display = "block";
		document.querySelector(".dual-pane-container").style.display = "none";
		document.querySelector(".switch-dualpane-view-button").innerHTML = `<i class="fa-solid fa-table-columns"></i>`;
		// document.querySelector(".go-back-button").style.display = "block";
		// document.querySelector(".nav-seperator-1").style.display = "block";
		document.querySelector(".switch-view-button").style.display = "block";
		document.querySelector(".current-path").style.left = "150px";
		document.querySelector(".current-path").style.width = "calc(100% - 150px)";

		switch (OrgViewMode) {
			case "wrap":
				ViewMode = "miller";
				break;
			case "column":
				ViewMode = "wrap";
				break;
			case "miller":
				ViewMode = "column";
				break;
		}
		await switchView();
		await listDirectories();
	}
	await saveConfig(false);
}

function switchHiddenFiles() {
	if (IsShowHiddenFiles) {
		IsShowHiddenFiles = false;
		document.querySelector(".switch-hidden-files-button").innerHTML =
			`<i class="fa-solid fa-eye-slash"></i>`;
	} else {
		IsShowHiddenFiles = true;
		document.querySelector(".switch-hidden-files-button").innerHTML =
			`<i class="fa-solid fa-eye"></i>`;
	}
	listDirectories();
}

function openSettings() {
	if (IsPopUpOpen == false) {
		document.querySelector(".settings-ui").style.display = "flex";
		IsDisableShortcuts = true;
		IsPopUpOpen = true;
	}
}

async function saveConfig(isToReload = true) {
	let configuredPathOne = (ConfiguredPathOne = document.querySelector(".configured-path-one-input").value);
	let configuredPathTwo = (ConfiguredPathTwo = document.querySelector(".configured-path-two-input").value);
	let configuredPathThree = (ConfiguredPathThree = document.querySelector(".configured-path-three-input").value);
	let isOpenInTerminal = false; // document.querySelector(".openin-terminal-checkbox").checked;
	let isDualPaneEnabled = document.querySelector(".show-dual-pane-checkbox").checked;
	let launchPath = document.querySelector(".launch-path-input").value;
	let isDualPaneActive = IsDualPaneEnabled;
	let searchDepth = parseInt(document.querySelector(".search-depth-input").value);
	let maxItems = parseInt(document.querySelector(".max-items-input").value);
	let isImagePreview = (IsImagePreview = document.querySelector(".image-preview-checkbox").checked);
	let isSelectMode = (IsSelectMode = $("#choose-interaction-mode").is(":checked"));
	let currentTheme = $(".theme-select").val();

	if (isOpenInTerminal == true) { isOpenInTerminal = "1"; } else { isOpenInTerminal = "0"; }
	if (isDualPaneEnabled == true) { isDualPaneEnabled = "1"; } else { isDualPaneEnabled = "0"; }
	if (isDualPaneActive == true) { isDualPaneActive = "1"; } else { isDualPaneActive = "0"; }
	if (isImagePreview == true) { isImagePreview = "1"; } else { isImagePreview = "0"; }
	if (isSelectMode == true) { isSelectMode = "1"; } else { isSelectMode = "0"; }

	await invoke("save_config", {
		configuredPathOne,
		configuredPathTwo,
		configuredPathThree,
		isOpenInTerminal,
		isDualPaneEnabled,
		launchPath,
		isDualPaneEnabled,
		isDualPaneActive,
		searchDepth,
		maxItems,
		isImagePreview,
		isSelectMode,
		currentTheme,
		arrFavorites: ArrFavorites
	});
	if (isToReload == true) {
		checkAppConfig();
	}
}

async function addFavorites(item) {
	ArrFavorites.push(item);
	console.log(ArrFavorites);
	// await invoke("save_favorites", { arrFavorites: ArrFavorites });
}

function closeSettings() {
	document.querySelector(".settings-ui").style.display = "none";
	IsDisableShortcuts = false;
	IsPopUpOpen = false;
}

function createTab(tabCount, isInitial) {
	let tab = document.createElement("div");
	tab.className = "fx-tab fx-tab-" + tabCount;
	if (isInitial) {
		var tabName = CurrentDir.split("/")[CurrentDir.split("/").length - 1] ?? "Home";
	}
	else {
		var tabName = "New tab";
	}
	tab.innerHTML = `
		<a class="tab-link" onclick="switchToTab(${tabCount})"><p>${tabName}</p></a>
		<button class="close-tab-button" onclick="closeTab()"><i class="fa-solid fa-xmark"></i></button>
		`;
	if (tabCount != 1 || document.querySelector(".tab-container-1") == null) {
		let explorerContainer = document.createElement("div");
		explorerContainer.className =
			"explorer-container tab-container-" + tabCount;
		if (ViewMode == "wrap") {
			explorerContainer.style.height = "calc(100vh - 100px)";
		}
		else {
			explorerContainer.style.marginTop = "35px";
			explorerContainer.style.height = "calc(100vh - 135px)";
		}
		document.querySelector(".main-container").append(explorerContainer);
	}
	document.querySelector(".tab-header").append(tab);
	CurrentActiveTab = tabCount;
	switchToTab(tabCount);
	listDirectories();
}

// Currently not used 
/*
	function closeTab() {
		if (IsTabs == true) {
			if (TabCount == 2) {
				IsTabs = false;
				document.querySelector(".tab-header").style.display = "none";
				document
					.querySelectorAll(".tab-container-" + CurrentActiveTab)
					.forEach((item) => item.remove());
				document.querySelectorAll(".fx-tab").forEach((item) => item.remove());
				document.querySelectorAll(".explorer-container").forEach((item) => {
					if (ViewMode == "wrap") {
						item.style.height = "calc(100vh - 100px)";
						item.style.paddingBottom = "20px";
					} else {
						item.style.marginTop = "35px";
						item.style.height = "calc(100vh - 137px)";
						item.style.paddingBottom = "10px";
					}
				});
				let tabCounter = 1;
				let checkTab = document.querySelector(".tab-container-" + tabCounter);
				while (checkTab == null) {
					tabCounter++;
					checkTab = document.querySelector(".tab-container-" + tabCounter);
				}
				switchToTab(tabCounter);
				TabCount = 0;
			} else {
				document
					.querySelectorAll(".tab-container-" + CurrentActiveTab)
					.forEach((item) => item.remove());
				document
					.querySelectorAll(".fx-tab-" + CurrentActiveTab)
					.forEach((item) => item.remove());
				let switchTabNo = document.querySelectorAll(".fx-tab").length;
				switchToTab(switchTabNo);
				TabCount--;
			}
		}
	}

async function switchToTab(tabNo) {
	if (IsDualPaneEnabled == false) {
		CurrentActiveTab = tabNo;
		document.querySelectorAll(".explorer-container").forEach((container) => {
			container.style.display = "none";
		});
		document.querySelectorAll(".fx-tab").forEach((tab) => {
			tab.classList.remove("active-tab");
		});
		let currentTabContainer = document.querySelector(".tab-container-" + tabNo);
		if (currentTabContainer != null) {
			let currentTab = document.querySelector(".fx-tab-" + tabNo);
			currentTab?.classList.add("active-tab");
			currentTabContainer.style.display = "block";
		}
		switch (CurrentActiveTab) {
			case 1:
				CurrentDir = TabOnePath;
				break;
			case 2:
				CurrentDir = TabTwoPath;
				break;
			case 3:
				CurrentDir = TabThreePath;
				break;
			case 4:
				CurrentDir = TabFourPath;
				break;
			case 5:
				CurrentDir = TabFivePath;
				break;
		}
		let currentDir = CurrentDir?.toString();
		if (currentDir != null) {
			await invoke("switch_to_directory", { currentDir });
		}
		document.querySelector(".current-path").textContent = CurrentDir;

		if (IsDualPaneEnabled == true) {
			switchToDualPane();
		}
	}
}
	*/

function showProperties(item) {
	let name = item.getAttribute("itemname");
	let path = item.getAttribute("itempath");
	let size = item.getAttribute("itemsize");
	let modifiedAt = item.getAttribute("itemmodified");
	alert(
		"Name: " + name +
		"\nModified: " + modifiedAt +
		"\nPath: " + path +
		"\nSize: " + size
	);
	ContextMenu.style.display = "none";
}

function showItemPreview(item, isOverride = false) {
	let fadeTime = 200;
	if (isOverride) {
		$(".item-preview-popup").fadeOut(50);
		fadeTime = 50;
	}
	let name = item.getAttribute("itemname");
	let ext = item.getAttribute("itemext");
	let path = item.getAttribute("itempath");
	let size = item.getAttribute("itemsize");
	let modified = item.getAttribute("itemmodified");
	let popup = document.createElement("div");
	popup.className = "item-preview-popup";
	let module = "";
	switch (ext) {
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".gif":
		case ".svg":
		case ".webp":
		case ".ico":
		case ".jfif":
		case ".avif":
			module = `<img decoding="async" src="${convertFileSrc(path)}" alt="${name}" />`;
			break;
		case ".pdf":
			module = `<iframe src="${convertFileSrc(path)}" />`;
			break;
		default:
			module = `
				<div>
				<p><b>Name:</b> ${name}</p>
				<p><b>Path:</b> ${path}</p>
				<p><b>Size:</b> ${size}</p>
				<p><b>Last modified:</b> ${modified}</p>
				</div>
				`;
			break;
	}
	popup.innerHTML = `
	${module}
	`;
	document.querySelector("body").append(popup);
	IsPopUpOpen = true;
	$(popup).fadeIn(fadeTime);
	IsItemPreviewOpen = true;
}

function showMultiRenamePopup() {
	IsPopUpOpen = true;
	let popup = document.createElement("div");
	popup.className = "uni-popup multi-rename-popup";
	popup.innerHTML = `
		<h3 class="multi-rename-popup-header">
		<div>
		<i class="fa-solid fa-pen-to-square" style="padding-right: 5px;"></i>
		Multi-Rename
		</div>
		<button onclick="closeMultiRenamePopup()" class="popup-close-button">
		<i class="fa-solid fa-xmark"></i>
		</button>
		</h3>
		<div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor); display: flex; flex-flow: column; gap: 5px;">
		<h4>Options</h4>
		<p class="text-2">If no extension is supplied the extension won't be changed</p>
		</div>
		<div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor);">
		<div style="display: flex; flex-flow: row; gap: 10px;">
		<div style="display: flex; flex-flow: column; gap: 5px; width: 55%;">
		<p class="text-2">New name</p>
		<input class="text-input multi-rename-input multi-rename-newname" placeholder="Name" />
		</div>
		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
		<p class="text-2">Start at</p>
		<input class="text-input multi-rename-input multi-rename-startat" placeholder="0" value="0" type="number" />
		</div>
		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
		<p class="text-2">Step by</p>
		<input class="text-input multi-rename-input multi-rename-stepby" placeholder="1" value="1" type="number" />
		</div>
		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
		<p class="text-2">Digits</p>
		<input class="text-input multi-rename-input multi-rename-ndigits" placeholder="1" value="1" type="number" />
		</div>
		<div style="display: flex; flex-flow: column; gap: 5px; width: 15%;">
		<p class="text-2">Extension</p>
		<input class="text-input multi-rename-input multi-rename-ext" placeholder=".txt" type="text" />
		</div>
		</div>
		</div>
		<h4 style="padding: 10px; background-color: var(--secondaryColor);">Selected items to rename</h4>
		`;
	let arrItemsToRename = ArrSelectedItems;
	let list = document.createElement("div");
	list.className = "list";
	for (let i = 0; i < arrItemsToRename.length; i++) {
		let item = document.createElement("div");
		item.className = "list-item";
		item.innerHTML = `${arrItemsToRename[i].getAttribute("itemname")}`;
		item.style.fontSize = "var(--fontSize)";
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
	$(".multi-rename-newname").focus();
	document.querySelectorAll(".multi-rename-input").forEach(input => input.addEventListener("keyup", (e) => {
		if (((e.ctrlKey && Platform != "darwin") || e.metaKey) && e.key === "Enter") {
			renameItemsWithFormat(
				arrItemsToRename.map(item => item.getAttribute("itempath")),
				$(".multi-rename-newname").val(),
				$(".multi-rename-startat").val(),
				$(".multi-rename-stepby").val(),
				$(".multi-rename-ndigits").val(),
				$(".multi-rename-ext").val()
			);
		}
	}));
	document.querySelector(".multi-rename-button-run").addEventListener("click", () => {
		renameItemsWithFormat(
			arrItemsToRename.map(item => item.getAttribute("itempath")),
			$(".multi-rename-newname").val(),
			$(".multi-rename-startat").val(),
			$(".multi-rename-stepby").val(),
			$(".multi-rename-ndigits").val(),
			$(".multi-rename-ext").val()
		);
	});
}

async function renameItemsWithFormat(arrElements = [], newName = "", startAt = 0, stepBy = 1, nDigits = 1, ext = "") {
	startAt = parseInt(startAt);
	stepBy = parseInt(stepBy);
	nDigits = parseInt(nDigits);
	await invoke("rename_elements_with_format", { arrElements, newName, startAt, stepBy, nDigits, ext })
		.then(() => {
			closeMultiRenamePopup();
			listDirectories();
		});
}

function closeMultiRenamePopup() {
	IsPopUpOpen = false;
	$(".multi-rename-popup").remove();
}

async function closeItemPreview() {
	$(".item-preview-popup").fadeOut(200, () => {
		$(".item-preview-popup")?.remove();
		IsPopUpOpen = false;
		IsItemPreviewOpen = false;
	});
}

function evalCurrentLoad(available, total) {
	available = parseFloat(available.replace("TB", "").replace("GB", "").replace("MB", "").replace("KB", "").replace("B", "").trim());
	total = parseFloat(total.replace("TB", "").replace("GB", "").replace("MB", "").replace("KB", "").replace("B", "").trim());
	let result = 100 - (100 / total) * available;
	return result.toFixed(0);
}

function closeFtpConfig() {
	document.querySelector(".ftp-connect-container").style.display = "none";
	IsPopUpOpen = false;
}

function showFtpConfig() {
	if (IsPopUpOpen == false) {
		document.querySelector(".ftp-connect-container").style.display = "block";
		IsPopUpOpen = true;
	}
}

function connectToFtp() {
	let hostname = document.querySelector(".ftp-hostname-input").value;
	let username = document.querySelector(".ftp-username-input").value;
	let password = document.querySelector(".ftp-password-input").value;
	let remotePath = document.querySelector(".ftp-path-input").value;
	let mountPoint = document.querySelector(".ftp-mountpoint-input").value;
	openFTP(hostname, username, password, remotePath, mountPoint);
	closeFtpConfig();
}

function formatBytes(bytes, decimals = 2) {
	if (!+bytes) return "0 Bytes";
	const k = 1000;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

async function sortItems(sortMethod) {
	if (IsShowDisks == false) {
		let arr = [...DirectoryList.children];
		arr = getFDirObjectListFromDirectoryList(arr);
		if (sortMethod == "size") {
			if (IsFilteredBySize == true) {
				arr.sort((a, b) => { return parseInt(b.size) - (parseInt(a.size)) });
				IsFilteredBySize = false;
			}
			else {
				arr.sort((a, b) => { return parseInt(a.size) - (parseInt(b.size)) });
				IsFilteredBySize = true;
			}
		}
		if (sortMethod == "name") {
			if (IsFilteredByName == true) {
				arr.sort((a, b) => { return a.name.localeCompare(b.name) });
				IsFilteredByName = false;
			}
			else {
				arr.sort((a, b) => { return b.name.localeCompare(a.name) });
				IsFilteredByName = true;
			}
		}
		if (sortMethod == "date") {
			if (IsFilteredByDate == true) {
				arr.sort((a, b) => { return new Date(b.last_modified) - new Date(a.last_modified) });
				IsFilteredByDate = false;
			}
			else {
				arr.sort((a, b) => { return new Date(a.last_modified) - new Date(b.last_modified) });
				IsFilteredByDate = true;
			}
		}
		await showItems(arr)
	};
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
		}
	})
}

function checkColorMode(appConfig) {
	var r = document.querySelector(":root");
	let themeId = parseInt(CurrentTheme);
	r.style.setProperty("--primaryColor", appConfig.themes[themeId].primary_color);
	r.style.setProperty("--secondaryColor", appConfig.themes[themeId].secondary_color);
	r.style.setProperty("--tertiaryColor", appConfig.themes[themeId].tertiary_color);
	r.style.setProperty("--transparentColor", appConfig.themes[themeId].transparent_color);
	r.style.setProperty("--transparentColorActive", appConfig.themes[themeId].transparent_color_active);
	r.style.setProperty("--textColor", appConfig.themes[themeId].text_color);
	r.style.setProperty("--textColor2", appConfig.themes[themeId].text_color2);
	r.style.setProperty("--textColor3", appConfig.themes[themeId].text_color3.replace("\"", "").replace("\"", ""));
}

async function open_with(filePath, appPath) {
	ContextMenu.style.display = "none";
	console.log("Opening: " + filePath + " with: " + appPath);
	await invoke("open_with", { filePath: filePath, appPath: appPath });
}

async function getSetInstalledApplications(ext = "") {
	await invoke("get_installed_apps", { extension: ext }).then(apps => Applications = apps);
}

function showFindDuplicates(item) {
	ContextMenu.style.display = "none";
	IsPopUpOpen = true;
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
	document.querySelector(".duplicates-search-depth-input").addEventListener("focus", () => IsInputFocused = true);
	document.querySelector(".duplicates-search-depth-input").addEventListener("blur", () => IsInputFocused = false);
	document.querySelector(".duplicate-button-run").addEventListener("click", async () => {
		await findDuplicates(item, document.querySelector(".duplicates-search-depth-input").value);
	});
}

function closeFindDuplicatesPopup() {
	IsPopUpOpen = false;
	cancelOperation();
	document.querySelector(".find-duplicates-popup").remove();
}

async function findDuplicates(item, depth) {
	showLoadingPopup("Searching for duplicates ...");
	document.querySelector(".list").innerHTML = "";
	ContextMenu.style.display = "none";
	await invoke("find_duplicates", { appWindow: appWindow, path: item.getAttribute("itempath"), depth: parseInt(depth) });
	closeLoadingPopup();
	IsPopUpOpen = true;
}

async function showYtDownload(url = "https://youtube.com/watch?v=dQw4w9WgXcQ") {
	ContextMenu.style.display = "none";
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
	document.querySelector(".yt-url-input").addEventListener("focus", () => IsInputFocused = true);
	document.querySelector(".yt-url-input").addEventListener("blur", () => IsInputFocused = false);
	document.querySelector(".yt-download-button-run").addEventListener("click", async () => {
		await startYtDownload(document.querySelector(".yt-url-input").value, document.querySelector(".yt-quality-input").value);
	});
}

async function startYtDownload(url = "https://youtube.com/watch?v=dQw4w9WgXcQ", quality = "highvideo") {
	closeYtDownloadPopup();
	showLoadingPopup("Downloading ...");
	await invoke("download_yt_video", { appWindow, url, quality });
	closeLoadingPopup();
}

async function closeYtDownloadPopup() {
	IsPopUpOpen = false;
	cancelOperation();
	document.querySelector(".yt-download-popup")?.remove();
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
		}
		contextMenu.append(cButton);
	}

	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.top = e.clientY + "px";
	document.querySelector("body").append(contextMenu);
}

async function addMillerCol(millerCol) {
	if (document.querySelector(".miller-col-" + millerCol) != null) return;
	let prevMillerCol = document.querySelector(".miller-col-" + (parseInt(millerCol) - 1));
	let newMillerCol = prevMillerCol.cloneNode(true);
	newMillerCol.className = "explorer-container miller-column miller-col-" + millerCol;
	newMillerCol.innerHTML = "";
	newMillerCol.style.boxShadow = "none";
	newMillerCol.onclick = () => setMillerColActive(newMillerCol);
	document.querySelector(".miller-container").appendChild(newMillerCol);
	document.querySelector(".miller-container").scrollTo(document.querySelector(".miller-container").scrollWidth, 0);
}

async function removeExcessMillerCols(millerCol) {
	let millerColCount = document.querySelector(".miller-container").children.length;
	for (let i = millerCol + 1; i <= millerColCount; i++) {
		if (i > millerCol) {
			$(".miller-col-" + i).remove();
		}
	}
}

async function setMillerColActive(millerColElement, millerCol = 1) {
	document.querySelectorAll(".miller-column").forEach(item => item.style.boxShadow = "none");
	if (millerColElement == null) {
		setCurrentDir(document.querySelector(".miller-col-" + millerCol).getAttribute("miller-col-path"));
		document.querySelector(".miller-col-" + millerCol).style.boxShadow = "inset 0px 0px 30px 1px var(--transparentColor)";
	}
	else {
		setCurrentDir(millerColElement.getAttribute("miller-col-path"));
		millerColElement.style.boxShadow = "inset 0px 0px 30px 1px var(--transparentColor)";
	}
}

async function getDir(number) {
	let dirPath = "";
	await invoke("get_df_dir", { number: number }).then(path => dirPath = path);
	return dirPath;
}

async function insertSiteNavButtons() {
	let siteNavButtons = [
		["Desktop", await getDir(0), "fa-solid fa-desktop", async () => await goToDir(0)],
		["Downloads", await getDir(1), "fa-solid fa-download", async () => await goToDir(1)],
		["Documents", await getDir(2), "fa-solid fa-file", async () => await goToDir(2)],
		["Pictures", await getDir(3), "fa-solid fa-image", async () => await goToDir(3)],
		["Videos", await getDir(4), "fa-solid fa-video", async () => await goToDir(4)],
		["Music", await getDir(5), "fa-solid fa-music", async () => await goToDir(5)],
		["FTP", "", "fa-solid fa-network-wired", showFtpConfig]
	];

	for (let i = 0; i < siteNavButtons.length; i++) {
		let button = document.createElement("button");
		button.className = "site-nav-bar-button";
		button.innerHTML = `<i color="blue" class="${siteNavButtons[i][2]}"></i> ${siteNavButtons[i][0]}`;
		button.setAttribute("itempath", siteNavButtons[i][1]);
		button.onclick = siteNavButtons[i][3];		// Support for dragging files to the directory
		button.ondragover = (e) => {
			button.style.opacity = "0.5";
			DraggedOverElement = button;
			MousePos = [e.clientX, e.clientY];
		};
		button.ondragleave = () => {
			button.style.opacity = "1";
		};
		document.querySelector(".site-nav-bar").append(button);
	}

	let seperator = document.createElement("div");
	seperator.className = "horizontal-seperator";
	document.querySelector(".site-nav-bar").append(seperator);

	let diskButton = document.createElement("button");
	diskButton.className = "site-nav-bar-button";
	diskButton.onclick = () => listDisks();
	diskButton.innerHTML = `<i class="fa-solid fa-hard-drive"></i> Disks`;
	document.querySelector(".site-nav-bar").append(diskButton);
}

/* File operation context menu */
async function fileOperationContextMenu() {
	let contextMenu = document.createElement("div");
	contextMenu.className = "uni-popup context-menu";
	contextMenu.innerHTML = `
			<button class="context-item">Copy</button>
			<button class="context-item">Move</button>
			`;
	contextMenu.children[0].onclick = () => FileOperation = "copy";
	contextMenu.children[1].onclick = () => FileOperation = "move";
	contextMenu.style.left = MousePos[0] + "px";
	contextMenu.style.top = MousePos[1] + "px";
	contextMenu.style.right = "unset";
	contextMenu.style.bottom = "unset";
	document.body.appendChild(contextMenu);
	await new Promise(resolve => {
		document.body.addEventListener("click", e => {
			resolve(e);
		}, { once: true });
		document.body.addEventListener("keyup", e => {
			if (e.key === "Escape") {
				resolve(e);
			}
		}, { once: true });
	});
	contextMenu.remove();
	return FileOperation;
}

async function showPromptInput() {
	let popup = document.createElement("div");
	popup.className = "uni-popup llm-prompt-input-popup";
	popup.innerHTML = `
			<div class="popup-header">
				<h3>Prompt</h3>
			</div>
			<div class="popup-body">
				<div class="popup-body-row-section">
					<input type="text" class="text-input llm-prompt-input" placeholder="Enter your prompt here">
				</div>
				<div class="popup-body-row-section">
					<div style='width: 100%' class="popup-body-col-section">
						<p>Response</p>
						<textarea style='width: 100%; resize: none; height: 200px;' class="text-input llm-prompt-response" readonly></textarea>
					</div>
				</div>
			</div>
			<div class="popup-controls">
				<button class="icon-button" onclick="closeLLMPromptInputPopup()">
					<div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
					Cancel
				</button>
				<button class="icon-button llm-prompt-run">
					<div class="button-icon"><i class="fa-solid fa-arrow-right"></i></div>
					Run
				</button>
			</div>
		`;
	document.body.appendChild(popup);
	IsPopUpOpen = true;

	document.querySelector(".llm-prompt-response").value = "";

	document.querySelector(".llm-prompt-input").onkeyup = (e) => {
		if (e.key === "Enter") {
			document.querySelector(".llm-prompt-run").click();
		}
	};

	document.querySelector(".llm-prompt-input").focus();
	IsInputFocused = true;

	document.querySelector(".llm-prompt-run").onclick = async () => {
		showLoadingPopup("Loading model ...");
		document.querySelector(".llm-prompt-run").disabled = true;
		document.querySelector(".llm-prompt-run").style.opacity = "0.5";
		document.querySelector(".llm-prompt-input").disabled = true;
		document.querySelector(".llm-prompt-input").style.opacity = "0.5";
		document.querySelector(".llm-prompt-response").value = "Loading ...";
		let prompt = document.querySelector(".llm-prompt-input").value;
		if (prompt.length > 0) {
			await get_llm_response(prompt);
		}
	};
}

async function closeLLMPromptInputPopup() {
	cancelOperation();
	document.querySelector(".llm-prompt-input-popup")?.remove();
	IsInputFocused = false;
	IsPopUpOpen = false;
}

async function get_llm_response(prompt) {
	return await invoke("get_llm_response", { appWindow, prompt });
}

insertSiteNavButtons();
checkAppConfig();
getSetInstalledApplications();
// showPromptInput();