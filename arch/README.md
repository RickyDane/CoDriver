# CoDriver Architecture

CoDriver is a Tauri desktop file explorer. The frontend is a static HTML/JavaScript app in `ui/`; the backend is a Rust Tauri command layer in `src-tauri/`.

```mermaid
graph TB
    User[User]
    UI[Static UI: ui/index.html]
    Logic[Global JS: ui/main_logic.js]
    Menu[Context Menu: ui/contextmenu.js]
    Events[Tauri Events: ui/events.js]
    Bridge[Tauri invoke/listen bridge]
    Commands[Rust commands: src-tauri/src/main.rs]
    Utils[Rust helpers: src-tauri/src/utils.rs]
    FS[(Filesystem)]

    User --> UI
    UI --> Logic
    Menu --> Logic
    Logic --> Bridge
    Bridge --> Commands
    Commands --> Utils
    Commands --> FS
    Utils --> FS
    Utils --> Bridge
    Commands --> Bridge
    Bridge --> Events
    Events --> UI
```

## Documentation Map
- `arch/context.md`: project context for feature work.
- `arch/components/file-operations.md`: copy/move architecture and conflict feature notes.
- `arch/components/relationships.md`: component dependencies.
- `arch/data/models.md`: important data shapes and global state.
- `arch/data/flows.md`: data flows.
- `arch/api/contracts.md`: Tauri command contracts relevant to file ops.
- `arch/api/sequences.md`: command sequences.
- `arch/diagrams/architecture.md`, `flow.md`, `sequence.md`: Mermaid diagrams.
