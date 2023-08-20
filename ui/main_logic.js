const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog; 

let viewMode = "wrap";
let directoryList;
let directoryCount = document.querySelector(".directory-entries-count");
let contextMenu = document.querySelector(".context-menu");
let copyFileName = "";
let copyFilePath = "";
let currentDir = "";

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
		document.querySelector(".newfolder-input").remove();
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
	}
});

// Open context menu for pasting for example
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	contextMenu.children[5].replaceWith(contextMenu.children[5].cloneNode(true));
	contextMenu.children[0].replaceWith(contextMenu.children[0].cloneNode(true));
	contextMenu.children[6].replaceWith(contextMenu.children[6].cloneNode(true));
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

	if (copyFilePath == "") {
		contextMenu.children[5].setAttribute("disabled", "true");
		contextMenu.children[5].classList.add("c-item-disabled");
	}
	else {
		contextMenu.children[5].removeAttribute("disabled");
		contextMenu.children[5].classList.remove("c-item-disabled");
	}
});

function showItems(items) {
	document.querySelector(".explorer-container").innerHTML = "";
	directoryList = document.createElement("div");
	directoryList.className = "directory-list";
	directoryCount.innerHTML = "Objekte: " + items.length;
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
				<span style="display: flex; gap: 10px; align-items: center; width: 30%;">
					<img class="item-icon" src="${fileIcon}" width="24px" height="24px"/>
					<p style="width: 30%; text-align: left;";>${item.name}</p>
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
		});
	});

	document.querySelector(".explorer-container").append(directoryList);
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

function extractItem(item) {
	let extractFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let extractFileName = extractFilePath[extractFilePath.length - 1].replace("'", "");
	if (extractFileName != "") {
		let fromPath = extractFilePath.toString();
		invoke("extract_item", {fromPath})
			.then(items => {
				showItems(items.filter(str => !str.name.startsWith(".")));
			});
		contextMenu.style.display = "none";
	}
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
				showItems(items.filter(str => !str.name.startsWith(".")));
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
				showItems(items.filter(str => !str.name.startsWith(".")));
			});
		copyFileName = "";
		copyFilePath = "";
		contextMenu.style.display = "none";
	}
}

function createFolderInputPrompt(e) {
	let nameInput = document.createElement("div");
	nameInput.className = "newfolder-input";
	nameInput.innerHTML = `
		<h4>Geben Sie einen Namen für den neuen Ordner ein.</h4>
		<input type="text" placeholder="Neuer Ordner" autofocus>
	`;
	nameInput.style.left = e.clientX + "px";
	nameInput.style.top = e.clientY + "px";
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
	let nameInput = document.createElement("div");
	nameInput.className = "newfolder-input";
	nameInput.innerHTML = `
		<h4>Geben Sie einen Namen für das neue Dokument ein.</h4>
		<input type="text" placeholder="Neuer Ordner" autofocus>
	`;
	nameInput.style.left = e.clientX + "px";
	nameInput.style.top = e.clientY + "px";
	document.querySelector("body").append(nameInput);
	contextMenu.style.display = "none";
	nameInput.addEventListener("keyup", (e) => {
		if (e.keyCode === 13) {
			createFile(nameInput.children[1].value);
			nameInput.remove();
		}
	});
}

function createFolder(folderName) {
	invoke("create_folder", {folderName});
	listDirectories();
}

function createFile(fileName) {
	invoke("create_file", {fileName});
	listDirectories();
}

async function checkAppConfig() {
	await invoke("check_app_config")
		.then(appConfig => {
			if (appConfig.view_mode.includes("column")) {
				console.log(appConfig);
				document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
				document.querySelectorAll(".item-button").forEach(item => {
					item.classList.add("item-button-list");
					item.classList.remove("item-button");
				});
				viewMode = "column";
			}
		});
}

async function listDirectories() {
	await invoke("list_dirs")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

function openItem(name, path, isDir) {
	if (isDir == 1) {
		directoryList.innerHTML = "Loading ...";
		invoke("open_dir", {path, name})
			.then((items) => {
				showItems(items.filter(str => !str.name.startsWith(".")));
			});
	}
	else {
		invoke("open_item", {path});
	}
}

async function goHome() {
	await invoke("go_home")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goBack() {
	await invoke("go_back")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goToDir(directory) {
	await invoke("go_to_dir", {directory})
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
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
	await invoke("switch_view", {viewMode})
		.then(items => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
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
listDirectories();
