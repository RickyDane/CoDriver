# UI/UX Spec: Copy/Move Destination Conflict Modal

## Purpose
Show a blocking decision modal when copy or move finds one or more destination items with matching names. User can resolve current conflict, apply one resolution to all remaining conflicts, skip, or cancel operation.

## Existing UI Fit
- Reuse modal shell: `.uni-popup`, `.popup-background`, `.popup-header`, `.popup-body`, `.popup-controls`.
- Reuse controls: `.icon-button`, `.button-icon`, `.text-small`, `.text-2`, `.text-input` if duplicate rename input is needed.
- Use existing color tokens: `--primaryColor`, `--secondaryColor`, `--tertiaryColor`, `--transparentColorActive`, `--textColor`, `--textColor2`, `--selectColor2`, `--successColor`, `--errorColor`.

## Modal Layout
Recommended class: `.destination-conflict-popup`.

```html
<div class="uni-popup destination-conflict-popup" role="dialog" aria-modal="true" aria-labelledby="destination-conflict-title" aria-describedby="destination-conflict-desc">
  <div class="popup-header destination-conflict-header">
    <div class="destination-conflict-title-row">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <h3 id="destination-conflict-title">Item already exists</h3>
    </div>
    <p class="destination-conflict-count">Conflict 1 of 4</p>
  </div>

  <div class="popup-body destination-conflict-body">
    <p id="destination-conflict-desc" class="popup-body-content">
      “Report.pdf” already exists in the destination.
    </p>

    <div class="destination-conflict-comparison" aria-label="Item comparison">
      <section class="destination-conflict-card">
        <h4>Incoming item</h4>
        <p class="destination-conflict-name">Report.pdf</p>
        <p class="text-2">Modified Apr 26, 2026 • 2.4 MB</p>
        <p class="text-2">From: /Downloads</p>
      </section>
      <section class="destination-conflict-card">
        <h4>Existing item</h4>
        <p class="destination-conflict-name">Report.pdf</p>
        <p class="text-2">Modified Apr 20, 2026 • 2.1 MB</p>
        <p class="text-2">In: /Documents</p>
      </section>
    </div>

    <fieldset class="destination-conflict-options">
      <legend>Choose what to do</legend>
      <label><input type="radio" name="conflict-action" value="replace"> <span>Replace existing item</span><small>Overwrite destination with incoming item.</small></label>
      <label><input type="radio" name="conflict-action" value="merge"> <span>Merge folders</span><small>Combine folder contents. Files with same names will ask again unless “Apply to all” is selected.</small></label>
      <label><input type="radio" name="conflict-action" value="duplicate" checked> <span>Keep both</span><small>Create a duplicate with a new name, e.g. “Report copy.pdf”.</small></label>
    </fieldset>

    <label class="destination-conflict-apply-all">
      <input type="checkbox" class="destination-conflict-apply-all-input">
      Apply this choice to all remaining conflicts
    </label>
  </div>

  <div class="popup-controls destination-conflict-controls">
    <button class="icon-button destination-conflict-cancel"><div class="button-icon"><i class="fa-solid fa-xmark"></i></div>Cancel</button>
    <button class="icon-button destination-conflict-skip"><div class="button-icon"><i class="fa-solid fa-forward-step"></i></div>Skip</button>
    <button class="icon-button destination-conflict-confirm"><div class="button-icon"><i class="fa-solid fa-check"></i></div>Continue</button>
  </div>
</div>
```

## Button Labels and Behavior
- `Cancel`: stop entire copy/move operation, close modal, leave already-completed operations intact unless backend supports rollback. If partial completion exists, caller should show operation summary/toast.
- `Skip`: skip only current conflicting item. If “Apply this choice to all remaining conflicts” is checked, skip all remaining conflicts and continue non-conflicting items.
- `Continue`: perform selected action for current conflict. If apply-to-all checked, apply compatible action to remaining conflicts.

## Conflict Actions
1. **Replace existing item** (`replace`)
   - Files: overwrite destination file with incoming file.
   - Folders: replace only if product supports folder replacement; otherwise disable for folders with helper text “Folder replace is not available. Use Merge or Keep both.”
   - Destructive. Use warning visual on selected option: `var(--errorColor)` accent/border.
