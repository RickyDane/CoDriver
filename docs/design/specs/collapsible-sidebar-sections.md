# Design Spec: Collapsible Sidebar Sections

## Overview

Make the FAVORITES and Disks sections in the sidebar collapsible/expandable with smooth animation. Both sections default to expanded. State persists via localStorage.

---

## 1. HTML Structure Pattern

### Current Structure (flat)
```
.site-nav-bar
  ├── button.site-nav-bar-button  (Desktop)
  ├── button.site-nav-bar-button  (Downloads)
  ├── ...
  ├── div.horizontal-seperator    ← FAVORITES separator
  ├── p.site-nav-bar-title        ← "FAVORITES"
  ├── button.site-nav-bar-button  (fav item 1)
  ├── button.site-nav-bar-button  (fav item 2)
  ├── div.horizontal-seperator    ← Disks separator
  ├── button.site-nav-bar-button  ← "Disks" button
  ├── div.horizontal-seperator
  └── div.disk-container          ← disk items
```

### New Structure (wrapped sections)
```
.site-nav-bar
  ├── button.site-nav-bar-button  (Desktop)
  ├── button.site-nav-bar-button  (Downloads)
  ├── ...
  │
  ├── div.collapse-section[data-section="favorites"]
  │   ├── button.collapse-header  ← clickable header
  │   │   ├── div.collapse-header-left
  │   │   │   ├── i.fa-solid.fa-star (10px, #ffca28)
  │   │   │   └── span "FAVORITES"
  │   │   └── i.fa-solid.fa-chevron-down.collapse-chevron
  │   └── div.collapse-content
  │       ├── button.site-nav-bar-button  (fav item 1)
  │       ├── button.site-nav-bar-button  (fav item 2)
  │       └── ...
  │
  └── div.collapse-section[data-section="disks"]
      ├── button.collapse-header  ← clickable header
      │   ├── div.collapse-header-left
      │   │   ├── i.fa-solid.fa-hard-drive
      │   │   └── span "Disks"
      │   └── i.fa-solid.fa-chevron-down.collapse-chevron
      └── div.collapse-content
          ├── div.disk-container
          │   ├── button.site-nav-bar-button.disk-site-nav-button
          │   └── ...
          └── (no extra separator needed)
```

---

## 2. CSS Classes and Styles

```css
/* =============================================
   Collapsible Sidebar Sections
   ============================================= */

.collapse-section {
    width: 100%;
    display: flex;
    flex-flow: column;
    align-items: center;
}

/* Header — acts as separator + title + toggle */
.collapse-header {
    width: 100%;
    height: 32px;
    min-height: 32px;
    display: flex;
    flex-flow: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
    background-color: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: var(--textColor2);
    font-size: 10px;
    font-weight: bold !important;
    letter-spacing: 1px;
    transition: background-color 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
}

.collapse-header:hover {
    background-color: var(--selectColor3);
    color: var(--textColor);
}

.collapse-header:focus-visible {
    outline: 2px solid var(--selectColor2);
    outline-offset: 2px;
    background-color: var(--selectColor3);
}

.collapse-header-left {
    display: flex;
    flex-flow: row;
    align-items: center;
    gap: 6px;
    pointer-events: none;
}

.collapse-header-left > i {
    font-size: 10px;
    color: var(--textColor2);
}

/* Chevron rotation */
.collapse-chevron {
    font-size: 9px;
    color: var(--textColor2);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
}

/* Collapsed state — chevron rotates up */
.collapse-section.collapsed .collapse-chevron {
    transform: rotate(-90deg);
}

/* Content wrapper — animates max-height */
.collapse-content {
    width: 100%;
    display: flex;
    flex-flow: column;
    align-items: center;
    overflow: hidden;
    max-height: 1000px; /* expanded default — JS sets real value */
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.2s ease;
    opacity: 1;
}

/* Collapsed content */
.collapse-section.collapsed .collapse-content {
    max-height: 0 !important;
    opacity: 0;
}

/* Separator line inside collapse section (above header) */
.collapse-section + .collapse-section,
.collapse-section:first-of-type {
    margin-top: 4px;
}

/* Remove top margin from first collapse section if quick-access buttons precede it */
.collapse-section:first-of-type {
    margin-top: 0;
}

/* Horizontal separator rendered by collapse-header acts as visual divider */
/* Add a subtle top border to the header for section separation */
.collapse-section {
    border-top: 1px solid var(--tertiaryColor);
    padding-top: 4px;
}
```

