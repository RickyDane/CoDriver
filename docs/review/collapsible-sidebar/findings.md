# Code Review Findings: Collapsible Sidebar Sections & Compact Favorites

**Reviewer:** Code Reviewer Agent  
**Date:** 2026-05-16  
**Files Reviewed:** `ui/style.css` (lines 1553–1677), `ui/main_logic.js` (lines 4555–4813)

---

## [CS-001] XSS via unsanitized innerHTML in favorite button labels

**Severity:** Critical  
**Location:** `ui/main_logic.js:4708-4709`

### Description
Favorite names are derived from filesystem paths and injected directly into innerHTML without sanitization.

```js
let name = path.split(/[\\\/]/).pop() || path;
button.innerHTML = `<i class="fa-solid fa-star" ...></i> <p>${name}</p>`;
```

A path like `/Users/test/<img src=x onerror=alert(1)>` injects executable HTML. Same pattern exists for disk names at lines 4780 and 5062 (`mount.name`), though `addNewMount` partially mitigates with `.replaceAll('"', "")` — which strips quotes but not HTML tags.

### Impact
In a Tauri desktop app, the blast radius is limited to the user's own filesystem (self-XSS). However, a crafted `.zip` with a malicious folder name extracted to the filesystem, then favorited, could execute arbitrary JS in the app context. This breaks the Tauri security model where the webview should never execute untrusted code.

### Recommendation
Use `textContent` instead of `innerHTML` for the name portion:

```js
const p = document.createElement("p");
p.textContent = name;
// Or: escape HTML entities before interpolation
```

Apply the same fix to disk name injection at lines 4780, 5062.

---

## [CS-002] `restoreCollapseState` sets inline `max-height: 0` — redundant but creates stale inline style

**Severity:** Major  
**Location:** `ui/main_logic.js:4584-4594`

### Description
```js
function restoreCollapseState(sectionEl) {
  // ...
  sectionEl.classList.add("collapsed");
  content.style.maxHeight = "0";   // ← inline style
  header.setAttribute("aria-expanded", "false");
}
```

The CSS `!important` rule (`.collapse-section.collapsed .collapse-content { max-height: 0 !important }`) already enforces `max-height: 0` when the `.collapsed` class is present. The inline `max-height: "0"` is redundant in the collapsed state but **persists as stale state** when expanding.

When `toggleCollapseSection` later expands:
1. Removes `.collapsed` → CSS `!important` no longer applies
2. Inline `max-height: "0"` **is still there** from `restoreCollapseState`
3. `content.style.maxHeight = content.scrollHeight + "px"` overwrites it

Step 3 saves it, but if any code path removes `.collapsed` without going through `toggleCollapseSection`, the inline `0` would clip content.

### Impact
Currently benign because step 3 always runs. But it's a latent bug — fragile coupling between `restoreCollapseState` and `toggleCollapseState`.

### Recommendation
Remove the `content.style.maxHeight = "0"` line from `restoreCollapseState`. The CSS `!important` rule handles collapsed state. If the inline style is needed for the expand animation's starting point, set it at expand-time (which `toggleCollapseSection` already does via `content.scrollHeight`).

---

## [CS-003] `role="region"` without `aria-label` or `aria-labelledby`

**Severity:** Major  
**Location:** `ui/main_logic.js:4701-4702`, `ui/main_logic.js:4766-4767`

### Description
```js
favContent.setAttribute("role", "region");
// No aria-label or aria-labelledby
```

Per WAI-ARIA spec, `role="region"` **must** have an accessible name. Without it, screen readers treat it as a generic group and may skip or misannounce it. The `aria-controls` on the header correctly points to the content ID, but the region itself is unlabeled.

### Impact
Screen reader users cannot identify the purpose of the region landmarks. The `aria-expanded`/`aria-controls` pattern works for the button, but the region itself is invisible as a navigable landmark.

