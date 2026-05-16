# Handoffs: Complete Visual Overhaul of All Popups

## software-engineer

### Context
CoDriver is a Tauri desktop file explorer. Frontend is vanilla HTML/CSS/JS in `ui/`. The context menu (`.custom-context-menu` at line 3013 of `style.css`) already has a modern glassmorphism style. All popups need to match this aesthetic.

### Files to Modify
1. **`ui/style.css`** (primary) — lines 2293-3011 for popup styles, lines 1-50 for `:root` variables, lines 650-680 for keyframes
2. **`ui/main_logic.js`** (secondary) — animation class toggling in ~15 functions

### Implementation Steps

**CSS (`ui/style.css`):**
1. Add glass token variables under `:root` (after line 50)
2. Add `@keyframes popupIn` and `@keyframes popupOut` (near line 650)
3. Add `.popup-enter` and `.popup-exit` utility classes
4. Restyle `.popup-background` (line 2998) — stronger blur
5. Restyle `.uni-popup` (line 2386) — glass base
6. Restyle `.popup-header` (line 2548) — glass bg + typography
7. Restyle `.popup-body` (line 2566) — remove hard border
8. Restyle `.popup-controls` (line 2572) — glass footer
9. Restyle `.popup-close-button` (line 2527) — glass
10. Restyle `.input-dialog` (line 2293), `.input-popup` (line 2365), `.loading-popup` (line 2336)
11. Restyle `.item-preview-popup` (line 2424), `.multi-rename-popup-header` (line 2407)
12. Restyle `.destination-conflict-card` (line 2914) and options
13. Restyle `.settings-ui` (line 684), `.settings-ui-header` (line 715), `.settings-sidebar` (line 729)
14. Restyle `.progress-bar-container-popup` (line 2785)
15. Add scoped button/input overrides inside popups
16. Add reduced-motion media query and scrollbar styling

**JS (`ui/main_logic.js`):**
17. In each `show*` function: add `popup.classList.add("popup-enter")` after `appendChild`/`append`
18. In each `close*` function: replace direct `.remove()` with exit animation pattern

### Acceptance Criteria
- All popups visually match `.custom-context-menu` glassmorphism
- Entrance animation: scale(0.95) + fade-in, ~220ms
- Exit animation: scale(0.97) + fade-out, ~150ms, then DOM removal
- All text readable on glass backgrounds
- All existing functionality preserved
- Works with all CSS variable themes
- `prefers-reduced-motion` respected

### Key Reference
Context menu style (line 3013):
```css
.custom-context-menu {
    background-color: color-mix(in srgb, var(--primaryColor) 85%, transparent);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border: 1px solid color-mix(in srgb, var(--tertiaryColor) 50%, transparent);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 0.5px 0 rgba(255, 255, 255, 0.06);
}
```

### Risks
- **Double-close race condition:** If user rapidly clicks close button, multiple exit animations could fire. Mitigate with a `isClosing` guard flag.
- **jQuery `.remove()` vs exit animation:** Some close functions use `$(selector).remove()` (jQuery). Need to get the DOM element reference first, then apply exit animation.
- **`closeConfirmPopup()` Promise pattern:** Resolve Promise immediately, animate out after. See decisions.md D1.

---

## code-reviewer

### Review Focus Areas
1. **Animation timing:** Verify entrance/exit durations feel natural (not too fast/slow)
2. **Glass rendering:** Check that `backdrop-filter` renders correctly in Tauri WebView
3. **Z-index stacking:** Ensure popups still layer correctly above content
4. **Theme compatibility:** Verify glass tokens work with non-default themes
5. **Reduced-motion:** Confirm `prefers-reduced-motion` disables all animations
6. **No regressions:** Every popup type still opens, functions, and closes correctly
7. **Edge cases:** Rapid open/close, Escape key during animation, multiple popups

### Expected Output
- `docs/review/popup-visual-overhaul/findings.md`
- `docs/review/popup-visual-overhaul/summary.md`

---

## documentation-writer

### Changes to Document
- Visual overhaul of all popup dialogs (glassmorphism + animations)
- No user-facing functional changes
- No migration or breaking changes
- No new features — purely cosmetic

### Expected Output
- Release notes summarizing the visual refresh
- Commit message following project conventions
