const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog;
const { appWindow } = window.__TAURI__.window;

document
  .getElementById('titlebar-minimize')
  .addEventListener('click', () => appWindow.minimize());
document
  .getElementById('titlebar-maximize')
  .addEventListener('click', () => appWindow.toggleMaximize());
document
  .getElementById('titlebar-close')
  .addEventListener('click', () => appWindow.close());

let viewMode = "wrap";
let directoryList;
let directoryCount = document.querySelector(".directory-entries-count");
let contextMenu = document.querySelector(".context-menu");
let copyFileName = "";
let copyFilePath = "";
let CurrentDir = "Disks";
let IsShowDisks = false;
let IsShowHiddenFiles = false;
let IsAltDown = false;
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

document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		searchFor();
	}
	else if (e.keyCode === 27) {
		cancelSearch();
	}
});

document.addEventListener("keyup", (e) => {
	if (e.keyCode === 27) {
		contextMenu.style.display = "none";
		document.querySelector(".newfolder-input")?.remove();
	}
});

// Close context menu / new folder input when click elsewhere
document.addEventListener("mousedown", (e) => {
	if (!e.target.classList.contains("context-item-icon")
		&& !e.target.classList.contains("context-item")
		&& !e.target.classList.contains("newfolder-input")
		&& !e.target.classList.contains("directory-item-entry")
		&& !e.target.classList.contains("directory-entry"))
	{
		let newFolderInput = document.querySelector(".newfolder-input");
		if (newFolderInput != null
			&& e.target != newFolderInput
			&& e.target != newFolderInput.children[0]
			&& e.target != newFolderInput.children[1])
		{
			newFolderInput.remove();
		}
		document.querySelector(".context-menu").style.display = "none";
		contextMenu.children[1].setAttribute("disabled", "true");
		contextMenu.children[1].classList.add("c-item-disabled");
		contextMenu.children[2].setAttribute("disabled", "true");
		contextMenu.children[2].classList.add("c-item-disabled");
		contextMenu.children[3].setAttribute("disabled", "true");
		contextMenu.children[3].classList.add("c-item-disabled");
		contextMenu.children[4].setAttribute("disabled", "true");
		contextMenu.children[4].classList.add("c-item-disabled");
		contextMenu.children[7].setAttribute("disabled", "true");
		contextMenu.children[7].classList.add("c-item-disabled");

	}
});

// Open context menu for pasting for example
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	contextMenu.children[0].replaceWith(contextMenu.children[0].cloneNode(true));
	contextMenu.children[5].replaceWith(contextMenu.children[5].cloneNode(true));
	contextMenu.children[6].replaceWith(contextMenu.children[6].cloneNode(true));
	// contextMenu.children[7].replaceWith(contextMenu.children[7].cloneNode(true));
	contextMenu.style.display = "flex";
	contextMenu.style.left = e.clientX + "px";
	if ((contextMenu.offsetHeight + e.clientY) >= window.innerHeight) {
		contextMenu.style.top = null;
		contextMenu.style.bottom = e.clientY / 2* -1 + "px";
	}
	else {
		contextMenu.style.bottom = null;
		contextMenu.style.top = e.clientY + "px";
	}
	contextMenu.children[0].addEventListener("click", function() { createFolderInputPrompt(e); }, {once: true});
	contextMenu.children[6].addEventListener("click", function() { createFileInputPrompt(e); }, {once: true});
	// contextMenu.children[7].addEventListener("click", function() { openInTerminal(); }, {once: true});

	if (copyFilePath == "") {
		contextMenu.children[5].setAttribute("disabled", "true");
		contextMenu.children[5].classList.add("c-item-disabled");
	}
	else {
		contextMenu.children[5].removeAttribute("disabled");
		contextMenu.children[5].classList.remove("c-item-disabled");
	}
});

