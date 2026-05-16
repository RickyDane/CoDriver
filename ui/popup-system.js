/**
 * PopupManager — Unified popup creation & management system
 * Handles backdrop, animations, focus trapping, Escape, and click-outside-to-close.
 */
class PopupManager {
  static activePopups = [];
  static backdropEl = null;
  static _escapeHandler = null;
  static _initialized = false;

  static init() {
    if (this._initialized) return;
    this._initialized = true;

    // Ensure backdrop exists
    this.backdropEl = document.querySelector(".popup-background");
    if (!this.backdropEl) {
      this.backdropEl = document.createElement("div");
      this.backdropEl.className = "popup-background";
      document.body.appendChild(this.backdropEl);
    }

    // Global Escape handler
    this._escapeHandler = (e) => {
      if (e.key === "Escape") {
        const topPopup = this.activePopups[this.activePopups.length - 1];
        if (topPopup && topPopup.allowEscapeClose) {
          this.close(topPopup.element);
        }
      }
    };
    document.addEventListener("keydown", this._escapeHandler);
  }

  /**
   * Open a new popup.
   * @param {Object} options
   * @param {string} options.className — Additional CSS class for sizing (e.g. 'cd-popup--medium')
   * @param {string} options.title — Header title text
   * @param {string} options.icon — Font Awesome icon class (e.g. 'fa-solid fa-check')
   * @param {string} options.content — HTML content for the body
   * @param {Array}  options.buttons — Array of button objects: { label, icon, className, action, primary, danger }
   * @param {boolean} options.allowBackdropClose — Close when clicking outside (default true)
   * @param {boolean} options.allowEscapeClose — Close on Escape key (default true)
   * @param {Function} options.onClose — Callback when popup closes
   * @param {HTMLElement} options.appendTo — Element to append popup to (default document.body)
   * @param {boolean} options.noHeader — Hide the header entirely
   * @param {boolean} options.noCloseButton — Hide the X close button
   * @returns {HTMLElement} The popup element
   */
  static open(options = {}) {
    this.init();

    const {
      className = "soft-popup--auto",
      title = "",
      icon = "",
      content = "",
      buttons = [],
      allowBackdropClose = true,
      allowEscapeClose = true,
      onClose = null,
      appendTo = document.body,
      noHeader = false,
      noCloseButton = false,
    } = options;

    // Create popup wrapper
    const popup = document.createElement("div");
    popup.className = `soft-popup ${className}`;

    // Header
    if (!noHeader) {
      const header = document.createElement("div");
      header.className = "soft-header";

      if (icon) {
        const iconWrapper = document.createElement("div");
        iconWrapper.className = "icon-wrapper";
        iconWrapper.innerHTML = `<i class="${icon}"></i>`;
        header.appendChild(iconWrapper);
      }

      const heading = document.createElement("h3");
      heading.textContent = title;
      header.appendChild(heading);

      if (!noCloseButton) {
        const closeBtn = document.createElement("button");
        closeBtn.className = "popup-close-button";
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.onclick = () => this.close(popup);
        header.appendChild(closeBtn);
      }

      popup.appendChild(header);
    }

    // Body
    const body = document.createElement("div");
    body.className = "soft-body";
    body.innerHTML = content;
    popup.appendChild(body);

    // Controls / Buttons
    if (buttons.length > 0) {
      const footer = document.createElement("div");
      footer.className = "soft-footer";

      buttons.forEach((btn) => {
        const button = document.createElement("button");
        button.className = `btn-soft ${btn.className || ""}`;
        if (btn.danger) button.classList.add("btn-danger");
        else if (btn.primary) button.classList.add("btn-primary");
        else if (btn.cancel || (btn.label && btn.label.toLowerCase() === 'cancel')) button.classList.add("btn-cancel");

        let html = "";
        if (btn.icon) {
          html += `<span class="btn-soft__icon"><i class="${btn.icon}"></i> </span>`;
        }
        html += `<span>${btn.label || "Button"}</span>`;
        button.innerHTML = html;

        button.onclick = () => {
          if (typeof btn.action === "function") {
            const result = btn.action();
            if (result !== false) {
              this.close(popup);
            }
          } else {
            this.close(popup);
          }
        };

        footer.appendChild(button);
      });

      popup.appendChild(footer);
    }

    appendTo.appendChild(popup);

    // Register popup
    const popupData = {
      element: popup,
      allowEscapeClose,
      allowBackdropClose,
      onClose,
      previouslyFocused: document.activeElement,
    };
    this.activePopups.push(popupData);

    // Show backdrop
    this._updateBackdrop();

    // Trigger entrance animation (handled by CSS animation in .soft-popup)
    requestAnimationFrame(() => {
      popup.classList.add("is-open");
    });

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = popup.querySelector(
        "button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      if (focusable) focusable.focus();
    });