### Recommendation
Add `aria-labelledby` pointing to the header's ID. Generate unique IDs for headers:

```js
favHeader.id = "favorites-header";
favContent.setAttribute("aria-labelledby", "favorites-header");
```

---

## [CS-004] `max-height: 1000px` hardcoded limit clips content on initial load

**Severity:** Major  
**Location:** `ui/style.css:1625`

### Description
```css
.collapse-content {
    max-height: 1000px;  /* ← hard limit */
    transition: max-height 0.3s ..., opacity 0.2s ease;
    opacity: 1;
}
```

On initial page load (no localStorage state), sections are expanded via CSS with `max-height: 1000px`. The `transitionend` handler that sets `max-height: none` only fires after a user-initiated toggle. If content exceeds 1000px (many favorites + many disks), it clips silently.

The JS correctly resolves this after the first toggle-to-expand (sets `max-height: none` on transitionend), but the initial render is CSS-only.

### Impact
Low probability in practice (sidebar rarely exceeds 1000px), but the limit is arbitrary and will silently break for power users with many favorites or mounted volumes.

### Recommendation
After `restoreCollapseState` runs (or after building the DOM), measure `scrollHeight` and set `content.style.maxHeight = content.scrollHeight + "px"`. Or add a one-time post-render adjustment:

```js
// After building collapse sections, ensure expanded sections aren't clipped
sectionEl.querySelectorAll(".collapse-content").forEach(c => {
  if (!sectionEl.classList.contains("collapsed")) {
    c.style.maxHeight = "none";
  }
});
```

---

## [CS-005] `addNewMount` bypasses collapse state awareness

**Severity:** Minor  
**Location:** `ui/main_logic.js:5086`

### Description
```js
document.querySelector(".disk-container").append(diskButton);
```

`addNewMount` appends a new disk button to `.disk-container` (now nested inside `.collapse-content`) without considering:
1. Whether the disk section is collapsed (button added but invisible)
2. Whether the inline `max-height` needs updating to accommodate the new button
3. Whether `scrollHeight` changed and the transition state needs refreshing

### Impact
- If collapsed: new drive appears invisible until user manually expands — **unexpected** for a hot-plug event
- If expanded with `max-height: none`: works fine
- If expanded with `max-height: 1000px` CSS default: new button may be clipped if near the limit

### Recommendation
After appending, if the disk section is expanded, update `max-height`:

```js
document.querySelector(".disk-container").append(diskButton);
const diskSection = document.querySelector('[data-section="disks"]');
if (diskSection && !diskSection.classList.contains("collapsed")) {
  const content = diskSection.querySelector(".collapse-content");
  content.style.maxHeight = content.scrollHeight + "px";
}
```

Or auto-expand the disk section when a new mount is detected (UX decision for Navigator).

---

## [CS-006] Dead cleanup selectors in `insertSiteNavButtons`

**Severity:** Minor  
**Location:** `ui/main_logic.js:4600-4601, 4603`

### Description
```js
$(".site-nav-bar-title").remove();               // ← no longer created
$(".site-nav-bar > .horizontal-seperator").remove(); // ← no longer created
$(".site-nav-bar > .disk-container").remove();   // ← now nested inside .collapse-section
```

These selectors no longer match any elements created by the new code. Titles and separators are replaced by `.collapse-section` borders. The `.disk-container` is now a descendant of `.collapse-section`, not a direct child of `.site-nav-bar`.

Line 4602 (`$(".collapse-section").remove()`) already handles cleanup of all nested content.

### Impact
No functional impact — jQuery silently ignores non-matching selectors. But dead code misleads future maintainers into thinking these elements still exist.

### Recommendation
Remove the three dead selector lines. Keep only:
```js
$(".site-nav-bar-button").remove();
$(".site-nav-bar-button-fav").remove();
$(".collapse-section").remove();
```

---

