# Plan: Complete Visual Overhaul of All Popups

## Summary
Restyle every popup/modal/dialog in CoDriver to match the modern glassmorphism aesthetic established by `.custom-context-menu`. Add entrance/exit animations, layered shadows, improved typography, and better button styling. Changes touch `ui/style.css` (primary) and `ui/main_logic.js` (minimal — animation class toggling only).

## Goals
- All popups match context menu's glassmorphism: semi-transparent glass bg, blur, layered shadows, subtle borders
- Entrance animations: scale(0.95) + fade-in, ~200ms, smooth easing
- Exit animations: scale(0.97) + fade-out, ~150ms, then DOM removal
- Stronger backdrop blur on `.popup-background` (8px → 12px)
- Typography hierarchy: headers use `font-weight: 700`, proper sizing, subtle letter-spacing
- Better button styling in `.popup-controls`: glass-consistent, clear hover/active states
- Border-radius consistency: 12px everywhere (matching context menu)
- All CSS variables respected — works with every theme
- Preserve all existing functionality

## Non-Goals
- Changing HTML structure of existing popups
- Adding new popup types
- Refactoring popup creation logic
- Changing CSS variable values or color scheme
- Touching popup z-index hierarchy

## Assumptions
- `backdrop-filter` works in Tauri WebView (Chromium) — confirmed by existing usage
- `color-mix()` available — confirmed by context menu usage
- No CSS preprocessor — vanilla CSS only
- `--primaryColor`, `--tertiaryColor`, `--textColor` etc. remain unchanged
- jQuery available for `fadeOut()` (already used by `.item-preview-popup`)

## Open Questions
None — scope is clear and self-contained.

## Dependencies
- Single file for CSS: `ui/style.css`
- Single file for JS: `ui/main_logic.js` (animation class toggling only)
- No backend/Rust changes needed

## Execution Phases

### Phase 1: CSS Design Tokens & Keyframes
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** New CSS variables under `:root`, new `@keyframes` for popup animations
**Acceptance Criteria:** Glass tokens defined, animation keyframes exist, no visual change yet.

**Add under `:root` (after line 50):**
```css
/* Popup glassmorphism tokens */
--glass-bg: color-mix(in srgb, var(--primaryColor) 85%, transparent);
--glass-border: 1px solid color-mix(in srgb, var(--tertiaryColor) 50%, transparent);
--glass-blur: blur(24px) saturate(1.4);
--glass-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
--glass-radius: 12px;
--glass-header-bg: color-mix(in srgb, var(--secondaryColor) 80%, transparent);
--glass-border-subtle: 1px solid color-mix(in srgb, var(--tertiaryColor) 35%, transparent);
```

**Add keyframes (near existing `@keyframes` block ~line 650):**
```css
@keyframes popupIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(8px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes popupOut {
    from {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    to {
        opacity: 0;
        transform: scale(0.97) translateY(-4px);
    }
}
```

---

### Phase 2: Base Popup Classes (Glass + Animation)
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Updated `.popup-background`, `.uni-popup`, `.popup-header`, `.popup-body`, `.popup-controls`, `.popup-close-button`
**Acceptance Criteria:** All base classes use glass tokens, entrance animation applied via `.popup-enter`, exit via `.popup-exit`.

**`.popup-background` (line 2998):**
- `background-color: rgba(0, 0, 0, 0.45)` (stronger overlay)
- `backdrop-filter: blur(12px) saturate(1.2)` (up from 2px)

**`.uni-popup` (line 2386):**
- `background-color: var(--glass-bg)`
- `backdrop-filter: var(--glass-blur)`
- `border: var(--glass-border)`
- `border-radius: var(--glass-radius)`
- `box-shadow: var(--glass-shadow)`

**`.popup-header` (line 2548):**
- `background-color: var(--glass-header-bg)`
- `backdrop-filter: blur(12px)`
- `border-bottom: var(--glass-border-subtle)`
- `padding: 12px 16px` (slightly more breathing room)
- `h3` → `font-weight: 700`, `font-size: 0.95em`, `letter-spacing: -0.01em`

**`.popup-body` (line 2566):**
- Remove `border-top: 1px solid var(--tertiaryColor)` (glass handles separation)

**`.popup-controls` (line 2572):**
- `border-top: var(--glass-border-subtle)`
- `background-color: color-mix(in srgb, var(--primaryColor) 60%, transparent)`
- `backdrop-filter: blur(8px)`
- `padding: 10px 14px`

