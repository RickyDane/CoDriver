# Popup Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all popups and the Settings UI to use the `PopupManager` with the modern "Soft & Elevated" design.

**Architecture:** We will add new structural CSS variables and classes to `ui/style.css`, update `PopupManager` in `ui/popup-system.js` to generate the new DOM structure (`.soft-popup`, `.soft-header`, etc.), and migrate `ui/main_logic.js` functions to use `PopupManager.open()`. The Settings UI will be updated to use the `.setting-card` layout and managed by `PopupManager`.

**Tech Stack:** Vanilla JS, Vanilla CSS, HTML.

---

### Task 1: Add "Soft & Elevated" CSS tokens and base classes

**Files:**
- Modify: `ui/style.css`

- [ ] **Step 1: Write UI test script**

Create `test_popup.html` to visually verify the classes.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="ui/style.css">
</head>
<body style="background: #f0f2f5; padding: 50px;">
  <div class="soft-popup">
    <div class="soft-header"><h3>Test</h3></div>
    <div class="soft-body">Body</div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails (looks unstyled)**

Run: `open test_popup.html` (or open in a browser)
Expected: The popup should look unstyled and basic, without soft shadows or rounded corners.

- [ ] **Step 3: Write minimal implementation**

Append these tokens to the `:root` block in `ui/style.css`:

```css
  --popup-radius-xl: 24px;
  --popup-radius-lg: 16px;
  --popup-radius-full: 9999px;
  --popup-shadow-soft: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
```

Append these classes to the end of `ui/style.css`:

```css
.soft-popup {
    background: var(--primaryColor);
    border-radius: var(--popup-radius-xl);
    box-shadow: var(--popup-shadow-soft);
    width: min(440px, 90vw);
    overflow: hidden;
    animation: scaleUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid rgba(255,255,255,0.05);
    color: var(--textColor);
}

.soft-header {
    padding: 32px 32px 16px;
    text-align: center;
    position: relative;
}

.soft-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.03em;
}

.soft-body {
    padding: 0 32px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.soft-footer {
    padding: 24px 32px;
    background: var(--secondaryColor);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-soft {
    padding: 12px 24px;
    border-radius: var(--popup-radius-full);
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    text-align: center;
}

.btn-primary {
    background: var(--selectColor);
    color: white;
}

.btn-cancel {
    background: var(--tertiaryColor);
    color: var(--textColor);
}

@keyframes scaleUp {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

@keyframes scaleDown {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.95); }
}

.soft-popup.is-closing {
    animation: scaleDown 0.2s ease forwards;
}

/* Settings Cards */
.setting-card {
    background: var(--secondaryColor);
    border-radius: var(--popup-radius-lg);
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid transparent;
}
.setting-name { font-weight: 600; }
.setting-desc { font-size: 0.85rem; color: var(--textColor2); }
```

- [ ] **Step 4: Run test to verify it passes**

Refresh `test_popup.html` in browser.
Expected: The popup should now have large rounded corners, a soft shadow, and proper styling.

- [ ] **Step 5: Commit**

```bash
rm test_popup.html
git add ui/style.css
git commit -m "feat(ui): add soft & elevated popup tokens and classes"
```

---

### Task 2: Refactor PopupManager

**Files:**
- Modify: `ui/popup-system.js`

- [ ] **Step 1: Write test script**

Create `test_manager.html`.

```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="ui/style.css"></head>
<body>
  <script src="ui/popup-system.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      PopupManager.open({
        title: "Test Manager",
        content: "<p>Content</p>",
        buttons: [{ label: "Close", action: () => true }]
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails (uses old classes)**

Run: `open test_manager.html`
Expected: The popup uses `cd-popup` classes, not the new `soft-popup` styling.

- [ ] **Step 3: Write minimal implementation**

In `ui/popup-system.js`, update `PopupManager.open()` to use the new DOM structure.

Find:
```javascript
    // Create popup wrapper
    const popup = document.createElement("div");
    popup.className = `cd-popup ${className}`;

    // Create container
    const container = document.createElement("div");
    container.className = "cd-popup__container";
```

Replace with:
```javascript
    // Create popup wrapper
    const popup = document.createElement("div");
    popup.className = `soft-popup ${className}`;