    // Click outside to close
    if (allowBackdropClose) {
      popup.addEventListener("click", (e) => {
        if (e.target === popup) {
          this.close(popup);
        }
      });
    }

    IsPopUpOpen = true;
    IsDisableShortcuts = true;

    return popup;
  }

  /**
   * Close a popup created by PopupManager.open()
   */
  static close(popupElement) {
    const idx = this.activePopups.findIndex((p) => p.element === popupElement);
    if (idx === -1) return;

    const popupData = this.activePopups[idx];
    
    // Trigger exit animation
    popupElement.classList.add("is-closing");
    popupElement.classList.remove("is-open");

    const cleanup = () => {
      if (!popupElement.parentNode) return;
      
      // If this was a legacy wrap, restore the element
      if (popupData.legacyElement) {
        const element = popupData.legacyElement;
        element.style.display = popupData.legacyOriginalDisplay;
        if (popupData.legacyParent) {
          popupData.legacyParent.insertBefore(element, popupData.legacyNextSibling);
        }
      }

      popupElement.remove();
      
      const currentIdx = this.activePopups.indexOf(popupData);
      if (currentIdx !== -1) {
        this.activePopups.splice(currentIdx, 1);
      }
      
      this._updateBackdrop();

      if (typeof popupData.onClose === "function") {
        popupData.onClose();
      }

      // Restore focus
      if (popupData.previouslyFocused && typeof popupData.previouslyFocused.focus === "function") {
        popupData.previouslyFocused.focus();
      }

      if (this.activePopups.length === 0) {
        IsPopUpOpen = false;
        IsDisableShortcuts = false;
      }
    };

    // Use animationend for cleanup, with a safety timeout
    popupElement.addEventListener("animationend", (e) => {
      if (e.animationName === "scaleDown") cleanup();
    }, { once: true });
    
    setTimeout(cleanup, 250); // Fallback
  }

  /**
   * Close all active popups
   */
  static closeAll() {
    [...this.activePopups].reverse().forEach((p) => this.close(p.element));
  }

  /**
   * Helper: open a legacy-style uni-popup with the new system
   * This wraps an existing DOM element inside the new popup shell.
   */
  static wrapLegacy(element, options = {}) {
    this.init();

    const {
      allowBackdropClose = true,
      allowEscapeClose = true,
      onClose = null,
    } = options;

    const popup = document.createElement("div");
    popup.className = "soft-popup soft-popup--auto legacy-wrapper";

    // Transfer styles from element to popup
    popup.style.cssText = element.style.cssText;

    // Transfer classes (except uni-popup / cd-popup ones)
    const extraClasses = Array.from(element.classList).filter(
      (c) => !["uni-popup", "cd-popup", "cd-popup--auto", "soft-popup", "soft-popup--auto", "is-visible", "is-open"].includes(c)
    );
    if (extraClasses.length) {
      popup.classList.add(...extraClasses);
    }

    // Move element into popup instead of moving its children
    const parent = element.parentNode;
    const nextSibling = element.nextSibling;
    const originalDisplay = element.style.display;
    
    // We want the element to be visible inside the popup
    element.style.display = 'flex'; 
    
    if (parent) {
      parent.insertBefore(popup, element);
    }
    popup.appendChild(element);

    const popupData = {
      element: popup,
      legacyElement: element,
      legacyParent: parent,
      legacyNextSibling: nextSibling,
      legacyOriginalDisplay: originalDisplay,
      allowEscapeClose,
      allowBackdropClose,
      onClose,
      previouslyFocused: document.activeElement,
    };
    this.activePopups.push(popupData);

    this._updateBackdrop();

    // Trigger entrance animation
    requestAnimationFrame(() => {
      popup.classList.add("is-open");
    });

    if (allowBackdropClose) {
      popup.addEventListener("click", (e) => {
        if (e.target === popup) {
          this.close(popup);
        }
      });
    }

    IsPopUpOpen = true;
    IsDisableShortcuts = true;

    return popup;
  }

  static _updateBackdrop() {
    if (!this.backdropEl) return;
    if (this.activePopups.length > 0) {
      this.backdropEl.style.display = "block";
      requestAnimationFrame(() => {
        this.backdropEl.style.opacity = "1";
      });
    } else {
      this.backdropEl.style.opacity = "0";
      setTimeout(() => {
        if (this.activePopups.length === 0) {
          this.backdropEl.style.display = "none";
        }
      }, 300);
    }
  }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => PopupManager.init());
