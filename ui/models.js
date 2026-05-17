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
        const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
        const tooltip = esc(`${this.name}${this.description ? " — " + this.description : ""}`);
        return `
            <div class="active-action active-action-${this.id}"
                 title="${tooltip}">
                <div class="active-action__spinner"><div class="preloader-small-invert"></div></div>
                <div class="active-action__text">
                    <p class="active-action__name">${esc(this.name)}</p>
                    <p class="active-action__desc">${esc(this.description)}</p>
                </div>
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
