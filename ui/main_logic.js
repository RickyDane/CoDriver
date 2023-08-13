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
				newRow.innerHTML = '<i class="item-icon folder-icon fa-solid fa-folder"></i>' + '<p>'+item.name+'</p>';
				newRow.className = "directory-list-item directory-item";
			}
			else {
				newRow.innerHTML = '<i class="item-icon fa-solid fa-file"></i>' + '<p>'+item.name+'</p>';
				newRow.className = "directory-list-item file-item";
			}
			itemLink.append(newRow)
			directoryList.append(itemLink);
		});
	let goBackButton = document.querySelector(".go-back-button").setAttribute("onclick", "goBack()");
}

async function listDirectories() {
	await invoke("list_dirs")
	.then((items) => {
		showItems(items);
	});
}

async function openItem(name, path, isDir) {
	if (isDir == 1) {
		await invoke("open_dir", {path, name})
			.then((items) => {
				showItems(items.filter(str => str[0] != "."));
			});
	}
	else {
		await invoke("open_item", {path});
	}

}

async function goBack() {
	await invoke("go_back")
		.then((items) => {
			showItems(items.filter(str => str[0] != "."));
		});
}

async function goHome() {
	await invoke("go_home")
		.then((items) => {
			showItems(items.filter(str => str[0] != "."));
		});
}

async function searchFor() {
	let fileName = document.querySelector(".search-bar-input").value; 
	await invoke("search_for", {fileName});
}

listDirectories();
