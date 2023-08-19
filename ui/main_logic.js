const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog; 

let view = "wrap";
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
		&& !e.target.classList.contains("newfolder-input")) {
		let newFolderInput = document.querySelector(".newfolder-input");
		if (newFolderInput != null
			&& e.target != newFolderInput
			&& e.target != newFolderInput.children[0]
			&& e.target != newFolderInput.children[1])
		{
			newFolderInput.remove();
		}
		document.querySelector(".context-menu").style.display = "none";
		contextMenu.children[0].setAttribute("disabled", "true");
		contextMenu.children[0].classList.add("c-item-disabled");
		contextMenu.children[1].setAttribute("disabled", "true");
		contextMenu.children[1].classList.add("c-item-disabled");
		contextMenu.children[2].setAttribute("disabled", "true");
		contextMenu.children[2].classList.add("c-item-disabled");
		contextMenu.children[4].setAttribute("disabled", "true");
		contextMenu.children[4].classList.add("c-item-disabled");
	}
});

// Open context menu for pasting for example
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	contextMenu.children[3].replaceWith(contextMenu.children[3].cloneNode(true));
	contextMenu.children[5].replaceWith(contextMenu.children[5].cloneNode(true));
	contextMenu.style.display = "flex";
	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.top = e.clientY + "px";
	contextMenu.children[3].addEventListener("click", function() { pasteItem(); });
	contextMenu.children[5].addEventListener("click", function() { createFolderInputPrompt(e); }, {once: true});

	contextMenu.children[3].classList.add("c-item-disabled");
	if (copyFilePath == "") {
		contextMenu.children[3].setAttribute("disabled", "true");
		contextMenu.children[3].classList.add("c-item-disabled");
	}
	else {
		contextMenu.children[3].removeAttribute("disabled");
		contextMenu.children[3].classList.remove("c-item-disabled");
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
		if (view == "wrap") {
			itemLink.className = "item-button directory-entry";
		}
		else {
			itemLink.className = "item-button-list directory-entry";
		}
		itemLink.setAttribute("onclick", "openItem('"+item.name+"', '"+item.path+"', '"+item.is_dir+"')");
		let newRow = document.createElement("div");
		newRow.className = "directory-item-entry";
		if (item.is_dir == 1) {
			newRow.innerHTML = `
				<img class="item-icon" src="resources/folder-icon.png" width="64px" height="auto" loading="lazy" alt="icon"/> 
				<p>${item.name}</p>
				`;
		}
		else {
			let fileIcon = "resources/file-icon.png"; // Default
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
			newRow.innerHTML = `
				<img class="item-icon" src="${fileIcon}" width="48px" height="auto"/>
				<p>${item.name}</p>
				`;
		}
		itemLink.append(newRow)
		directoryList.append(itemLink);
	});

	document.querySelectorAll(".directory-entry").forEach(item => {
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			// Reset so that the commands are not triggered multiple times
			contextMenu.children[0].replaceWith(contextMenu.children[0].cloneNode(true));
			contextMenu.children[1].replaceWith(contextMenu.children[1].cloneNode(true));
			contextMenu.children[2].replaceWith(contextMenu.children[2].cloneNode(true));
			contextMenu.children[4].replaceWith(contextMenu.children[4].cloneNode(true));
			contextMenu.children[5].replaceWith(contextMenu.children[5].cloneNode(true));

			contextMenu.style.display = "flex";
			contextMenu.style.left = e.clientX + "px";
			contextMenu.style.top = e.clientY + "px";

			let fromPath = item.getAttribute("onclick").split(",")[1].trim().split("/");
			let actFileName = fromPath[fromPath.length - 1].replace("'", "");
			let extension = actFileName.split(".")[actFileName.split(".").length-1];

			contextMenu.children[0].removeAttribute("disabled");
			contextMenu.children[0].classList.remove("c-item-disabled");
			contextMenu.children[2].removeAttribute("disabled");
			contextMenu.children[2].classList.remove("c-item-disabled");
			contextMenu.children[4].removeAttribute("disabled");
			contextMenu.children[4].classList.remove("c-item-disabled");

			if (extension != "zip"
				&& extension != "rar"
				&& extension != "tar"
				&& extension != "7z") {
				contextMenu.children[1].setAttribute("disabled", "true");
				contextMenu.children[1].classList.add("c-item-disabled");
			}
			else {
				contextMenu.children[1].removeAttribute("disabled");
				contextMenu.children[1].classList.remove("c-item-disabled");
			}
			contextMenu.children[0].addEventListener("click", function() { deleteItem(item); }, {once: true});
			contextMenu.children[1].addEventListener("click", function() { extractItem(item); }, {once: true});
			contextMenu.children[2].addEventListener("click", function() { copyItem(item); }, {once: true});
			contextMenu.children[4].addEventListener("click", function() { compressItem(item); }, {once: true});
			contextMenu.children[5].addEventListener("click", function() { createFolderInputPrompt(e); }, {once: true});
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

function createFolder(folderName) {
	invoke("create_folder", {folderName})
		.then(items => {
			showItems(items.filter(str => !str.name.startsWith(".")));
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
	if (view == "wrap") {
		list.style.flexFlow = "column";
		list.style.gap = "5px";
		document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-grip"></i>`;
		document.querySelectorAll(".item-button").forEach(item => {
			item.classList.add("item-button-list");
			item.classList.remove("item-button");
		});
		view = "column";
	}
	else {
		list.style.flexFlow = "wrap";
		list.style.gap = "0";
		document.querySelector(".switch-view-button").innerHTML = `<i class="fa-solid fa-list"></i>`;
		document.querySelectorAll(".item-button-list").forEach(item => {
			item.classList.remove("item-button-list");
			item.classList.add("item-button");
		});
		view = "wrap";
	}
}

listDirectories();
