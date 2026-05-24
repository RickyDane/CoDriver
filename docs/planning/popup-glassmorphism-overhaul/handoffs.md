# Handoffs: Popup Glassmorphism Overhaul

## software-engineer

### Context
All popup/modal CSS lives in `ui/style.css`. The context menu (`.context-menu` at line 2075 and `.custom-context-menu` at line 3018) already has the target glassmorphism aesthetic. Goal: make every other popup match.

### Implementation Steps
1. Add glass design token variables to `:root` (Phase 1)
2. Update base classes: `.popup-background`, `.uni-popup`, `.popup-header`, `.popup-body`, `.popup-controls`, `.popup-close-button` (Phase 2)
3. Update input/dialog popups: `.input-dialog`, `.input-popup`, `.loading-popup` (Phase 3)
4. Update content-specific popups: preview, properties, rename, duplicates, yt-download, llm, confirm, conflict, search (Phase 4)
5. Update settings panel: `.settings-ui` and children (Phase 5)
6. Update progress bar and supporting overlays (Phase 6)
7. Add scoped button/input/select overrides inside popups (Phase 7)
8. Final polish: reduced-motion, scrollbars (Phase 8)

### Files Modified
- `ui/style.css` — only file changed

### Acceptance Criteria
- Every popup type uses glassmorphism (semi-transparent bg, blur, subtle border, layered shadows)
- Text readable on all popup surfaces (white on dark glass)
- Hover/active/focus states work on all interactive elements inside popups
- No visual regressions (z-index, responsive, scrollbars)
- `prefers-reduced-motion` respected

### Key Reference Lines
- `.context-menu` glassmorphism source: lines 2075–2095
- `.custom-context-menu`: lines 3018–3031
- `:root` variables: lines 31–52
- `.uni-popup` base: lines 2391–2404
- `.popup-background`: lines 3003–3016
- `.settings-ui`: lines 685–707
- `.progress-bar-container-popup`: lines 2790–2810

---

## code-reviewer

### Review Focus Areas
1. Verify all 21 popup types have glassmorphism applied
2. Check text contrast/readability on glass backgrounds
3. Check for CSS specificity conflicts (existing rules overriding new glass styles)
4. Verify no broken layouts (missing `overflow`, wrong `border-radius`, broken flex)
5. Verify `prefers-reduced-motion` fallback exists
6. Check that `.popup-close-button` has a typo fix: line 2550 has `var(--tr ansparentColorActive)` — note the space in the variable name
7. Verify z-index layering still correct (background < content < popups)

### Risks to Inspect
- `backdrop-filter` performance on many overlapping blurred elements
- Text readability if blur amount is too high or bg opacity too low
- Settings panel has complex nested layout — verify glass doesn't break scrolling

### Expected Output
- `docs/review/popup-glassmorphism-overhaul/findings.md`
- `docs/review/popup-glassmorphism-overhaul/summary.md`

---

## documentation-writer

### User-Facing Changes
- Visual refresh: all popups, dialogs, settings, and overlays now have a modern glassmorphism look matching the context menu
- No functional changes
- No migration steps

### Expected Output
- Brief release notes documenting the visual refresh
