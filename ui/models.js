class ActiveAction {
    id = "";
    name = "";
    description = "";
    path = "";
    isProgress = false;
    progress = 0;
    currentFile = "";
    countLabel = "";
    speedLabel = "";
    constructor(name = "", description = "", id = "", path = "", isProgress = false) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.path = path;
        this.isProgress = isProgress;
    }
    finishAction() {
        document.querySelector(".active-action-"+this.id)?.remove();
    }
    getHTMLElement() {
        const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
        const tooltip = esc(`${this.name}${this.description ? " — " + this.description : ""}`);
        if (this.isProgress) {
            return `
                <div class="active-action active-action-${this.id} active-action--progress"
                     title="${tooltip}"
                     onclick="reopenProgressModal('${this.id}')">
                    <div class="active-action__progress-header">
                        <div class="active-action__text">
                            <p class="active-action__name">${esc(this.name)}</p>
                            <p class="active-action__desc active-action__current-file">${esc(this.currentFile || this.description)}</p>
                        </div>
                        <span class="active-action__percent">${Math.round(this.progress)}%</span>
                    </div>
                    <div class="active-action__progress-track">
                        <div class="active-action__progress-fill" style="width: ${this.progress}%"></div>
                    </div>
                    <div class="active-action__progress-meta">
                        <span class="active-action__count">${esc(this.countLabel)}</span>
                        <span class="active-action__speed">${esc(this.speedLabel)}</span>
                    </div>
                </div>
            `;
        }
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
