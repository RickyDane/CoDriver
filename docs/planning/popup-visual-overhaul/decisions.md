# Decisions: Complete Visual Overhaul of All Popups

## D1: Exit Animation Pattern for Promise-Based Popups

**Context:** `showPopup()` and `showDestinationConflictPopup()` return Promises that resolve when the popup closes. The `closeConfirmPopup()` function directly removes the DOM element.

**Decision:** Resolve the Promise immediately, then animate out. The animation is purely cosmetic (150ms). Waiting for `animationend` before resolving would add unnecessary latency to the calling code.

**Pattern:**
```js
// Resolve immediately
resolve(value);
// Animate out
popup.classList.add("popup-exit");
popup.addEventListener("animationend", () => popup.remove(), { once: true });
```

For `closeConfirmPopup()` specifically:
```js
function closeConfirmPopup() {
    const popup = document.querySelector(".confirm-popup");
    if (popup) {
        popup.classList.add("popup-exit");
        popup.addEventListener("animationend", () => popup.remove(), { once: true });
    }
    $(".popup-background").css("display", "none");
    $(".popup-background").css("opacity", "0");
    IsPopUpOpen = false;
}
```

**Rationale:** The 150ms exit animation is too short for users to interact with the popup after resolve. No functional difference. Avoids complicating the Promise chain.

---

## D2: Keep `.item-preview-popup` jQuery fadeOut

**Context:** `.item-preview-popup` already uses `$(popup).fadeIn(200)` on open and `$(popup).fadeOut(200, callback)` on close via `closeItemPreview()`.

**Decision:** Leave as-is. jQuery fadeOut already provides a smooth exit. Adding CSS animation on top would conflict.

**Exception:** Still add `.popup-enter` class for the entrance animation (CSS `popupIn` is smoother than jQuery fadeIn due to scale transform). But the exit stays jQuery-managed.

---

## D3: Keep `.settings-ui` CSS Class Toggle

**Context:** `.settings-ui` uses `.active` class toggle for show/hide with CSS transitions (`opacity` + `transform`).

**Decision:** Leave as-is. Already has entrance/exit transitions built in. Apply glass tokens to the base styles only.

---

## D4: Border-Radius Consistency at 12px

**Context:** Context menu uses `12px`. Current popups use mix of `10px` and `15px`. Settings panel uses `15px`.

**Decision:** Standardize all popups to `12px` via `--glass-radius`. Settings panel header `border-radius` adjusts to `12px 12px 0 0`.

---

## D5: `popup-background` Blur Strength

**Context:** Current backdrop blur is `2px`. Context menu doesn't use backdrop (it's inline). Task says "stronger blur."

**Decision:** Use `blur(12px) saturate(1.2)` with `background-color: rgba(0, 0, 0, 0.45)`. This creates a strong frosted glass effect behind popups without being too dark. 12px is enough to noticeably blur content behind the overlay while keeping it recognizable.

---

## D6: Typography in Headers

**Context:** Current `.popup-header h3` uses `font-weight: bolder`. Task wants "better typography hierarchy."

**Decision:**
- `.popup-header h3`: `font-weight: 700`, `font-size: 0.95em`, `letter-spacing: -0.01em`
- Keep existing `gap: 10px` between icon and text
- No changes to body text (already uses `--textColor` / `--textColor2` hierarchy)