**`.popup-close-button` (line 2527):**
- `background-color: color-mix(in srgb, var(--tertiaryColor) 60%, transparent)`
- `transition: background-color 0.15s ease`

**New animation utility classes:**
```css
.popup-enter {
    animation: popupIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.popup-exit {
    animation: popupOut 0.15s ease-in forwards;
    pointer-events: none;
}
```

---

### Phase 3: Input/Dialog Popups
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Updated `.input-dialog`, `.input-popup`, `.loading-popup`
**Acceptance Criteria:** Glass treatment applied, text inputs remain usable and readable.

**`.input-dialog` (line 2293):**
- Apply glass: bg, blur, border, radius, shadow
- Remove old `box-shadow: 0px 0px 10px 1px rgba(0, 0, 0, 0.2)`

**`.input-popup` (line 2365):**
- Same glass treatment as `.input-dialog`

**`.loading-popup` (line 2336):**
- Apply glass tokens
- Inner `h4` background: `color-mix(in srgb, var(--secondaryColor) 80%, transparent)`

---

### Phase 4: Content-Specific Popups
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Updated all content-specific popup classes
**Acceptance Criteria:** Each popup inherits glass base + has popup-specific overrides consistent with glass aesthetic.

All these extend `.uni-popup`, so they inherit glass from Phase 2. Only specific overrides:

**`.item-preview-popup` (line 2424):**
- Apply glass tokens (currently uses `var(--transparentColorActive)` as bg)
- Keep `backdrop-filter: blur(5px)` → upgrade to `var(--glass-blur)`

**`.item-properties-popup` (line 2480):**
- Inherits from `.uni-popup` — no extra glass needed

**`.multi-rename-popup` (line 2401):**
- Inherits from `.uni-popup` — no extra glass needed
- `.multi-rename-popup-header` → glass header bg

**`.confirm-popup` (line 2864):**
- Inherits from `.uni-popup` — no extra glass needed

**`.destination-conflict-popup` (line 2879):**
- Inherits from `.uni-popup` — no extra glass needed
- `.destination-conflict-card` → `background: color-mix(in srgb, var(--secondaryColor) 80%, transparent)`
- `.destination-conflict-options label` → glass-consistent bg

**`.find-duplicates-popup` (line 2608):**
- Inherits from `.uni-popup` — no extra glass needed

**`.yt-download-popup` (line 2638):**
- Inherits from `.uni-popup` — no extra glass needed

**`.llm-prompt-input-popup` (line 2644):**
- Inherits from `.uni-popup` — no extra glass needed

**`.compression-popup` (line 2417):**
- Inherits from `.uni-popup` — no extra glass needed

---

### Phase 5: Settings Panel & Progress Bar
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Updated `.settings-ui`, `.settings-ui-header`, `.settings-sidebar`, `.progress-bar-container-popup`
**Acceptance Criteria:** Settings panel and progress bar match glass aesthetic.

**`.settings-ui` (line 684):**
- `background-color: var(--glass-bg)`
- `backdrop-filter: var(--glass-blur)`
- `border: var(--glass-border)`
- `border-radius: var(--glass-radius)` (12px, was 15px)
- `box-shadow: var(--glass-shadow)`
- Keep existing transition for `.active` toggle

**`.settings-ui-header` (line 715):**
- `background-color: var(--glass-header-bg)`
- `backdrop-filter: blur(12px)`
- `border-bottom: var(--glass-border-subtle)`
- `border-radius: 12px 12px 0 0`

**`.settings-sidebar` (line 729):**
- `background-color: color-mix(in srgb, var(--secondaryColor) 60%, transparent)`
- `border-right: var(--glass-border-subtle)`

**`.progress-bar-container-popup` (line 2785):**
- `background-color: var(--glass-bg)`
- `backdrop-filter: var(--glass-blur)`
- `border: var(--glass-border)`
- `border-radius: var(--glass-radius)`
- `box-shadow: var(--glass-shadow)`

---

### Phase 6: Buttons & Interactive Elements Inside Popups
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Scoped overrides for buttons, inputs, selects inside popups
**Acceptance Criteria:** All interactive elements inside popups have glass-consistent styling.