---

## 3. JS Logic Approach

### Toggle Function

```js
function toggleCollapseSection(sectionEl) {
    const sectionKey = sectionEl.dataset.section;
    const content = sectionEl.querySelector(".collapse-content");
    const isCollapsed = sectionEl.classList.contains("collapsed");

    if (isCollapsed) {
        // EXPAND
        sectionEl.classList.remove("collapsed");
        // Set max-height to actual scroll height for smooth animation
        content.style.maxHeight = content.scrollHeight + "px";
        // After transition ends, set to none so content can grow dynamically
        content.addEventListener("transitionend", function handler() {
            if (!sectionEl.classList.contains("collapsed")) {
                content.style.maxHeight = "none";
            }
            content.removeEventListener("transitionend", handler);
        });
    } else {
        // COLLAPSE
        // First, set explicit max-height from current height (needed for animation)
        content.style.maxHeight = content.scrollHeight + "px";
        // Force reflow so browser registers the value
        content.offsetHeight; // eslint-disable-line no-unused-expressions
        // Then animate to 0
        sectionEl.classList.add("collapsed");
    }

    // Persist state
    localStorage.setItem("sidebar-section-" + sectionKey, isCollapsed ? "expanded" : "collapsed");
}
```

### Restore State on Init

```js
function restoreCollapseState(sectionEl) {
    const sectionKey = sectionEl.dataset.section;
    const saved = localStorage.getItem("sidebar-section-" + sectionKey);

    if (saved === "collapsed") {
        const content = sectionEl.querySelector(".collapse-content");
        sectionEl.classList.add("collapsed");
        content.style.maxHeight = "0";
    }
    // Default: expanded (no action needed)
}
```

### Building Sections in `insertSiteNavButtons()`

Replace the current flat favorites/disks code with wrapped sections. Key insertion pattern:

```js
// === FAVORITES SECTION ===
if (ArrFavorites.length > 0) {
    const favSection = document.createElement("div");
    favSection.className = "collapse-section";
    favSection.dataset.section = "favorites";

    const favHeader = document.createElement("button");
    favHeader.className = "collapse-header";
    favHeader.innerHTML = `
        <div class="collapse-header-left">
            <i class="fa-solid fa-star" style="color: #ffca28;"></i>
            <span>FAVORITES</span>
        </div>
        <i class="fa-solid fa-chevron-down collapse-chevron"></i>
    `;
    favHeader.setAttribute("aria-expanded", "true");
    favHeader.setAttribute("aria-controls", "favorites-content");
    favHeader.onclick = () => toggleCollapseSection(favSection);

    const favContent = document.createElement("div");
    favContent.className = "collapse-content";
    favContent.id = "favorites-content";
    favContent.setAttribute("role", "region");

    // ... append favorite buttons to favContent ...

    favSection.append(favHeader);
    favSection.append(favContent);
    document.querySelector(".site-nav-bar").append(favSection);

    // Restore persisted state
    restoreCollapseState(favSection);
}
```

Same pattern for Disks section.

---

## 4. Specific Design Values

| Property | Value | Rationale |
|---|---|---|
| Header height | `32px` | Slightly shorter than nav buttons (35px) to differentiate |
| Header border-radius | `8px` | Subtle, matches sidebar aesthetic |
| Header font | `10px bold, letter-spacing 1px` | Matches existing `.site-nav-bar-title` exactly |
| Header color | `var(--textColor2)` default, `var(--textColor)` on hover | Consistent with existing secondary text pattern |
| Header padding | `0 10px` | Matches nav button horizontal padding |
| Chevron icon | `fa-solid fa-chevron-down`, `9px` | Small, unobtrusive |
| Chevron rotation | `-90deg` when collapsed | Points right when collapsed, down when expanded |
| Transition timing | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` for max-height | Material standard easing — snappy feel |
| Opacity transition | `0.2s ease` | Slightly faster than height for layered effect |
| Hover background | `var(--selectColor3)` | Same as nav button hover |
| Section separator | `1px solid var(--tertiaryColor)` top border on `.collapse-section` | Replaces standalone `.horizontal-separator` divs |
| Star icon | `10px, #ffca28` | Same as existing favorites star |
| Hard drive icon | `10px, var(--textColor2)` | Matches existing disk icon style |
| localStorage keys | `sidebar-section-favorites`, `sidebar-section-disks` | Namespaced, descriptive |

