const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog;
const { appWindow } = window.__TAURI__.window;
const { writeText } = window.__TAURI__.clipboard;
const { writeFile } = window.__TAURI__.clipboard;
const { getTauriVersion } = window.__TAURI__.app;
const { getVersion } = window.__TAURI__.app;
const { getName } = window.__TAURI__.app;
const { getMatches } = window.__TAURI__.cli;

/* Window customization */

document
  .getElementById('titlebar-minimize')
  .addEventListener('click', () => appWindow.minimize());
document
  .getElementById('titlebar-maximize')
  .addEventListener('click', () => appWindow.toggleMaximize());
document
  .getElementById('titlebar-close')
  .addEventListener('click', () => appWindow.close());


/* region Global Variables */

let ViewMode = "wrap";
let DirectoryList;
let DirectoryCount = document.querySelector(".directory-entries-count");
let ContextMenu = document.querySelector(".context-menu");
let CopyFileName = "";
let CopyFilePath = "";
let CurrentDir = "/Home";
let IsShowDisks = false;
let IsShowHiddenFiles = false;
let IsAltDown = false;
let IsMetaDown = false;
let IsQuickSearchOpen = false;
let ConfiguredPathOne = "";
let ConfiguredPathTwo = "";
let ConfiguredPathThree = "";
let IsTabs = false;
let TabCount = 0;
let CurrentActiveTab = 1;
let TabOnePath;
let TabTwoPath;
let TabThreePath;
let TabFourPath;
let TabFivePath;
let IsTabsEnabled = true;
let IsDualPaneEnabled = false;
let LeftDualPanePath = "";
let RightDualPanePath = "";
let SelectedElement = null;
let SelectedItemPath = "";
let SelectedItemPaneSide = "";
let LeftPaneItemCollection = [];
let RightPaneItemCollection = [];
let IsDisableShortcuts = false;
let LeftPaneItemIndex = 0;
let RightPaneItemIndex = 0;
let IsPopUpOpen = false;
let SettingsSearchDepth = 10;
let SettingsMaxItems = 1000;
let IsFullSearching = false;
let ArrCopyItems = []; // Todo: select more elements to copy at once
let IsLightMode = false;
let IsImagePreview = false;
let IsFtpActive = false;
let CurrentFtpPath = "";

/* endregion */

/* Colors  */
let PrimaryColor = "#3f4352";
let SecondaryColor = "rgb(56, 59, 71)";
let SelectedColor = "rgba(0, 0, 0, 0.25)";

/* Upper right search bar logic */

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

document.querySelector(".full-dualpane-search-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13 && IsFullSearching == false) {
		startFullSearch();
	}
});
document.querySelector(".full-dualpane-search-file-content-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13 && IsFullSearching == false) {
		startFullSearch();
	}
});

function startFullSearch() {
	IsFullSearching = true;
	let fileName = document.querySelector(".full-dualpane-search-input").value;
	let maxItems = parseInt(document.querySelector(".full-search-max-items-input").value);
	maxItems = maxItems >= 1 ? maxItems : 9999999;
	let searchDepth = parseInt(document.querySelector(".full-search-search-depth-input").value);
	searchDepth = searchDepth >= 1 ? searchDepth : 9999999;
	let fileContent = document.querySelector(".full-dualpane-search-file-content-input").value;
	searchFor(fileName, maxItems, searchDepth, false, fileContent);
}

document.addEventListener("keyup", (e) => {
	if (e.keyCode === 27) {
		// Close all popups etc.
		ContextMenu.style.display = "none";
		closeSearchBar();
		closeSettings();
		closeInputDialog();
		closeFullSearchContainer();
		closeFtpConfig();
		closeInputPopup();
	}
});


// Close context menu or new folder input dialog when click elsewhere
document.addEventListener("mousedown", (e) => {
	if (!e.target.classList.contains("context-item-icon")
		&& !e.target.classList.contains("context-item")
		&& !e.target.classList.contains("input-dialog")
		&& !e.target.classList.contains("directory-item-entry")
		&& !e.target.classList.contains("directory-entry"))
	{
		let newFolderInput = document.querySelector(".input-dialog");
		if (newFolderInput != null
			&& e.target != newFolderInput
			&& e.target != newFolderInput.children[0]
			&& e.target != newFolderInput.children[1])
		{
			closeInputDialog();
		}
		document.querySelector(".context-menu").style.display = "none";

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

		// New file and new folder
		// ContextMenu.children[5].setAttribute("disabled", "true");
		// ContextMenu.children[5].classList.add("c-item-disabled");
		// ContextMenu.children[6].setAttribute("disabled", "true");
		// ContextMenu.children[6].classList.add("c-item-disabled");

		ContextMenu.children[7].setAttribute("disabled", "true");
		ContextMenu.children[7].classList.add("c-item-disabled");
		ContextMenu.children[8].setAttribute("disabled", "true");
		ContextMenu.children[8].classList.add("c-item-disabled");
	}
});


// Open context menu for pasting for example
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	ContextMenu.children[5].replaceWith(ContextMenu.children[5].cloneNode(true));
	ContextMenu.children[6].replaceWith(ContextMenu.children[6].cloneNode(true));
	// ContextMenu.children[7].replaceWith(ContextMenu.children[7].cloneNode(true));

	ContextMenu.style.display = "flex";
	if ((ContextMenu.offsetHeight + e.clientY) >= window.innerHeight) {
		ContextMenu.style.top = e.clientY - ContextMenu.offsetHeight + "px";
		ContextMenu.style.bottom = null;
	}
	else {
		ContextMenu.style.bottom = null;
		ContextMenu.style.top = e.clientY + "px";
	}
	if ((ContextMenu.clientWidth + e.clientX) >= window.innerWidth) {
		ContextMenu.style.left = e.clientX - ContextMenu.clientWidth + "px";
		console.log("ContextMenu.style.left");
	}
	else {
		ContextMenu.style.left = e.clientX + "px";
	}
	
	ContextMenu.children[6].addEventListener("click", function() { createFolderInputPrompt(e); }, {once: true});
	ContextMenu.children[5].addEventListener("click", function() { createFileInputPrompt(e); }, {once: true});

	if (CopyFilePath == "") {
		ContextMenu.children[4].setAttribute("disabled", "true");
		ContextMenu.children[4].classList.add("c-item-disabled");
	}
	else {
		ContextMenu.children[4].removeAttribute("disabled");
		ContextMenu.children[4].classList.remove("c-item-disabled");
	}
	closeInputDialog();
});


/* Shortcuts configuration */

