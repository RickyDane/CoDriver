# Plan: Popup Glassmorphism Visual Overhaul

## Summary
Restyle every popup/modal/dialog in CoDriver to match the modern glassmorphism aesthetic already established by the context menu (`.context-menu` / `.custom-context-menu`). All changes are CSS-only in `ui/style.css` — no HTML structure or JS changes needed.

## Goals
- Unified glassmorphism look across all 21 popup types
- Shared base styles to reduce duplication and ensure consistency
- All text remains readable (WCAG contrast on dark glass)
- Hover/active/focus states for interactive elements inside popups
- Preserve existing responsive behavior and functionality

## Non-Goals
- Changing HTML structure or JS logic
- Adding new popup types
- Refactoring popup creation code
- Changing the color scheme or CSS variable values

## Assumptions
- `backdrop-filter` is supported in Tauri's WebView (Chromium-based) — confirmed by existing usage
- CSS `color-mix()` is available — confirmed by existing context menu usage
- No CSS preprocessor — vanilla CSS only
- The `--primaryColor`, `--tertiaryColor`, `--textColor` variables remain unchanged

## Open Questions
None — scope is clear.

## Dependencies
None — single-file CSS change.

## Execution Phases

### Phase 1: Establish Glassmorphism Design Tokens
**Owner:** software-engineer
**Output:** CSS custom properties block at top of popup section
**Acceptance Criteria:** Reusable variables defined for glass background, glass border, glass shadow, glass blur.

