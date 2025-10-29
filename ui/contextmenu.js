class CDContextMenu {
  selectedItem = null; // Current selected item with right click
  menu = document.createElement("div");
  subMenu = document.createElement("div");

  // Simple definition of the context menu items
  items = [
    {
      label: "Delete",
      icon: "fa-solid fa-trash",
      color: "red",
      action: () => deleteItems(),
    },
    {
      label: "Open with",
      icon: "fa-solid fa-up-right-from-square",
      subItems: [],
    },
    {
      label: "Extract",
      icon: "fa-solid fa-box-open",
      action: () => extractItem(this.selectedItem),
    },
    {
      label: "Compress",
      icon: "fa-solid fa-box",
      action: () => showCompressPopup(this.selectedItem),
    },
    {
      label: "Copy",
      icon: "fa-solid fa-copy",
      action: () => copyItem(this.selectedItem),
    },
    {
      label: "Cut",
      icon: "fa-solid fa-cut",
      action: () => copyItem(this.selectedItem, true),
    },
    {
      label: "Paste",
      icon: "fa-solid fa-paste",
      action: () => pasteItem("", IsCopyToCut),
    },
    {
      label: "Rename",
      icon: "fa-solid fa-file-pen",
      action: () => renameElementInputPrompt(this.selectedItem),
    },
    {
      label: "Move To",
      icon: "fa-solid fa-arrow-right",
      action: () => itemMoveTo(),
    },
    {
      label: "New file",
      icon: "fa-solid fa-file-circle-plus",
      action: () => createFileInputPrompt(),
    },
    {
      label: "New folder",
      icon: "fa-solid fa-folder-plus",
      action: () => createFolderInputPrompt(),
    },
    {
      label: "Open terminal",
      icon: "fa-solid fa-terminal",
      action: () => openInTerminal(this.selectedItem),
    },
    {
      label: "Properties",
      icon: "fa-solid fa-info-circle",
      action: () => showProperties(this.selectedItem),
    },
  ];

  constructor() {
    this.setup();
    this.setupItems();
  }

  show(e) {
    e.preventDefault();
    this.menu.style.left = `${e.clientX}px`;
    this.menu.style.top = `${e.clientY}px`;
    this.menu.style.display = "block";
    positionContextMenu(e);
  }

  hide() {
    this.menu.style.display = "none";
  }

  setSelectedItem(item) {
    this.selectedItem = item;
    this.setupItems();
    if (!ArrSelectedItems.includes(item)) {
      if (ArrSelectedItems.length === 0) {
        selectItem(item, "", true);
      } else if (IsMetaDown || IsCtrlDown) {
        selectItem(item, "", true);
      } else {
        unSelectAllItems();
        selectItem(item, "", true);
      }
    }
  }

  setup() {
    this.menu.classList.add("context-menu");
    this.menu.style.display = "none";
    this.menu.style.position = "absolute";
    document.body.appendChild(this.menu);

    this.subMenu.className = "context-menu context-submenu";
    this.subMenu.style.display = "none";
    this.subMenu.style.position = "absolute";
    document.body.appendChild(this.subMenu);
  }

  setupItems() {
    this.menu.innerHTML = "";
    this.items.forEach((item) => {
      let isDisabled = this.checkDisabled(item);
      if (isDisabled == true) {
        return;
      }
      const button = document.createElement("button");
      button.className = "context-item";
      button.innerHTML = `
        <span class="context-label" style="color: ${isDisabled ? ("var(--transparentColorActive)" ?? "var(--color-primary)") : (item.color ?? "var(--color-primary)")}">
          ${item.label}
        </span>
        <i style="color: ${isDisabled ? ("var(--transparentColorActive)" ?? "var(--color-primary)") : (item.color ?? "var(--color-primary)")}" class="${item.icon}"></i>
      `;
      button.onclick = () => {
        if (!isDisabled) {
          item.action();
        }
        this.hide();
      };
      button.onmouseenter = (e) => {
        if (!isDisabled && item.subItems) {
          this.showSubMenuItems(item, e);
        } else {
          this.hideSubMenu();
        }
      };
      this.menu.appendChild(button);
    });
  }

  showSubMenuItems(item, e) {
    this.subMenu.innerHTML = "";

    if (item.label == "Open with") {
      Applications.forEach((app) => {
        const subItemButton = document.createElement("button");
        subItemButton.className = "context-item";
        subItemButton.innerHTML = `<span class="context-label">${app[0]}</span>`;
        subItemButton.onclick = () => {
          open_with(this.selectedItem.getAttribute("itempath"), app[1]);
          this.hideSubMenu();
        };
        this.subMenu.appendChild(subItemButton);
      });
    } else {
      item?.subItems.forEach((subItem) => {
        const subItemButton = document.createElement("button");
        subItemButton.className = "context-item";
        subItemButton.innerHTML = `<span class="context-label">${subItem[0]}</span>`;
        subItemButton.onclick = () => {
          subItem.action();
          this.hideSubMenu();
        };
        console.log(subItem);
        this.subMenu.appendChild(subItemButton);
      });
    }

    this.subMenu.style.left = `${e.clientX}px`;
    this.subMenu.style.top = `${e.clientY}px`;
    this.subMenu.style.display = "block";
  }

  hideSubMenu() {
    this.subMenu.innerHTML = "";
    this.subMenu.style.display = "none";
  }

  checkDisabled(item) {
    if (!this.selectedItem) {
      if (
        ["Paste", "New file", "New folder", "Open terminal", "Properties"].includes(
          item.label,
        )
      ) {
        if (item.label == "Paste") {
          return ArrCopyItems.length === 0;
        }
        return false;
      }
      return true;
    } else {
      if (item.label == "Extract") {
        return !endsWith(this.selectedItem?.getAttribute("itempath"), ".", [
          "zip",
          "rar",
          "7z",
          "tar",
          "tar.gz",
          "tar.bz2",
        ]);
      } else if (item.label == "Paste") {
        return ArrCopyItems.length === 0;
      }
    }
  }
}
