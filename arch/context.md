# Architecture Context

## System Shape
CoDriver loads static frontend assets from `ui/` directly in a Tauri v1 window. There is no active frontend build pipeline in the root project and no app-level `package.json` was found. Most frontend behavior lives in globals across script tags ordered in `ui/index.html`.

## Feature Area: Copy/Move Conflict Resolution
Current behavior auto-duplicates destination names in Rust:
- `src-tauri/src/main.rs:get_final_filename` checks `fs::metadata(&file_name).is_ok()` and appends ` (1)`, ` (2)`, etc.
- `arr_copy_paste` always calls `get_final_filename`, so users cannot replace or merge.
- `copy_to` creates destination files with `File::create`, which truncates if called with an existing file path; directory copy uses `create_dir_all` and recursively writes children.

Desired feature should add an explicit conflict decision path before invoking copy/move mutation.

## Recommended Design
1. Add frontend helper to compute destination path for each selected source and identify conflicts.
2. Add custom modal using existing `.uni-popup` + `.popup-background` patterns to let user choose: Replace, Merge (directories), Duplicate, Skip/Cancel; optionally apply to all.
3. Extend Rust command contract to accept a conflict policy/decision map, or add a new command like `arr_copy_paste_with_conflicts`.
4. Replace current unconditional duplicate behavior with explicit policy handling:
   - `duplicate`: use current `get_final_filename` behavior.
   - `replace`: remove existing destination first, then copy.
   - `merge`: for directories, recurse into existing directory and apply child-level policy; for files, treat like replace or ask/skip depending UI decision.
   - `skip`: do nothing for that item.
5. For moves/cuts, delete originals only after copy result succeeds for that item; skipped/failed items must not be deleted.

## Risks
- Current move flow deletes all source paths after `arr_copy_paste` returns, regardless per-item success. Conflict-aware move should return copied/skipped/failed paths.
- Existing frontend same-directory guard compares source paths against `copyToPath`, which is insufficient for many destination cases.
- Drag/drop and dual-pane routes call `pasteItem` with different `copyToPath` meanings; conflict helper must normalize destination paths.
