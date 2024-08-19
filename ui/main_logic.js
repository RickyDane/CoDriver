const TAURI = window.__TAURI__;
const { invoke } = TAURI.tauri;
const { confirm } = TAURI.dialog;
const { message } = TAURI.dialog;
const { open } = TAURI.dialog;
const { appWindow } = TAURI.window;
const { writeText } = TAURI.clipboard;
const { writeFile } = TAURI.clipboard;
const { getTauriVersion } = TAURI.app;
const { getVersion } = TAURI.app;
const { getName } = TAURI.app;
const { getMatches } = TAURI.cli;
const { platform } = TAURI.os;
const { arch } = TAURI.os;
const { fetch } = TAURI.http;
const convertFileSrc = TAURI.convertFileSrc;
const { appDataDir } = TAURI.path;
const { resolveResource } = TAURI.path;
const { resourceDir } = TAURI.path;
const { BaseDirectory } = TAURI.fs;
const { readDir } = TAURI.fs;

// :entry_point Entry point

getMatches().then((matches) => {
	console.log("source: " + JSON.stringify(matches.args.source));
})

// :drag / Dragging functionality

async function startDrag(options, onEvent) {
	ds.break();
	await invoke("plugin:drag|start_drag", {
		item: options.item,
		image: options.icon,
		onEventFn: onEvent ? transformCallback(onEvent) : null,
	});
}

const ds = new DragSelect({
	immediateDrag: false,
})

ds.subscribe('DS:select', async (payload) => {
	if (payload.item == SelectedElement || IsShiftDown === true || IsCtrlDown === true || IsMetaDown === true) return;
	selectItem(payload.item, "", true);
});
ds.subscribe('DS:unselect', async (payload) => {
	deSelectitem(payload.item);
});

/* region Global Variables */
let ViewMode = "wrap";
let OrgViewMode = "wrap";

let DirectoryList;
let Applications = [];
let ArrDirectoryItems = [];
let ArrActiveActions = [];
let ContextMenu = document.querySelector(".context-menu");
let CopyFileName = "";
let CopyFilePath = "";
let CurrentDir = "/";
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

document.querySelector(".search-bar-input").addEventListener("focusin", (e) => {
	$(".file-searchbar").css("width", "250px");
	IsInputFocused = true;
});
document.querySelector(".search-bar-input").addEventListener("focusout", (e) => {
	$(".file-searchbar").css("width", "200px");
	IsInputFocused = false;
});
document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		let fileName = $(".search-bar-input").val();
		searchFor(fileName);
	} else if (e.keyCode === 27) {
		cancelSearch();
	}
});

/* Quicksearch for dual pane view */
document.querySelector(".fullsearch-search-button").onclick = async () => {
	if (IsFullSearching == false) {
		await startFullSearch();
	}
};
document.querySelectorAll(".trigger-for-full-search").forEach((item) =>
	item.addEventListener("keyup", async (e) => {
		if (e.keyCode === 13 && IsFullSearching == false) {
			await startFullSearch();
		}
	}),
);

async function startFullSearch() {
	IsFullSearching = true;
	let fileName = document.querySelector(".full-dualpane-search-input").value;
	let maxItems = parseInt(
		document.querySelector(".full-search-max-items-input").value,
	);
	maxItems = maxItems >= 1 ? maxItems : 9999999;
	let searchDepth = parseInt(
		document.querySelector(".full-search-search-depth-input").value,
	);
	searchDepth = searchDepth >= 1 ? searchDepth : 9999999;
	let fileContent = document.querySelector(
		".full-dualpane-search-file-content-input",
	).value;
	await searchFor(fileName, maxItems, searchDepth, false, fileContent);
}

document.addEventListener("keydown", async (e) => {
	if (e.key === "Escape") {
		if (IsQuickSearchOpen == true) {
			goUp(false, true);	
		}
		await resetEverything();
		$(".search-bar-input").blur();
		// Close all popups etc.
		ContextMenu.style.display = "none";
		if (DraggedOverElement != null) {
			DraggedOverElement.style.opacity = "1";
		}
		await stopSearching();
		document.querySelectorAll(".site-nav-bar-button").forEach((item) => {
			item.style.opacity = "1";
		});
	}
	if (IsInputFocused === false &&
		IsPopUpOpen === false &&
		e.key !== "Escape" &&
		e.key !== "ArrowLeft" &&
		e.key !== "ArrowRight" &&
		e.key !== "ArrowUp" &&
		e.key !== "ArrowDown" &&
		e.key !== "Enter" &&
		e.key !== "Backspace" &&
		e.key !== "Delete" &&
		e.key !== "CapsLock" &&
		e.key !== "Shift" &&
		e.key !== "Control" &&
		e.key !== "Alt" &&
		e.key !== "Meta" &&
		e.key !== "Tab" &&
		e.key !== " " &&
		!e.metaKey &&
		!e.ctrlKey &&
		!e.altKey &&
		!e.shiftKey &&
		IsMetaDown === false &&
		IsCtrlDown === false &&
		IsShiftDown === false
	) {
		CurrentQuickSearch += e.key;
		await searchFor(CurrentQuickSearch, 9999999, 1, true);
		setTimeout(() => {
			if (IsDualPaneEnabled === true) {
				goUp(true);
			} else {
				goLeft();
			}
		}, 250);
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
		} else {
			CurrentQuickSearchTime -= 50;
		}
	}, 100);
}

async function resetEverything() {
	if (IsPopUpOpen === false && IsInputFocused === false) {
		await refreshView();
	}
	closeSearchBar();
	closeSettings();
	closeFullSearchContainer();
	closeFtpConfig();
	closeItemPreview();
	closeMultiRenamePopup();
	closeCompressPopup();
	closeYtDownloadPopup();
	closeInfoProperties();
	resetProgressBar();
	closeInputDialogs();
	unSelectAllItems();
	closeConfirmPopup();
	closeCustomContextMenu();
	$(".popup-background").css("display", "none");
	IsPopUpOpen = false;
	IsInputFocused = false;
	IsDisableShortcuts = false;
	if (ArrCopyItems.length == 0) {
		IsCopyToCut = false;
	}
	$(".path-item")?.css("opacity", "1");
	$(".site-nav-bar-button").css("border", "1px solid transparent");
	$(".item-link").css("border", "1px solid transparent");
	$(".path-item").css("border", "1px solid transparent");
	CurrentQuickSearch = "";
	resetQuickSearch();
}
// Close context menu or new folder input dialog when click elsewhere
document.addEventListener("mousedown", (e) => {
	// Check if your click is outside of important elements
	if (
		!e.target.classList.contains("context-item-icon") &&
		!e.target.classList.contains("context-item") &&
		!e.target.classList.contains("open-with-item") &&
		!e.target.classList.contains("input-dialog") &&
		!e.target.classList.contains("confirm-popup") &&
		!e.target.classList.contains("uni-popup") &&
		!e.target.classList.contains("popup-body") &&
		!e.target.classList.contains("popup-body-content") &&
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
		!e.target.classList.contains("item-button-text") &&
		!e.target.classList.contains("item-preview-file-content") &&
		!e.target.classList.contains("popup-header") &&
		!e.target.classList.contains("item-preview-copy-path-button")
	) {
		ContextMenu.style.display = "none";
		$(".extra-c-menu")?.remove();

		// Reset context menu
		resetContextMenu();

		document
			.querySelector(".c-item-duplicates")
			.setAttribute("disabled", "true");
		document
			.querySelector(".c-item-duplicates")
			.classList.add("c-item-disabled");
		unSelectAllItems();
		if (DraggedOverElement != null) {
			DraggedOverElement.style.filter = "none";
		}
		// closeItemPreview();
	}
	if (IsPopUpOpen === true && !e.target.classList.contains("input-dialog") && !e.target.classList.contains("input-dialog-headline") && !e.target.classList.contains("text-input")) {
		closeInputDialogs();
	}
	if (!e.target.classList.contains("c-item-custom")) {
		closeCustomContextMenu();
	}
	$(".site-nav-bar-button").css("border", "1px solid transparent");
	$(".item-link").css("border", "1px solid transparent");
	$(".path-item").css("border", "1px solid transparent");
});

// Open context menu for pasting for example
// :context open
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	if (IsPopUpOpen == false) {
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

		if (CopyFilePath == "") {
			document.querySelector(".c-item-paste").setAttribute("disabled", "true");
			document.querySelector(".c-item-paste").classList.add("c-item-disabled");
		} else {
			document.querySelector(".c-item-paste").removeAttribute("disabled");
			document
				.querySelector(".c-item-paste")
				.classList.remove("c-item-disabled");
		}
	}
	document
		.querySelector(".c-item-ytdownload")
		.replaceWith(document.querySelector(".c-item-ytdownload").cloneNode(true));
	document.querySelector(".c-item-ytdownload").addEventListener(
		"click",
		async () => {
			await showYtDownload();
		},
		{ once: true },
	);
});

// Position contextmenu
function positionContextMenu(e) {
	ContextMenu.style.display = "flex";

	// Horizontal position
	if (ContextMenu.clientWidth + e.clientX >= window.innerWidth) {
		ContextMenu.style.left = e.clientX - ContextMenu.clientWidth + "px";
	} else {
		ContextMenu.style.left = e.clientX + "px";
	}

	// Vertical position
	if (ContextMenu.offsetHeight + e.clientY >= window.innerHeight) {
		ContextMenu.style.top = e.clientY - ContextMenu.offsetHeight + "px";
		ContextMenu.style.bottom = null;
	} else {
		ContextMenu.style.bottom = null;
		ContextMenu.style.top = e.clientY + "px";
	}
}

