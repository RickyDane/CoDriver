# Release Notes: Copy/Move Conflict Handling

## Summary
Copy and move operations now handle name conflicts with clear choices and safer behavior. Users can decide how to continue when a destination already contains matching files or folders.

## What's New
- **Conflict Resolution Modal**: When conflicts are detected, users can choose to replace existing items, merge folders, skip conflicts, or cancel the operation.
- **Safe Replace Behavior**: Replace actions validate the target before changing files and avoid unsafe overwrites.
- **Safe Merge Behavior**: Folder merges preserve existing content while adding non-conflicting items and prompting for nested conflicts.
- **Safe Move Behavior**: Move operations use the same conflict checks as copy operations, reducing the chance of accidental data loss.
- **Validation Before Changes**: Source, destination, permissions, and conflict choices are checked before file operations run.

## Bug Fixes
- Fixed copy and move flows that could fail or behave unpredictably when destination names already existed.
- Fixed cases where conflict handling did not clearly explain the available action before continuing.

## Migration Notes
No migration required. The new conflict handling is applied automatically to copy and move operations.

## Breaking Changes
None.

## Review Notes
- Minor approved caveats remain: some edge cases may still depend on platform file-system behavior, and very large conflict sets may require repeated modal decisions.