**New CSS variables to add under `:root`:**
```css
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

---

### Phase 2: Restyle Base Popup Classes
**Owner:** software-engineer
**Output:** Updated `.popup-background`, `.uni-popup`, `.popup-header`, `.popup-body`, `.popup-controls`, `.popup-close-button`
**Acceptance Criteria:** All base popup classes use glassmorphism; consistent with context menu aesthetic.

**Specific changes:**

#### `.popup-background` (line 3003)
```css
.popup-background {
    /* existing: keep display/position/size */
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px) saturate(1.2);
    -webkit-backdrop-filter: blur(8px) saturate(1.2);
    /* rest unchanged */
}
```

#### `.uni-popup` (line 2391)
```css
.uni-popup {
    /* keep existing positioning */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
    z-index: 98 !important;
}
```

#### `.popup-header` (line 2553)
```css
.popup-header {
    background-color: var(--glass-header-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: var(--glass-border-subtle);
    /* keep existing flex/layout */
}
```

#### `.popup-body` (line 2571)
```css
.popup-body {
    padding: 10px;
    border-top: none; /* remove hard line, glass handles it */
    color: var(--textColor);
}
```

#### `.popup-controls` (line 2577)
```css
.popup-controls {
    /* keep existing layout */
    border-top: var(--glass-border-subtle);
    background-color: color-mix(in srgb, var(--primaryColor) 60%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}
```

#### `.popup-close-button` (line 2532)
```css
.popup-close-button {
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(in srgb, var(--tertiaryColor) 60%, transparent);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: var(--fontSize);
    transition: background-color 0.15s ease;
}
.popup-close-button:hover {
    background-color: var(--transparentColor);
}
.popup-close-button:active {
    background-color: var(--transparentColorActive);
}
```

---

### Phase 3: Restyle Input/Dialog Popups
**Owner:** software-engineer
**Output:** Updated `.input-dialog`, `.input-popup`, `.loading-popup`
**Acceptance Criteria:** Glassmorphism applied; text inputs inside remain usable.

#### `.input-dialog` (line 2298)
```css
.input-dialog {
    /* keep positioning */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
    /* remove old box-shadow and border */
}
```

#### `.input-popup` (line 2370)
Same glass treatment as `.input-dialog`.

#### `.loading-popup` (line 2341)
```css
.loading-popup {
    /* keep positioning */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
}
```

---

### Phase 4: Restyle Content-Specific Popups
**Owner:** software-engineer
**Output:** Updated `.compression-popup`, `.item-preview-popup`, `.item-properties-popup`, `.multi-rename-popup`, `.find-duplicates-popup`, `.yt-download-popup`, `.llm-prompt-input-popup`, `.confirm-popup`, `.destination-conflict-popup`
**Acceptance Criteria:** Each popup inherits glass base + has any popup-specific overrides.

These all extend `.uni-popup`, so most get the glass treatment from Phase 2 for free. Only popup-specific overrides need updating:

#### `.item-preview-popup` (line 2429)
```css
.item-preview-popup {
    /* keep positioning */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
    /* remove old background-color: var(--transparentColorActive) */
}
```

#### `.destination-conflict-popup` (line 2884)
Cards inside need glass treatment:
```css
.destination-conflict-card {
    background: color-mix(in srgb, var(--secondaryColor) 80%, transparent);
    border: var(--glass-border-subtle);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}
.destination-conflict-options label {
    background: color-mix(in srgb, var(--secondaryColor) 80%, transparent);
    border: var(--glass-border-subtle);
}
```

#### `.search-full-container` (line 1857)
Already has `.uni-popup` class — inherits glass. Update header:
```css
.search-full-container-header {
    background-color: var(--glass-header-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: var(--glass-border-subtle);
}
```

---

### Phase 5: Restyle Settings Panel
**Owner:** software-engineer
**Output:** Updated `.settings-ui`, `.settings-ui-header`, `.settings-sidebar`, `.settings-content`
**Acceptance Criteria:** Settings panel matches glassmorphism aesthetic.

#### `.settings-ui` (line 685)
```css
.settings-ui {
    /* keep positioning/sizing */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
}
```

#### `.settings-ui-header` (line 716)
```css
.settings-ui-header {
    background-color: var(--glass-header-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: var(--glass-border-subtle);
}
```

#### `.settings-sidebar` (line 730)
```css
.settings-sidebar {
    background-color: color-mix(in srgb, var(--secondaryColor) 60%, transparent);
    border-right: var(--glass-border-subtle);
}
```

#### `.settings-ui .popup-controls` (line 810)
```css
.settings-ui .popup-controls {
    background-color: var(--glass-header-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: var(--glass-border-subtle);
}
```

---

### Phase 6: Restyle Progress Bar & Supporting Elements
**Owner:** software-engineer
**Output:** Updated `.progress-bar-container-popup`, `.search-bar-container`, `.ftp-connect-container`
**Acceptance Criteria:** All overlay elements match the glass aesthetic.

#### `.progress-bar-container-popup` (line 2790)
```css
.progress-bar-container-popup {
    /* keep existing layout/sizing */
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
}
```

#### `.ftp-connect-container` (line 991)
Already has `.uni-popup` class — inherits glass from Phase 2.

#### `.search-bar-container` (line 1791)
```css
.search-bar-container {
    background-color: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    border-radius: var(--glass-radius);
    box-shadow: var(--glass-shadow);
}
```

---

### Phase 7: Buttons & Interactive Elements Inside Popups
**Owner:** software-engineer
**Output:** Updated button styles, input styles, select styles inside popups
**Acceptance Criteria:** All interactive elements inside popups have glass-consistent styling and clear hover/active/focus states.

**Scoped overrides for popup children:**
```css
/* Buttons inside popups */
.uni-popup .button,
.uni-popup .button-invert,
.settings-ui .button {
    background-color: color-mix(in srgb, var(--tertiaryColor) 60%, transparent);
    border: var(--glass-border-subtle);
    backdrop-filter: blur(4px);
    transition: background-color 0.15s ease, transform 0.1s ease;
}
.uni-popup .button:hover,
.uni-popup .button-invert:hover,
.settings-ui .button:hover {
    background-color: var(--transparentColor);
}
.uni-popup .button:active,
.uni-popup .button-invert:active,
.settings-ui .button:active {
    background-color: var(--transparentColorActive);
    transform: scale(0.97);
}

/* Text inputs inside popups */
.uni-popup .text-input,
.uni-popup .number-input,
.settings-ui .text-input {
    background-color: color-mix(in srgb, var(--secondaryColor) 70%, transparent);
    border: var(--glass-border-subtle);
    backdrop-filter: blur(4px);
}
.uni-popup .text-input:focus,
.uni-popup .number-input:focus,
.settings-ui .text-input:focus {
    background-color: color-mix(in srgb, var(--tertiaryColor) 70%, transparent);
    border-color: var(--selectColor2);
}

/* Select dropdowns inside popups */
.uni-popup .select,
.settings-ui .select {
    background-color: color-mix(in srgb, var(--secondaryColor) 70%, transparent);
    border: var(--glass-border-subtle);
}
```

---

### Phase 8: Final Polish & Edge Cases
**Owner:** software-engineer
**Output:** Animation adjustments, reduced-motion support, scrollbar styling inside popups
**Acceptance Criteria:** No visual regressions; reduced-motion respected; scrollbars styled.

```css
/* Reduced motion fallback for popups */
@media (prefers-reduced-motion: reduce) {
    .uni-popup,
    .settings-ui,
    .popup-background {
        transition: none !important;
        animation: none !important;
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
1. Open each popup type in the running app
2. Verify glassmorphism appearance (blur visible, semi-transparent, correct border/shadow)
3. Verify text readability on all backgrounds
4. Test hover/active states on buttons, inputs, selects inside popups
5. Test keyboard focus outlines still visible
6. Test with `prefers-reduced-motion` enabled
7. Test responsive behavior (resize window, check settings panel, conflict popup)
8. Test dark theme (default) and any other themes
9. Verify no z-index regressions (popups above content, background below popups)

## Rollback Plan
All changes are in a single file: `ui/style.css`. Git revert of the commit is the rollback path. No database, config, or JS changes to unwind.
