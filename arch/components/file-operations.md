# File Operations Component

## Purpose
Coordinates user-selected filesystem mutations from the UI to Rust: copy, cut/move, paste, move-to, delete, rename, compress/extract.

## Frontend Entry Points
- Keyboard copy/cut/paste: `ui/main_logic.js` lines around `copyItem(SelectedElement)`, `copyItem(SelectedElement, true)`, `pasteItem()`.
- Dual-pane copy/move shortcuts: F5 and Shift+F5 call `pasteItem()` after Tauri `confirm`.
- Context menu: `ui/contextmenu.js` actions for Copy, Cut, Paste, Move To.
- Move To folder picker: `ui/main_logic.js:itemMoveTo` invokes `arr_copy_paste`, then `arr_delete_items`.
- Drag/drop: `ui/utils.js` calls `pasteItem(...)` for copy/move based on current operation.

## Backend Entry Points
- `src-tauri/src/main.rs:arr_copy_paste(arr_items, is_for_dual_pane, copy_to_path)` copies multiple items.
- `src-tauri/src/main.rs:copy_paste(...)` older/single-item copy path.
- `src-tauri/src/main.rs:get_final_filename(...)` calculates destination path and currently auto-duplicates conflicts.
- `src-tauri/src/utils.rs:copy_to(final_filename, from_path, total_size, count_to_copy)` recursively copies files/directories and emits progress.
- `src-tauri/src/main.rs:arr_delete_items` and `delete_item` delete originals for cut/move.

## Current Copy/Move Flow
```mermaid
flowchart TD
    A[User selects item(s)] --> B[copyItem stores ArrCopyItems]
    B --> C[User paste/move]
    C --> D[pasteItem/itemMoveTo builds FDir array]
    D --> E[invoke arr_copy_paste]
    E --> F[get_final_filename]
    F -->|Destination exists| G[Generate duplicate name]
    F -->|No conflict| H[Use destination name]
    G --> I[copy_to]
    H --> I[copy_to]
    I --> J{Cut/move?}
    J -->|yes| K[arr_delete_items originals]
    J -->|no| L[Refresh/unselect]
```

## Conflict Feature Target Flow
```mermaid
flowchart TD
    A[Paste/Move requested] --> B[Build operation plan]
    B --> C[Check target path exists for each item]
    C --> D{Any conflicts?}
    D -->|No| E[Invoke copy with duplicate/no-conflict policy]
    D -->|Yes| F[Show conflict modal]
    F --> G{User decision}
    G -->|Replace| H[Policy replace]
    G -->|Merge| I[Policy merge directories]
    G -->|Duplicate| J[Policy duplicate]
    G -->|Skip/Cancel| K[Policy skip or abort]
    H --> L[Invoke Rust conflict-aware copy]
    I --> L
    J --> L
    K --> L
    L --> M[Return per-item result]
    M --> N[Delete originals only for moved items copied successfully]
    N --> O[Refresh view(s)]
```

## Implementation Notes
- Add `PopupType.CONFLICT` or a dedicated `showConflictResolutionPopup(conflicts)` rather than stretching `showPopup`'s boolean/prompt return too far.
- Destination path calculation should use a Rust command for path joining or careful JS normalization; Tauri fs `exists` is allowlisted, but a backend `check_copy_conflicts` command would be safer and platform-correct.
- Backend should return structured results: `{ source, destination, action, status, error? }`.
