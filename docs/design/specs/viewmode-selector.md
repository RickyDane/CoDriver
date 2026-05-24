# Design Spec: ViewMode Selector Overhaul

## Overview

Replace the current `<select>` dropdown + icon combo with a **segmented icon button group** — three icon buttons in a single pill-shaped container. Inspired by macOS Finder's view toggle and VS Code's layout switcher. No text labels, just icons. Clean, compact, native to the header bar.

## Design Approach: Segmented Icon Control

**Why this approach:**
- Single-click access to any mode (no dropdown open → select → close cycle)
- Visual at a glance — user sees all available modes and which is active
- Compact enough for the header bar (no wider than current select + icon)
- Matches patterns users already know (Finder, VS Code, Figma toolbar)
- Eliminates the need for a separate icon span that JS must update

**Rejected alternatives:**
- *Toggle pills with text labels*: Too wide for the header bar
- *Single icon button that cycles*: Hides available options, requires multiple clicks
- *Keep dropdown, restyle*: Still requires two interactions to switch modes

---

## Visual Design

### Layout

```
┌──────────────────────────────────────────┐
│  [  ⋮⋮  ] [  ≡  ] [  ||  ]             │
│   Grid     List    Miller                │
│   (active)                             │
└──────────────────────────────────────────┘
```

Container: pill shape, 3 icon buttons side by side, 1px gap between them (visible separation via subtle border or background difference).

### Dimensions

| Element | Value |
|---|---|
| Container height | 32px |
| Container border-radius | 8px |
| Container padding | 3px (inner gap around buttons) |
| Button width | 28px |
| Button height | 26px |
| Button border-radius | 6px |
| Icon size | 11px |
| Gap between container and adjacent elements | 10px (matches header gap) |

### Color Palette

| State | Background | Icon Color |
|---|---|---|
| Container | `var(--secondaryColor)` | — |
| Container border | `1px solid var(--tertiaryColor)` | — |
| Button default | transparent | `var(--textColor2)` |
| Button hover | `var(--transparentColor)` | `var(--textColor)` |
| Button active/selected | `var(--transparentColorActive)` | `var(--textColor)` |
| Button focus-visible | `outline: 2px solid var(--selectColor2)` | `var(--textColor)` |
| Container disabled | opacity 0.5 | — |
| Button disabled | `cursor: not-allowed` | no hover effect |

### Typography

No text — icon-only. Icons use Font Awesome solid set at 11px.

| Mode | Icon Class | Visual |
|---|---|---|
| Grid (wrap) | `fa-solid fa-grip` | 2×2 dot grid |
| List (column) | `fa-solid fa-list` | stacked horizontal lines |
| Miller (miller) | `fa-solid fa-table-columns` | vertical columns |

---

## HTML Structure

### Current (to be replaced)

```html
<div class="view-mode-container" style="display: flex; align-items: center; gap: 8px; background-color: var(--secondaryColor); border: 1px solid var(--tertiaryColor); border-radius: 10px; padding: 0 10px; height: 35px;">
    <span class="view-mode-icon-span" style="display: flex; align-items: center; justify-content: center;">
        <i class="fa-solid fa-grip" style="font-size: 12px; color: var(--textColor2);"></i>
    </span>
    <select class="select view-mode-select" onchange="switchView(this.value)" style="height: 100%; padding: 0; font-size: 11px; min-width: 40px; border: none; background: transparent; box-shadow: none;">
        <option value="wrap">Grid</option>
        <option value="column">List</option>
        <option value="miller">Miller</option>
    </select>
</div>
```

### New

```html
<div class="view-mode-group" role="group" aria-label="View mode">
    <button
        class="view-mode-btn active"
        data-view="wrap"
        onclick="switchView('wrap')"
        aria-pressed="true"
        title="Grid view"
    >
        <i class="fa-solid fa-grip"></i>
    </button>
    <button
        class="view-mode-btn"
        data-view="column"
        onclick="switchView('column')"
        aria-pressed="false"
        title="List view"
    >
        <i class="fa-solid fa-list"></i>
    </button>
    <button
        class="view-mode-btn"
        data-view="miller"
        onclick="switchView('miller')"
        aria-pressed="false"
        title="Miller columns view"
    >
        <i class="fa-solid fa-table-columns"></i>
    </button>
</div>
```

