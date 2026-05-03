# Data Models and State

## Frontend Globals Relevant to Copy/Move
- `ArrSelectedItems`: selected DOM elements.
- `ArrCopyItems`: DOM elements staged by copy/cut.
- `IsCopyToCut`: boolean; true when staged operation is a move/cut.
- `IsDualPaneEnabled`, `SelectedItemPaneSide`, `LeftDualPanePath`, `RightDualPanePath`: determine destination pane for F5/Shift+F5.
- `CurrentDir`: current active directory.

## JS Item Shape Passed to Rust
`pasteItem` and `itemMoveTo` map DOM attributes into Rust-compatible objects:

```js
{
  name: item.getAttribute("itemname") ?? "",
  path: item.getAttribute("itempath") ?? "",
  is_dir: parseInt(item.getAttribute("itemisdir") ?? 0) ?? 0,
  size: item.getAttribute("itemrawsize") ?? "",
  last_modified: item.getAttribute("itemmodified") ?? "",
  extension: item.getAttribute("itemext") ?? ""
}
```

## Proposed Conflict Data Shape
```ts
type ConflictPolicy = "replace" | "merge" | "duplicate" | "skip";

type CopyConflict = {
  sourcePath: string;
  destinationPath: string;
  name: string;
  sourceIsDir: boolean;
  destinationIsDir: boolean;
};

type CopyDecision = {
  sourcePath: string;
  policy: ConflictPolicy;
};
```

Rust equivalent should derive `serde::Deserialize`/`Serialize`.
