# Release Notes: CoDriver v0.7.6

## Summary
CoDriver version 0.7.6 introduces key bug fixes for cross-platform visual consistency, window control functionality, and file preview/thumbnail generation on Windows.

## What's New & Fixes

### 1. Windows Image Thumbnail Fix
- **Problem**: Image thumbnails did not load on Windows systems, displaying only a circular loading/activity indicator.
- **Fix**: Resolved path separator mismatch issues in `src-tauri/src/main.rs` by switching from hardcoded forward-slash (`/`) splits to native Rust `Path` methods. Normalized path separators across different OS platforms, ensuring that thumbnails generate and display correctly on Windows while preserving existing macOS and Linux functionality.

### 2. Disabling Sidebar Top Blur on Windows & Linux
- **Problem**: Blur effects at the top of the sidebar are designed primarily for macOS-like translucent UI styles and caused visual inconsistencies or performance issues on other platforms.
- **Fix**: Modified styles in `ui/style.css` to hide the sidebar top blur element (`.site-nav-bar-blur-top`) on non-macOS platforms, keeping it enabled only for macOS (`.darwin`).

### 3. Window Maximize Button Fix (Windows & Linux)
- **Problem**: Maximize and toggle maximize buttons/window actions could fail or fail to update on Windows and Linux.
- **Fix**: Explicitly added the `core:window:allow-toggle-maximize` capability to the Tauri permissions configuration (`src-tauri/capabilities/migrated.json`), enabling smooth and reliable window maximization across all supported desktop platforms.

## Migration Notes
No migration required. These fixes are applied automatically upon upgrading to `v0.7.6`.
