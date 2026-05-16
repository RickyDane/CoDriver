# Design: Popup System & Settings UI Overhaul (Soft & Elevated)

## Purpose
Overhaul the CoDriver popup system and Settings UI to use a unified architecture and a modern, "Soft & Elevated" aesthetic inspired by macOS/iOS native applications.

## Architecture & Consolidation
1. **Unified Manager:** All existing popups (loading, confirm, input, previews, conflicts) and the Settings UI will be migrated to use the `PopupManager` class (currently defined in `ui/popup-system.js` but seemingly underutilized).
2. **Deprecation:** The legacy `.uni-popup` structure and ad-hoc creation functions (e.g., `showPopup`, `showInputPopup`, `toggleSettings`) will be refactored to wrap or utilize `PopupManager.open()`.
3. **Settings UI:** The Settings panel, currently a toggled side/overlay element, will become a standard managed popup, ensuring consistent behavior for focus trapping, backdrop blurring, and Escape-to-close.

## Aesthetic: Soft & Elevated
The visual design moves away from sharp borders and basic backgrounds toward an airy, friendly, and structured look.

### Key Visual Characteristics
- **Generous Padding:** Increased breathing room inside popups (e.g., `32px` outer padding, `16px` inner element padding).
- **Large Border Radii:** 
  - Outer popup container: `24px`
  - Inner elements (buttons, setting cards): `16px` or fully rounded (`9999px`) for buttons/toggles.
- **Soft Shadows:** Dropping harsh drop-shadows for a diffuse, soft shadow (`0 20px 25px -5px rgba(0, 0, 0, 0.05)`).
- **Icon-led Headers:** Centered or prominent headers featuring a circular, soft-background icon wrapper.
- **Card-based Content:** Individual settings or list items wrapped in subtle, interactive cards (`.setting-card`) that elevate slightly on hover.

### CSS Variables & Theme Integration
Since CoDriver supports multiple themes (Dark, Default, Hacker, Light), the "Soft & Elevated" structural properties (padding, radius, animation, shadows) will be defined as new base tokens, while colors will map to existing theme variables (`var(--primaryColor)`, `var(--secondaryColor)`, `var(--textColor)`).

**New Structural Tokens (to be added to `:root`):**
```css
--popup-radius-xl: 24px;
--popup-radius-lg: 16px;
--popup-radius-full: 9999px;
--popup-shadow-soft: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
```

### Components
1. **Container:** `.soft-popup` with entry animation (`scaleUp`), large radius, and soft shadow.
2. **Header:** `.soft-header` containing an `.icon-wrapper` and text.
3. **Body/Cards:** `.soft-body` containing `.setting-card` elements for lists or settings.
4. **Controls:** `.soft-toggle` for boolean settings, replacing basic checkboxes.
5. **Buttons:** `.btn-soft` (primary and cancel variants) with full rounding and hover elevation.

## Data Flow & Lifecycle
1. Caller invokes `PopupManager.open(options)`.
2. Manager constructs the DOM elements using the "Soft & Elevated" CSS classes.
3. Backdrop is shown with a soft blur.
4. Popup animates in (`scaleUp`).
5. Upon user action or Escape, the exit animation plays.
6. Popup is removed from DOM and Promise/callback resolves.

## Execution Strategy
1. Introduce the new CSS architecture in `ui/style.css`.
2. Update `ui/popup-system.js` to construct popups using the new HTML/CSS structure.
3. Migrate existing `showPopup`, `showLoadingPopup`, `showConfirmPopup` etc., in `ui/main_logic.js` to use `PopupManager`.
4. Migrate Settings UI to use `PopupManager` and the `.setting-card` layout.
5. Verify cross-theme compatibility and remove legacy `.uni-popup` CSS.