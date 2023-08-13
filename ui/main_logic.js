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
	let goBackButton = document.querySelector(".go-back-button").setAttribute("onclick", "goBack('"+currentDir+"/../')");
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
				showItems(items, path);
			});
	}
	else {
		await invoke("open_item", {path});
	}

}

async function goBack(backToPath) {
	console.log(backToPath);
	await invoke("go_back", {backToPath})
		.then((items) => {
			showItems(items, backToPath);
		});
}

listDirectories();