---

## 5. Accessibility Considerations

### ARIA Attributes
- `aria-expanded="true|false"` on each `.collapse-header` button
- `aria-controls="section-content-id"` pointing to the content container
- `role="region"` on `.collapse-content` with `aria-label`

### Keyboard Navigation
- Section headers are `<button>` elements — natively focusable and keyboard-activatable
- `Tab` moves between quick-access buttons → section headers → collapsed content (if expanded)
- `Enter` / `Space` toggles collapse
- `:focus-visible` outline: `2px solid var(--selectColor2)` with `2px offset`

### Screen Reader Support
- Announce "FAVORITES section, collapsed/expanded" on toggle
- Chevron icon has `aria-hidden="true"` (decorative)
- Header left icons have `aria-hidden="true"` (decorative, text conveys meaning)

### Interaction States
| State | Visual |
|---|---|
| Default | `color: var(--textColor2)`, transparent bg |
| Hover | `color: var(--textColor)`, `bg: var(--selectColor3)` |
| Focus visible | 2px blue outline + hover bg |
| Active/pressed | Slightly darker (existing `0.2s ease` transition handles it) |

---

## 6. Edge Cases

### Empty FAVORITES
- If `ArrFavorites.length === 0`, no favorites section renders at all (current behavior preserved)

### No Disks
- Disks section always renders (button always exists), but disk items inside collapse-content may be empty

### Dynamic Content in Favorites
- When favorites are added/removed, `insertSiteNavButtons()` rebuilds the sidebar entirely
- After rebuild, `restoreCollapseState()` re-applies collapsed state from localStorage
- The `max-height: none` trick handles dynamic content after expand

### Disk Items Added Dynamically
- Same rebuild pattern — section state persists across rebuilds

### Sidebar Collapse/Expand (existing 175px width animation)
- The existing sidebar width transition (`0.4s cubic-bezier`) doesn't affect internal sections
- Sections adapt naturally since they use `width: 100%`

---

## 7. Implementation Summary

### Files to Modify

1. **`ui/style.css`** — Add the `.collapse-section`, `.collapse-header`, `.collapse-content`, `.collapse-chevron` CSS block (place after `.site-nav-bar-title` rules, around line 1551)

2. **`ui/main_logic.js`** — Modify `insertSiteNavButtons()` (line 4555):
   - Add `toggleCollapseSection()` and `restoreCollapseState()` functions
   - Wrap favorites block (lines 4636-4681) in a `.collapse-section[data-section="favorites"]`
   - Wrap disks block (lines 4684-4739) in a `.collapse-section[data-section="disks"]`
   - Remove standalone `.horizontal-separator` divs between sections (borders handle separation)
   - Remove standalone `.site-nav-bar-title` (header replaces it)
   - Remove standalone "Disks" button (header replaces it)
   - Call `restoreCollapseState()` after building each section

### What Gets Removed
- The standalone `<div class="horizontal-seperator">` between favorites and disks (section `border-top` replaces it)
- The standalone `<p class="site-nav-bar-title">FAVORITES</p>` (collapse header replaces it)
- The standalone "Disks" `<button>` (collapse header replaces it)
- The `<div class="horizontal-seperator">` before disk items (collapse header provides separation)

### What Stays Unchanged
- All existing `.site-nav-bar-button` styles and behavior
- `.disk-container` styles
- `.disk-site-nav-button` styles
- Quick access buttons (not collapsible)
- The `.site-nav-bar-title` CSS rule can remain for backwards compatibility or be removed
