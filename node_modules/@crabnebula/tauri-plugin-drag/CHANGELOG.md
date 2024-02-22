# Changelog

## \[0.3.0]

- [`dd3f087`](https://github.com/crabnebula-dev/drag-rs/commit/dd3f0873ae2406968d412d9dfdc1c79a5ed5533e)([#25](https://github.com/crabnebula-dev/drag-rs/pull/25)) Changed the onEvent callback payload from `DragResult` to `{ result: DragResult, cursorPos: CursorPosition }`.

## \[0.2.2]

- [`dcafc76`](https://github.com/crabnebula-dev/drag-rs/commit/undefined) Fixes package ignoring dist files.

## \[0.2.1]

- [`4d0ce4f`](https://github.com/crabnebula-dev/drag-rs/commit/4d0ce4f2a2d81596f67adba2bc6addd8af50a73c) Fixes package missing dist files.

## \[0.2.0]

- [`1449076`](https://github.com/crabnebula-dev/drag-rs/commit/14490764de8ff50969a3f2299d204e44e091752e) The `startDrag` function now takes an argument for a callback function for the operation result (either `Dragged` or `Cancelled`).
- [`f58ed78`](https://github.com/crabnebula-dev/drag-rs/commit/f58ed7838abe1fe5b23c4e3aa92df28e77564345) The `startDrag` function can now be used to drag arbitrary data strings on macOS (e.g. Final Cut Pro XMLs).

## \[0.1.0]

- [`644cfa2`](https://github.com/crabnebula-dev/drag-rs/commit/644cfa28b09bee9c3de396bdcc1dc801a26d65bc) Initial release.