```
*(Remove `container` creation and appending entirely. Append directly to `popup`)*

Find:
```javascript
    // Header
    if (!noHeader) {
      const header = document.createElement("div");
      header.className = "cd-popup__header";
```

Replace the entire Header block with:
```javascript
    if (!noHeader) {
      const header = document.createElement("div");
      header.className = "soft-header";
      
      const heading = document.createElement("h3");
      heading.textContent = title;
      header.appendChild(heading);
      
      popup.appendChild(header);
    }
```

Find the Body block and replace with:
```javascript
    const body = document.createElement("div");
    body.className = "soft-body";
    body.innerHTML = content;
    popup.appendChild(body);
```

Find the Controls block and replace with:
```javascript
    if (buttons.length > 0) {
      const controls = document.createElement("div");
      controls.className = "soft-footer";

      buttons.forEach((btn) => {
        const button = document.createElement("button");
        button.className = `btn-soft ${btn.primary ? 'btn-primary' : 'btn-cancel'} ${btn.className || ""}`;
        button.innerHTML = `<span>${btn.label || "Button"}</span>`;
        button.onclick = () => {
          if (typeof btn.action === "function") {
            const result = btn.action();
            if (result !== false) this.close(popup);
          } else {
            this.close(popup);
          }
        };
        controls.appendChild(button);
      });
      popup.appendChild(controls);
    }

    appendTo.appendChild(popup);
```

Also, update `PopupManager.close()` to use `.is-closing`:
Find `popupElement.classList.remove("is-open");` and replace with `popupElement.classList.add("is-closing");`

- [ ] **Step 4: Run test to verify it passes**

Refresh `test_manager.html`.
Expected: Popup looks soft and elevated, buttons styled correctly.

- [ ] **Step 5: Commit**

```bash
rm test_manager.html
git add ui/popup-system.js
git commit -m "refactor(ui): update PopupManager to generate soft & elevated DOM"
```

---

### Task 3: Migrate Loading & Input Popups

**Files:**
- Modify: `ui/main_logic.js`

- [ ] **Step 1: Write test script**

Create `test_logic.html`.

```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="ui/style.css"></head>
<body>
  <div class="popup-background"></div>
  <script src="ui/jquery.js"></script>
  <script src="ui/popup-system.js"></script>
  <script src="ui/main_logic.js"></script>
  <script>
    showLoadingPopup("Loading test...");
    setTimeout(() => closeLoadingPopup(), 1000);
  </script>
</body>
</html>
```

- [ ] **Step 2: Run test to verify it fails (uses legacy DOM)**

Inspect DOM while open, it uses `<div class="loading-popup">`.

- [ ] **Step 3: Write minimal implementation**

In `ui/main_logic.js`:

Replace `showLoadingPopup` implementation:
```javascript
let currentLoadingPopup = null;
function showLoadingPopup(msg) {
  closeLoadingPopup(); // Ensure no duplicates
  currentLoadingPopup = PopupManager.open({
    noHeader: true,
    content: `<div style="text-align:center; padding-top:16px;">
                <img src="resources/preloader.gif" width="32">
                <p style="margin-top:16px; font-weight:600;">${msg}</p>
              </div>`,
    allowBackdropClose: false,
    allowEscapeClose: false
  });
}
```

Replace `closeLoadingPopup` implementation:
```javascript
function closeLoadingPopup() {
  if (currentLoadingPopup) {
    PopupManager.close(currentLoadingPopup);
    currentLoadingPopup = null;
  }
}
```

Replace `showInputPopup` implementation:
```javascript
let currentInputPopup = null;
function showInputPopup(msg) {
  closeInputPopup();
  return new Promise((resolve) => {
    currentInputPopup = PopupManager.open({
      title: "Input Required",
      content: `<p>${msg}</p><input type="text" id="popup-generic-input" class="text-input" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--tertiaryColor); background:var(--bg-base); color:var(--textColor); margin-top:10px;">`,
      allowBackdropClose: false,
      buttons: [
        { label: "Cancel", action: () => resolve(null) },
        { label: "Confirm", primary: true, action: () => resolve(document.getElementById("popup-generic-input").value) }
      ],
      onClose: () => resolve(null)
    });
    setTimeout(() => document.getElementById("popup-generic-input")?.focus(), 100);
  });
}
```

Replace `closeInputPopup` implementation:
```javascript
function closeInputPopup() {
  if (currentInputPopup) {
    PopupManager.close(currentInputPopup);
    currentInputPopup = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run `npm run tauri dev` (or manually trigger these in the console).
Expected: Loading and input popups use the new aesthetic.

- [ ] **Step 5: Commit**

```bash
rm -f test_logic.html
git add ui/main_logic.js
git commit -m "refactor(ui): migrate loading and input popups to PopupManager"
```

---

### Task 4: Migrate Confirm Popup

**Files:**
- Modify: `ui/main_logic.js`

- [ ] **Step 1: Write test script**

(Manual test within application via developer console: `showPopup("Confirm action?", 0)`)

- [ ] **Step 2: Run test to verify it fails (legacy DOM)**

Call `showPopup("Confirm", 0)` in console. Expected: uses legacy `.confirm-popup` structure.

- [ ] **Step 3: Write minimal implementation**

In `ui/main_logic.js`, replace the entire `showPopup` function:

```javascript
let currentConfirmPopup = null;
async function showPopup(message = "Nothing to see here!", type = 0, subtitle = "") {
  closeConfirmPopup();
  
  let primaryLabel = "Confirm";
  let isDanger = false;
  if (type === 2) { primaryLabel = "Delete"; isDanger = true; } // PopupType.DELETE
  if (type === 1) { primaryLabel = "Extract"; } // PopupType.EXTRACT

  return new Promise((resolve) => {
    let contentHtml = `<p>${message}</p>`;
    if (subtitle) contentHtml += `<p class="setting-desc" style="margin-top:8px;">${subtitle}</p>`;
    if (type === 3) { // PopupType.PROMPT
      contentHtml += `<input type="password" id="popup-prompt-input" class="text-input" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--tertiaryColor); background:var(--bg-base); color:var(--textColor); margin-top:16px;" placeholder="Password">`;
    }

    currentConfirmPopup = PopupManager.open({
      title: "Confirmation",
      content: contentHtml,
      allowBackdropClose: false,
      buttons: [
        { label: "Cancel", action: () => { resolve(type === 3 ? null : false); } },
        { 
          label: primaryLabel, 
          primary: !isDanger, 
          danger: isDanger,
          action: () => {
            if (type === 3) resolve(document.getElementById("popup-prompt-input").value);
            else resolve(true);
          }
        }
      ],
      onClose: () => resolve(type === 3 ? null : false)
    });
    
    if (type === 3) {
      setTimeout(() => {
        const inp = document.getElementById("popup-prompt-input");
        if(inp) {
          inp.focus();
          inp.onkeyup = (e) => { if(e.key === "Enter") { resolve(inp.value); PopupManager.close(currentConfirmPopup); } };
        }
      }, 100);
    }
  });
}
```

Replace `closeConfirmPopup`:
```javascript
function closeConfirmPopup() {
  if (currentConfirmPopup) {
    PopupManager.close(currentConfirmPopup);
    currentConfirmPopup = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Call `showPopup("Test", 0)` in app console.
Expected: It renders as a `.soft-popup` with correct buttons and styling.

- [ ] **Step 5: Commit**

```bash
git add ui/main_logic.js
git commit -m "refactor(ui): migrate confirm popup to PopupManager"
```

---

### Task 5: Migrate Settings UI to PopupManager Layout

**Files:**
- Modify: `ui/main_logic.js`
- Modify: `ui/style.css`

- [ ] **Step 1: Manual UI Test Setup**

Run app. Open Settings. 
Expected: Slides in from side or uses `.active` class with legacy flat styling.

- [ ] **Step 2: Check current toggle logic**

Currently `$(".settings-ui").addClass("active");` handles display.

- [ ] **Step 3: Write minimal implementation**

In `ui/main_logic.js`, find where `$(".settings-ui").addClass("active")` is called (likely in an event listener like `$("#settings-btn").click()`). 

Change it to extract the HTML of `.settings-ui` and wrap it:

```javascript
// Find the function or click handler that opens settings. For example:
// If it's a dedicated function:
let settingsPopupRef = null;
function toggleSettings() {
  if (settingsPopupRef) return; // Already open
  
  const settingsEl = document.querySelector(".settings-ui");
  // Ensure we display it properly by removing 'display: none' if it had it
  settingsEl.style.display = 'block'; 
  
  // Wrap it in the new PopupManager
  settingsPopupRef = PopupManager.wrapLegacy(settingsEl, {
    allowBackdropClose: true,
    allowEscapeClose: true,
    onClose: () => {
      // Re-hide or clean up if needed
      settingsPopupRef = null;
    }
  });
}

// In ui/main_logic.js, search for `$(".settings-ui").addClass("active");`
// Replace it with `toggleSettings();`
```
*(Note: As the exact caller for Settings isn't fully mapped, adapt the above to replace the specific click handler in `main_logic.js` that adds `.active` to `.settings-ui`)*

In `ui/style.css`, remove the `.settings-ui.active` styles that handle side-panel sliding:
```css
/* Remove or comment out these if they exist to prevent layout conflicts */
/* .settings-ui { position: fixed; right: -400px; ... } */
/* .settings-ui.active { right: 0; } */
```
Add to `ui/style.css` to ensure internal cards use the new look:
```css
.settings-control-group {
    background: var(--secondaryColor);
    border-radius: var(--popup-radius-lg);
    padding: 16px;
    margin-bottom: 12px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Open Settings in the app.
Expected: Settings appears centered in a `.soft-popup` envelope with blurred backdrop and Escape-to-close behavior, instead of a slide-out panel.

- [ ] **Step 5: Commit**

```bash
git add ui/main_logic.js ui/style.css
git commit -m "refactor(ui): migrate Settings panel to PopupManager soft styling"
```
