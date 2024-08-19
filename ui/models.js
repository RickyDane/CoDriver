class ActiveAction {
    id = "";
    name = "";
    description = "";
    path = "";
    constructor(name = "", description = "", id = "", path = "") {
        this.id = id;
        this.name = name;
        this.description = description;
        this.path = path;
    }
    finishAction() {
        document.querySelector(".active-action-"+this.id)?.remove();
    }
    getHTMLElement() {
        return `
            <div onclick="openDirAndSwitch('${this.path}')" class="active-action active-action-${this.id}">
                <div class="active-action-header">
                    <div class="preloader-small-invert"></div>
                    <p>${this.name}</p>
                </div>
                <div class="horizontal-seperator"></div>
                <p class="action-description">${this.description}</p>
            </div>
        `;
    }
}

const PopupType = {
    PROMPT: "prompt",
    CONTINUE: "continue",
    EXTRACT: "extract",
    DELETE: "delete"
}

const ToastType = {
    INFO: "info",
    SUCCESS: "success",
    ERROR: "error"
}