---

## CSS Classes

All inline styles move to these classes. Add to `style.css`.

```css
/* =============================================
   ViewMode Segmented Control
   ============================================= */

.view-mode-group {
    display: flex;
    align-items: center;
    background-color: var(--secondaryColor);
    border: 1px solid var(--tertiaryColor);
    border-radius: 8px;
    padding: 3px;
    height: 32px;
    gap: 1px;
}

.view-mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--textColor2);
    cursor: pointer;
    transition: background-color 0.1s ease-out, color 0.1s ease-out;
    padding: 0;
    font-size: 11px;
}

.view-mode-btn:hover {
    background-color: var(--transparentColor);
    color: var(--textColor);
}

.view-mode-btn:active {
    background-color: var(--transparentColorActive);
}

.view-mode-btn.active {
    background-color: var(--transparentColorActive);
    color: var(--textColor);
}

.view-mode-btn:focus-visible {
    outline: 2px solid var(--selectColor2);
    outline-offset: -1px;
}

.view-mode-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
}

.view-mode-btn:disabled:hover {
    background: transparent;
    color: var(--textColor2);
}

/* Disabled state for the container (dual-pane mode) */
.view-mode-group.disabled {
    opacity: 0.5;
    pointer-events: none;
}
```

---

## Interaction States

### Default
- Container: `--secondaryColor` bg, `--tertiaryColor` border
- Active button: `--transparentColorActive` bg, `--textColor` icon (white)
- Inactive buttons: transparent bg, `--textColor2` icon (60% white)

### Hover (on inactive button)
- Background fades to `--transparentColor` (10% black)
- Icon brightens to `--textColor` (full white)
- 100ms ease-out transition

### Active / Selected
- Background: `--transparentColorActive` (25% black)
- Icon: `--textColor` (full white)
- Stays visually "pressed in"

### Click (on already-active button)
- No-op — already selected, no visual change

### Disabled (dual-pane mode)
- Entire container opacity 0.5
- `pointer-events: none` on container (blocks all interaction)
- No hover effects

### Focus (keyboard navigation)
- 2px solid outline in `--selectColor2` (blue accent)
- Outline offset -1px (inside the button)
- Only visible on `:focus-visible` (keyboard only, not mouse click)

---

## JS Integration

### Changes to `switchView()` in `main_logic.js`

Replace the select/icon-span update logic with button active-state toggling:

```js
async function switchView(newMode = null) {
  if (IsDualPaneEnabled == false) {
    if (newMode) {
      ViewMode = newMode;
    } else {
      if (ViewMode == "wrap") ViewMode = "column";
      else if (ViewMode == "column") ViewMode = "miller";
      else ViewMode = "wrap";
    }

    // Update segmented control active state
    document.querySelectorAll(".view-mode-btn").forEach((btn) => {
      const isActive = btn.dataset.view === ViewMode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    // ... rest of existing view-switching logic unchanged ...
  }
}
```

### Changes to `switchToDualPane()` / dual-pane disable

```js
// Disable
document.querySelector(".view-mode-group").classList.add("disabled");
// Re-enable
document.querySelector(".view-mode-group").classList.remove("disabled");
```

Remove these lines:
```js
// DELETE: document.querySelector(".view-mode-select").disabled = true;
// DELETE: document.querySelector(".view-mode-container").style.opacity = "0.5";
// DELETE: document.querySelector(".view-mode-select").disabled = false;
// DELETE: document.querySelector(".view-mode-container").style.opacity = "1";
```

### Selectors to update in `main_logic.js`

| Old Selector | New Selector | Notes |
|---|---|---|
| `.view-mode-container` | `.view-mode-group` | Container class rename |
| `.view-mode-select` | `.view-mode-btn` | No more select element |
| `.view-mode-icon-span` | *(removed)* | No longer needed — icons live in buttons |

### Cleanup

