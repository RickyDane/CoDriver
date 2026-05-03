# Code Review Findings: Copy/Move Conflict Handling Final Re-review

## Resolution Status: CMCH-001 through CMCH-006

| ID | Status | Notes |
| --- | --- | --- |
| CMCH-001 | Resolved | Merge now preserves existing nested destination entries and returns an error if any nested item was skipped, so move deletion is not triggered for partially merged sources. |
| CMCH-002 | Resolved | Replace now copies to staging, renames the destination to a backup, installs staging, and restores the backup if install fails. |
| CMCH-003 | Resolved | Folder merge no longer overwrites nested destination files; skipped nested conflicts block source deletion on move. |
| CMCH-004 | Resolved | Backend canonicalizes source/destination parent paths and compares case-insensitively on macOS/Windows; frontend same-directory cut guard compares source parents to target. |
| CMCH-005 | Resolved | Conflict dialog traps Tab/Shift+Tab, handles Escape/Enter, and restores prior focus. |
| CMCH-006 | Resolved | Context menu label check now matches `Remove Favorite`. |

## Critical Issues (0)

None.

## Major Issues (0)

None.

## Minor Caveats

### [CMCH-007] Same-folder duplicate copy is still blocked by pre-policy validation

**Severity:** Minor  
**Location:** `src-tauri/src/main.rs:1038-1066`

#### Description
`arr_copy_paste_resolved` validates `source_path` against the original conflicting `destination_path` before applying the `duplicate` policy. Copying an item into its own folder and choosing “Keep both” can therefore fail as “same path” instead of first selecting an available duplicate path.

#### Evidence
```rust
if let Err(err) = validate_copy_destination(source_path, destination_path) {
    errors.push(err);
    continue;
}
...
"duplicate" => {
    destination = get_available_path(destination_path);
    copy_to(destination.clone(), source.clone(), total_bytes, counter).await
}
```

#### Impact
No data loss observed. The affected workflow may require the user to duplicate via another command/path until duplicate destination selection happens before same-path validation.

#### Recommendation
For `duplicate`, compute `get_available_path(destination_path)` before running same-path validation, then validate against that resolved destination.

### [CMCH-008] Successful replace may leave hidden backup if cleanup fails

**Severity:** Minor  
**Location:** `src-tauri/src/main.rs:1250-1257`

#### Description
After a successful replace, backup cleanup failure is logged but not surfaced to the user.

#### Impact
No source or destination data loss. A hidden `.codriver-replace-backup-*` item may remain and consume disk space.

#### Recommendation
Consider surfacing a non-blocking warning/toast if backup cleanup fails.

## Validation Performed

- `git status --short`
- `git diff --stat && git diff`
- `cargo check` in `src-tauri` — passed
- `node --check ui/main_logic.js` — passed
- `node --check ui/contextmenu.js` — passed
