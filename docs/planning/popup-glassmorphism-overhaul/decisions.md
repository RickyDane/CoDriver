# Decisions: Popup Glassmorphism Overhaul

## Decision Log

### D1: CSS Variables vs Inline Glass Values
**Decision:** Add reusable CSS variables for glass properties (`--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-shadow`, `--glass-radius`) in `:root`.
**Rationale:** The context menu already hardcodes these values. Extracting them into variables ensures consistency and makes future tweaks (e.g., adjusting blur amount) a single-line change. All popup types reference the same tokens.

### D2: Scope — CSS-Only, No JS/HTML Changes
**Decision:** All changes are in `ui/style.css` only. No HTML structure or JS logic changes.
**Rationale:** The existing HTML class structure (`uni-popup` + specific class, `popup-header`, `popup-body`, `popup-controls`) is consistent and sufficient. Adding glassmorphism is purely visual. This minimizes regression risk.

### D3: Fix Existing Typo
**Decision:** Fix `var(--tr ansparentColorActive)` typo at line 2550 in `.popup-close-button:active`.
**Rationale:** This is a pre-existing bug (space in variable name). Fixing it during this overhaul is natural since we're restyling that rule anyway.

### D4: `backdrop-filter` on Sub-Elements
**Decision:** Apply `backdrop-filter` to `.popup-header`, `.popup-controls`, and `.settings-sidebar` as well, not just the outer popup container.
**Rationale:** These sub-areas have their own background colors. Adding subtle blur creates a layered frosted-glass depth effect. The blur values are lighter (8–12px) than the main popup (24px) to avoid performance issues with nested blurs.

### D5: Button/Input Overrides Scoped to Popups
**Decision:** Use `.uni-popup .button`, `.uni-popup .text-input` selectors (scoped) rather than changing global `.button`/`.text-input` styles.
**Rationale:** Global button/input styles are used throughout the app (sidebar, toolbar, etc.). Changing them globally would cause unintended side effects. Scoped overrides ensure only elements inside popups get the glass treatment.

### D6: `color-mix()` for Semi-Transparency
**Decision:** Use `color-mix(in srgb, var(--primaryColor) 85%, transparent)` pattern consistently.
**Rationale:** This is the exact pattern used by the context menu. It's cleaner than manually calculating RGBA values and adapts automatically if `--primaryColor` changes via themes.

### D7: `:root` Variable Naming Convention
**Decision:** Use `--glass-*` prefix for all new glass token variables.
**Rationale:** Clear separation from existing `--primaryColor`/`--tertiaryColor` tokens. Makes it obvious which variables are for the glass system vs. base theme colors.

### D8: `.popup-background` Darker Overlay
**Decision:** Increase `.popup-background` from `var(--transparentColor)` (rgba(0,0,0,0.1)) to `rgba(0,0,0,0.4)` and increase blur from 2px to 8px.
**Rationale:** The current background is too subtle — popups don't feel "above" the content. A stronger dimming effect + more blur creates clear visual separation and makes the glassmorphism popups stand out.
