const { invoke } = window.__TAURI__.tauri;
const { confirm } = window.__TAURI__.dialog; 
const { message } = window.__TAURI__.dialog; 

async function showItems(items, currentDir) {
	let directoryList = document.querySelector(".directory-list");
		directoryList.innerHTML = "";
		items.forEach(item => {
			let itemLink = document.createElement("button");
			itemLink.className = "item-button";
			itemLink.setAttribute("onclick", "openItem('"+item.name+"', '"+item.path+"', '"+item.is_dir+"')");
			let newRow = document.createElement("div");
			if (item.is_dir == 1) {
				newRow.innerHTML = `
						<i class="item-icon folder-icon fa-solid fa-folder"></i>
						<p>${item.name}</p>
					`;
			}
			else {
				newRow.innerHTML = `
						<i class="item-icon fa-solid fa-file"></i>
						<p>${item.name}</p>
					`;
			}
			itemLink.append(newRow)
			directoryList.append(itemLink);
		});
	document.querySelector(".go-back-button").setAttribute("onclick", "goBack()");
	document.querySelector(".directory-entries-count").innerHTML = items.length;
}

async function listDirectories() {
	await invoke("list_dirs")
	.then((items) => {
		showItems(items.filter(str => !str.name.startsWith(".")));
	});
}

async function openItem(name, path, isDir) {
	if (isDir == 1) {
		await invoke("open_dir", {path, name})
			.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
			});
	}
	else {
		await invoke("open_item", {path});
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

async function searchFor() {
	document.querySelector(".cancel-search-button").style.display = "block";
	let fileName = document.querySelector(".search-bar-input").value; 
	await invoke("search_for", {fileName})
		.then((items) => {
			showItems(items.filter(str => !str.name.startsWith(".")));
		});
}

async function cancelSearch() {
	document.querySelector(".cancel-search-button").style.display = "none";
	listDirectories();
}

listDirectories();
