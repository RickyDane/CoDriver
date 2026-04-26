# API Contracts

## Existing Tauri Commands Relevant to Feature

### `arr_copy_paste`
Location: `src-tauri/src/main.rs`

Input from JS:
```js
invoke("arr_copy_paste", {
  arrItems: FDir[],
  isForDualPane: "0" | "1",
  copyToPath: string
})
```

Current return: none (`async fn` returns `()`). Emits progress events.

Current behavior: copies each item to destination; if destination exists, uses duplicate filename via `get_final_filename`.

### `arr_delete_items`
Input:
```js
invoke("arr_delete_items", { arrItems: string[] })
```
Deletes each source path. Used after copy for move/cut.

### `set_dir`
Used before dual-pane copy to switch backend current directory to opposite pane when no explicit `copyToPath` is provided.

## Proposed Additions

### Option A: Extend `arr_copy_paste`
Add optional `conflictPolicy` and `decisions` args while preserving existing callers.

```ts
type ConflictPolicy = "duplicate" | "replace" | "merge" | "skip";

type CopyDecision = {
  sourcePath: string;
  policy: ConflictPolicy;
};

type CopyResult = {
  sourcePath: string;
  destinationPath: string;
  policy: ConflictPolicy;
  status: "copied" | "replaced" | "merged" | "duplicated" | "skipped" | "failed";
  error?: string;
};
```

### Option B: New commands
- `check_copy_conflicts(arrItems, copyToPath, isForDualPane) -> CopyConflict[]`
- `arr_copy_paste_with_conflicts(arrItems, copyToPath, isForDualPane, decisions) -> CopyResult[]`

Option B is safer because it avoids breaking existing behavior and gives platform-correct path resolution in Rust.