/* :shortcuts Shortcuts configuration */

document.onkeydown = async (e) => {
	if (IsDisableShortcuts === false) {
		// Shortcut for jumping to configured directory
		if (e.metaKey && Platform == "darwin") {
			IsMetaDown = true;
		}
		if (e.ctrlKey && Platform != "darwin") {
			IsCtrlDown = true;
		}
		if (e.key == "Shift") {
			IsShiftDown = true;
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
				goBack();
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
					IsShiftDown = false;
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
			if (IsPopUpOpen == false) {
				// check if f8 is pressed
				if (e.keyCode == 119) {
					e.preventDefault();
					e.stopPropagation();
					openFullSearchContainer();
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
			((Platform != "darwin" && IsCtrlDown && e.altKey) ||
				(Platform == "darwin" && e.shiftKey)) &&
			e.key == "c"
		) {
			await writeText(CurrentDir);
			showToast("Current dir path copied", ToastType.SUCCESS);
			return;
		}
		// Check if cmd / ctrl + f is pressed
		if (e.key == "f" && (e.ctrlKey || e.metaKey)) {
			$(".search-bar-input").focus();
			IsInputFocused = true;
			e.preventDefault();
			e.stopPropagation();
		}
		// Check if space is pressed on selected item
		if (e.key == " " && SelectedElement != null) {
			e.preventDefault();
			e.stopPropagation();
			if (IsPopUpOpen == false && IsInputFocused == false && IsItemPreviewOpen == false) {
				showItemPreview(SelectedElement);
			} else {
				closeItemPreview();
			}
		}

		if (IsPopUpOpen == false) {
			// check if del is pressed
			if (IsInputFocused == false && (e.keyCode == 46 || (e.metaKey && e.keyCode == 8))) {
				await deleteItems();
				closeLoadingPopup();
				await listDirectories();
				goUp();
				e.preventDefault();
				e.stopPropagation();
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
				e.key == "F2" ||
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
				refreshView();
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
				copyItem(SelectedElement, true);
				e.preventDefault();
				e.stopPropagation();
			}
			// check if cmd / ctrl + v is pressed
			if (
				((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
				e.key == "v" &&
				IsInputFocused == false
			) {
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
			// Disabled for instant quick search
			// check if cmd / ctrl + s is pressed
			// if (
			// 	((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
			// 	e.key === "s" &&
			// 	IsShowDisks == false
			// ) {
			// 	openSearchBar();
			// 	e.preventDefault();
			// 	e.stopPropagation();
			// }

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
				if (e.keyCode == 8 && IsPopUpOpen === false && IsInputFocused === false && ArrSelectedItems.length == 0) {
					goBack();
					e.preventDefault();
					e.stopPropagation();
				}
			}
		}

		if (IsDualPaneEnabled === false && (IsItemPreviewOpen === true && IsPopUpOpen === true || IsPopUpOpen === false)) {
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
			if (e.keyCode == 37 || ((ViewMode == "column" || ViewMode == "miller") && e.keyCode == 38)) {
				e.preventDefault();
				e.stopPropagation();
				goLeft();
			}
			// check if arrow right is pressed
			if (e.keyCode == 39 || ((ViewMode == "column" || ViewMode == "miller") && e.keyCode == 40)) {
				e.preventDefault();
				e.stopPropagation();
				goRight();
			}
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
	if (e.key == "Shift") {
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
	await cancelSearch();
	IsShowDisks = false;
	// Reset position when navigating in another directory
	window.scrollTo(0, 0);
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
		items = items.filter((str) => !str.name.startsWith(".") && !str.name.toLowerCase().includes("desktop.ini"));
	}
	items = items.filter((str) => !str.name.toLowerCase().includes("ntuser"));
	let counter = 0;
	items.forEach(async (item) => {
		let itemLink = document.createElement("button");
		itemLink.setAttribute(
			"onclick",
			"interactWithItem(this, '" + dualPaneSide + "')",
		);
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
		let iconSize = "56px";
		if (item.is_dir == 1) {
			fileIcon = "resources/folder-icon.png";
			// Check for dir name to apply custom icons
			if (item.name.toLowerCase().includes("downloads")) {
				fileIcon = "resources/folder-downloads.png";
			} else if (
				item.name.toLowerCase().includes("desktop") ||
				item.name.toLowerCase().includes("schreibtisch")
			) {
				fileIcon = "resources/folder-desktop.png";
			} else if (
				item.name.toLowerCase().includes("dokumente") ||
				item.name.toLowerCase().includes("documents") ||
				item.name.toLowerCase().includes("docs")
			) {
				fileIcon = "resources/folder-docs.png";
			} else if (
				item.name.toLowerCase().includes("musik") ||
				item.name.toLowerCase().includes("music")
			) {
				fileIcon = "resources/folder-music.png";
			} else if (
				item.name.toLowerCase().includes("bilder") ||
				item.name.toLowerCase().includes("pictures") ||
				item.name.toLowerCase().includes("images")
			) {
				fileIcon = "resources/folder-images.png";
			} else if (
				item.name.toLowerCase().includes("videos") ||
				item.name.toLowerCase().includes("movies") ||
				item.name.toLowerCase().includes("films") ||
				item.name.toLowerCase().includes("filme")
			) {
				fileIcon = "resources/folder-videos.png";
			} else if (
				item.name.toLowerCase().includes("coding") ||
				item.name.toLowerCase().includes("programming") ||
				item.name.toLowerCase().includes("programmieren") ||
				item.name.toLowerCase().includes("code")
			) {
				fileIcon = "resources/folder-coding.png";
			} else if (
				item.name.toLowerCase().includes("werkzeuge") ||
				item.name.toLowerCase().includes("tools")
			) {
				fileIcon = "resources/folder-tools.png";
			} else if (
				item.name.toLowerCase().includes("public") ||
				item.name.toLowerCase().includes("öffentlich") ||
				item.name.toLowerCase().includes("shared") ||
				item.name.toLowerCase().includes("geteilt")
			) {
				fileIcon = "resources/folder-public.png";
			} else if (
				item.name.toLowerCase().includes("games") ||
				item.name.toLowerCase().includes("spiele")
			) {
				fileIcon = "resources/folder-games.png";
			} else if (
				item.name.toLowerCase().includes("developer") ||
				item.name.toLowerCase().includes("development")
			) {
				fileIcon = "resources/folder-development.png";
			} else if (item.path.split(".")[1] == "app") {
				fileIcon = convertFileSrc(
					await invoke("get_app_icns", { path: item.path }),
				);
			}
		} else {
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
						fileIcon = convertFileSrc(item.path); // Beispiel für die Verwendung der Funktion
						// if (item.size > 20000000) {
						//   fileIcon = convertFileSrc(await getThumbnail(item.path)); // Beispiel für die Verwendung der Funktion
						// }
					} else {
						fileIcon = "resources/img-file.png";
					}
					break;
				case ".pdf":
					if (IsImagePreview) {
						fileIcon = convertFileSrc(item.path); // Beispiel für die Verwendung der Funktion
					} else {
						fileIcon = "resources/pdf-file.png";
					}
					break;
				case ".txt":
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
		itemLink.className = "item-link directory-entry";
		if (ViewMode == "wrap") {
			var itemButton = document.createElement("div");
			itemButton.innerHTML = `
				<img decoding="async" class="item-icon" src="${fileIcon}" width="${iconSize}" height="${iconSize}" />
				<p class="item-button-text" style="text-align: left;">${item.name}</p>
			`;
			itemButton.className = "item-button directory-entry";
			newRow.append(itemButton);
			DirectoryList.style.gridTemplateColumns =
				"repeat(auto-fill, minmax(80px, 1fr))";
			DirectoryList.style.rowGap = "15px";
		} else if (ViewMode == "column") {
			var itemButtonList = document.createElement("div");
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
			} else {
				itemButtonList.className = "item-button-list directory-entry";
			}
			newRow.append(itemButtonList);
			DirectoryList.style.gridTemplateColumns = "unset";
			DirectoryList.style.rowGap = "2px";
		}
		else if (ViewMode == "miller") {
			var itemButtonList = document.createElement("div");
			itemButtonList.innerHTML = `
				<span class="item-button-list-info-span" style="display: flex; gap: 10px; align-items: center; max-width: 200px; overflow: hidden;">
					<img decoding="async" class="item-icon" src="${fileIcon}" width="24px" height="24px"/>
					<p class="item-button-list-text" style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
				</span>
				`;
			if (dualPaneSide != null && dualPaneSide != "") {
				itemButtonList.className = "directory-entry dual-pane-list-item";
			} else {
				itemButtonList.className = "item-button-list directory-entry";
			}
			newRow.append(itemButtonList);
			DirectoryList.style.gridTemplateColumns = "unset";
			DirectoryList.style.rowGap = "1px";
		}
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
			if (
				ArrSelectedItems.find(
					(itemOfArray) =>
						itemOfArray.getAttribute("itempath") ==
						item.getAttribute("itempath"),
				) == null ||
				ArrSelectedItems.length == 0
			) {
				ArrSelectedItems.push(item);
			}
			let arr = ArrSelectedItems.map((item) => item.getAttribute("itempath"));
			if (
				Platform != "darwin" &&
				(Platform.includes("win") || Platform.includes("linux"))
			) {
				await startDrag({ item: arr, icon: icon });
				unSelectAllItems();
				refreshView();
			} else {
				await startDrag({ item: arr, icon: icon });
				unSelectAllItems();
				refreshView();
			}
		};
		// Accept file drop into folders
		item.addEventListener("dragover", (e) => {
			MousePos = [e.clientX, e.clientY];
			if (item.getAttribute("itemisdir") == "1") {
				if (!ArrSelectedItems.includes(item)) {
					item.style.opacity = "0.5";
					item.style.border = "1px solid var(--textColor)";
					DraggedOverElement = item;
				}
			}
		});
		item.addEventListener("dragleave", () => {
			item.style.opacity = "1";
			item.style.border = "1px solid transparent";
		});
		// :item_right_click :context_menu | showItems()
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", async (e) => {
			e.preventDefault();
			setupItemContextMenu(item, e);
		});
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
		draggability: false
	  });
}

listen("addSingleItem", async (item) => {
	item = JSON.parse(item.payload);
	setTimeout(async () => {
		if (IsDualPaneEnabled == true) {
			await addSingleItem(item, SelectedItemPaneSide);
		} else {
			await addSingleItem(item);
		}
	}, 10);
});

async function addSingleItem(item, dualPaneSide = "", millerCol = 1, itemIndex = 0) {
	if (IsShowHiddenFiles === false) {
		if (item.name.startsWith(".") == true || item.name.toLowerCase().includes("desktop.ini")) {
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
		"interactWithItem(this, '" + dualPaneSide + "')",
	);
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
	itemLink.setAttribute("id", "item-link");
	itemLink.setAttribute("itemformillercol", parseInt(millerCol) + 1);

	let newRow = document.createElement("div");
	newRow.className = "directory-item-entry";
	let fileIcon = "resources/file-icon.png"; // Default
	let iconSize = "56px";
	if (item.is_dir == 1) {
		fileIcon = "resources/folder-icon.png";
		// Check for dir name to apply custom icons
		if (item.name.toLowerCase().includes("downloads")) {
			fileIcon = "resources/folder-downloads.png";
		} else if (
			item.name.toLowerCase().includes("desktop") ||
			item.name.toLowerCase().includes("schreibtisch")
		) {
			fileIcon = "resources/folder-desktop.png";
		} else if (
			item.name.toLowerCase().includes("dokumente") ||
			item.name.toLowerCase().includes("documents") ||
			item.name.toLowerCase().includes("docs")
		) {
			fileIcon = "resources/folder-docs.png";
		} else if (
			item.name.toLowerCase().includes("musik") ||
			item.name.toLowerCase().includes("music")
		) {
			fileIcon = "resources/folder-music.png";
		} else if (
			item.name.toLowerCase().includes("bilder") ||
			item.name.toLowerCase().includes("pictures") ||
			item.name.toLowerCase().includes("images")
		) {
			fileIcon = "resources/folder-images.png";
		} else if (
			item.name.toLowerCase().includes("videos") ||
			item.name.toLowerCase().includes("movies") ||
			item.name.toLowerCase().includes("films") ||
			item.name.toLowerCase().includes("filme")
		) {
			fileIcon = "resources/folder-videos.png";
		} else if (
			item.name.toLowerCase().includes("coding") ||
			item.name.toLowerCase().includes("programming") ||
			item.name.toLowerCase().includes("programmieren") ||
			item.name.toLowerCase().includes("code")
		) {
			fileIcon = "resources/folder-coding.png";
		} else if (
			item.name.toLowerCase().includes("werkzeuge") ||
			item.name.toLowerCase().includes("tools")
		) {
			fileIcon = "resources/folder-tools.png";
		} else if (
			item.name.toLowerCase().includes("public") ||
			item.name.toLowerCase().includes("öffentlich") ||
			item.name.toLowerCase().includes("shared") ||
			item.name.toLowerCase().includes("geteilt")
		) {
			fileIcon = "resources/folder-public.png";
		} else if (
			item.name.toLowerCase().includes("games") ||
			item.name.toLowerCase().includes("spiele")
		) {
			fileIcon = "resources/folder-games.png";
		} else if (
			item.name.toLowerCase().includes("developer") ||
			item.name.toLowerCase().includes("development")
		) {
			fileIcon = "resources/folder-development.png";
		} else if (item.path.split(".")[1] == "app") {
			fileIcon = convertFileSrc(
				await invoke("get_app_icns", { path: item.path }),
			);
		}
	} else {
		switch (item.extension) {
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
					fileIcon = convertFileSrc(item.path); 
					// if (item.size > 20000000) {
					//   fileIcon = convertFileSrc(await getThumbnail(item.path)); 
					// }
				} else {
					fileIcon = "resources/img-file.png";
				}
				break;
			case ".pdf":
				if (IsImagePreview) {
					fileIcon = convertFileSrc(item.path); 
				} else {
					fileIcon = "resources/pdf-file.png";
				}
				break;
			case ".txt":
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
	itemLink.className = "item-link directory-entry";
	if (ViewMode == "wrap") {
		var itemButton = document.createElement("div");
		itemButton.innerHTML = `
			<img decoding="async" class="item-icon" src="${fileIcon}" width="${iconSize}" height="${iconSize}" />
			<p class="item-button-text" style="text-align: left;">${item.name}</p>
			`;
		itemButton.className = "item-button directory-entry";
		newRow.append(itemButton);
		$(".directory-list").css(
			"gridTemplateColumns",
			"repeat(auto-fill, minmax(80px, 1fr))",
		);
		$(".directory-list").css("rowGap", "15px");
	} else if (ViewMode == "column") {
		var itemButtonList = document.createElement("div");
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
		} else {
			itemButtonList.className = "item-button-list directory-entry";
		}
		newRow.append(itemButtonList);
		$(".directory-list").css("gridTemplateColumns", "unset");
		$(".directory-list").css("rowGap", "2px");
	}
	if (ViewMode == "miller") {
		$(".directory-list").style.gridTemplateColumns = "unset";
		$(".directory-list").style.rowGap = "1px";
	}
	itemLink.append(newRow);
	// Start dragging item
	itemLink.ondragstart = async (e) => {
		e.preventDefault();
		IsFileOpIntern = true;
		let icon = DefaultFileIcon;
		if (itemLink.getAttribute("itemisdir") == 1) {
			icon = DefaultFolderIcon;
		}
		if (
			ArrSelectedItems.find(
				(itemOfArray) =>
					itemOfArray.getAttribute("itempath") ==
					itemLink.getAttribute("itempath"),
			) == null ||
			ArrSelectedItems.length == 0
		) {
			ArrSelectedItems.push(itemLink);
		}
		let arr = ArrSelectedItems.map((item) => item.getAttribute("itempath"));
		if (
			Platform != "darwin" &&
			(Platform.includes("win") || Platform.includes("linux"))
		) {
			await startDrag({ item: arr, icon: "" });
			unSelectAllItems();
		} else {
			await startDrag({ item: arr, icon: icon });
			unSelectAllItems();
		}
	};
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
	// :item_right_click :context_menu | AddSingleItem()
	// Open context menu when right-clicking on file/folder
	itemLink.addEventListener("contextmenu", async (e) => {
		e.preventDefault();
		setupItemContextMenu(itemLink, e);
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
	}
	else {
		$(".directory-list").append(itemLink);
	}
	ArrDirectoryItems.push(itemLink);
}

async function getCurrentDir() {
	return await invoke("get_current_dir");
}

async function setCurrentDir(currentDir = "", dualPaneSide = "") {
	if (currentDir == "") return;
	
	if (dualPaneSide != "") {
		SelectedItemPaneSide = dualPaneSide;
	}

	await invoke("set_dir", { currentDir }).then(async (isSuccess) => {
		if (isSuccess === false) {
			alert("Switching directory failed. Probably no permissions.");
			return;
		}
		CurrentDir = currentDir;
		let currentDirContainer = document.querySelector(".current-path");
		currentDirContainer.innerHTML = "";
		let currentPathTracker = "/";
		if (Platform != "darwin" && Platform.includes("win")) {
			currentPathTracker = "";
		}
		currentDir.split("/").forEach((path) => {
			if (path == "") return;
			let pathItem = document.createElement("button");
			pathItem.textContent = path;
			pathItem.className = "path-item";
			currentPathTracker += path + "/";
			pathItem.setAttribute("itempath", currentPathTracker);
			pathItem.setAttribute("itempaneside", dualPaneSide);
			pathItem.setAttribute("itemisdir", 1);
			pathItem.setAttribute(
				"onClick",
				"openItem(this, '" + dualPaneSide + "', '')",
			);
			pathItem.ondragover = (e) => {
				MousePos = [e.clientX, e.clientY-60];
				e.preventDefault();
				pathItem.style.opacity = 0.5;
				pathItem.style.border = "1px solid var(--textColor)";
				DraggedOverElement = pathItem;
			}
			pathItem.ondragleave = (e) => {
				e.preventDefault();
				pathItem.style.opacity = 1;
				pathItem.style.border = "1px solid transparent";
			}
			let divider = document.createElement("i");
			divider.className = "fa fa-chevron-right";
			divider.style.color = "var(--textColor)";
			currentDirContainer.appendChild(pathItem);
			currentDirContainer.appendChild(divider);
		});
		try {
			if (currentDirContainer?.lastElementChild?.textContent !== "/") {
				currentDirContainer?.removeChild(currentDirContainer?.lastElementChild);
			}
		}
		catch (err) {
			// alert(err);
			await invoke("log", { log: JSON.stringify(err) });
			console.log("INFO: Not enough children to remove last current dir tracker element");
		}
	});

	if (dualPaneSide == "left") {
		LeftDualPanePath = currentDir;
		$(".dual-pane-left").css("box-shadow", "inset 0px 0px 30px 3px var(--transparentColorActive)");
		$(".dual-pane-right").css("box-shadow", "none");
	} else if (dualPaneSide == "right") {
		RightDualPanePath = currentDir;
		$(".dual-pane-right").css("box-shadow", "inset 0px 0px 30px 3px var(--transparentColorActive)");
		$(".dual-pane-left").css("box-shadow", "none");
	}
}

async function deleteItems() {
	ContextMenu.style.display = "none";
	let msg = "Do you really want to delete:<br/><br/>";
	for (let i = 0; i < ArrSelectedItems.length; i++) {
		if (i == 0) {
			msg += "<span class='confirm-popup-item'>" + ArrSelectedItems[i].getAttribute("itemname") + "</span>";
		} else {
			msg += "<br/><span class='confirm-popup-item'>" + ArrSelectedItems[i].getAttribute("itemname") + "</span>";
		}
	}
	let arr = ArrSelectedItems.map((item) => item.getAttribute("itempath"));
	let isConfirm = await confirmPopup(msg, PopupType.DELETE);
	if (isConfirm == true) {
		let actionId = new Date().getMilliseconds();
		createNewAction(actionId, "Deleting", "Delete Items", "Delete Items");
		for (let i = 0; i < arr.length; i++) {
			let actFileName = arr[i];
			await invoke("delete_item", { actFileName });
		}
		IsCopyToCut = false;
		await listDirectories();
		ArrSelectedItems = [];
		showToast("Deletion of items is done", ToastType.INFO);
		removeAction(actionId);
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
	ContextMenu.style.display = "none";
	await writeText(CopyFilePath);
	if (toCut == true) {
		IsCopyToCut = true;
	} else {
		IsCopyToCut = false;
	}
}

async function extractItem(item) {
	let compressFilePath = item.getAttribute("itempath");
	let compressFileName = compressFilePath.split("/")[compressFilePath.split("/").length - 1].replace("'", "");
	ContextMenu.style.display = "none";
	let isExtracting = await confirmPopup("Do you want to extract " + compressFileName + "?", PopupType.EXTRACT);
	if (isExtracting == true) {
		ContextMenu.style.display = "none";
		let extractFilePath = item.getAttribute("itempath");
		let extractFileName = item.getAttribute("itemname");
		if (extractFileName != "") {
			let fromPath = extractFilePath.toString();
			await invoke("extract_item", { fromPath, appWindow });
			showToast("Extraction done", ToastType.SUCCESS);
			await listDirectories();
		}
	}
}

async function showCompressPopup(item) {
	IsPopUpOpen = true;
	ContextMenu.style.display = "none";
	let arrCompressItems = ArrSelectedItems;
	if (ArrSelectedItems.length > 1) {
		arrCompressItems = ArrSelectedItems;
	} else {
		arrCompressItems = [item];
	}
	let compressFileName = "";
	if (arrCompressItems.length > 1) {
		for (let i = 0; i < arrCompressItems.length; i++) {
			compressFileName += arrCompressItems[i].getAttribute("itemname") + "<br>";
		}
	} else {
		compressFileName = item.getAttribute("itemname");
	}
	if (compressFileName != "") {
		let popup = document.createElement("div");
		popup.innerHTML = `
			<div class="popup-header">
			<i class="fa-solid fa-compress"></i>
			<h3>Compression options</h3>
			</div>
			<div style="padding: 10px; border-bottom: 1px solid var(--tertiaryColor);">
			<p class="text-2">Selected item</p>
			<h5>${compressFileName}</h5>
			</div>
			<div class="popup-body">
			<div class="popup-body-row-section">
			<div class="popup-body-col-section" style="width: 100%;">
			<p class="text-2">Level (0 - 9)</p>
			<input class="text-input compression-popup-level-input" type="number" value="6" placeholder="0 - 9" />
			</div>
			</div>
			</div>
			<div class="popup-controls">
			<button class="icon-button" onclick="closeCompressPopup()">
			<div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
			Close	
			</button>
			<button class="icon-button compress-item-button">
			<div class="button-icon"><i class="fa-solid fa-minimize"></i></div>
			Compress
			</button>
			</div>
			`;
		popup.className = "uni-popup compression-popup";
		document.querySelector("body").append(popup);
		document
			.querySelector(".compress-item-button")
			.addEventListener("click", async () => {
				await compressItem(
					arrCompressItems,
					$(".compression-popup-level-input").val(),
				);
			});
		$(".compression-popup-level-input").on(
			"focus",
			() => (IsInputFocused = true),
		);
		$(".compression-popup-level-input").on(
			"blur",
			() => (IsInputFocused = false),
		);
		$(".compression-popup-level-input").on("keyup", (e) => {
			if (
				((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
				e.key == "Enter"
			) {
				$(".compress-item-button").click();
			}
		});
	}
}

async function compressItem(arrItems, compressionLevel = 3) {
	closeCompressPopup();
	if (arrItems.length > 1) {
		ContextMenu.style.display = "none";
		await invoke("arr_compress_items", {
			arrItems: arrItems.map((item) => item.getAttribute("itempath")),
			compressionLevel: parseInt(compressionLevel),
			appWindow
		});
		await listDirectories();
		showToast("Compressing done", ToastType.INFO);
	} else {
		let item = arrItems[0];
		let compressFilePath = item.getAttribute("itempath");
		let compressFileName = item.getAttribute("itemname");
		if (compressFileName != "") {
			// open compressing... popup
			ContextMenu.style.display = "none";
			SelectedItemPaneSide = item.getAttribute("itempaneside");
			await invoke("compress_item", {
				fromPath: compressFilePath,
				compressionLevel: parseInt(compressionLevel),
				pathToZip: compressFilePath,
				appWindow
			});
			await listDirectories();
			showToast("Compressing done", ToastType.INFO);
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
		<h4 style="color: var(--textColor);">${msg}</h4>
		<input class="text-input" placeholder="/path/to/dir" autofocus/>
		`;
	popup.className = "input-popup input-dialog";
	popup.children[1].addEventListener("keyup", async (e) => {
		if (e.keyCode == 13) {
			await invoke("open_dir", { path: popup.children[1].value });
			await listDirectories();
			closeInputPopup();
		}
	});
	body.append(popup);
	IsPopUpOpen = true;
	popup.children[1].focus();
	IsInputFocused = true;
	popup.children[1].addEventListener("focusout", () => {
		resetEverything();
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
	if (selectedPath != "" && selectedPath != null) {
		await invoke("arr_copy_paste", {
			appWindow,
			arrItems: ArrSelectedItems.map((item) => item.getAttribute("itempath")),
			isForDualPane: isForDualPane ? "1" : "0",
			copyToPath: selectedPath,
		}).then(async () => {
			await invoke("arr_delete_items", {
				arrItems: ArrSelectedItems.map((item) => item.getAttribute("itempath")),
			});
			if (isForDualPane) {
				refreshBothViews(SelectedItemPaneSide);
			} else {
				refreshView();
			}
		});
	}
}

async function pasteItem(copyToPath = "") {
	let arr = [];
	if (IsDualPaneEnabled == true) {
		arr = ArrSelectedItems;
	} else {
		arr = ArrCopyItems;
	}

	arr = arr.map((item) => ({
		name: item.getAttribute("itemname") ?? "",
		path: item.getAttribute("itempath") ?? "",
		is_dir: parseInt(item.getAttribute("itemisdir") ?? 0) ?? 0,
		size: item.getAttribute("itemrawsize") ?? "",
		last_modified: item.getAttribute("itemmodified") ?? "",
		extension: item.getAttribute("itemext") ?? "",
	}));

	ContextMenu.style.display = "none";
	if (IsDualPaneEnabled == true) {
		if (SelectedItemPaneSide == "left") {
			await invoke("set_dir", { currentDir: RightDualPanePath });
			await invoke("arr_copy_paste", {
				appWindow,
				arrItems: arr,
				isForDualPane: "1",
				copyToPath,
			});
		} else if (SelectedItemPaneSide == "right") {
			await invoke("set_dir", { currentDir: LeftDualPanePath });
			await invoke("arr_copy_paste", {
				appWindow,
				arrItems: arr,
				isForDualPane: "1",
				copyToPath,
			});
		}
	} else {
		await invoke("arr_copy_paste", {
			appWindow,
			arrItems: arr,
			isForDualPane: "0",
			copyToPath,
		});
		ContextMenu.style.display = "none";
	}
	if (IsCopyToCut == true) {
		await invoke("arr_delete_items", {
			arrItems: arr.map((element) => element.path),
		});
		ArrCopyItems = [];
		if (IsDualPaneEnabled === true) {
			refreshBothViews(SelectedItemPaneSide);
		}
		await listDirectories();
		IsCopyToCut = false;
	}
	else {
		await unSelectAllItems();
		await listDirectories(true);
	}
	if (arr.length >= 1) {
		showToast("Done copying some files", ToastType.SUCCESS);
	}
}

function resetProgressBar() {
	document.querySelector(".progress-bar-text").textContent = "";
	document.querySelector(".progress-bar-item-text").textContent = "";
	document.querySelector(".progress-bar-fill").style.width = "0px";
	document.querySelector(".progress-bar-container-popup").style.display = "none";
	document.querySelector(".progress-bar-2-fill").style.width = "0px";
}

function createFolderInputPrompt() {
	document.querySelectorAll(".input-dialog").forEach((item) => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4 class="input-dialog-headline">Type in a name for your new folder.</h4>
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
	ContextMenu.style.display = "none";
	nameInput.children[1].focus();
	IsInputFocused = true;
	IsDisableShortcuts = true;
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
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
}

async function createFile(fileName) {
	await invoke("create_file", { fileName });
	listDirectories();
}

async function renameElement(path, newName) {
	await invoke("rename_element", { path, newName, appWindow });
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
	await applyPlatformFeatures();
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
		
		// document.querySelector(".context-open-in-terminal").style.display = "none";

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

		// Theme options
		CurrentTheme = appConfig.current_theme;
		appConfig.themes = await invoke("get_themes");
		// Fallback when there's no theme installed
		if (appConfig.themes.length == 0) {
			appConfig.themes = [
				{
					"name": "Default",
					"primary_color": "#3f4352",
					"secondary_color": "rgba(56, 59, 71, 1)",
					"tertiary_color": "#474b5c",
					"text_color": "rgba(255, 255, 255, 0.8)",
					"text_color2": "rgba(255, 255, 255, 0.6)",
					"text_color3": "rgb(255, 255, 255)",
					"transparent_color": "rgba(0, 0, 0, 0.15)",
					"transparent_color_active": "rgba(0, 0, 0, 0.25)",
					"site_bar_color": "rgb(45, 47, 57)",
					"nav_bar_color": "rgba(30, 30, 40, 0.5)"
				}
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
		document.querySelector(".configured-path-one-input").value = ConfiguredPathOne = appConfig.configured_path_one;
		document.querySelector(".configured-path-two-input").value = ConfiguredPathTwo = appConfig.configured_path_two;
		document.querySelector(".configured-path-three-input").value = ConfiguredPathThree = appConfig.configured_path_three;
		document.querySelector(".launch-path-input").value = appConfig.launch_path;
		document.querySelector(".search-depth-input").value = SettingsSearchDepth = parseInt(appConfig.search_depth);
		document.querySelector(".max-items-input").value = SettingsMaxItems = parseInt(appConfig.max_items);

		if (appConfig.is_dual_pane_active.includes("1")) {
			await switchToDualPane();
			if (appConfig.launch_path.length >= 1) {
				let path = appConfig.launch_path;
				let isSwitched = await invoke("open_dir", { path });
				if (isSwitched === true) {
					await setCurrentDir(path, "left");
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
				await setCurrentDir(path, "left");
				await listDirectories();
			} else {
				alert("No directory found or unable to open due to missing permissions");
			}
		} else {
			await initDualPane(await getCurrentDir());
			await goHome();
		}
	});
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
		$(".search-bar-input").attr("placeholder", "Cmd + F");
		$(".settings-ui-header").css("padding", "5px 10px 5px 100px");
	} else {
		appWindow.transparent = true;
		appWindow.setDecorations(false);
		$(".windows-linux-titlebar-buttons").css("display", "flex");
		$('.minimize-button').on('click', () => appWindow.minimize())
		$('.maximize-button').on('click', () => appWindow.toggleMaximize())
		$('.close-button').on('click', () => appWindow.close())
		$(".search-bar-input").attr("placeholder", "Ctrl + F");
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
							<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><span class="disk-info">Description:</span><span class="disk-info">${item.name}</span></span>
							<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><span class="disk-info">File-System:</span><span class="disk-info">${item.format.replace('"', "").replace('"', "")}</span></span>
						</span>
						<span class="disk-info">
							<span class="disk-info" style="display: flex; gap: 10px; align-items: center;"><span class="disk-info">Total space:</span><span class="disk-info">${formatBytes(item.capacity)}</span></span>
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
			} else {
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
			document.querySelector(".current-path").innerHTML = `
				<div class="path-item">Disks</div>
			`;
		});
	});
	document.querySelector(".tab-container-" + CurrentActiveTab).append(DirectoryList);
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
		}
		else {
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
	switch (dualPaneSide) {
		case "left":
			await setCurrentDir(RightDualPanePath, "right");
			await listDirectories();
			await setCurrentDir(LeftDualPanePath, "left");
			await listDirectories();
			goUp(false, true);
			break;
		case "right":
			await setCurrentDir(LeftDualPanePath, "left");
			await listDirectories();
			await setCurrentDir(RightDualPanePath, "right");
			await listDirectories();
			goUp(false, true);
			break;
	}
}

async function interactWithItem(
	element = null,
	dualPaneSide = "",
	shortcutPath = null,
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
	// Interaction mode: Select
	if (
		element != null &&
		element != SelectedItemToOpen &&
		IsSelectMode == true &&
		(isDir == 0 || ViewMode != "miller" || IsMetaDown == true)
	) {
		if (IsShiftDown === true) {
			if (IsDualPaneEnabled === false) {
				let firstIndex = parseInt(SelectedElement.getAttribute("itemindex"));
				let lastIndex = parseInt(element.getAttribute("itemindex"));
				unSelectAllItems();
				if (firstIndex < lastIndex) {
					for (let i = firstIndex; i <= lastIndex; i++) {
						selectItem(DirectoryList.children[i]);
					}
				}
				else {
					for (let i = firstIndex; i >= lastIndex; i--) {
						selectItem(DirectoryList.children[i]);
					}
				}
			}
			else {
				if (dualPaneSide == "left") {
					let firstIndex = parseInt(SelectedElement?.getAttribute("itemindex") ?? 0);
					let lastIndex = parseInt(element.getAttribute("itemindex"));
					unSelectAllItems();
					if (firstIndex < lastIndex) {
						for (let i = firstIndex; i <= lastIndex; i++) {
							selectItem(LeftPaneItemCollection.children[i]);
						}
					}
					else {
						for (let i = firstIndex; i >= lastIndex; i--) {
							selectItem(LeftPaneItemCollection.children[i]);
						}
					}
				}
				else {
					let firstIndex = parseInt(SelectedElement?.getAttribute("itemindex") ?? ß);
					let lastIndex = parseInt(element.getAttribute("itemindex"));
					unSelectAllItems();
					if (firstIndex < lastIndex) {
						for (let i = firstIndex; i <= lastIndex; i++) {
							selectItem(RightPaneItemCollection.children[i]);
						}
					}
					else {
						for (let i = firstIndex; i >= lastIndex; i--) {
							selectItem(RightPaneItemCollection.children[i]);
						}
					}
				}
			}
		}
		else {
			selectItem(element);
		}
	}
	// Interaction mode: Open item
	else if (
		(element != null &&
			(element == SelectedItemToOpen || IsSelectMode == false)) ||
		(isDir == 1 && ViewMode == "miller" && IsMetaDown == false)
	) {
		await openItem(element, dualPaneSide, shortcutPath);
	}
	// Double click logic / reset after 500 ms to force double click to open
	setTimeout(() => {
		SelectedItemToOpen = null;
	}, 250); // Maybe make this customizable in the future
}

async function openItem(element, dualPaneSide, shortcutDirPath = null) {
	let isDir =
		element != null
			? parseInt(element.getAttribute("itemisdir"))
			: shortcutDirPath != null
				? 1
				: 0;
	let path = element != null ? element.getAttribute("itempath") : shortcutDirPath;
	let millerCol = element != null ? element.getAttribute("itemformillercol") : null;
	let ext = element != null ? element.getAttribute("itemext") : null;
	if (IsPopUpOpen == false || IsQuickSearchOpen === true) {
		if (
			IsItemPreviewOpen == false &&
			isDir == 1 &&
			ext != ".app"
		) {
			// Open directory
			let isSwitched = await invoke("open_dir", { path });
			if (isSwitched == true) {
				if (IsDualPaneEnabled === false) {
					if (ViewMode == "miller") {
						$(".selected-item").removeClass("selected-item");
						element.classList.add("selected-item");
						await removeExcessMillerCols(parseInt(millerCol));
						await addMillerCol(millerCol);
						await setMillerColActive(null, millerCol);
						await listDirectories();
					} 
					else {
						await listDirectories();
					}
					await setCurrentDir(path);
				} else {
					if (dualPaneSide == "left") {
						LeftDualPanePath = path;
					} else {
						RightDualPanePath = path;
					}
					SelectedItemPaneSide = dualPaneSide;
					await setCurrentDir(path, SelectedItemPaneSide);
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

function selectItem(element, dualPaneSide = "", isNotReset = false) {
	let path = element?.getAttribute("itempath");
	let index = element?.getAttribute("itemindex");
	// Reset colored selection
	if (SelectedElement != null && IsMetaDown == false && IsCtrlDown == false && IsShiftDown == false && (isNotReset === false)) {
		ArrSelectedItems.forEach((item) => {
			if (IsDualPaneEnabled) {
				item.children[0].classList.remove("selected-item");
			} else if (ViewMode == "column" || ViewMode == "miller") {
				if (IsShowDisks) {
					item.children[0].children[1].classList.remove("selected-item");
				} else {
					item.children[0].children[0].classList.remove("selected-item");
				}
			} else {
				if (IsShowDisks == true) {
					item.children[0].children[0].classList.remove("selected-item");
				} else {
					item.children[0].children[0].children[0].classList.remove(
						"selected-item",
					);
					item.children[0].children[0].children[1].classList.remove(
						"selected-item-min",
					);
				}
			}
		});
		ArrSelectedItems = [];
	}
	SelectedElement = element; // Switch to new element / selection
	SelectedItemToOpen = isNotReset ? null : element;
	if (IsDualPaneEnabled) {
		SelectedElement.children[0].classList.add("selected-item");
	} else if (ViewMode == "column" || ViewMode == "miller") {
		if (IsShowDisks) {
			SelectedElement.children[0].children[1].classList.add("selected-item");
		} else {
			SelectedElement.children[0].children[0].classList.add("selected-item");
		}
	} else {
		if (IsShowDisks == true) {
			SelectedElement.children[0].children[0].classList.add("selected-item");
		} else {
			SelectedElement.children[0].children[0].children[0].classList.add(
				"selected-item",
			);
			SelectedElement.children[0].children[0].children[1].classList.add(
				"selected-item-min",
			);
		}
	}
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
		showItemPreview(SelectedElement, true);
	}
	ArrSelectedItems.push(SelectedElement);
}

function deSelectitem(item) {
	if (IsDualPaneEnabled) {
		item.children[0].classList.remove("selected-item");
	} else if (ViewMode == "column") {
		item.children[0].children[0].classList.remove("selected-item");
	} else {
		item.children[0].children[0].children[0].classList.remove("selected-item");
		item.children[0].children[0].children[1].classList.remove(
			"selected-item-min",
		);
	}
}

async function unSelectAllItems() {
	if (ArrSelectedItems.length > 0) {
		for (let i = 0; i < ArrSelectedItems.length; i++) {
			if (IsDualPaneEnabled) {
				ArrSelectedItems[i].children[0].children[0].classList.remove("selected-item");
			} else if (ViewMode == "column" || ViewMode == "miller") {
				ArrSelectedItems[i].children[0].children[0].classList.remove("selected-item");
			} else {
				try {
					if (IsShowDisks === true) {
						ArrSelectedItems[i].children[0].children[0].classList.remove("selected-item");
						ArrSelectedItems[i].children[0].children[1].classList.remove("selected-item-min");
					} else {
						ArrSelectedItems[i].children[0].children[0].children[0].classList.remove("selected-item");
						ArrSelectedItems[i].children[0].children[0].children[1].classList.remove("selected-item-min");
					}
				} catch (e) {
					console.log(e);
				}
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
	await invoke("go_home");
	await listDirectories();
	await setCurrentDir(await getCurrentDir());
}

async function goBack() {
	if (IsDualPaneEnabled === true) {
		if (SelectedItemPaneSide == "left") {
			LeftPaneItemIndex = LastLeftPaneIndex ?? 0;
		} else {
			RightPaneItemIndex = LastRightPaneIndex ?? 0;
		}
	}
	if (IsMetaDown == false) {
		await invoke("go_back", { isDualPane: IsDualPaneEnabled });
		await listDirectories();
	}
	await setCurrentDir(await getCurrentDir());
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
					parseInt(selectedItemIndex) * 36 -
					document.querySelector(".dual-pane-left").scrollTop <
					10
				) {
					document.querySelector(".dual-pane-left").scrollTop -= 36;
				}
			} else if (SelectedItemPaneSide == "right") {
				if (
					parseInt(selectedItemIndex) * 36 -
					document.querySelector(".dual-pane-right").scrollTop <
					10
				) {
					document.querySelector(".dual-pane-right").scrollTop -= 36;
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
			parseInt(selectedItemIndex) * 36 -
			document.querySelector(".dual-pane-left").scrollTop >
			window.innerHeight - 200
		) {
			document.querySelector(".dual-pane-left").scrollTop += 36;
		}
	} else if (SelectedItemPaneSide == "right") {
		if (
			parseInt(selectedItemIndex) * 36 -
			document.querySelector(".dual-pane-right").scrollTop >
			window.innerHeight - 200
		) {
			document.querySelector(".dual-pane-right").scrollTop += 36;
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
	}
	catch (e) {
		console.log(e);
	}
}

async function initDualPane(path = "") {
	LeftDualPanePath = path;
	RightDualPanePath = path;
	SelectedItemIndex = 0;
	SelectedItemPaneSide = "left";
	await refreshBothViews();
	goUp(false, true);
}

function goLeft(isToFirst = false, index = null) {
	if (index == null) {
		if (SelectedElement == null) {
			index = 0;	
		}
		else {
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
		}
		else {
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
	var rowlen = Array.prototype.reduce.call(DirectoryList.children, function (prev, next) {
		if (!prev[2]) {
			var ret = next.getBoundingClientRect().left
			// if increasing, increment unter
			if (!(prev[0] > -1 && ret < prev[1])) { prev[0]++ }
			else { prev[2] = 1 } // else stop counting
		}
		return [prev[0], ret, prev[2]] // [counter, elem, stop-counting]
	}, [0, null, 0])[0];
	let index = 0;
	if (SelectedElement != null) {
		index = parseInt(SelectedElement?.getAttribute("itemindex")) - rowlen;
	}
	goLeft(false, index);	
}

function goGridDown() {
	var rowlen = Array.prototype.reduce.call(DirectoryList.children, function (prev, next) {
		if (!prev[2]) {
			var ret = next.getBoundingClientRect().left
			// if increasing, increment counter
			if (!(prev[0] > -1 && ret < prev[1])) { prev[0]++ }
			else { prev[2] = 1 } // else stop counting
		}
		return [prev[0], ret, prev[2]] // [counter, elem, stop-counting]
	}, [0, null, 0])[0];
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
		}
		else {
			LastRightPaneIndex = RightPaneItemIndex;
		}
		if (SelectedElement != null) {
			await openItem(SelectedElement, SelectedItemPaneSide);
		}
	}
	else {
		if (SelectedElement != null) {
			await openItem(SelectedElement);
		}
	}
	goUp(false, true);
}

async function goToDir(directory) {
	await invoke("go_to_dir", { directory }).then(async (items) => {
		if (IsDualPaneEnabled == true) {
			await showItems(items, SelectedItemPaneSide);
		} else {
			await showItems(items);
		}
	});
	await setCurrentDir(await getCurrentDir());
}

async function openInTerminal() {
	if (!await invoke("open_in_terminal", {"path": ArrSelectedItems.length === 0 ? CurrentDir : SelectedItemPath})) {
		if (Platform === "linux") {
			showToast("Failed to open terminal. Make sure exo-open is installed and configured.", ToastType.ERROR, 5000);
		} else {
			showToast("Failed to open terminal.", ToastType.ERROR);
		}
	}

	ContextMenu.style.display = "none";
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
		document.querySelector(".cancel-search-button").style.display = "block";
		if (IsDualPaneEnabled === true) {
			if (SelectedItemPaneSide === "left") {
				$(".dual-pane-left").html("");
			}
			else {
				$(".dual-pane-right").html("");
			}
		}
		else {
			$(".directory-list").html("");
		}
		IsSearching = true;
		FoundItemsCountIndex = 0;
		await invoke("search_for", {
			fileName,
			maxItems,
			searchDepth,
			fileContent,
			appWindow,
			isQuickSearch
		});
		setTimeout(() => {
			ds.setSettings({
				selectables: ArrDirectoryItems,
			});
		}, 250);
	} else {
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
}

function closeFullSearchContainer() {
	document.querySelector(".search-full-container").style.display = "none";
	IsPopUpOpen = false;
	IsDisableShortcuts = false;
	IsInputFocused = false;
}

document.querySelector(".dualpane-search-input").addEventListener("keyup", async (e) => {
	if (e.keyCode == 13) {
		closeSearchBar();
		if (IsDualPaneEnabled == true) {
			await openSelectedItem(SelectedElement);
		}
	} else if (IsQuickSearchOpen == true && e.key !== "Escape" && e.key != "Shift" && e.key != "Control" && e.key != "Alt" && e.key != "Meta") {
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
	document.querySelector(".dualpane-search-input").addEventListener("focusout", () => {
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
	document.querySelector(".cancel-search-button").style.display = "none";
	document.querySelector(".search-bar-input").value = "";
	await invoke("stop_searching");
	// await listDirectories();
}

async function switchView() {
	if (IsDualPaneEnabled == false) {
		if (ViewMode == "wrap") {
			document.querySelectorAll(".directory-list").forEach((list) => {
				// list.style.flexFlow = "column";
				list.style.gridTemplateColumns = "unset";
				list.style.rowGap = "2px";
			});
			if (IsShowDisks == false) {
				document.querySelector(".switch-view-button").innerHTML =
					`<i class="fa-solid fa-indent"></i>`;
			} else {
				document.querySelector(".switch-view-button").innerHTML =
					`<i class="fa-solid fa-grip"></i>`;
			}
			document
				.querySelectorAll(".item-button")
				.forEach((item) => (item.style.display = "none"));
			document
				.querySelectorAll(".item-button-list")
				.forEach((item) => (item.style.display = "flex"));
			document
				.querySelectorAll(".disk-item-button-button")
				.forEach((item) => (item.style.display = "none"));
			document.querySelector(".list-column-header").style.display = "flex";
			$(".explorer-container")?.css("padding", "100px 10px 10px 10px");
			ViewMode = "column";
		} else if (ViewMode == "column") {
			document.querySelector(".list-column-header").style.display = "none";
			document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
			document.querySelector(".miller-container").style.display = "flex";
			document.querySelector(".miller-column").style.display = "inline";
			document.querySelector(".non-dual-pane-container").style.display = "none";
			$(".explorer-container").css("padding", "10px 10px 0 10px");
			$(".file-searchbar").css("opacity", "0");
			$(".file-searchbar").css("pointer-events", "none");
			ViewMode = "miller";
		} else if (ViewMode == "miller" || IsShowDisks == true) {
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
			document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-list"></i>`;
			document.querySelectorAll(".item-button").forEach((item) => (item.style.display = "flex"));
			document.querySelectorAll(".item-button-list").forEach((item) => (item.style.display = "none"));
			document.querySelectorAll(".disk-item-button-button").forEach((item) => (item.style.display = "flex"));
			document.querySelector(".list-column-header").style.display = "none";
			$(".explorer-container")?.css("padding", "85px 20px 20px 20px");
			$(".file-searchbar").css("opacity", "1");
			$(".file-searchbar").css("pointer-events", "all");
			ViewMode = "wrap";
		}
		await invoke("switch_view", { viewMode: ViewMode });
	}
	if (IsShowDisks === false) {
		await listDirectories();
	}
}

async function switchToDualPane() {
	if (IsDualPaneEnabled == false) {
		OrgViewMode = ViewMode;
		IsDualPaneEnabled = true;
		ViewMode = "column";
		document.querySelector(".miller-container").style.display = "none";
		if (Platform == "darwin") {
			$(".header-nav").css("padding-left", "85px");
		}
		document.querySelectorAll(".item-button").forEach((item) => (item.style.display = "none"));
		document.querySelectorAll(".item-button-list").forEach((item) => (item.style.display = "flex"));
		document.querySelector(".switch-dualpane-view-button").innerHTML = `<i class="fa-regular fa-rectangle-xmark"></i>`;
		await invoke("list_dirs").then(async (items) => {
			await showItems(items, "left");
			await showItems(items, "right");
			goUp(false, true);
		});
		document.querySelector(".site-nav-bar").style.width = "0px";
		document.querySelector(".site-nav-bar").style.minWidth = "0";
		if (Platform == "darwin") {
			$(".site-nav-bar").css("padding", "55px 0 0 0");
		}
		else {
			$(".site-nav-bar").css("padding", "0");
		}
		$(".list-column-header").css("height", "0");
		$(".list-column-header").css("padding", "0");
		$(".list-column-header").css("border", "none");
		$(".dual-pane-container").css("opacity", "1");
		$(".dual-pane-container").css("height", "100%");
		$(".dual-pane-container").css("padding-top", "55px");
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
		$(".non-dual-pane-container")?.css("width", "calc(100vw - 150px)");
		$(".non-dual-pane-container")?.css("opacity", "1");
		$(".non-dual-pane-container")?.css("height", "100%");
		$(".non-dual-pane-container")?.css("padding", "10px 20px");
		$(".non-dual-pane-container").css("overflow-y", "auto");
		$(".site-nav-bar")?.css("width", "150px");
		$(".site-nav-bar")?.css("min-width", "150px");
		if (Platform == "darwin") {
			$(".site-nav-bar")?.css("padding", "55px 10px 10px 10px");
		}
		else {
			$(".site-nav-bar")?.css("padding", "10px");
		}
		$(".explorer-container").css("padding", "10px");
		$(".list-column-header")?.css("height", "35px");
		$(".list-column-header")?.css("padding", "5px");
		$(".list-column-header")?.css("border-bottom", "1px solid var(--tertiaryColor)");
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
		// Reset to view before the 
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

function openSettings() {
	if (IsPopUpOpen == false) {
		$(".settings-ui").css("display", "flex");
		// Workaround for opacity transition
		setTimeout(() => {
			$(".settings-ui").css("opacity", "1");
		});
		IsDisableShortcuts = true;
		IsPopUpOpen = true;
	}
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
	);
	let maxItems = parseInt(document.querySelector(".max-items-input").value);
	let isImagePreview = (IsImagePreview = document.querySelector(
		".image-preview-checkbox",
	).checked);
	let isSelectMode = (IsSelectMode = $("#choose-interaction-mode").is(
		":checked",
	));
	let currentTheme = $(".theme-select").val();

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
		arrFavorites: ArrFavorites,
	});
	if (isVerbose === true) {
		showToast("Settings have been saved", ToastType.INFO);
	}
	if (isToReload == true) {
		checkAppConfig();
	}
}

async function addFavorites(item) {
	ArrFavorites.push(item);
	// await invoke("save_favorites", { arrFavorites: ArrFavorites });
}

function closeSettings() {
	$(".settings-ui").css("opacity", "0");
	setTimeout(() => {
		$(".settings-ui").css("display", "none");
	}, 300)
	IsDisableShortcuts = false;
	IsPopUpOpen = false;
}

function getExtDescription(file_extension) {
	return fileExtensions[file_extension.replace(".", "").toUpperCase()];
}

async function showProperties(item) {
	if (IsPopUpOpen === false) {
		let name = item.getAttribute("itemname");
		let path = item.getAttribute("itempath");
		let ext = item.getAttribute("itemext");
		let extension_description = getExtDescription(ext); // undefined if it's unknown or a directory
		let modifiedAt = item.getAttribute("itemmodified");
		ContextMenu.style.display = "none";
		let popup = document.createElement("div");
		popup.className = "uni-popup item-properties-popup";
		popup.innerHTML = `
		<div class="popup-header">
			<h3>${name}</h3>
		</div>
		<div class="popup-body">
			<button class="item-preview-copy-path-button" onclick="writeText('${path}'); showToast('Copied path to clipboard', ToastType.INFO);">Path: ${path}</button>
			${extension_description ? `<br/><p>Type: ${extension_description}</p>` : ''}
			<br/>
			<p>Modified: ${modifiedAt}</p>
			<br/>
			<div style="display: flex; gap: 5px;">
				<div>Size:</div><div class="properties-item-size"><div class="preloader-small-invert"></div></div>
			</div>
		</div>
		<div class="popup-controls">
			<button class="icon-button" onclick="closeInfoProperties()">
				<span class="button-icon"><i class="fa-solid fa-ban"></i></span>
				Close
			</button>
		</div>
		`;
		document.querySelector("body").append(popup);
		IsPopUpOpen = true;
		await getSimpleDirInfo(path, ".properties-item-size");
	}
}

function closeInfoProperties() {
	$(".item-properties-popup")?.remove();
	IsPopUpOpen = false;
	IsItemPreviewOpen = false;
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
					<img decoding="async" src="${convertFileSrc(path)}"/>
				</div>
			`;
			break;
		case ".pdf":
		case ".html":
			module = `<iframe src="${convertFileSrc(path)}" />`;
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
					<video src="${convertFileSrc(path)}" autoplay></video>
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
				<div class="module-container"><pre class="item-preview-file-content" style="padding: 20px;">${await invoke("get_file_content", { path })}</pre></div>
			`;
			break;
		default:
			showProperties(item);
			return;
	}
	popup.innerHTML = `
		<div class="popup-header">
			<h3>Name: ${name}</h3>
		</div>
		${module}
	`;
	IsPopUpOpen = true;
	document.querySelector("body").append(popup);
	$(popup).fadeIn(fadeTime);
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
	document.querySelectorAll(".multi-rename-input").forEach((input) =>
		input.addEventListener("keyup", (e) => {
			if (
				((e.ctrlKey && Platform != "darwin") || e.metaKey) &&
				e.key === "Enter"
			) {
				renameItemsWithFormat(
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
		.addEventListener("click", () => {
			renameItemsWithFormat(
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
	await invoke("rename_elements_with_format", {
		arrElements,
		newName,
		startAt,
		stepBy,
		nDigits,
		ext,
	}).then(async () => {
		closeMultiRenamePopup();
		await listDirectories();
	});
}

function closeMultiRenamePopup() {
	IsPopUpOpen = false;
	$(".multi-rename-popup").remove();
}

async function closeItemPreview() {
	$(".item-preview-popup").fadeOut(200, () => {
		$(".item-preview-popup")?.remove();
	});
	$(".item-properties-popup")?.remove();
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
	$(".ftp-loader").css("display", "flex");
	openFTP(hostname, username, password, remotePath);
}

async function openFTP(
	hostname,
	username,
	password,
	remotePath = "/",
) {
	await invoke("mount_sshfs", {
		hostname,
		username,
		password,
		remotePath,
	}).then(async (mountedPath) => {
		await openDirAndSwitch(mountedPath);
		insertSiteNavButtons();
	});
	closeFtpConfig();
}

async function sortItems(sortMethod) {
	if (IsShowDisks == false) {
		let arr = [...DirectoryList.children];
		arr = getFDirObjectListFromDirectoryList(arr);
		if (sortMethod == "size") {
			if (IsFilteredBySize == true) {
				arr.sort((a, b) => {
					return parseInt(b.size) - parseInt(a.size);
				});
				IsFilteredBySize = false;
			} else {
				arr.sort((a, b) => {
					return parseInt(a.size) - parseInt(b.size);
				});
				IsFilteredBySize = true;
			}
		}
		if (sortMethod == "name") {
			if (IsFilteredByName == true) {
				arr.sort((a, b) => {
					return a.name.localeCompare(b.name);
				});
				IsFilteredByName = false;
			} else {
				arr.sort((a, b) => {
					return b.name.localeCompare(a.name);
				});
				IsFilteredByName = true;
			}
		}
		if (sortMethod == "date") {
			if (IsFilteredByDate == true) {
				arr.sort((a, b) => {
					return new Date(b.last_modified) - new Date(a.last_modified);
				});
				IsFilteredByDate = false;
			} else {
				arr.sort((a, b) => {
					return new Date(a.last_modified) - new Date(b.last_modified);
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
	r.style.setProperty("--siteBarColor", appConfig.themes[themeId].site_bar_color);
	r.style.setProperty("--navBarColor", appConfig.themes[themeId].nav_bar_color);
}

async function open_with(filePath, appPath) {
	ContextMenu.style.display = "none";
	await invoke("open_with", { filePath: filePath, appPath: appPath });
}

async function getSetInstalledApplications(ext = "") {
	await invoke("get_installed_apps", { extension: ext }).then(
		(apps) => (Applications = apps),
	);
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
	await invoke("find_duplicates", {
		appWindow: appWindow,
		path: item.getAttribute("itempath"),
		depth: parseInt(depth),
	});
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
	resetProgressBar();
	await listDirectories();
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

async function insertSiteNavButtons() {
	for (let children of document.querySelector(".site-nav-bar").children) {
		if (!children.classList.contains("active-actions-container")) {
			children.remove();
		}
	}
	let sshfsMounts = await invoke("get_sshfs_mounts");
	let siteNavButtons = [
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
		Platform.includes("win") && Platform != "darwin" ? [] : ["FTP", "", "fa-solid fa-circle-nodes", showFtpConfig],
	];

	for (let i = 0; i < siteNavButtons.length; i++) {
		if (siteNavButtons[i].length == 0) continue;
		let button = document.createElement("button");
		button.className = "site-nav-bar-button";
		button.innerHTML = `<i class="${siteNavButtons[i][2]}"></i> ${siteNavButtons[i][0]}`;
		button.setAttribute("itempath", siteNavButtons[i][1]);
		button.onclick = siteNavButtons[i][3]; // Support for dragging files to the directory
		button.ondragover = (e) => {
			button.style.opacity = "0.5";
			button.style.border = "1px solid var(--textColor)";
			DraggedOverElement = button;
			MousePos = [e.clientX, e.clientY];
		};
		button.ondragleave = () => {
			button.style.opacity = "1";
			button.style.border = "1px solid transparent";
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

	if (sshfsMounts.length > 0) {
		let seperator2 = document.createElement("div");
		seperator2.className = "horizontal-seperator";
		document.querySelector(".site-nav-bar").append(seperator2);
		
		sshfsMounts.forEach((mount) => {
			let sshfsButton = document.createElement("button");
			sshfsButton.className = "site-nav-bar-button sshfs-mount-button";
			sshfsButton.setAttribute("onclick", `openDirAndSwitch('${mount.path}')`);
			sshfsButton.innerHTML = `<i class="fa-solid fa-network-wired"></i> ${mount.name}`;
			sshfsButton.addEventListener("contextmenu", (e) => {
				e.preventDefault();
				e.stopPropagation();
				showCustomContextMenu(e, [
					{
						name: "Unmont",
						onclick: () => unmountNetworkDrive(mount)
					},
				]);
			});
			document.querySelector(".site-nav-bar").append(sshfsButton);
		});
	}
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
	return FileOperation;
}

async function stopSearching() {
	await invoke("stop_searching");
}

function createNewAction(actionId, actionName, actionDescription, path) {
	let newAction = new ActiveAction(actionName, actionDescription, actionId, path);
	ArrActiveActions.push(newAction);
	$(".active-actions-container").append(newAction.getHTMLElement());
}

function removeAction(actionId) {
	ArrActiveActions = ArrActiveActions.filter((action) => action.id !== actionId);
	$(`.active-action-${actionId}`).css("opacity", "0");
	setTimeout(() => {
		$(`.active-action-${actionId}`).remove();
	}, 300);
}

async function openDirAndSwitch(path) {
	await invoke("open_dir", { path });
	await setCurrentDir(path);
	await listDirectories();
	await unSelectAllItems();
}

async function openConfigLocation() {
	let dir = await invoke("get_config_location");
	await openDirAndSwitch(dir);
	resetEverything();
}

async function confirmPopup(message = "Nothing to see here!", type = PopupType.CONTINUE) {
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
		</div>
		<div class="popup-controls">
			<button class="icon-button">
				<div class="button-icon"><i class="fa-solid fa-xmark"></i></div>
				Cancel
			</button>
			${confirmationButton}	
		</div>
	`;
	document.body.appendChild(popup);
	document.querySelector(".confirm-popup button:last-child").focus();
	IsPopUpOpen = true;
	$(".popup-background").css("display", "block");
	setTimeout(() => $(".popup-background").css("opacity", "1")); // Workaround to trigger opacity transition
	return new Promise((resolve) => {
		document.querySelector(".confirm-popup button:first-child").onclick = () => {
			closeConfirmPopup();
			resolve(false);
		};
		document.querySelector(".confirm-popup button:last-child").onclick = () => {
			closeConfirmPopup();
			resolve(true);
		};
	});
}

function closeConfirmPopup() {
	document.querySelector(".confirm-popup")?.remove();
	$(".popup-background").css("display", "none");
	$(".popup-background").css("opacity", "0");
	IsPopUpOpen = false;
}

function resetContextMenu() {
	// Disabled access to "open with" context menu
	$(".c-item-openwith").css("pointer-events", "none");
	new Set(ContextMenu.children).forEach(children => {
		if (
			!(children.classList.contains("context-with-dropdown") && children.children[0].innerHTML === "Extras") &&
			!children.classList.contains("c-item-newfile") &&
			!children.classList.contains("c-item-newfolder") &&
			!children.classList.contains("c-item-openinterminal")
		)
		{
			children.setAttribute("disabled", "true");
			children.classList.add("c-item-disabled");
		}
	});
}

async function setupItemContextMenu(item, e) {
	if (ArrSelectedItems.length == 1 && (IsCtrlDown === false && Platform != "darwin" || Platform == "darwin" && IsMetaDown === false)) {
		await unSelectAllItems();
	}
	if (!ArrSelectedItems.includes(item)) {
		selectItem(item, "", true);
	}
	if (IsPopUpOpen == false) {
		let appsCMenu = document.querySelector(".context-open-item-with");
		appsCMenu.innerHTML = "";
		await getSetInstalledApplications(item.getAttribute("itemext"));
		if (Platform.includes("linux")) {
			appsCMenu.innerHTML = "<p>Not yet available on this platform</p>";
		} else if (Applications.length > 0) {
			Applications.forEach((app) => {
				if (app[0].split(".")[0].length > 0) {
					let newItem = document.createElement("button");
					newItem.innerHTML = app[0].split(".")[0];
					newItem.className = "context-item";
					newItem.setAttribute("appname", app[0].split(".")[0]);
					newItem.setAttribute("apppath", app[1]);
					newItem.addEventListener("click", () =>
						open_with(item.getAttribute("itempath"), app[1]),
					);
					appsCMenu.appendChild(newItem);
				}
			});
		} else {
			appsCMenu.innerHTML = "<p>No applications found</p>";
		}

		// Reset so that the commands are not triggered multiple times
		new Set(ContextMenu.children).forEach(children => {
			children.replaceWith(children.cloneNode(true));
		});

		// Enable all items
		new Set(ContextMenu.children).forEach(children => {
			if (children.classList.contains("c-item-paste")) {
				if (ArrCopyItems.length > 0) {
					children.removeAttribute("disabled");
					children.classList.remove("c-item-disabled");	
				}
			} else {
				children.removeAttribute("disabled");
				children.classList.remove("c-item-disabled");
			}
		});

		
		// Check if item is an supported archive
		let extension = item.getAttribute("itemext");
		if (
			extension != ".zip" &&
			extension != ".rar" &&
			extension != ".7z" &&
			extension != ".tar" &&
			extension != ".gz" &&
			extension != ".br" &&
			extension != ".bz2"
		) {
			document.querySelector(".c-item-extract").setAttribute("disabled", "true");
			document.querySelector(".c-item-extract").classList.add("c-item-disabled");
		} else {
			document.querySelector(".c-item-extract").removeAttribute("disabled");
			document.querySelector(".c-item-extract").classList.remove("c-item-disabled");
			// Disable another compression
			document.querySelector(".c-item-compress").setAttribute("disabled", "true");
			document.querySelector(".c-item-compress").classList.add("c-item-disabled");
		}

		// Check if item can be searched through for duplicates
		if (item.getAttribute("itemisdir") == "1") {
			document.querySelector(".c-item-duplicates").removeAttribute("disabled");
			document.querySelector(".c-item-duplicates").classList.remove("c-item-disabled");
		} else {
			document.querySelector(".c-item-duplicates").setAttribute("disabled", "true");
			document.querySelector(".c-item-duplicates").classList.add("c-item-disabled");
		}

		document.querySelector(".c-item-delete").addEventListener(
			"click",
			async () => {
				await deleteItems();
			},
			{ once: true },
		);
		document.querySelector(".c-item-extract").addEventListener(
			"click",
			async () => {
				await extractItem(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-compress").addEventListener(
			"click",
			async () => {
				await showCompressPopup(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-copy").addEventListener(
			"click",
			async () => {
				await copyItem(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-moveto").addEventListener(
			"click",
			async () => {
				await itemMoveTo(false);
			},
			{ once: true },
		);
		document.querySelector(".c-item-newfile").addEventListener(
			"click",
			() => {
				createFileInputPrompt(e);
			},
			{ once: true },
		);
		document.querySelector(".c-item-rename").addEventListener(
			"click",
			() => {
				renameElementInputPrompt(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-properties").addEventListener(
			"click",
			() => {
				showProperties(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-duplicates").addEventListener(
			"click",
			() => {
				showFindDuplicates(item);
			},
			{ once: true },
		);
		document.querySelector(".c-item-ytdownload").addEventListener(
			"click",
			async () => {
				await showYtDownload();
			},
			{ once: true },
		);

		$(".context-with-dropdown").css("pointer-events", "all");

		positionContextMenu(e);
	}
}

function showCustomContextMenu(e, contextMenuItems = [{}]) {
	let customContextMenu = document.createElement("div");
	customContextMenu.className = "custom-context-menu";
	contextMenuItems.map((item) => {
		let newButton = document.createElement("button");
		newButton.innerHTML = item.name;
		newButton.className = "c-item-custom";
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

function unmountNetworkDrive(networkDrive) {
	invoke("unmount_network_drive", { path: networkDrive.path }).then(() => {
		insertSiteNavButtons();
	});
}

insertSiteNavButtons();
checkAppConfig();
getSetInstalledApplications();