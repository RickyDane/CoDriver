# Handoffs: Disk Sidebar Display and Usage Refresh Fixes

## reverse-engineer
- Inspect `ui/events.js` `fs-mount-changed` and `ui/main_logic.js` `addNewMount`.
- Confirm all places disk sidebar rows are created or rebuilt.
- Confirm file operation completion points likely to affect disk capacity.
- Expected output: concise map of raw mount path/name flow and mutation refresh touchpoints.

## ui-ux-designer
- Define display behavior for quoted disk names:
  - Sidebar name should strip one matching outer quote pair.
  - Tooltip should match display name.
  - Internal quotes should remain visible.
- Confirm whether disk dropdown labels should share same cleanup.
- Expected output: final display rule and any edge cases.

## software-engineer
- Implement display-only cleanup in `ui/main_logic.js`; do not mutate `mount.path`, `payload.paths`, `itempath`, or backend command args.
- Prefer helper names such as `displayDiskName`, `calculateDiskUsedPercentage`, `refreshDiskSidebarUsage`, `scheduleDiskUsageRefresh`.
- Update existing disk row DOM using `textContent` and `style.width`; avoid adding unsafe disk-row `innerHTML`.
- Wire debounced refresh after successful copy/move/delete/create/rename/compress/extract and optional `finish-progress-bar` event.
- Acceptance criteria:
  - Event-added `"Data"` displays as `Data`.
  - Raw path behavior unchanged.
  - Sidebar usage updates after file operations without continuous polling.

## code-reviewer
- Focus areas:
  - Display cleanup applied only to names/labels, never paths.
  - No broad `.replaceAll('"', '')` on paths or mount objects.
  - No unsafe `innerHTML` reintroduced for disk row data.
  - Refresh helper is debounced and does not run on every progress tick.
  - Full sidebar rebuild, if used, preserves collapse/selection enough for current UX.
- Expected output: findings in `docs/review/disk-sidebar-fixes/`.

## documentation-writer
- Document two user-visible fixes:
  - Event-added drive names no longer show wrapping quotes.
  - Disk usage indicators refresh after file operations.
- Mention no migration or breaking change.
- Expected output: release notes and commit message under `docs/disk-sidebar-fixes/` or release-note location chosen by Navigator.
