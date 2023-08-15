const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog; 

let view = "wrap";
let directoryList = document.querySelector(".directory-list");
let directoryCount = document.querySelector(".directory-entries-count");

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
	let contextMenu = document.querySelector(".context-menu");
	contextMenu.style.display = "flex";
	contextMenu.style.left = e.clientX + "px";
	contextMenu.style.top = e.clientY + "px";
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
		// Open context menu when right-clicking of file/folder
		item.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			let contextMenu = document.querySelector(".context-menu");
			contextMenu.style.display = "flex";
			contextMenu.style.left = e.clientX + "px";
			contextMenu.style.top = e.clientY + "px";
		});
	});
}

async function listDirectories() {
	await invoke("list_dirs")
	.then(async (items) => {
		await showItems(items.filter(str => !str.name.startsWith(".")));
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

async function goDesktop() {
	await invoke("go_to_desktop")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goDownloads() {
	await invoke("go_to_downloads")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goImages() {
	await invoke("go_to_images")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goVideos() {
	await invoke("go_to_videos")
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function goMusic() {
	await invoke("go_to_music")
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
