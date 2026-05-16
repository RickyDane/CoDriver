# Implementation Tracker: Complete Visual Overhaul of All Popups

## Status Summary
**Overall Status:** Completed
**Current Phase:** All phases complete
**Last Updated:** 2026-05-16

## Task Table

| ID | Task | Owner | Status | Depends On | Evidence | Next Step |
|----|------|-------|--------|------------|----------|-----------|
| T1 | Add glass CSS variables to `:root` | software-engineer | Completed | None | `ui/style.css:53-61` | — |
| T2 | Add `@keyframes popupIn` and `popupOut` | software-engineer | Completed | None | `ui/style.css:957-977` | — |
| T3 | Add `.popup-enter` / `.popup-exit` utility classes | software-engineer | Completed | T2 | `ui/style.css:3071-3078` | — |
| T4 | Restyle `.popup-background` (stronger blur) | software-engineer | Completed | T1 | `ui/style.css:3056-3069` | — |
| T5 | Restyle `.uni-popup` (glass base) | software-engineer | Completed | T1 | `ui/style.css:2443-2457` | — |
| T6 | Restyle `.popup-header` (glass + typography) | software-engineer | Completed | T1 | `ui/style.css:2608-2628` | — |
| T7 | Restyle `.popup-body` (remove hard border) | software-engineer | Completed | T1 | `ui/style.css:2630-2633` | — |
| T8 | Restyle `.popup-controls` (glass footer) | software-engineer | Completed | T1 | `ui/style.css:2635-2645` | — |
| T9 | Restyle `.popup-close-button` (glass) | software-engineer | Completed | T1 | `ui/style.css:2587-2600` | — |
| T10 | Restyle `.input-dialog` | software-engineer | Completed | T5 | `ui/style.css:2350-2370` | — |
| T11 | Restyle `.input-popup` | software-engineer | Completed | T5 | `ui/style.css:2422-2440` | — |
| T12 | Restyle `.loading-popup` | software-engineer | Completed | T5 | `ui/style.css:2393-2420` | — |
| T13 | Restyle `.item-preview-popup` | software-engineer | Completed | T5 | `ui/style.css:2484-2498` | — |
| T14 | Restyle `.multi-rename-popup-header` | software-engineer | Completed | T5 | `ui/style.css:2465-2474` | — |
| T15 | Restyle `.destination-conflict-card` + options | software-engineer | Completed | T5 | `ui/style.css:2972-2978`, `ui/style.css:2998-3006` | — |
| T16 | Restyle `.settings-ui` + header/sidebar | software-engineer | Completed | T1 | `ui/style.css:684-706`, `ui/style.css:715-727`, `ui/style.css:729-737`, `ui/style.css:809-814` | — |
| T17 | Restyle `.progress-bar-container-popup` | software-engineer | Completed | T1 | `ui/style.css:2845-2862` | — |
| T18 | Add scoped button/input overrides inside popups | software-engineer | Completed | T5 | `ui/style.css:3080-3103` | — |
| T19 | JS: Add `.popup-enter` to all popup creation functions | software-engineer | Completed | T3 | `ui/main_logic.js:4925`, `ui/main_logic.js:1805`, `ui/main_logic.js:1825`, `ui/main_logic.js:2025`, `ui/main_logic.js:4075`, `ui/main_logic.js:3869`, `ui/main_logic.js:1658` | — |
| T20 | JS: Add `.popup-exit` to all popup close functions | software-engineer | Completed | T3 | `ui/main_logic.js:4978-4984`, `ui/main_logic.js:1810-1815`, `ui/main_logic.js:1840-1846`, `ui/main_logic.js:2035-2041`, `ui/main_logic.js:4141-4148`, `ui/main_logic.js:3886-3892`, `ui/main_logic.js:1786-1794` | — |
| T21 | Final polish: reduced-motion, scrollbars, edge cases | software-engineer | Completed | T18 | `ui/style.css:3189-3209` | — |
| T22 | Visual QA: test all popup types | code-reviewer | Planned | T21 | — | Review all popups |

## Blockers
None

## Drift Log
No drift.

## Implementation Summary

### CSS Changes (`ui/style.css`)
- **Phase 1**: Added 8 glass CSS variables under `:root` (lines 53-61). Added `@keyframes popupIn` and `popupOut` after existing keyframes (lines 957-977).
- **Phase 2**: Updated `.popup-background` with stronger overlay + blur (lines 3056-3069). Updated `.uni-popup` with full glass treatment (lines 2443-2457). Updated `.popup-header` with glass bg, backdrop blur, border-bottom, improved typography (lines 2608-2628). Removed `border-top` from `.popup-body` (line 2633). Updated `.popup-controls` with glass footer (lines 2635-2645). Updated `.popup-close-button` with glass bg + transition (lines 2587-2600). Added `.popup-enter` and `.popup-exit` utility classes (lines 3071-3078).
- **Phase 3**: Updated `.input-dialog` with glass treatment (lines 2350-2370). Updated `.input-popup` with glass treatment (lines 2422-2440). Updated `.loading-popup` with glass tokens (lines 2393-2420).
- **Phase 4**: Updated `.item-preview-popup` with glass tokens (lines 2484-2498). Updated `.multi-rename-popup-header` with glass header bg (lines 2465-2474). Updated `.destination-conflict-card` with glass bg (lines 2972-2978). Updated `.destination-conflict-options label` with glass-consistent bg (lines 2998-3006).
- **Phase 5**: Updated `.settings-ui` with glass treatment (lines 684-706). Updated `.settings-ui-header` with glass header bg (lines 715-727). Updated `.settings-sidebar` with glass bg (lines 729-737). Updated `.settings-ui .popup-controls` with glass treatment (lines 809-814). Updated `.progress-bar-container-popup` with glass tokens (lines 2845-2862).
- **Phase 6**: Added scoped overrides for `.uni-popup .icon-button` (glass bg, hover, active with scale) and `.uni-popup .text-input`/`.uni-popup .number-input` (glass bg, focus border) (lines 3080-3103).
- **Phase 8**: Added `@media (prefers-reduced-motion: reduce)` block for popup elements (lines 3189-3199). Added scrollbar styling inside popups (lines 3201-3209).

### JS Changes (`ui/main_logic.js`)
- **Phase 7**: Added `popup.classList.add("popup-enter")` after appendChild in: `showPopup()` (line 4925), `showLoadingPopup()` (line 1805), `showInputPopup()` (line 1825), `showDestinationConflictPopup()` (line 2025), `showMultiRenamePopup()` (line 4075), `showProperties()` (line 3869), compression popup (line 1658).
- Replaced direct `.remove()` with exit animation pattern in: `closeConfirmPopup()` (lines 4978-4984), `closeLoadingPopup()` (lines 1810-1815), `closeInputPopup()` (lines 1840-1846), conflict popup close callback (lines 2035-2041), `closeMultiRenamePopup()` (lines 4141-4148), `closeInfoProperties()` (lines 3886-3892), `closeCompressPopup()` (lines 1786-1794).
- Left `closeItemPreview()` unchanged (uses jQuery fadeOut).
- Left settings UI unchanged (uses CSS class toggle).
