# CoDriver Release Notes

**Date:** 2026-05-03  
**Version:** 0.6.5, from `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`  
**Comparison:** current branch `some_work` / `origin/some_work` against `master` / `origin/master`

## Summary

This release expands CoDriver's file-management workflow with favorites, safer copy/move conflict handling, improved view and settings controls, stronger archive support, better search feedback, and clearer disk/network-drive management.

## What's New

- **Favorites in the sidebar:** Files, folders, and disks can be added to Favorites from the context menu. Favorites are saved in the app config, shown in a dedicated sidebar section with star icons, opened directly from the sidebar, and removable from the favorite item's context menu.
- **Safer copy and move conflicts:** When a destination already contains an item with the same name, CoDriver now lets users replace, merge folders, keep both, skip, or apply the same choice to remaining conflicts. Moves now copy first and only remove sources after successful copies, reducing the risk of losing files.
- **Reworked view selection:** The previous view toggle was replaced with clearer Grid, List, and Miller column selection. Dual-pane mode disables incompatible view choices while active and restores the previous view when leaving dual-pane mode.
- **Tabbed settings screen:** Settings are now grouped into General, Shortcuts, Search, and Experimental sections, making theme, startup path, quick-access paths, search limits, image previews, interaction mode, and dual-pane options easier to find.
- **More compression formats:** Compression now includes ZIP, Zstd, Density, and Brotli options, including multi-item archive creation and progress feedback.
- **More extraction support:** Archive extraction now covers additional formats such as `.tar.gz`, `.tar.bz2`, Zstd, Density, and Brotli tar archives alongside existing archive handling.
- **Multi-selection properties:** Properties can now summarize multiple selected items and calculate total size for the selection. Size calculation can be cancelled when the properties dialog closes.
- **Improved disk views:** Disk listings now use clearer cards with filesystem, total/used/available space, and usage bars. Sidebar disks also show usage information and mount-specific actions.
- **SSHFS display names:** SSHFS mounts can use a custom display name instead of always using the username.
- **Updated shortcuts/help text:** The app info dialog now documents the current copy, cut, paste, jump-to-path, preview, multi-rename, dual-pane, search, and quick-access shortcuts.
- **Updated branding and assets:** App icons, README screenshots, bundled UI assets, preloader graphics, and theme files were refreshed.

## Fixes and Improvements

- Fixed duplicate copy/move edge cases by resolving destination conflicts before deleting source files during moves.
- Fixed full-search stopping behavior in dual-pane mode and added clearer progress updates for current file and count of checked items.
- Improved quick search and instant navigation behavior, including search result limits and better reset behavior.
- Improved asynchronous image thumbnail loading for directory entries and search results, with safer fallbacks when icons cannot be resolved.
- Improved drag-and-drop behavior so dragging a selected item can drag the whole selection and uses safer fallback icons.
- Improved path, disk, sidebar, and back-button drop targets with clearer hover feedback.
- Improved context menus with a reworked menu system, proper Open With handling, Favorites actions, archive-specific actions, and reduced menus when no item is selected.
- Improved disk and network-drive handling, including mounted-volume watching, sidebar refreshes on mount changes, SSHFS unmount support, and removable-drive unmount actions.
- Improved file previews: video previews now expose playback controls, and preview handling avoids image-only assumptions for unsupported item types.
- Improved sorting behavior so name, size, and date sorting reset the other sort states and toggle direction predictably.
- Improved multi-rename UI text and spacing.
- Improved Linux and release workflow files, including tag workflow updates.
- Updated README feature descriptions, supported archive formats, screenshots, and known issues.
- Added architecture, design, review, and implementation documentation for the copy/move conflict work.

## Uncommitted Working-Tree Changes Included in This Audit

These notes include the current working tree because this document describes the current version being prepared for merge. The following user-visible items were found only in uncommitted staged/unstaged changes at audit time and should be treated as release content only if they are committed before merge:

- **Disk context menu:** Disk items have a dedicated context menu with Open Disk, Add/Remove Favorite, Copy Path, Open in Terminal, Eject Disk, and Properties actions.
- **macOS disk eject:** Removable `/Volumes/...` disks can be ejected through a new Tauri command, with user-facing success/error toasts.
- **Disk selection/card refinements:** Disk entries carry removable-disk metadata, use improved card styling, and open on double-click while selecting on single click.
- **Light theme and style refinements:** Additional Light theme and CSS adjustments are present in the working tree.
- **Bundled Tauri asset deletion caveat:** The working tree also contains deletions under `src-tauri/tauri-assets`. This may be intentional cleanup or an incomplete local state; verify before treating it as release content.

## Notes for Testers

- Add and remove Favorites for folders, files, and disks; restart the app and verify favorites persist and open from the sidebar.
- Copy and move into folders that already contain files/folders with the same name. Verify Replace, Merge, Keep both, Skip, and Apply to all.
- Test multi-select Properties on large folders and close the dialog while size calculation is running.
- Test ZIP, Zstd, Density, Brotli, `.tar.gz`, and `.tar.bz2` compression/extraction where supported.
- Test Grid, List, Miller, and dual-pane view switching, including returning from dual-pane to the previous view.
- Test full search and quick search in single-pane and dual-pane modes.
- Test SSHFS mounting with a custom name, sidebar mount refresh, and unmount behavior.
- If the uncommitted disk changes are committed, test removable disk context-menu actions, especially Copy Path, Open in Terminal, and Eject Disk on macOS.

## Migration Notes

- No manual migration is expected. Favorites are stored in the existing app configuration as `arr_favorites` and default to an empty list for existing configs.

## Breaking Changes

- No intentional breaking changes were identified.

## Audit Scope

- Audited committed changes from `master` / `origin/master` to current `HEAD` on `some_work` / `origin/some_work`.
- Audited staged and unstaged working-tree changes and marked uncommitted-only items separately above.
- No version numbers were modified while preparing these notes.