## [CS-007] `transitionend` handler guard is correct but doesn't handle rapid clicks cleanly

**Severity:** Minor  
**Location:** `ui/main_logic.js:4565-4570`

### Description
```js
content.addEventListener("transitionend", function handler() {
  if (!sectionEl.classList.contains("collapsed")) {
    content.style.maxHeight = "none";
  }
  content.removeEventListener("transitionend", handler);
});
```

If the user rapidly clicks expand → collapse → expand before transitions complete:
1. Expand: handler H1 added
2. Quick collapse: H1 fires on collapse's `transitionend`, guard fails (section is collapsed), H1 self-removes ✓
3. Expand: handler H2 added, fires on expand's `transitionend`, sets `max-height: none` ✓

This is **correct** — the guard prevents stale handlers from causing damage. However, `transitionend` fires for each animated property. The CSS transitions both `max-height` and `opacity`, so `transitionend` fires **twice** per toggle. The handler removes itself on first fire, leaving the second `transitionend` unhandled (benign, but could confuse debugging).

### Impact
No functional impact. The `max-height: none` is set on the first `transitionend` (for `max-height`), which is correct. The second `transitionend` (for `opacity`) is ignored.

### Recommendation
Filter for the specific property in the handler:

```js
content.addEventListener("transitionend", function handler(e) {
  if (e.propertyName !== "max-height") return;
  // ... existing logic
});
```

---

## [CS-008] `restoreCollapseState` doesn't restore `aria-expanded` on initially expanded (default) state

**Severity:** Minor  
**Location:** `ui/main_logic.js:4695-4696`, `ui/main_logic.js:4760-4761`

### Description
Headers are created with `aria-expanded="true"` (the default expanded state). `restoreCollapseState` only sets `aria-expanded="false"` when restoring a collapsed state. For expanded state, the initial `"true"` persists — which is correct.

However, there's no code path that validates `aria-expanded` matches the actual visual state if the DOM is manipulated externally. This is a minor robustness concern.

### Impact
None in normal usage. Aria state stays synchronized because all toggle operations go through `toggleCollapseSection`.

### Recommendation
No change needed. Current approach is correct.

---

## Positive Findings

1. **Clean collapse animation pattern**: The `scrollHeight` → reflow → class toggle → `transitionend` → `max-height: none` pattern is the correct approach for animating dynamic-height content with CSS transitions. Well implemented.

2. **Good keyboard accessibility**: Using `<button>` elements for collapse headers provides native keyboard support (Enter/Space). `focus-visible` styling with `outline` is present on both headers and fav buttons.

3. **`aria-hidden` on decorative icons**: Chevron and section icons correctly have `aria-hidden="true"` to prevent screen reader noise.

4. **`aria-expanded` + `aria-controls` pattern**: Properly implemented on both sections. The IDs match between `aria-controls` and the content `id` attributes.

5. **Drag-drop preserved on fav buttons**: The compact favorites maintain the same `ondragover`/`ondragleave` handlers as regular nav buttons, preserving the drop-to-navigate workflow.

6. **localStorage persistence**: Section state correctly persists across sessions with `sidebar-section-{key}` keys.

7. **Rebuild cleanup**: The `$(".collapse-section").remove()` line properly cleans up all nested content on rebuild — no orphaned DOM nodes.

8. **Smooth chevron rotation**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard easing) on the chevron feels polished.

---

## CSS Specificity Notes

- `.collapse-section.collapsed .collapse-content { max-height: 0 !important; }` — the `!important` is **necessary** here to override inline `max-height` set by JS during collapse animation. This is the correct use of `!important`.

- `.site-nav-bar-button-fav:hover { background-color: var(--selectColor3) !important; }` — `!important` overrides the `background-color: transparent` base. Could be avoided by increasing specificity instead, but functional.

- No specificity conflicts detected with existing `.site-nav-bar-button` styles — the fav buttons use a separate class with no inheritance issues.