document.onkeydown = async (e) => {
	// Shortcut for jumping to configured directory
	if (e.keyCode == 18){
		IsAltDown = true;
	}
	if (e.keyCode === 91) {
		IsMetaDown = true;
	}
	if (IsAltDown == true && e.keyCode == 49)
	{
		if (ConfiguredPathOne == "") {
			return;
		}
		openItem(1, SelectedItemPaneSide, null, true, ConfiguredPathOne);
	}
	if (IsAltDown == true && e.keyCode == 50)
	{
		if (ConfiguredPathTwo == "") {
			return;
		}
		openItem(1, SelectedItemPaneSide, null, true, ConfiguredPathTwo);
	}
	if (IsAltDown == true && e.keyCode == 51)
	{
		if (ConfiguredPathThree == "") {
			return;
		}
		openItem(1, SelectedItemPaneSide, null, true, ConfiguredPathThree);
	}

	if (false) { //IsTabsEnabled == true) {
		// Check if ctrl + t or is pressed to open new tab
		if ((e.ctrlKey || e.keyCode == 91) && e.keyCode == 84) {
			if (TabCount < 5) {
				let tabCounter = 1;
				if (IsTabs == false) {
					IsTabs = true;
					document.querySelector(".tab-header").style.display = "flex";
					document.querySelectorAll(".explorer-container").forEach(item => {
						if (ViewMode == "column") {
							item.style.marginTop = "35px";
							item.style.height = "calc(100vh - 147px)";
							item.style.paddingBottom = "10px";
						}
						else {
							item.style.height = "calc(100vh - 97px)";
							item.style.paddingBottom = "20px";
						}
					});
					createTab(1, true);
					TabCount++;
				}
				let checkTab = document.querySelector(".fx-tab-"+tabCounter);
				while (checkTab != null) {
					tabCounter++;
					checkTab = document.querySelector(".fx-tab-"+tabCounter);
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
		// check if f5 is pressed
		if (e.keyCode == 116 && IsTabsEnabled == false) {
			let isToCopy = await confirm("Current selection will be copied over");
			if (isToCopy == true) {
				pasteItem();
			}
			e.preventDefault();
			e.stopPropagation();
		}
		// check if backspace is pressed
		if (e.keyCode == 8) {
			goBack();	
			e.preventDefault();
			e.stopPropagation();
		}
		// check if arrow up is pressed
		if (e.keyCode == 38) {
			goUp();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if arrow down is pressed
		if (e.keyCode == 40) {
			goDown();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if return is pressed
		if (!IsAltDown && e.keyCode == 13) {
			openSelectedItem();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if tab is pressed
		if (e.keyCode == 9) {
			goToOtherPane();
			e.preventDefault();
			e.stopPropagation();
		}
		// check if del is pressed
		if (e.keyCode == 46 || (IsMetaDown && e.keyCode == 8)) {
			deleteItem(SelectedElement);
			e.preventDefault();
			e.stopPropagation();
		}
		// check if alt + enter is pressed
		if (IsAltDown && e.keyCode == 13) {
			renameElementInputPrompt(null, SelectedElement);	
		}
		if (IsPopUpOpen == false) {
			// check if alt + f7 is pressed
			if (e.keyCode == 119) {
				openFullSearchContainer();
				e.preventDefault();
				e.stopPropagation();
			}
			// check if strg + f is pressed
			if (e.ctrlKey && e.keyCode == 70) {
				openSearchBar();
				e.preventDefault();
				e.stopPropagation();
			}
		}
	}
	
	// check if ctrl + r is pressed
	if (e.ctrlKey && e.key == "r") {
		refreshView();
		e.preventDefault();
		e.stopPropagation();
	}

	if (IsPopUpOpen == false) {
		// check if ctrl + g is pressed | Path input
		if (e.ctrlKey && e.key == "g") {
			showInputPopup("Input path to jump to");
			e.preventDefault();
			e.stopPropagation();
		}

		// New folder input prompt when f7 is pressed
		if (e.keyCode == 118) {
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
	}
} 

// check for click on one of the dual pane containers and set directory accordingly
document.querySelector(".dual-pane-left").addEventListener("click", () => {
	setCurrentDir(LeftDualPanePath, "left");
});
document.querySelector(".dual-pane-left").addEventListener("contextmenu", () => {
	setCurrentDir(LeftDualPanePath, "left");
});
document.querySelector(".dual-pane-right").addEventListener("click", () => {
	setCurrentDir(RightDualPanePath, "right");
});
document.querySelector(".dual-pane-right").addEventListener("contextmenu", () => {
	setCurrentDir(RightDualPanePath, "right");
});


// Reset 
document.onkeyup = (e) => {
	if (e.keyCode == 18){
		IsAltDown = false;
	}
	if (e.keyCode == 71){
		IsGDown = false;
	}
	if (e.keyCode === 91) {
		IsMetaDown = false;
	}
}


// Main function to handle directory visualization
async function showItems(items, dualPaneSide = "") {
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
		document.querySelector(".tab-container-"+CurrentActiveTab).innerHTML = "";
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
	document.querySelector(".normal-list-column-header").style.display = "flex";
	document.querySelector(".disk-list-column-header").style.display = "none";

	let currentTab = document.querySelector(".fx-tab-"+CurrentActiveTab);
	if (currentTab != null) {
		currentTab.children[0].innerHTML = CurrentDir.split("/")[CurrentDir.split("/").length-1];
	}
	delete currentTab;
	DirectoryList = document.createElement("div");
	if (IsDualPaneEnabled == true) {
		DirectoryList.className = "directory-list-dual-pane";
	}
	else {
		DirectoryList.className = "directory-list";
	}
	let hiddenItemsLength = items.filter(str => str.name.startsWith(".")).length;
	if (!IsShowHiddenFiles) {
		items = items.filter(str => !str.name.startsWith("."));
	}
	DirectoryCount.innerHTML = "Objects: " + items.length + " / " + hiddenItemsLength;
	delete hiddenItemsLength;
	let set = new Set(items);
	delete items;
	let counter = 0;
	set.forEach(item => {
		let itemLink = document.createElement("button");
		itemLink.setAttribute("onclick", "openItem('"+item.is_dir+"', '"+dualPaneSide+"', this)");
		itemLink.setAttribute("itempath", item.path);
		itemLink.setAttribute("itemindex", counter++);
		itemLink.setAttribute("itempaneside", dualPaneSide);
		itemLink.setAttribute("itemisdir", item.is_dir);
		itemLink.setAttribute("itemext", item.extension);
		itemLink.setAttribute("isftp", item.is_ftp);
		itemLink.setAttribute("itemname", item.name);
		itemLink.setAttribute("itemsize", formatBytes(item.size));
		itemLink.setAttribute("itemmodified", item.last_modified);

		let newRow = document.createElement("div");
		newRow.className = "directory-item-entry";
		let fileIcon = "resources/file-icon.png"; // Default
		let iconSize = "48px";
		if (item.is_dir == 1) {
			fileIcon = "resources/folder-icon.png";
			iconSize = "48px";
			// Check for dir name to apply custom icons
			if (item.name.toLowerCase().includes("downloads")) {
				fileIcon = "resources/folder-downloads.png";
			}
			else if (item.name.toLowerCase().includes("desktop")
			|| item.name.toLowerCase().includes("schreibtisch"))
			{
				fileIcon = "resources/folder-desktop.png";
			}
			else if (item.name.toLowerCase().includes("dokumente")
			|| item.name.toLowerCase().includes("documents")
			|| item.name.toLowerCase().includes("docs"))
			{
				fileIcon = "resources/folder-docs.png";
			}
			else if (item.name.toLowerCase().includes("musik") || item.name.toLowerCase().includes("music")) {
				fileIcon = "resources/folder-music.png";
			}
			else if (item.name.toLowerCase().includes("bilder")
			|| item.name.toLowerCase().includes("pictures")
			|| item.name.toLowerCase().includes("images"))
			{
				fileIcon = "resources/folder-images.png";
			}
			else if (item.name.toLowerCase().includes("videos")
			|| item.name.toLowerCase().includes("movies")
			|| item.name.toLowerCase().includes("films")
			|| item.name.toLowerCase().includes("filme"))
			{
				fileIcon = "resources/folder-videos.png";
			}
			else if (item.name.toLowerCase().includes("coding")
			|| item.name.toLowerCase().includes("programming")
			|| item.name.toLowerCase().includes("programmieren")
			|| item.name.toLowerCase().includes("code"))
			{
				fileIcon = "resources/folder-coding.png";
			}
			else if (item.name.toLowerCase().includes("werkzeuge") || item.name.toLowerCase().includes("tools")) {
				fileIcon = "resources/folder-tools.png";
			}
			else if (item.name.toLowerCase().includes("public")
			|| item.name.toLowerCase().includes("öffentlich")
		    || item.name.toLowerCase().includes("shared")
			|| item.name.toLowerCase().includes("geteilt"))
			{
				fileIcon = "resources/folder-public.png";
			}
			else if (item.name.toLowerCase().includes("games")
			|| item.name.toLowerCase().includes("spiele"))
			{
				fileIcon = "resources/folder-games.png";
			}
			else if (item.name.toLowerCase().includes("developer")
			|| item.name.toLowerCase().includes("development"))
			{
				fileIcon = "resources/folder-development.png";
			}
		}
		else {
			switch (item.extension.toLowerCase()) {
				case ".json":
				case ".sql":
				case ".js":
				case ".css":
				case ".scss":
				case ".cs":
				case ".c":
				case ".rs":
				case ".html":
				case ".php":
				case ".htm":
				case ".py":
					fileIcon = "resources/code-file.png";
					break;
				case ".png":
				case ".jpg":
				case ".jpeg":
				case ".gif":
				case ".webp":
					if (IsImagePreview) {
						fileIcon = window.__TAURI__.tauri.convertFileSrc(item.path);
					}
					else {
						fileIcon = "resources/img-file.png";
					}
					break;
				case ".svg":
					fileIcon = "resources/img-file.png";
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
					fileIcon = "resources/zip-file.png";
					break;
				case ".xlsx":
					fileIcon = "resources/spreadsheet-file.png";
					break;
				case ".appimage":
					fileIcon = "resources/appimage-file.png";
					break;
				default:
					fileIcon = "resources/file-icon.png";
					break;
			}

		}
		itemLink.className = "item-link directory-entry";
		let itemButton = document.createElement("div");
		itemButton.innerHTML = `
			<img class="item-icon" src="${fileIcon}" width="${iconSize}" height="${iconSize}" style="object-fit: cover;" loading="lazy" />
			<p style="text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
		`;
		delete fileIcon;
		itemButton.className = "item-button directory-entry";
		let itemButtonList = document.createElement("div");
		itemButtonList.innerHTML = `
			<span style="display: flex; gap: 10px; align-items: center; width: 50%;">
				<img class="item-icon" src="${fileIcon}" width="24px" height="24px" loading="lazy"/>
				<p style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
			</span>
			<span style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-right: 5px;">
				<p style="width: auto; text-align: right;">${item.last_modified}</p>
				<p style="width: 75px; text-align: right;">${formatBytes(parseInt(item.size), 2)}</p>
			</span>
		`;
		if (dualPaneSide != null && dualPaneSide != "") {
			itemButtonList.className = "item-button-list directory-entry dual-pane-list-item";
		}
		else {
			itemButtonList.className = "item-button-list directory-entry";
		}
		if (ViewMode == "column") {
			itemButton.style.display = "none";
			DirectoryList.style.flexFlow = "column";
		}
		else {
			itemButtonList.style.display = "none";
			DirectoryList.style.flexFlow = "wrap";
		}
		newRow.append(itemButton);
		newRow.append(itemButtonList);
		itemLink.append(newRow)
		DirectoryList.append(itemLink);
	});

	DirectoryList.querySelectorAll(".directory-entry").forEach(item => {
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			// Reset so that the commands are not triggered multiple times
			ContextMenu.children[0].replaceWith(ContextMenu.children[0].cloneNode(true));
			ContextMenu.children[1].replaceWith(ContextMenu.children[1].cloneNode(true));
			ContextMenu.children[2].replaceWith(ContextMenu.children[2].cloneNode(true));
			ContextMenu.children[3].replaceWith(ContextMenu.children[3].cloneNode(true));
			ContextMenu.children[4].replaceWith(ContextMenu.children[4].cloneNode(true));
			ContextMenu.children[6].replaceWith(ContextMenu.children[6].cloneNode(true));
			ContextMenu.children[7].replaceWith(ContextMenu.children[7].cloneNode(true));
			ContextMenu.children[8].replaceWith(ContextMenu.children[8].cloneNode(true));

			ContextMenu.style.display = "flex";
			ContextMenu.style.left = e.clientX + "px";
			ContextMenu.style.top = e.clientY + "px";

			let extension = item.getAttribute("itemext");

			ContextMenu.children[0].removeAttribute("disabled");
			ContextMenu.children[0].classList.remove("c-item-disabled");
			ContextMenu.children[2].removeAttribute("disabled");
			ContextMenu.children[2].classList.remove("c-item-disabled")
			ContextMenu.children[3].removeAttribute("disabled");
			ContextMenu.children[3].classList.remove("c-item-disabled");;
			ContextMenu.children[4].removeAttribute("disabled");
			ContextMenu.children[4].classList.remove("c-item-disabled");
			ContextMenu.children[7].removeAttribute("disabled");
			ContextMenu.children[7].classList.remove("c-item-disabled");
			ContextMenu.children[8].removeAttribute("disabled");
			ContextMenu.children[8].classList.remove("c-item-disabled");


			if (extension != ".zip"
				&& extension != ".rar"
				&& extension != ".7z") {
				ContextMenu.children[1].setAttribute("disabled", "true");
				ContextMenu.children[1].classList.add("c-item-disabled");
			}
			else {
				ContextMenu.children[1].removeAttribute("disabled");
				ContextMenu.children[1].classList.remove("c-item-disabled");
			}
			ContextMenu.children[0].addEventListener("click", () => { deleteItem(item); }, {once: true});
			ContextMenu.children[1].addEventListener("click", () => { extractItem(item); }, {once: true});
			ContextMenu.children[2].addEventListener("click", () => { compressItem(item); }, {once: true});
			ContextMenu.children[3].addEventListener("click", () => { copyItem(item); }, {once: true});
			ContextMenu.children[5].addEventListener("click", () => { createFileInputPrompt(e); }, {once: true});
			ContextMenu.children[6].addEventListener("click", () => { createFolderInputPrompt(e); }, {once: true});
			ContextMenu.children[7].addEventListener("click", () => { renameElementInputPrompt(e, item); }, {once: true});
			ContextMenu.children[8].addEventListener("click", () => { showProperties(item); }, {once: true});

		});
	});
	if (IsTabsEnabled == true) {
		document.querySelector(".tab-container-"+CurrentActiveTab).append(DirectoryList);
	}
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
	delete DirectoryList;
}

async function getCurrentDir() {
	await invoke("get_current_dir")
		.then(path => {
			CurrentDir = path;
			document.querySelector(".current-path").textContent = path;
		});
}

async function setCurrentDir(currentDir, dualPaneSide) {
	await invoke("set_dir", {currentDir})
		.then(() => {
			CurrentDir = currentDir;
			document.querySelector(".current-path").textContent = CurrentDir;
		});

	if (dualPaneSide == "left") {
		document.querySelector(".dual-pane-left").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
		document.querySelector(".dual-pane-right").style.boxShadow = "none";
	}
	else if (dualPaneSide == "right") {
		document.querySelector(".dual-pane-right").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
		document.querySelector(".dual-pane-left").style.boxShadow = "none";
	}
}

async function deleteItem(item) {
	ContextMenu.style.display = "none";
	let fromPath = item.getAttribute("itempath");
	let SelectedItemPaneSide = item.getAttribute("itempaneside");
	let actFileName = fromPath.split("/")[fromPath.split("/").length-1];
	let isConfirm = await confirm("Do you really want to delete "+actFileName+"?");
	if (IsMetaDown == true) {
		IsMetaDown = false;
	}
	if (isConfirm == true) {
		showLoadingPopup(actFileName + " is being deleted");
		await invoke("delete_item", {actFileName})
			.then(async items => {
				ContextMenu.style.display = "none";
				await showItems(items.filter(str => !str.name.startsWith(".")), SelectedItemPaneSide);
				closeLoadingPopup();
			});
	}
}

async function copyItem(item) {
	CopyFilePath = item.getAttribute("itempath");
	let tempCopyFilePath = item.getAttribute("itempath").split("/");
	CopyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
	ContextMenu.style.display = "none";
	await writeText(CopyFilePath);
}

async function extractItem(item) {
	let compressFilePath = item.getAttribute("itempath");
	let compressFileName = compressFilePath.split("/")[compressFilePath.split("/").length - 1].replace("'", "");
	let isExtracting = await confirm("Do you want to unpack " + compressFileName + "?");
	if (isExtracting == true) {
		ContextMenu.style.display = "none";
		let extractFilePath = item.getAttribute("itempath");
		let extractFileName = extractFilePath.split("/")[extractFilePath.split("/").length - 1].replace("'", "");
		if (extractFileName != "") {
			let fromPath = extractFilePath.toString();
			await invoke("extract_item", {fromPath})
				.then(async (items) => {
					await showItems(items.filter(str => !str.name.startsWith(".")));
					await message("Unpack complete");
				});
		}
	}
}

async function compressItem(item) {
	let compressFilePath = item.getAttribute("itempath");
	let compressFileName = compressFilePath.split("/")[compressFilePath.split("/").length - 1].replace("'", "");
	if (compressFileName != "") {
		// open compressing... popup
		showLoadingPopup("File is being compressed");
		let fromPath = compressFilePath.toString();
		ContextMenu.style.display = "none";
		let SelectedItemPaneSide = item.getAttribute("itempaneside");
		await invoke("compress_item", { fromPath })
			.then(async (items) => {
				await showItems(items, SelectedItemPaneSide);
				closeLoadingPopup();	
				await message("Compressing done");
			});
	}
}

function showLoadingPopup(msg) {
	let body = document.querySelector("body");
	let popup = document.createElement("div");
	popup.innerHTML = `
		<h4>${msg}</h4>
		<img width="32px" height="auto" src="resources/preloader.gif" />
	`;
	popup.className = "loading-popup";
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
		<input class="text-input" placeholder="Start typing ..." autofocus/>
	`;
	popup.className = "input-popup"
	popup.children[1].addEventListener("keyup", async (e) => {
		if (e.keyCode == 13) {
			await invoke("open_dir", {path: popup.children[1].value})
			.then(async (items) => {
				await showItems(items);
				closeInputPopup();
			});
		}
	});
	body.append(popup);
	popup.children[1].focus();
	IsPopUpOpen = true;
}
function closeInputPopup() {
	$(".input-popup").remove();
	IsPopUpOpen = false;
}

async function pasteItem() {
	ContextMenu.style.display = "none";
	if (IsDualPaneEnabled == true) {
		let actFileName = SelectedItemPath.split("/")[SelectedItemPath.split("/").length - 1].replace("'", "");
		let fromPath = SelectedItemPath;
		showLoadingPopup(actFileName + " is being copied over");
		let isForDualPane = "1"
		if (SelectedItemPaneSide == "left") {
			actFileName = RightDualPanePath+"/"+actFileName;
			await invoke("set_dir", {currentDir: RightDualPanePath});
			await invoke("copy_paste", {actFileName, fromPath, isForDualPane})
				.then(items => {
					showItems(items, "right");
				});
		}
		else if (SelectedItemPaneSide == "right") {
			actFileName = LeftDualPanePath+"/"+actFileName;
			await invoke("set_dir", {currentDir: LeftDualPanePath});
			await invoke("copy_paste", {actFileName, fromPath, isForDualPane})
				.then(items => {
					showItems(items, "left");
				});
		}
	}
	else if (CopyFileName != "") {
		let actFileName = CopyFileName;
		showLoadingPopup(actFileName + " is being copied over");
		let fromPath = CopyFilePath.toString();
		let isForDualPane = "0"
		await invoke("copy_paste", {actFileName, fromPath, isForDualPane})
			.then(async (items) => {
				await showItems(items);
			});
		CopyFileName = "";
		CopyFilePath = "";
		ContextMenu.style.display = "none";
	}
	closeLoadingPopup();
}

function createFolderInputPrompt(e = null) {
	document.querySelectorAll(".input-dialog").forEach(item => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a name for your new folder.</h4>
		<input type="text" placeholder="New folder" autofocus>
	`;
	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
	nameInput.children[1].focus();
	IsDisableShortcuts = true;
	IsPopUpOpen = false;
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFolder(nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function createFileInputPrompt(e) {
	document.querySelectorAll(".input-dialog").forEach(item => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a name for your new file.</h4>
		<input type="text" placeholder="New document" autofocus>
	`;
	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
	nameInput.children[1].focus();
	IsDisableShortcuts = true;
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFile(nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function closeInputDialog() {
	let newFolderInput = document.querySelector(".input-dialog");
	if (newFolderInput != null) {
		newFolderInput.remove();
	}
	IsDisableShortcuts = false;
}

function renameElementInputPrompt(e, item) {
	let tempFilePath = item.getAttribute("itempath");
	let tempRenameFilePath = item.getAttribute("itempath").split("/");
	let tempFileName = tempRenameFilePath[tempRenameFilePath.length - 1].replace("'", "");
	let nameInput = document.createElement("div");

	nameInput.className = "input-dialog";
	nameInput.innerHTML = `
		<h4>Type in a new name for this item.</h4>
		<input type="text" placeholder="document.txt" value="${tempFileName}" required pattern="[0-9]" autofocus>
		`;
	if (e != null) {
		nameInput.style.left = e.clientX + "px";
		nameInput.style.top = e.clientY + "px";
	}
	else {
		nameInput.style.left = "50%";
		nameInput.style.top = "50%";
	}
	document.querySelector("body").append(nameInput);
	ContextMenu.style.display = "none";
	IsDisableShortcuts = true;
	IsPopUpOpen = true;
	nameInput.children[1].focus();
	nameInput.addEventListener("keydown", (e) => {
		if (e.keyCode === 13) {
			renameElement(tempFilePath, nameInput.children[1].value);
			nameInput.remove();
			IsDisableShortcuts = false;
			IsPopUpOpen = false;
		}
	});
}

function createFolder(folderName) {
	let isDualPaneEnabled = IsDualPaneEnabled;
	invoke("create_folder", {folderName, isDualPaneEnabled});
	listDirectories();
}

async function createFile(fileName) {
	await invoke("create_file", {fileName});
	listDirectories();
}

async function renameElement(path, newName) {
	await invoke("rename_element", {path, newName});
	listDirectories();
}

async function showAppInfo() {
	alert(`Application: ${await getName()}\nTauri version: ${await getTauriVersion()}\nApp version: ${await getVersion()}\nDeveloper: Ricky Dane`);
}

async function checkAppConfig() {
	await invoke("check_app_config")
		.then(appConfig => {
			if (appConfig.view_mode.includes("column")) {
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
				ViewMode = "column";
				let firstContainer = document.querySelector(".explorer-container");
				document.querySelector(".list-column-header").style.display = "flex";
				firstContainer.style.marginTop = "35px";
				firstContainer.style.height = "calc(100vh - 147px)";
				firstContainer.style.paddingBottom = "10px";
			}

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
				document.querySelector(".switch-dualpane-view-button").style.display = "block";
			}
			else {
				document.querySelector(".show-dual-pane-checkbox").checked = false;
				document.querySelector(".switch-dualpane-view-button").style.display = "none";
			}

			if (appConfig.is_light_mode.includes("1")) {
				document.querySelector(".switch-light-dark-mode-checkbox").checked = true;
				IsLightMode = true;
			}
			else {
				document.querySelector(".switch-light-dark-mode-checkbox").checked = false;
				IsLightMode = false;
			}

			if (appConfig.is_image_preview.includes("1")) {
				document.querySelector(".image-preview-checkbox").checked = IsImagePreview = true;
			}
			else {
				document.querySelector(".image-preview-checkbox").checked = false;
			}

			document.querySelector(".configured-path-one-input").value = ConfiguredPathOne = appConfig.configured_path_one;
			document.querySelector(".configured-path-two-input").value = ConfiguredPathTwo = appConfig.configured_path_two;
			document.querySelector(".configured-path-three-input").value = ConfiguredPathThree = appConfig.configured_path_three;
			document.querySelector(".launch-path-input").value = appConfig.launch_path;
			document.querySelector(".search-depth-input").value = SettingsSearchDepth = parseInt(appConfig.search_depth);
			document.querySelector(".max-items-input").value = SettingsMaxItems = parseInt(appConfig.max_items);

			if (appConfig.is_dual_pane_active.includes("1")) {
				if (IsDualPaneEnabled == false) {
					switchToDualPane();
				}
			}
			else if (appConfig.launch_path.length >= 1) {
				let path = appConfig.launch_path;
				invoke("open_dir", {path})
					.then((items) => {
						showItems(items);
					});
			}
		});
	checkColorMode("light_mode");
}

async function listDisks() {
	await invoke("list_disks")
		.then(disks => {
			IsShowDisks = true;
			document.querySelector(".disk-list-column-header").style.display = "block";
			document.querySelector(".normal-list-column-header").style.display = "none";
			document.querySelector(".tab-container-"+CurrentActiveTab).innerHTML = "";
			DirectoryList = document.createElement("div");
			DirectoryList.className = "directory-list";
			DirectoryCount.innerHTML = "Objects: " + disks.length;
			disks.forEach(item => {
				let itemLink = document.createElement("button");
				itemLink.setAttribute("itempath", item.path);
				itemLink.setAttribute("itemname", item.name);
				itemLink.setAttribute("isftp", 0);
				itemLink.setAttribute("onclick", "openItem('1', '', this)");
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
							<img class="item-icon" src="resources/disk-icon.png" width="48" height="auto"/>
							<span>
								<span style="display: flex; gap: 10px; align-items: center;">${formatBytes(item.avail)}</span>
								<span style="display: flex; gap: 10px; align-items: center;">${formatBytes(item.capacity)}</span>
							</span>
						</div>
						<span class="disk-item-bot">
							<div class="disk-item-usage-bar" style="width: ${evalCurrentLoad(item.avail, item.capacity)}%;"></div>	
							<p style="text-align: left;">${item.name}</p>
						</span>
					</span>
					`;
				itemButton.className = "item-button directory-entry";
				let itemButtonList = document.createElement("div");
				itemButtonList.innerHTML = `
					<span style="display: flex; gap: 10px; align-items: center; width: 50%;">
					<img class="item-icon" src="resources/disk-icon.png" width="24px" height="24px"/>
					<p style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
					</span>
					<span style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-right: 5px;">
					<p style="width: auto; text-align: right;">${formatBytes(item.avail)}</p>
					<p style="width: 75px; text-align: right;">${formatBytes(item.capacity)}</p>
					</span>
					`;
				itemButtonList.className = "item-button-list directory-entry";
				if (ViewMode == "column") {
					itemButton.style.display = "none";
					DirectoryList.style.flexFlow = "column";
				}
				else {
					itemButtonList.style.display = "none";
					DirectoryList.style.flexFlow = "wrap";
				}
				newRow.append(itemButton);
				newRow.append(itemButtonList);
				itemLink.append(newRow)
				DirectoryList.append(itemLink);
				document.querySelector(".current-path").textContent = "Disks/";
			});
		});
	document.querySelector(".tab-container-"+CurrentActiveTab).append(DirectoryList);
}

async function listDirectories() {
	await invoke("list_dirs")
		.then(async (items) => {
			if (IsDualPaneEnabled == true) {
				await showItems(items, SelectedItemPaneSide);
				goUp(false, true);
			}
			else {
				await showItems(items);
			}
		});
}

async function refreshView() {
	listDirectories();
}

async function openItem(isDir, dualPaneSide = "", element = null, shortcut = false, shortcutPath = null) {
	let name = element?.getAttribute("itemname");
	let path = element?.getAttribute("itempath");
	let isFtp = element?.getAttribute("isftp");
	if (isFtp == false || isFtp == null) {

		if (shortcut == true) {
			path = shortcutPath;
		}
		if (dualPaneSide == "left") {
			document.querySelector(".dual-pane-left").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
			document.querySelector(".dual-pane-right").style.boxShadow = "none";
		}
		else if (dualPaneSide == "right") {
			document.querySelector(".dual-pane-right").style.boxShadow = "inset 0px 0px 30px 3px rgba(0, 0, 0, 0.2)";
			document.querySelector(".dual-pane-left").style.boxShadow = "none";
		}
		// Select item for dualpane
		if (element != null && SelectedElement != element && IsDualPaneEnabled == true) {
			if (SelectedElement != null) {
				SelectedElement.style.backgroundColor = "transparent";
			}
			SelectedElement = element;
			SelectedElement.style.backgroundColor = SelectedColor;
			SelectedItemPath = path;
			SelectedItemPaneSide = dualPaneSide;
		}
		else if (isDir == 1 || (isDir == 1 && shortcut == true)) { // Open directory
			await invoke("open_dir", {path})
			.then(async (items) => {
				if (IsDualPaneEnabled == true && dualPaneSide != "") {
					document.querySelector(".tab-container-"+CurrentActiveTab).innerHTML = "";
					await showItems(items, dualPaneSide);
					goUp(false, true);
				}
				else {
					showItems(items);
				}
			});
		}
		else { // Open element with default application
			await invoke("open_item", {path});
		}
	}
	else {
		if (isDir == 1) {
			DirectoryList.innerHTML = `<img src="resources/preloader.gif" width="48px" height="auto" /><p>Loading ...</p>`;
			DirectoryList.classList.add("dir-preloader-container");
			await invoke("open_ftp_dir", {path})
				.then(async (items) => {
					await showItems(items);
					CurrentFtpPath = path;
				});
			document.querySelector(".fullsearch-loader").style.display = "none";
			DirectoryList.classList.remove("dir-preloader-container");
		}
		else {
			await invoke("copy_from_ftp", {path});
		}
	}
}

async function goHome() {
	await invoke("go_home")
		.then((items) => {
			if (IsDualPaneEnabled == true) {
				showItems(items, "left");
				showItems(items, "right");
			}
			else {
				showItems(items);
			}
		});
}

async function goBack() {
	if (IsFtpActive == false) {
		if (IsMetaDown == false) {
			await invoke("go_back")
				.then(async (items) => {
					if (IsDualPaneEnabled == true) {
						await showItems(items, SelectedItemPaneSide);
						goUp(false, true);
					}
					else {
						showItems(items);
					}
				});
		}
	}
	else {
		await invoke("ftp_go_back", {path: CurrentFtpPath})
			.then(async (items) => {
				await showItems(items);
				console.log(CurrentFtpPath);
				CurrentFtpPath = CurrentFtpPath.replace("/"+CurrentFtpPath.split("/").pop(), "");
				console.log(CurrentFtpPath, CurrentFtpPath.split("/"));
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
				else if ((parseInt(selectedItemIndex)) < 1) {
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
				else if ((parseInt(selectedItemIndex) - 1) < 1) {
					selectedItemIndex = 0;
					element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
				}
				else {
					selectedItemIndex = parseInt(selectedItemIndex) - 1;
					element = RightPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
				}
				RightPaneItemIndex = selectedItemIndex;
			}
			SelectedElement.style.backgroundColor = SelectedColor;
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
		if (element != SelectedElement && element != null) {
			SelectedElement.style.backgroundColor = "transparent";
			element.onclick();
		}

		/* Scroll logic */
		if (SelectedItemPaneSide == "left") {
			if ((parseInt(selectedItemIndex) * 36) - document.querySelector(".dual-pane-left").scrollTop < 10) { 
				document.querySelector(".dual-pane-left").scrollTop -= 36;
			}
		}
		else if (SelectedItemPaneSide == "right") {
			if ((parseInt(selectedItemIndex) * 36) - document.querySelector(".dual-pane-right").scrollTop < 10) { 
				document.querySelector(".dual-pane-right").scrollTop -= 36;
			}
		}
	}
	else {
		if (SelectedItemPaneSide == "right") {
			RightPaneItemIndex = 0;
			element = RightPaneItemCollection.querySelectorAll(".item-link")[0];
		}
		else {
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
			if ((parseInt(selectedItemIndex) + 1) >= LeftPaneItemCollection.querySelectorAll(".item-link").length - 1) {
				selectedItemIndex = LeftPaneItemCollection.querySelectorAll(".item-link").length - 1;
				element = LeftPaneItemCollection.querySelectorAll(".item-link")[parseInt(selectedItemIndex)];
			}
			else {
				selectedItemIndex = parseInt(selectedItemIndex)+1
				element = LeftPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
			}
			LeftPaneItemIndex = selectedItemIndex;
		}
		else if (SelectedItemPaneSide == "right") {
			if ((parseInt(selectedItemIndex) + 1) >= RightPaneItemCollection.querySelectorAll(".item-link").length - 1) {
				selectedItemIndex = RightPaneItemCollection.querySelectorAll(".item-link").length - 1;
				element = RightPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
			}
			else {
				selectedItemIndex = parseInt(selectedItemIndex) + 1;
				element = RightPaneItemCollection.querySelectorAll(".item-link")[selectedItemIndex];
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
	if (element != SelectedElement) {
		SelectedElement.style.backgroundColor = "transparent";
		element.onclick();
	}

	/* Scroll logic */
	if (SelectedItemPaneSide == "left") {
		if ((parseInt(selectedItemIndex) * 36) - document.querySelector(".dual-pane-left").scrollTop > window.innerHeight - 200) {
			document.querySelector(".dual-pane-left").scrollTop += 36;
		}
	}
	else if (SelectedItemPaneSide == "right") {
		if ((parseInt(selectedItemIndex) * 36) - document.querySelector(".dual-pane-right").scrollTop > window.innerHeight - 200) {
			document.querySelector(".dual-pane-right").scrollTop += 36;
		}
	}
}

function goToOtherPane() {
	if (SelectedItemPaneSide == "right") {
		SelectedItemPaneSide = "left";
		setCurrentDir(LeftDualPanePath, "left");
	}
	else {
		SelectedItemPaneSide = "right";
		setCurrentDir(RightDualPanePath, "right");
	}
	goUp(true);
}

function openSelectedItem() {
	SelectedElement.onclick();
}

async function goToDir(directory) {
	await invoke("go_to_dir", {directory})
		.then(async (items) => {
			if (IsDualPaneEnabled == true) {
				await showItems(items, SelectedItemPaneSide);
			}
			else {
				await showItems(items);
			}
			IsFtpActive = false;
		});
}

async function openFavFTP(hostname, username, password) {
	IsFtpActive = true;
	await invoke("open_fav_ftp", {hostname, username, password})
		.then(async (items) => {
			CurrentFtpPath = items[0].path.split("/")[items[0].path.split("/").length - 1];
			await showItems(items);
		});
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
			DirectoryList.innerHTML = `<img src="resources/preloader.gif" width="48px" height="auto" /><p>Loading ...</p>`;
			DirectoryList.classList.add("dir-preloader-container");
		}
		await invoke("search_for", {fileName, maxItems, searchDepth, fileContent})
			.then(async (items) => {
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
	IsPopUpOpen = true;
	IsDisableShortcuts = true;
}

function closeFullSearchContainer() {
	document.querySelector(".search-full-container").style.display = "none";
	IsPopUpOpen = false;
	IsDisableShortcuts = false;
}

document.querySelector(".dualpane-search-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		closeSearchBar();
	}
	else if (IsQuickSearchOpen == true) {
		let fileName = document.querySelector(".dualpane-search-input").value;
		searchFor(fileName, 999999, 1, true);
	}
});

function openSearchBar() {
	document.querySelector(".search-bar-container").style.display = "flex";
	document.querySelector(".dualpane-search-input").focus();
	IsDisableShortcuts = true;	
	IsQuickSearchOpen = true;
	IsPopUpOpen = true;
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
	listDirectories();
}

async function switchView() {
	if (IsDualPaneEnabled == false) {
		if (ViewMode == "wrap") {
			document.querySelectorAll(".directory-list").forEach(list => {
				list.style.flexFlow = "column";
			});
			document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
			document.querySelectorAll(".item-button").forEach(item => item.style.display = "none");
			document.querySelectorAll(".item-button-list").forEach(item => item.style.display = "flex");
			ViewMode = "column";
			document.querySelector(".list-column-header").style.display = "flex";
			document.querySelectorAll(".explorer-container").forEach(item => {
				item.style.marginTop = "35px";
				item.style.height = "calc(100vh - 135px)";
			});		
		}
		else {
			document.querySelectorAll(".directory-list").forEach(list => {
				list.style.flexFlow = "wrap";
			});
			document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-list"></i>`;
			document.querySelectorAll(".item-button").forEach(item => item.style.display = "flex");
			document.querySelectorAll(".item-button-list").forEach(item => item.style.display = "none");
			ViewMode = "wrap";
			document.querySelector(".list-column-header").style.display = "none";
			document.querySelectorAll(".explorer-container").forEach(item => {
				item.style.height = "calc(100vh - 100px)";
				item.style.marginTop = "0";
			});
		}
		await invoke("switch_view", {viewMode: ViewMode});
	}
}

async function switchToDualPane() {
	if (IsDualPaneEnabled == false) {
		// disable tab functionality and show two panels side by side
		IsTabsEnabled = false;
		ViewMode = "column";
		if (ViewMode == "column") {
			await switchView();
		}
		ViewMode = "column";
		IsDualPaneEnabled = true;
		document.querySelector(".site-nav-bar").style.display = "none";
		document.querySelector(".file-searchbar").style.display = "none";
		document.querySelectorAll(".item-button").forEach(item => item.style.display = "none");
		document.querySelectorAll(".item-button-list").forEach(item => item.style.display = "flex");
		document.querySelector(".non-dual-pane-container").style.display = "none";
		document.querySelector(".dual-pane-container").style.display = "flex";
		document.querySelector(".switch-dualpane-view-button").innerHTML = `<i class="fa-regular fa-rectangle-xmark"></i>`;
		document.querySelector(".go-back-button").style.display = "none";
		document.querySelector(".nav-seperator-1").style.display = "none";
		document.querySelector(".switch-view-button").style.display = "none";
		await saveConfig(false);
		await invoke("list_dirs")
			.then(async (items) => {
				await showItems(items, "left");
				await showItems(items, "right");
				goUp(false, true);
			});
		document.querySelectorAll(".explorer-container").forEach(item => {
			item.style.display = "none";
		});
	}
	else {
		// enables tab functionality and show shows just one directory container 
		IsTabsEnabled = true;
		IsDualPaneEnabled = false;
		ViewMode = "wrap";
		document.querySelector(".site-nav-bar").style.display = "flex";
		document.querySelector(".file-searchbar").style.display = "flex";
		document.querySelectorAll(".item-button").forEach(item => item.style.display = "flex");
		document.querySelectorAll(".item-button-list").forEach(item => item.style.display = "none");
		document.querySelector(".non-dual-pane-container").style.display = "block";
		document.querySelector(".dual-pane-container").style.display = "none";
		document.querySelector(".switch-dualpane-view-button").innerHTML = `<i class="fa-solid fa-table-columns"></i>`;
		document.querySelector(".go-back-button").style.display = "block";
		document.querySelector(".nav-seperator-1").style.display = "block";
		document.querySelector(".switch-view-button").style.display = "block";
		await saveConfig(false);
		await invoke("list_dirs")
			.then(async (items) => {
				await showItems(items);
			});	
	}
}

function switchHiddenFiles() {
	if (IsShowHiddenFiles) {
		IsShowHiddenFiles = false;
		document.querySelector(".switch-hidden-files-button").innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
	}
	else {
		IsShowHiddenFiles = true;
		document.querySelector(".switch-hidden-files-button").innerHTML = `<i class="fa-solid fa-eye"></i>`;
	}
	listDirectories();
}

function openSettings() {
	if (IsPopUpOpen == false) {
		document.querySelector(".settings-ui").style.display = "block";
		IsDisableShortcuts = true;
		IsPopUpOpen = true;
	}
}

async function saveConfig(isToReload = true) {
	let configuredPathOne = ConfiguredPathOne = document.querySelector(".configured-path-one-input").value;
	let configuredPathTwo = ConfiguredPathTwo = document.querySelector(".configured-path-two-input").value;
	let configuredPathThree = ConfiguredPathThree = document.querySelector(".configured-path-three-input").value;
	let isOpenInTerminal = false; //document.querySelector(".openin-terminal-checkbox").checked;
	let isDualPaneEnabled = document.querySelector(".show-dual-pane-checkbox").checked;
	let launchPath = document.querySelector(".launch-path-input").value;
	let isDualPaneActive = IsDualPaneEnabled;
	let searchDepth = parseInt(document.querySelector(".search-depth-input").value);
	let maxItems = parseInt(document.querySelector(".max-items-input").value);
	let isLightMode = document.querySelector(".switch-light-dark-mode-checkbox").checked;
	let isImagePreview = IsImagePreview = document.querySelector(".image-preview-checkbox").checked;
	closeSettings();

	if (isOpenInTerminal == true) {
		isOpenInTerminal = "1";
	}
	else {
		isOpenInTerminal = "0";
	}

	if (isDualPaneEnabled == true) {
		isDualPaneEnabled = "1";
	}
	else {
		isDualPaneEnabled = "0";
	}

	if (isDualPaneActive == true) {
		isDualPaneActive = "1";
	}
	else {
		isDualPaneActive = "0";
	}
	
	if (isLightMode == true) {
		isLightMode = "1";
	}
	else {
		isLightMode = "0";
	}
	
	if (isImagePreview == true) {
		isImagePreview = "1";
	}
	else {
		isImagePreview = "0";
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
		isLightMode,
		isImagePreview
	});
	if (isToReload == true) {
		checkAppConfig();
	}
}

function closeSettings() {
	document.querySelector(".settings-ui").style.display = "none";
	IsDisableShortcuts = false;
	IsPopUpOpen = false;
}

function createTab(tabCount, isInitial) {
	let tab = document.createElement("div");
	tab.className = "fx-tab fx-tab-"+tabCount;
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
		explorerContainer.className = "explorer-container tab-container-"+tabCount;
		if (ViewMode == "wrap") {
			explorerContainer.style.height = "calc(100vh - 100px)";
			explorerContainer.style.paddingBottom = "20px";
		}
		else {
			explorerContainer.style.marginTop = "35px";
			explorerContainer.style.height = "calc(100vh - 147px)";
			explorerContainer.style.paddingBottom = "10px";
		}
		document.querySelector(".main-container").append(explorerContainer);
	}
	document.querySelector(".tab-header").append(tab);
	CurrentActiveTab = tabCount;
	switchToTab(tabCount);
	listDirectories();
}

function closeTab() {
	if (IsTabs == true) {
		if (TabCount == 2) {
			IsTabs = false;
			document.querySelector(".tab-header").style.display = "none";
			document.querySelectorAll(".tab-container-" + CurrentActiveTab).forEach(item => item.remove());
			document.querySelectorAll(".fx-tab").forEach(item => item.remove());
			document.querySelectorAll(".explorer-container").forEach(item => {
				if (ViewMode == "wrap") {
					item.style.height = "calc(100vh - 100px)";
					item.style.paddingBottom = "20px";
				}
				else {
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
		}
		else {
			document.querySelectorAll(".tab-container-" + CurrentActiveTab).forEach(item => item.remove());
			document.querySelectorAll(".fx-tab-" + CurrentActiveTab).forEach(item => item.remove());
			let switchTabNo = document.querySelectorAll(".fx-tab").length;
			switchToTab(switchTabNo);
			TabCount--;
		}
	}
}

async function switchToTab(tabNo) {
	if (IsDualPaneEnabled == false) {
		CurrentActiveTab = tabNo;
		document.querySelectorAll(".explorer-container").forEach(container => {
			container.style.display = "none";
		});
		document.querySelectorAll(".fx-tab").forEach(tab => {
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

function showProperties(item) {
	let name = item.getAttribute("itemname");
	let path = item.getAttribute("itempath");
	let size = item.getAttribute("itemsize");
	let modifiedAt = item.getAttribute("itemmodified");
	alert("Name: " + name + "\nModified: " + modifiedAt + "\nPath: " + path + "\nSize: " + size);
	ContextMenu.style.display = "none";
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
	openFavFTP(hostname+":21", username, password);
	closeFtpConfig();
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1000
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function checkColorMode() {
	var r = document.querySelector(':root');
	if (IsLightMode) {
		r.style.setProperty("--primaryColor", "white");
		r.style.setProperty("--secondaryColor", "whitesmoke");
		r.style.setProperty("--tertiaryColor", "lightgray");
		r.style.setProperty("--textColor", "rgba(75, 75, 105)");
	}
	else {
		r.style.setProperty("--primaryColor", "#3f4352");
		r.style.setProperty("--secondaryColor", "rgba(56, 59, 71, 1)");
		r.style.setProperty("--tertiaryColor", "#464d5f");
		r.style.setProperty("--textColor", "white");
	}
}

// listDirectories();
checkAppConfig();
// listDisks()