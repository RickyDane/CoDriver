const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog; 

let view = "wrap";
let directoryList = document.querySelector(".directory-list");
let directoryCount = document.querySelector(".directory-entries-count");
let contextMenu = document.querySelector(".context-menu");
let copyFileName = "";
let copyFilePath = "";

document.querySelector(".search-bar-input").addEventListener("keyup", (e) => {
	if (e.keyCode === 13) {
		searchFor();
	}
	else if (e.keyCode === 27) {
		cancelSearch();
	}
});

// Close context menu when click elsewhere
document.addEventListener("mousedown", (e) => {
	if (!e.target.classList.contains("context-item-icon") && !e.target.classList.contains("context-item")) {
		document.querySelector(".context-menu").style.display = "none";
	}
});

// Open context menu for pasting for example
document.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	contextMenu.children[2].replaceWith(contextMenu.children[2].cloneNode(true));
	contextMenu.style.display = "flex";
	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.top = e.clientY + "px";
	contextMenu.children[2].addEventListener("click", function() { pasteItem(); });
});

function showItems(items, currentDir) {
	directoryList.innerHTML = "";
	directoryCount.innerHTML = items.length;
	const itemsLength = items.length;
	let i = 0;
	for (i; i < itemsLength; i++) {
		let itemLink = document.createElement("button");
		if (view == "wrap") {
			itemLink.className = "item-button";
		}
		else {
			itemLink.className = "item-button-list";
		}
		itemLink.setAttribute("onclick", "openItem('"+items[i].name+"', '"+items[i].path+"', '"+items[i].is_dir+"')");
		let newRow = document.createElement("div");
		newRow.className = "directory-item-entry";
		if (items[i].is_dir == 1) {
			newRow.innerHTML = `
				<img class="item-icon" src="resources/folder-icon.png"/> 
				<p>${items[i].name}</p>
				`;
		}
		else {
				newRow.innerHTML = `
				<img class="item-icon" src="resources/file-icon.png"/>	
				<p>${items[i].name}</p>
				`;
		}
		itemLink.append(newRow)
		directoryList.append(itemLink);
	}

	document.querySelectorAll(".item-button").forEach(item => {
		// Open context menu when right-clicking on file/folder
		item.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			contextMenu.children[0].replaceWith(contextMenu.children[0].cloneNode(true));
			contextMenu.children[1].replaceWith(contextMenu.children[1].cloneNode(true));
			contextMenu.style.display = "flex";
			contextMenu.style.left = e.clientX + "px";
			contextMenu.style.top = e.clientY + "px";
			contextMenu.children[0].addEventListener("click", function() { deleteItem(item); }, {once: true});
			contextMenu.children[1].addEventListener("click", function() { copyItem(item); }, {once: true});
		});
	});
}

function deleteItem(item) {
	let fromPath = item.getAttribute("onclick").split(",")[1].trim().split("/");
	let actFileName = fromPath[fromPath.length - 1].replace("'", "");
	invoke("delete_item", {actFileName})
		.then(items => {
			let temp_item = item.getAttribute("onclick").split(",")[1].trim().split("/");
			contextMenu.style.display = "none";
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

function copyItem(item) {
	copyFilePath = item.getAttribute("onclick").split(",")[1].trim().replace("'", "").replace("'", "");
	let tempCopyFilePath = item.getAttribute("onclick").split(",")[1].trim().split("/");
	copyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
	contextMenu.style.display = "none";
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
		contextMenu.style.display = "none";
	}
}

async function listDirectories() {
	await invoke("list_dirs")
	.then((items) => {
		showItems(items.filter(str => !str.name.startsWith(".")));
	});
}

function openItem(name, path, isDir) {
	if (isDir == 1) {
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
	let fileName = document.querySelector(".search-bar-input").value; 
	await invoke("search_for", {fileName})
		.then((items) => {
			showItems(items);
		});
}

async function cancelSearch() {
	document.querySelector(".cancel-search-button").style.display = "none";
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