Remove from JS:
- All `.view-mode-icon-span` innerHTML assignments (lines ~3492-3499)
- All `.view-mode-select` value/property access (lines ~3489-3491)
- Inline style opacity toggling on `.view-mode-container`

---

## Accessibility

### ARIA Attributes

| Attribute | Element | Value |
|---|---|---|
| `role="group"` | `.view-mode-group` | Identifies as a button group |
| `aria-label` | `.view-mode-group` | `"View mode"` |
| `aria-pressed` | `.view-mode-btn` | `"true"` on active, `"false"` on others |
| `title` | `.view-mode-btn` | `"Grid view"`, `"List view"`, `"Miller columns view"` |

### Keyboard Navigation

| Key | Behavior |
|---|---|
| `Tab` | Focus enters the group on the active button |
| `Arrow Left` | Move focus to previous button in group |
| `Arrow Right` | Move focus to next button in group |
| `Enter` / `Space` | Activate the focused button |
| `Home` | Focus first button (Grid) |
| `End` | Focus last button (Miller) |

Arrow key navigation within the group requires a small JS handler (roving tabindex pattern):

```js
document.querySelector(".view-mode-group").addEventListener("keydown", (e) => {
  const buttons = [...document.querySelectorAll(".view-mode-btn")];
  const current = document.activeElement;
  const index = buttons.indexOf(current);
  if (index === -1) return;

  let next;
  if (e.key === "ArrowRight") next = buttons[(index + 1) % buttons.length];
  else if (e.key === "ArrowLeft") next = buttons[(index - 1 + buttons.length) % buttons.length];
  else if (e.key === "Home") next = buttons[0];
  else if (e.key === "End") next = buttons[buttons.length - 1];
  else return;

  e.preventDefault();
  next.focus();
});
```

Roving tabindex: only the active button has `tabindex="0"`, others get `tabindex="-1"`. Updated when active state changes.

### Screen Reader

- Button group announced as "View mode, group"
- Each button announced as "Grid view, toggle button, pressed" / "not pressed"
- Disabled state announced as "dimmed" or "unavailable"

---

## Implementation Checklist

- [ ] Add `.view-mode-group` and `.view-mode-btn` CSS to `style.css`
- [ ] Replace HTML in `index.html` (lines 79-88)
- [ ] Update `switchView()` in `main_logic.js` — button active-state logic
- [ ] Update `switchToDualPane()` — use `.disabled` class instead of inline opacity
- [ ] Update `switchFromDualPane()` (if exists) — remove `.disabled` class
- [ ] Add roving tabindex keyboard handler
- [ ] Remove dead selectors (`.view-mode-select`, `.view-mode-icon-span`, `.view-mode-container`)
- [ ] Test: click each mode, verify view switches
- [ ] Test: keyboard navigation (Tab, arrows, Enter)
- [ ] Test: dual-pane disable/enable
- [ ] Test: screen reader output
- [ ] Test: focus-visible outline appears on keyboard nav only

---

## Visual Reference

```
 HEADER BAR
┌─────────────────────────────────────────────────────────────────────┐
│  ← | 🏠  👁  ⬜  ⚙     [🔍 Search...]  [⋮⋮ ≡ \|\|]  ─ □ ✕     │
│                                      ↑                             │
│                              view-mode-group                       │
└─────────────────────────────────────────────────────────────────────┘

 State: Grid selected          State: List selected         State: Miller selected
┌───────────────────┐         ┌───────────────────┐       ┌───────────────────┐
│ ▓▓▓ │ ░░ │ ░░ │  │         │ ░░ │ ▓▓▓ │ ░░ │  │       │ ░░ │ ░░ │ ▓▓▓ │  │
└───────────────────┘         └───────────────────┘       └───────────────────┘
  ▲active                      ▲active                     ▲active
  white icon                   white icon                  white icon
  dark bg                      dark bg                     dark bg

 Disabled (dual-pane):
 ┌───────────────────┐
 │ ░░ │ ░░ │ ░░ │   │   opacity: 0.5, no interaction
 └───────────────────┘
```