document.onkeydown = (e) => {
	// Shortcut for jumping to configured directory
    if(event.keyCode == 18){
        IsAltDown = true;
    }
    if (IsAltDown == true && e.keyCode == 49)
    {
		if (ConfiguredPathOne == "") {
			return;
		}
		openItem("ConfigPath1", ConfiguredPathOne, 1);
    }
	if (IsAltDown == true && e.keyCode == 50)
    {
		if (ConfiguredPathTwo == "") {
			return;
		}
		openItem("ConfigPath2", ConfiguredPathTwo, 1);
    }
	if (IsAltDown == true && e.keyCode == 51)
	{
		if (ConfiguredPathThree == "") {
			return;
		}
		openItem("ConfigPath3", ConfiguredPathThree, 1);
    }

	// Check if ctrl + t is pressed to open new tab
	if (e.ctrlKey && e.keyCode == 84) {
		if (TabCount < 5) {
			let tabCounter = 1;
			if (IsTabs == false) {
				IsTabs = true;
				document.querySelector(".tab-header").style.display = "flex";
				document.querySelectorAll(".explorer-container").forEach(item => {
					item.style.marginTop = "60px";
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

	// New folder input prompt when alt + 7 is pressed
	if (e.altKey && e.keyCode == 55) {
		createFolderInputPrompt();
	}

	// New file input prompt when alt + 6 is pressed
	if (e.altKey && e.keyCode == 54) {
		createFileInputPrompt();
	}
} 

document.onkeyup = (e) => {
	if (e.keyCode == 18){
		IsAltDown = false;
	}
	if (e.keyCode == 71){
		IsGDown = false;
	}
}

async function showItems(items) {
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
	document.querySelector(".tab-container-"+CurrentActiveTab).innerHTML = "";
	let currentTab = document.querySelector(".fx-tab-"+CurrentActiveTab);
	if (currentTab != null) {
		currentTab.children[0].innerHTML = CurrentDir.split("/")[CurrentDir.split("/").length-1];
	}
	directoryList = document.createElement("div");
	directoryList.className = "directory-list";
	if (!IsShowHiddenFiles) {
		items = items.filter(str => !str.name.startsWith("."));
	}
	directoryCount.innerHTML = "Objects: " + items.length;
	let set = new Set(items);
	set.forEach(item => {
		let itemLink = document.createElement("button");
		itemLink.setAttribute("onclick", "openItem('"+item.name+"', '"+item.path+"', '"+item.is_dir+"')");
		let newRow = document.createElement("div");
		newRow.className = "directory-item-entry";
		let fileIcon = "resources/file-icon.png"; // Default
		let iconSize = "48px";
		if (item.is_dir == 1) {
			fileIcon = "resources/folder-icon.png";
			iconSize = "64px";	
		}
		else {
			switch (item.extension) {
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
				case ".webp":
				case ".gif":
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
				default:
					fileIcon = "resources/file-icon.png";
					break;
			}

		}
		if (viewMode == "wrap") {
			itemLink.className = "item-button directory-entry";
			newRow.innerHTML = `
				<img class="item-icon" src="${fileIcon}" width="${iconSize}" height="auto"/>
				<p style="text-align: left;">${item.name}</p>
				`;
		}
		else {
			itemLink.className = "item-button-list directory-entry";
			newRow.innerHTML = `
				<span style="display: flex; gap: 10px; align-items: center; width: 50%;">
					<img class="item-icon" src="${fileIcon}" width="24px" height="24px"/>
					<p style="text-align: left; overflow: hidden; text-overflow: ellipsis;">${item.name}</p>
				</span>
				<span style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-right: 5px;">
					<p style="width: auto; text-align: right;">${item.last_modified}</p>
					<p style="width: 75px; text-align: right;">${formatBytes(parseInt(item.size), 2)}</p>
				</span>
				`;
		}
		itemLink.append(newRow)
		directoryList.append(itemLink);
	});

	directoryList.querySelectorAll(".directory-entry").forEach(item => {
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			// Reset so that the commands are not triggered multiple times
			contextMenu.children[0].replaceWith(contextMenu.children[0].cloneNode(true));
			contextMenu.children[1].replaceWith(contextMenu.children[1].cloneNode(true));
			contextMenu.children[2].replaceWith(contextMenu.children[2].cloneNode(true));
			contextMenu.children[3].replaceWith(contextMenu.children[3].cloneNode(true));
			contextMenu.children[4].replaceWith(contextMenu.children[4].cloneNode(true));
			contextMenu.children[6].replaceWith(contextMenu.children[6].cloneNode(true));
			contextMenu.children[7].replaceWith(contextMenu.children[7].cloneNode(true));

			contextMenu.style.display = "flex";
			contextMenu.style.left = e.clientX + "px";
			contextMenu.style.top = e.clientY + "px";

			let fromPath = item.getAttribute("onclick").split(",")[1].trim().split("/");
			let actFileName = fromPath[fromPath.length - 1].replace("'", "");
			let extension = actFileName.split(".")[actFileName.split(".").length-1];

			contextMenu.children[1].removeAttribute("disabled");
			contextMenu.children[1].classList.remove("c-item-disabled");
			contextMenu.children[3].removeAttribute("disabled");
			contextMenu.children[3].classList.remove("c-item-disabled");
			contextMenu.children[4].removeAttribute("disabled");
			contextMenu.children[4].classList.remove("c-item-disabled");
			contextMenu.children[7].removeAttribute("disabled");
			contextMenu.children[7].classList.remove("c-item-disabled");


			if (extension != "zip"
				&& extension != "rar"
				&& extension != "7z") {
				contextMenu.children[2].setAttribute("disabled", "true");
				contextMenu.children[2].classList.add("c-item-disabled");
			}
			else {
				contextMenu.children[2].removeAttribute("disabled");
				contextMenu.children[2].classList.remove("c-item-disabled");
			}
			contextMenu.children[0].addEventListener("click", function() { createFolderInputPrompt(e); }, {once: true});
			contextMenu.children[1].addEventListener("click", function() { deleteItem(item); }, {once: true});
			contextMenu.children[2].addEventListener("click", function() { extractItem(item); }, {once: true});
			contextMenu.children[3].addEventListener("click", function() { compressItem(item); }, {once: true});
			contextMenu.children[4].addEventListener("click", function() { copyItem(item); }, {once: true});
			contextMenu.children[6].addEventListener("click", function() { createFileInputPrompt(e); }, {once: true});
			contextMenu.children[7].addEventListener("click", function() { renameElementInputPrompt(e, item); }, {once: true});
		});
	});

	document.querySelector(".tab-container-"+CurrentActiveTab).append(directoryList);
	window.gc();
}

async function getCurrentDir() {
	await invoke("get_current_dir")
		.then(path => {
			CurrentDir = path;
			document.querySelector(".current-path").textContent = path;
		});
}

async function deleteItem(item) {
	let fromPath = item.getAttribute("onclick").split(",")[1].trim().split("/");
	let actFileName = fromPath[fromPath.length - 1].replace("'", "");
	let isConfirm = await confirm("Wollen Sie "+actFileName+" wirklich löschen?");
	if (isConfirm) {
		await invoke("delete_item", {actFileName})
			.then(items => {
				let temp_item = item.getAttribute("onclick").split(",")[1].trim().split("/");
				contextMenu.style.display = "none";
				showItems(items.filter(str => !str.name.startsWith(".")));
			});
	}
}

function copyItem(item) {
	copyFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let tempCopyFilePath = item.getAttribute("onclick").split(",")[1].trim().split("/");
	copyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
	contextMenu.style.display = "none";
}

async function extractItem(item) {
	let compressFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let compressFileName = compressFilePath.split("/")[compressFilePath.split("/").length - 1].replace("'", "");
	let isExtracting = await confirm("wollen sie " + compressFileName + " wirklich entpacken?");
	if (isExtracting) {
		let extractFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
		let extractFileName = extractFilePath[extractFilePath.length - 1].replace("'", "");
		if (extractFileName != "") {
			let fromPath = extractFilePath.toString();
			invoke("extract_item", {fromPath})
				.then(items => {
					showItems(items.filter(str => !str.name.startsWith(".")));
					message("Entpacken erfolgreich");
				});
		}
	}
	contextMenu.style.display = "none";
}

function compressItem(item) {
	message("Komprimierung gestartet.\nDas kann eine Weile dauern.\nSie werden benachrichtigt, sobald die Komprimierung abgeschlossen wurde"); 
	let compressFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let compressFileName = compressFilePath[compressFilePath.length - 1].replace("'", "");
	if (compressFileName != "") {
		let fromPath = compressFilePath.toString();
		contextMenu.style.display = "none";
		invoke("compress_item", {fromPath})
			.then(items => {
				showItems(items);
				message("Komprimierung abgeschlossen");
			});
	}
}

function pasteItem() {
	if (copyFileName != "") {
		let actFileName = copyFileName;
		let fromPath = copyFilePath.toString();
		invoke("copy_paste", {actFileName, fromPath})
			.then(items => {
				showItems(items);
			});
		copyFileName = "";
		copyFilePath = "";
		contextMenu.style.display = "none";
	}
}

function createFolderInputPrompt(e = null) {
	document.querySelectorAll(".newfolder-input").forEach(item => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "newfolder-input";
	nameInput.innerHTML = `
		<h4>Geben Sie einen Namen für den neuen Ordner ein.</h4>
		<input type="text" placeholder="Neuer Ordner" autofocus>
	`;
	if (e == null) {
		nameInput.style.left = "50%"; 
		nameInput.style.top = "50%";
	}
	else {
		nameInput.style.left = e.clientX + "px";
		nameInput.style.top = e.clientY + "px";
	}
	document.querySelector("body").append(nameInput);
	contextMenu.style.display = "none";
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFolder(nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function createFileInputPrompt(e) {
	document.querySelectorAll(".newfolder-input").forEach(item => {
		item.remove();
	});
	let nameInput = document.createElement("div");
	nameInput.className = "newfolder-input";
	nameInput.innerHTML = `
		<h4>Geben Sie einen Namen für das neue Dokument ein.</h4>
		<input type="text" placeholder="Neues Dokument" autofocus>
	`;
	if (e == null) {
		nameInput.style.left = "50%"; 
		nameInput.style.top = "50%";
	}
	else {
		nameInput.style.left = e.clientX + "px";
		nameInput.style.top = e.clientY + "px";
	}
	document.querySelector("body").append(nameInput);
	contextMenu.style.display = "none";
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFile(nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function renameElementInputPrompt(e, item) {
	let tempFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let tempRenameFilePath = item.getAttribute("onclick").split(",")[1].trim().split("/");
	let tempFileName = tempRenameFilePath[tempRenameFilePath.length - 1].replace("'", "");

	let nameInput = document.createElement("div");
	nameInput.className = "newfolder-input";
	nameInput.innerHTML = `
		<h4>Geben Sie einen neuen Namen für das Dokument ein.</h4>
		<input type="text" placeholder="document.txt" value="${tempFileName}" autofocus>
		`;
	nameInput.style.left = e.clientX + "px";
	nameInput.style.top = e.clientY + "px";
	document.querySelector("body").append(nameInput);
	contextMenu.style.display = "none";
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			renameElement(tempFilePath, nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function createFolder(folderName) {
	invoke("create_folder", {folderName});
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

async function checkAppConfig() {
	await invoke("check_app_config")
		.then(appConfig => {
			if (appConfig.view_mode.includes("column")) {
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
				document.querySelectorAll(".item-button").forEach(item => {
					item.classList.add("item-button-list");
					item.classList.remove("item-button");
				});
				viewMode = "column";
			}
			document.querySelector(".configured-path-one-input").value = ConfiguredPathOne = appConfig.configured_path_one;
			document.querySelector(".configured-path-two-input").value = ConfiguredPathTwo = appConfig.configured_path_two;
			document.querySelector(".configured-path-three-input").value = ConfiguredPathThree = appConfig.configured_path_three;
		});
}

async function listDisks() {
	await invoke("list_disks")
		.then(disks => {
			IsShowDisks = true;
			document.querySelector(".tab-container-"+CurrentActiveTab).innerHTML = "";
			directoryList = document.createElement("div");
			directoryList.className = "directory-list";
			directoryCount.innerHTML = "Objects: " + disks.length;
			let currentTab = document.querySelector(".fx-tab-"+CurrentActiveTab);
			disks.forEach(item => {
				let itemLink = document.createElement("button");
				itemLink.setAttribute("onclick", "openItem('"+item.name.replace('/dev/', '')+"', '"+item.path+"', '1')");
				let newRow = document.createElement("div");
				newRow.className = "directory-item-entry ";
				let fileIcon = "resources/disk-icon.png"; // Default
				let iconSize = "48px";
					if (item.name == "") {
						item.name = "/";
					}
				if (viewMode == "wrap") {
					itemLink.className = "item-button directory-entry disk-info-entry";
					newRow.innerHTML = `
						<img class="item-icon" style="margin-right: 10px;" src="${fileIcon}" width="${iconSize}" height="auto"/>
						<div class="disk-info">
							<span>${item.load}</span>
							<span>${item.capacity}</span>
						</div>
						<p style="text-align: left;">${item.name}</p>
						`;
				}
				else {
					itemLink.className = "item-button-list directory-entry";
					newRow.innerHTML = `
						<span style="display: flex; gap: 10px; align-items: center; width: 30%;">
							<img class="item-icon" src="${fileIcon}" width="24px" height="24px"/>
							<p style="width: 30%; text-align: left;";>${item.name}</p>
						</span>
						<span style="display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-right: 5px;">
							<p style="width: auto; text-align: right;">${item.load} Available</p>
							<p style="width: 75px; text-align: right;">${item.capacity}</p>
						</span>
						`;
				}
				itemLink.append(newRow)
				directoryList.append(itemLink);
				document.querySelector(".current-path").textContent = "Disks/";
			});
		});
	document.querySelector(".tab-container-"+CurrentActiveTab).append(directoryList);
}

async function listDirectories() {
	await invoke("list_dirs")
		.then((items) => {
			showItems(items);
		});
}

async function openItem(name, path, isDir) {
	if (isDir == 1) {
		document.querySelector('.tab-container-'+CurrentActiveTab).innerHTML = "";
		await invoke("open_dir", {path, name})
			.then((items) => {
				showItems(items);
			});
	}
	else {
		await invoke("open_item", {path});
	}
}

async function goHome() {
	await invoke("go_home")
		.then((items) => {
			showItems(items);
		});
}

async function goBack() {
	await invoke("go_back")
		.then((items) => {
			showItems(items);
		});
}

async function goToDir(directory) {
	await invoke("go_to_dir", {directory})
		.then((items) => {
			showItems(items);
		});
}

async function openInTerminal() {
	await invoke("open_in_terminal");
}

async function searchFor() {
	document.querySelector(".cancel-search-button").style.display = "block";
	directoryList.innerHTML = "Loading ...";
	let fileName = document.querySelector(".search-bar-input").value; 
	await invoke("search_for", {fileName})
		.then((items) => {
			showItems(items);
		});
}

async function cancelSearch() {
	document.querySelector(".cancel-search-button").style.display = "none";
	document.querySelector(".search-bar-input").value = "";
	listDirectories();
}

async function switchView() {
	let list = document.querySelector(".directory-list");
	if (viewMode == "wrap") {
		list.style.flexFlow = "column";
		list.style.gap = "5px";
		document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
		document.querySelectorAll(".item-button").forEach(item => {
			item.classList.add("item-button-list");
			item.classList.remove("item-button");
		});
		viewMode = "column";
	}
	else {
		list.style.flexFlow = "wrap";
		list.style.gap = "0";
		document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-list"></i>`;
		document.querySelectorAll(".item-button-list").forEach(item => {
			item.classList.remove("item-button-list");
			item.classList.add("item-button");
		});
		viewMode = "wrap";
	}
	await invoke("switch_view", {viewMode, ConfiguredPathOne, ConfiguredPathTwo, ConfiguredPathThree})
		.then(items => {
			if (!IsShowDisks) {
				showItems(items.filter(str => !str.name.startsWith(".")));
			}
			else {
				listDisks();
			}
		});
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
	document.querySelector(".settings-ui").style.display = "block";
}

async function saveConfigPaths() {
	configuredPathOne = document.querySelector(".configured-path-one-input").value;
	configuredPathTwo = document.querySelector(".configured-path-two-input").value;
	configuredPathThree = document.querySelector(".configured-path-three-input").value;
	await invoke("save_config_paths", {configuredPathOne, configuredPathTwo, configuredPathThree})
		.then(() => {
			checkAppConfig();
			closeSettings();
	  	});
}

function closeSettings() {
	document.querySelector(".settings-ui").style.display = "none";
}

function createTab(tabCount, isInitial) {
	let tab = document.createElement("div");
	tab.className = "fx-tab fx-tab-"+tabCount;
	if (isInitial) {
		var tabName = CurrentDir.split("/")[CurrentDir.split("/").length - 1];
	}
	else {
		var tabName = "New tab";
	}
	tab.innerHTML = `
		<h5>${tabName}<h5>
		<h4><i class="fa-solid fa-xmark"></i></h4>
		`;
	tab.addEventListener("click", () => {
		switchToTab(tabCount);
	});
	tab.children[1].addEventListener("click", () => {
		console.log(tabCount);
		switchToTab(tabCount);
		closeTab();
	});
	if (tabCount != 1 || document.querySelector(".tab-container-1") == null) {
		let explorerContainer = document.createElement("div");
		explorerContainer.className = "explorer-container tab-container-"+tabCount;
		explorerContainer.style.marginTop = "60px";
		document.querySelector(".main-container").append(explorerContainer);
	}
	document.querySelector(".tab-header").append(tab);
	CurrentActiveTab = tabCount;
	switchToTab(tabCount);
	listDisks();
}

function closeTab() {
	if (IsTabs == true) {
		if (TabCount == 2) {
			IsTabs = false;
			document.querySelector(".tab-container-"+CurrentActiveTab).remove();
			document.querySelector(".tab-header").style.display = "none";
			document.querySelectorAll(".fx-tab").forEach(item => {
				item.remove();
			});
			document.querySelectorAll(".explorer-container").forEach(item => {
				item.style.marginTop = "20px";
			});
			tabCounter = 1;
			let checkTab = document.querySelector(".tab-container-"+tabCounter);
			while (checkTab == null) {
				tabCounter++;
				checkTab = document.querySelector(".tab-container-"+tabCounter);
			}
			switchToTab(tabCounter);
			TabCount = 0;
		}
		else {
			document.querySelector(".tab-container-"+CurrentActiveTab).remove();
			document.querySelector(".fx-tab-"+CurrentActiveTab).remove();
			let switchTabNo = document.querySelectorAll(".fx-tab").length;
			switchToTab(switchTabNo);
			TabCount--;
		}
	}
}

async function switchToTab(tabNo) {
	CurrentActiveTab = tabNo;
	document.querySelectorAll(".explorer-container").forEach(container => {
		container.style.display = "none";
	});
	document.querySelectorAll(".fx-tab").forEach(tab => {
		tab.classList.remove("active-tab");
	});
	let currentTabContainer = document.querySelector(".tab-container-"+tabNo);
	if (currentTabContainer != null) {
		let currentTab = document.querySelector(".fx-tab-"+tabNo);
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
	let currentDir = CurrentDir.toString();
	if (currentDir != null) {
		await invoke("switch_to_directory", {currentDir});
	}
	document.querySelector(".current-path").textContent = CurrentDir;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1000
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

checkAppConfig();
// listDirectories();
listDisks()
