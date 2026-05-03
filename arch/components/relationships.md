# Component Relationships

```mermaid
graph LR
    Index[ui/index.html] --> Models[ui/models.js]
    Index --> Main[ui/main_logic.js]
    Index --> Menu[ui/contextmenu.js]
    Index --> Events[ui/events.js]
    Main --> Menu
    Menu --> Main
    Main --> Tauri[Tauri invoke]
    Events --> Main
    Tauri --> RustMain[src-tauri/src/main.rs]
    RustMain --> RustUtils[src-tauri/src/utils.rs]
    RustUtils --> Events
```

## Notes
- Script ordering matters: `models.js` defines `PopupType`; `main_logic.js` consumes it; `contextmenu.js` calls functions defined globally.
- UI state is shared mutable globals, not a component framework/store.
- Backend emits events that mutate DOM/progress state through `ui/events.js`.