```css
/* Buttons inside popups */
.uni-popup .icon-button {
    background-color: color-mix(in srgb, var(--secondaryColor) 80%, transparent);
    border: var(--glass-border-subtle);
    transition: background-color 0.15s ease, transform 0.1s ease;
}
.uni-popup .icon-button:hover {
    background-color: var(--transparentColor);
}
.uni-popup .icon-button:active {
    background-color: var(--transparentColorActive);
    transform: scale(0.97);
}

/* Text inputs inside popups */
.uni-popup .text-input,
.uni-popup .number-input {
    background-color: color-mix(in srgb, var(--secondaryColor) 70%, transparent);
    border: var(--glass-border-subtle);
}
.uni-popup .text-input:focus,
.uni-popup .number-input:focus {
    border-color: var(--selectColor2);
}
```

---

### Phase 7: JS Animation Integration
**Owner:** software-engineer
**Files:** `ui/main_logic.js`
**Output:** Add `.popup-enter` on creation, `.popup-exit` before removal
**Acceptance Criteria:** Popups animate in/out; no visual glitching; exit animation completes before DOM removal.

**Pattern for entrance (add after `appendChild`):**
```js
popup.classList.add("popup-enter");
```

**Pattern for exit (replace direct `.remove()`):**
```js
popup.classList.add("popup-exit");
popup.addEventListener("animationend", () => popup.remove(), { once: true });
```

**Functions to modify:**

| Function | Line | Change |
|----------|------|--------|
| `showPopup()` | 4862 | Add `.popup-enter` after appendChild |
| `closeConfirmPopup()` | 4968 | Replace `.remove()` with exit animation |
| `showLoadingPopup()` | 1791 | Add `.popup-enter` after append |
| `closeLoadingPopup()` | 1802 | Replace `.remove()` with exit animation |
| `showInputPopup()` | 1807 | Add `.popup-enter` after append |
| `closeInputPopup()` | 1832 | Replace `.remove()` with exit animation |
| `showDestinationConflictPopup()` | 1973 | Add `.popup-enter` after appendChild |
| `close` callback in conflict popup | 2030 | Replace `.remove()` with exit animation |
| `showMultiRenamePopup()` | 3998 | Add `.popup-enter` after append |
| `closeMultiRenamePopup()` | 4118 | Replace `.remove()` with exit animation |
| `showProperties()` | 3826 | Add `.popup-enter` after append |
| `closeInfoProperties()` | 3874 | Replace `.remove()` with exit animation |
| `showItemPreview()` | 3891 | Add `.popup-enter` after append |
| `closeItemPreview()` | 4123 | Already uses fadeOut — keep as-is |
| compression popup | 1616 | Add `.popup-enter` after append |
| `closeCompressPopup()` | 1785 | Replace `.remove()` with exit animation |

**Note:** `.item-preview-popup` already uses jQuery `fadeOut()` — leave unchanged. `.settings-ui` uses CSS class toggle (`.active`) — leave unchanged.

---

### Phase 8: Final Polish
**Owner:** software-engineer
**Files:** `ui/style.css`
**Output:** Reduced-motion support, scrollbar styling inside popups, edge case fixes
**Acceptance Criteria:** No visual regressions; reduced-motion respected; tested across all popup types.

```css
/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
    .uni-popup,
    .settings-ui,
    .popup-background,
    .popup-enter,
    .popup-exit {
        animation: none !important;
        transition: none !important;
    }
}

/* Scrollbar inside popups */
.uni-popup ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
}
.uni-popup ::-webkit-scrollbar-thumb {
    background-color: color-mix(in srgb, var(--tertiaryColor) 60%, transparent);
    border-radius: 4px;
}
```

---

## Validation Plan
1. Open each popup type in running app
2. Verify glassmorphism: blur visible, semi-transparent, correct border/shadow
3. Verify entrance animation plays on open (scale + fade)
4. Verify exit animation plays on close (scale + fade, then removal)
5. Verify text readability on all backgrounds
6. Test hover/active states on buttons inside popups
7. Test keyboard focus outlines still visible
8. Test with `prefers-reduced-motion` enabled
9. Test responsive behavior (resize window)
10. Test dark theme (default) and any other themes
11. Verify no z-index regressions
12. Verify no timing issues (double-click close, rapid open/close)

## Rollback Plan
All changes in two files: `ui/style.css` and `ui/main_logic.js`. Git revert of the commit is the rollback path. No database, config, or backend changes to unwind.