2. **Merge folders** (`merge`)
   - Enabled only when both incoming and existing items are folders.
   - Disabled for file-vs-file and file-vs-folder conflicts.
   - If nested conflicts occur, show this modal again unless apply-to-all supplies a valid default.
   - Use success/neutral visual: `var(--successColor)` accent.
3. **Keep both** (`duplicate`)
   - Default selected safest option.
   - Files: create unique name with existing app naming convention, e.g. `name copy.ext`, `name copy 2.ext`.
   - Folders: create unique folder name, e.g. `Folder copy`.
   - If generated duplicate name conflicts, increment suffix silently until unique.

## Apply-to-All Rules
- Show checkbox only when total conflicts > 1.
- Wording: `Apply this choice to all remaining conflicts`.
- If selected action is invalid for some future conflict, handle as follows:
  - `merge`: apply only folder-folder conflicts; prompt again for incompatible file conflicts.
  - `replace`: apply file replace; prompt again for folders if folder replacement unsupported.
  - `duplicate` and `skip`: safe for all conflicts.
- Store result as `{ action: "replace" | "merge" | "duplicate" | "skip" | "cancel", applyToAll: boolean }`.

## States
- **Default**: duplicate selected; Continue focused.
- **Hover**: reuse `.icon-button:hover`; option rows use darker background `--transparentColorActive`.
- **Selected option**: border/accent `--selectColor2`; visible check/radio state.
- **Disabled option**: opacity 0.5, `cursor: not-allowed`, explain in small text.
- **Destructive replace selected**: show helper text “This will overwrite the existing item.” with `--errorColor`.
- **Long names/paths**: truncate middle or wrap within cards; full path exposed with `title` attribute.

## Accessibility and Keyboard
- Modal root: `role="dialog"`, `aria-modal="true"`, labelled by title, described by body text.
- Focus trap inside modal while open. Initial focus: `Continue` if default duplicate selected; otherwise first enabled radio is acceptable.
- `Esc`: same as `Cancel`.
- `Enter`: activate `Continue` unless focus is on checkbox/radio where browser default should apply.
- `Tab`/`Shift+Tab`: cycle through radios, apply-to-all, buttons.
- Radio group must use `<fieldset>` + `<legend>` or `role="radiogroup"` with labels.
- Preserve clear focus indicator; existing global `*:focus-visible` outline can be reused.
- Do not rely on color alone: include radio selection, icons, and helper text.

## CSS Classes to Add
```css
.destination-conflict-popup { width: min(620px, 92vw); height: fit-content; color: var(--textColor); }
.destination-conflict-header { justify-content: space-between; border-bottom: 1px solid var(--tertiaryColor); }
.destination-conflict-title-row { display: flex; align-items: center; gap: 10px; }
.destination-conflict-count { color: var(--textColor2); font-size: var(--fontSize); }
.destination-conflict-body { display: flex; flex-flow: column; gap: 12px; }
.destination-conflict-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.destination-conflict-card { padding: 10px; border: 1px solid var(--tertiaryColor); border-radius: 10px; background: var(--secondaryColor); min-width: 0; }
.destination-conflict-name { overflow-wrap: anywhere; font-weight: 600 !important; }
.destination-conflict-options { border: 0; display: flex; flex-flow: column; gap: 8px; }
.destination-conflict-options legend { margin-bottom: 4px; color: var(--textColor2); font-size: var(--fontSize); }
.destination-conflict-options label { display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; padding: 10px; border: 1px solid var(--tertiaryColor); border-radius: 10px; background: var(--secondaryColor); cursor: pointer; }
.destination-conflict-options label:hover { background: var(--transparentColorActive); }
.destination-conflict-options label:has(input:checked) { border-color: var(--selectColor2); box-shadow: inset 3px 0 0 var(--selectColor2); }
.destination-conflict-options small { grid-column: 2; color: var(--textColor2); }
.destination-conflict-options label.is-disabled { opacity: .5; cursor: not-allowed; }
.destination-conflict-apply-all { display: flex; align-items: center; gap: 8px; color: var(--textColor); }
@media (max-width: 560px) { .destination-conflict-comparison { grid-template-columns: 1fr; } .destination-conflict-controls { flex-wrap: wrap; } }
```

If avoiding `:has()` for compatibility, toggle `.is-selected` on selected option label instead.
