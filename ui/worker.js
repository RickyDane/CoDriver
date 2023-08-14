onmessage = (event) => {
	console.log(event);
	let items = event.data.items;
	let directoryList = event.data.list;
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
};

