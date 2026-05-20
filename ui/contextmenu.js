class CDContextMenu {
  selectedItem = null;
  menu = document.createElement("div");
  subMenu = document.createElement("div");
  _closeTimeout = null;

  itemGroups = [
    [
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
        label: "Image edit",
        icon: "fa-solid fa-image-portrait",
        action: () => showImageEditPopup(this.selectedItem),
      },
    ],
    [
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
    ],
    [
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
        label: "Delete",
        icon: "fa-solid fa-trash",
        color: "var(--errorColor)",
        action: () => deleteItems(),
      },
    ],
    [
      {
        label: "Add to Favorites",
        icon: "fa-solid fa-star",
        action: () => addFavorite(this.selectedItem.getAttribute("itempath")),
      },
      {
        label: "Remove Favorite",
        icon: "fa-regular fa-star",
        action: () => removeFavorite(this.selectedItem.getAttribute("itempath")),
      },
    ],
    [
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
    ],
    [
      {
        label: "Properties",
        icon: "fa-solid fa-info-circle",
        action: () => showProperties(this.selectedItem),
      },
    ],
  ];

  diskItemGroups = [
    [
      {
        label: "Open Disk",
        icon: "fa-solid fa-folder-open",
        action: () => openItem(this.selectedItem, ""),
      },
    ],
    [
      {
        label: "Add to Favorites",
        icon: "fa-solid fa-star",
        action: () => addFavorite(this.selectedItem.getAttribute("itempath")),
      },
      {
        label: "Remove Favorite",
        icon: "fa-regular fa-star",
        action: () => removeFavorite(this.selectedItem.getAttribute("itempath")),
      },
    ],
    [
      {
        label: "Copy Path",
        icon: "fa-solid fa-clipboard",
        action: async () => {
          await writeText(this.selectedItem.getAttribute("itempath"));
          showToast("Copied path to clipboard", ToastType.INFO);
        },
      },
      {
        label: "Open in Terminal",
        icon: "fa-solid fa-terminal",
        action: () => openInTerminal(this.selectedItem),
      },
      {
        label: "Eject Disk",
        icon: "fa-solid fa-eject",
        action: () => ejectDisk(this.selectedItem),
      },
    ],
    [
      {
        label: "Properties",
        icon: "fa-solid fa-circle-info",
        action: () => showProperties(this.selectedItem),
      },
    ],
  ];

  get items() {
    return this.itemGroups.flat();
  }

  get diskItems() {
    return this.diskItemGroups.flat();
  }

  constructor() {
    this.setup();
    this.setupItems();
  }

  show(e) {
    e.preventDefault();
    this.hideSubMenu();
    if (this._closeTimeout) {
      clearTimeout(this._closeTimeout);
      this._closeTimeout = null;
    }
    this.menu.style.left = `${e.clientX}px`;
    this.menu.style.top = `${e.clientY}px`;
    this.menu.style.display = "flex";
    this.menu.classList.remove("context-menu--closing");
    positionContextMenu(e);
  }

  hide() {
    this.menu.classList.add("context-menu--closing");
    this._closeTimeout = setTimeout(() => {
      this.menu.style.display = "none";
      this.menu.classList.remove("context-menu--closing");
      this._closeTimeout = null;
    }, 120);
  }

  setSelectedItem(item, e = null) {
    this.selectedItem = item;
    this.setupItems();
    if (!ArrSelectedItems.includes(item)) {
      const isMeta = e ? e.metaKey : (window.event ? window.event.metaKey : false);
      const isCtrl = e ? e.ctrlKey : (window.event ? window.event.ctrlKey : false);
      if (ArrSelectedItems.length === 0) {
        selectItem(item, "", true, false);
      } else if (isMeta || isCtrl) {
        selectItem(item, "", true, false);
      } else {
        unSelectAllItems();
        selectItem(item, "", true, false);
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
    const groups = this.selectedItem?.getAttribute("itemisdisk") === "1"
      ? this.diskItemGroups
      : this.itemGroups;

    groups.forEach((group) => {
      const visibleItems = group.filter((item) => !this.checkDisabled(item));
      if (visibleItems.length === 0) return;

      if (this.menu.children.length > 0) {
        const divider = document.createElement("div");
        divider.className = "context-divider";
        this.menu.appendChild(divider);
      }

      visibleItems.forEach((item) => {
        const button = document.createElement("button");
        button.className = "context-item";
        const isSubmenu = item.subItems && item.subItems.length > 0 || item.label === "Open with";
        const itemColor = item.color ?? "var(--textColor)";

        button.innerHTML = `
          <span class="context-item-group">
            <i class="context-item-icon ${item.icon}" style="color: ${itemColor}"></i>
            <span class="context-label">${item.label}</span>
          </span>
          ${isSubmenu ? '<i class="context-item-chevron fa-solid fa-chevron-right"></i>' : ""}
        `;

        button.onclick = () => {
          if (item.action) {
            item.action();
          }
          this.hide();
        };

        button.onmouseenter = (e) => {
          if (isSubmenu) {
            this.showSubMenuItems(item, e);
          } else {
            this.hideSubMenu();
          }
        };

        this.menu.appendChild(button);
      });
    });
  }

  getVisibleItems() {
    if (this.selectedItem?.getAttribute("itemisdisk") === "1") {
      return this.diskItems;
    }
    return this.items;
  }

  showSubMenuItems(item, e) {
    this.subMenu.innerHTML = "";

    if (item.label === "Open with") {
      Applications.forEach((app) => {
        const subItemButton = document.createElement("button");
        subItemButton.className = "context-item";
        subItemButton.innerHTML = `
          <span class="context-item-group">
            <span class="context-label">${app[0]}</span>
          </span>
        `;
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
        subItemButton.innerHTML = `
          <span class="context-item-group">
            <span class="context-label">${subItem[0]}</span>
          </span>
        `;
        subItemButton.onclick = () => {
          subItem.action();
          this.hideSubMenu();
        };
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
        if (item.label === "Paste") {
          return ArrCopyItems.length === 0;
        }
        return false;
      }
      return true;
    } else {
      if (item.label === "Extract") {
        return !endsWith(this.selectedItem?.getAttribute("itempath"), ".", [
          "zip", "rar", "7z", "zst", "zstd", "tar", "gz", "bz2", "density", "br",
        ]);
      } else if (item.label === "Paste") {
        return ArrCopyItems.length === 0;
      } else if (item.label === "Add to Favorites") {
        if (!this.selectedItem) return true;
        if (this.selectedItem.getAttribute("itemisdir") != "1") return true;
        let path = this.selectedItem.getAttribute("itempath");
        return ArrFavorites.includes(path);
      } else if (item.label === "Remove Favorite") {
        if (!this.selectedItem) return true;
        let path = this.selectedItem.getAttribute("itempath");
        return !ArrFavorites.includes(path);
      } else if (item.label === "Eject Disk") {
        return this.selectedItem?.getAttribute("itemisremovable") !== "1";
      } else if (item.label === "Image edit") {
        if (!this.selectedItem) return true;
        if (this.selectedItem.getAttribute("itemisdir") === "1") return true;
        let path = this.selectedItem.getAttribute("itempath");
        let ext = "." + path.split(".").pop().toLowerCase();
        return !isImage(ext);
      }
    }
  }
}
