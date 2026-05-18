# Plan: Disk Sidebar Display and Usage Refresh Fixes

## Summary
Fix two related sidebar disk issues without changing filesystem behavior: remove only presentation-only wrapping quotes from event-added disk names, and refresh sidebar disk usage after file operations that can change capacity usage.

## Goals
- Display event-added mount names like `Data` instead of `"Data"`.
- Preserve raw disk paths/names used for navigation, unmount, selection, and backend calls.
- Refresh sidebar disk percentage/progress after copy, move, delete, create, rename, compress, extract, and similar filesystem mutations.
- Keep recent safe DOM creation for disk rows intact.

## Non-Goals
- Do not alter backend disk discovery, mount paths, or unmount path handling.
- Do not add continuous polling for disk usage.
- Do not rewrite existing sidebar/dropdown architecture beyond small helper/touchpoint changes.
- Do not convert unrelated `innerHTML` usage outside this fix.

## Assumptions
- `list_disks` and `get_disk_info` return current `capacity` and `avail` values quickly enough for user-triggered refreshes.
- Window event-added mounts enter through `ui/events.js` `fs-mount-changed` and `ui/main_logic.js` `addNewMount`.
- Disk sidebar rows are created by `createSidebarDiskButton(mount, pathOverride = "")`.
- Existing operation completion points already await backend filesystem commands, so a post-operation disk refresh can be scheduled there.

## Open Questions
- Should disk dropdown labels also strip display-only wrapping quotes, or only sidebar disk rows? Recommended: use same display helper for dropdown labels for consistency, while leaving option values raw.
- Which operations should trigger sidebar usage refresh in v1? Recommended: every completed mutation path already refreshing views, plus progress finish event as safety.
- Should failed operations refresh usage? Recommended: refresh only after successful mutation, except `finish-progress-bar` can schedule a best-effort debounced refresh.

## Dependencies
- Architecture context: static Tauri UI in `ui/`, global JS in `ui/main_logic.js`, Tauri event listeners in `ui/events.js`.
- Existing backend commands: `list_disks`, `get_disk_info`, file mutation commands.
- Existing disk UI styles in `ui/style.css`; no CSS change expected unless updated progress state needs minor styling.

## Likely Files and Functions
- `ui/main_logic.js`
  - `createSidebarDiskButton(mount, pathOverride = "")`: compute sanitized display name only; keep `path` raw.
  - `addNewMount(payload)`: event-added mount path/name flow; append disk row using raw `pathOverride`.
  - `insertSiteNavButtons()`: full sidebar rebuild; candidate for reuse by refresh helper if acceptable.
  - `setDiskDropdowns()`: optional display-label sanitization for dropdown options; option `value` must stay raw.
  - File operation completion points: `deleteItems`, `runResolvedCopyMove`, `pasteItem`, `compressItem`, `extractItem`, `createFolder`, `createFile`, `renameElement`, `renameElementsWithFormat`, drag/drop cleanup paths invoking `arr_delete_items`.
  - New helper candidate: `displayDiskName(rawName)`, `scheduleDiskUsageRefresh()`, `refreshDiskSidebarUsage()`.
- `ui/events.js`
  - `fs-mount-changed`: existing add/remove mount event flow.
  - `finish-progress-bar`: optional completion-triggered debounced sidebar usage refresh.
- `ui/style.css`
  - No expected change; verify progress classes `.disk-nav-usage`, `.disk-nav-progress-fill` already support updates.

## Execution Phases

### Phase 1: Context and Architecture
**Owner:** reverse-engineer  
**Output:** Confirm disk sidebar data flow and operation completion touchpoints.  
**Acceptance Criteria:** `createSidebarDiskButton`, `addNewMount`, refresh helpers, and mutation functions are mapped with raw/display data boundaries.

### Phase 2: Design
**Owner:** ui-ux-designer  
**Output:** Minimal display behavior spec.  
**Acceptance Criteria:** Sidebar name, tooltip, and optional disk dropdown labels display unquoted names; progress update is visually unchanged except current percentage/bar.

