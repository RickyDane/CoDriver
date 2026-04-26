# Business Flow Diagrams

## Copy/Move Conflict Decision
```mermaid
flowchart LR
    A[User initiates copy/move] --> B[Resolve destination]
    B --> C[Check existing target names]
    C --> D{Conflicts?}
    D -->|No| E[Copy normally]
    D -->|Yes| F[Show modal]
    F --> G{Decision}
    G -->|Replace| H[Delete/overwrite destination]
    G -->|Merge| I[Merge directory contents]
    G -->|Duplicate| J[Generate name (n)]
    G -->|Skip| K[Do not copy item]
    G -->|Cancel| L[Abort operation]
    H --> M[Run copy]
    I --> M
    J --> M
    K --> N[Return skipped]
    M --> O{Move/cut?}
    O -->|Yes| P[Delete copied source only]
    O -->|No| Q[Refresh]
    P --> Q
```