### Phase 3: Implementation
**Owner:** software-engineer  
**Output:** JS-only changes in `ui/main_logic.js` and possibly `ui/events.js`.  
**Acceptance Criteria:**
- Names wrapped with one matching quote pair display without that pair.
- Raw `mount.path`, `pathOverride`, DOM `itempath`, `dataset.itempath`, navigation, and unmount calls remain unchanged.
- Disk usage text and progress fill update after successful filesystem mutations.
- Refresh is debounced/event-driven; no interval polling is introduced.
- Disk rows continue using `createElement`, `textContent`, attributes/dataset, and no unsafe `innerHTML` for disk row data.

### Phase 4: Review
**Owner:** code-reviewer  
**Output:** Findings against raw/display separation, refresh frequency, and DOM safety.  
**Acceptance Criteria:** No critical/major issues; no path mutation or unsafe disk row HTML regression.

### Phase 5: Documentation
**Owner:** documentation-writer  
**Output:** Short release note and commit message.  
**Acceptance Criteria:** Notes mention display-only quote cleanup and sidebar usage refresh after operations.

## Suggested Implementation Steps
1. Add a small helper in `ui/main_logic.js`, near disk helpers:
   - `displayDiskName(rawName)` returns `/` for empty names.
   - Strip only one matching wrapping pair of `"..."` or `'...'` from the display value.
   - Do not call it on paths.
2. Update `createSidebarDiskButton`:
   - Keep `const path = pathOverride || mount.path || ""` as raw behavior path.
   - Keep raw mount object for unmount logic.
   - Use `const displayName = displayDiskName(mount.name)` for `title` and `.disk-nav-name.textContent` only.
3. Optionally update `setDiskDropdowns` labels:
   - Use `displayDiskName(disks[i].name)` for `<option>` text.
   - Preserve `value="${disks[i].path}"`; ideally avoid string `innerHTML +=` for future safety if touching this area.
4. Add debounced refresh helper:
   - `scheduleDiskUsageRefresh(delay = 250)` coalesces multiple operation completions.
   - `refreshDiskSidebarUsage()` calls `list_disks`, maps by raw `path`, and updates existing `.disk-site-nav-button` children: `.disk-nav-usage.textContent`, `.disk-nav-progress-fill.style.width`, `title`.
   - If mapping/update becomes too brittle, fallback to `insertSiteNavButtons()` but preserve collapse state and avoid excessive full rebuilds.
5. Call `scheduleDiskUsageRefresh()` after successful filesystem mutations:
   - `deleteItems` after deletes complete.
   - `runResolvedCopyMove` after copy and optional source delete complete, if copied sources exist.
   - `compressItem` and `extractItem` after invoke/list refresh.
   - `createFolder`, `createFile`, `renameElement`, multi-rename completion.
   - Any drag/drop or cleanup path that directly invokes `arr_delete_items`.
6. Add safety trigger in `ui/events.js`:
   - On `finish-progress-bar`, call `scheduleDiskUsageRefresh()` if the helper exists on `window`/global scope.
   - Avoid adding periodic polling or refreshing on every progress tick.
7. Manual validation across normal and event-added mounts.

## Validation Plan
- Event-added mount named `"Data"` displays `Data` in sidebar name and title.
- Mount path remains raw and navigation opens the correct path.
- Unmount/removable context menu still works for removable and SSHFS mounts.
- Literal names with internal quotes, e.g. `Team "Data"`, keep internal quotes.
- Copy/paste to a disk changes sidebar percentage/bar after completion.
- Move/cut updates source and destination disks after copy plus delete complete.
- Delete/remove updates sidebar percentage/bar after completion.
- Compress/extract/create/rename update disk usage when size changes.
- Rapid operations trigger one coalesced refresh rather than repeated full sidebar rebuilds.
- No new unsafe `innerHTML` added for disk row content.

## Rollback Plan
- Revert JS helper calls and post-operation refresh calls.
- Keep backend commands untouched, so rollback is limited to `ui/main_logic.js`/`ui/events.js`.
- If refresh causes regressions, disable only `scheduleDiskUsageRefresh()` calls while keeping display-only name cleanup.
