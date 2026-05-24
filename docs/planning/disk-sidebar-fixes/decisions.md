# Decisions: Disk Sidebar Display and Usage Refresh Fixes

## D1: Treat quote cleanup as display-only
**Decision:** Strip only one matching outer quote pair from disk display labels. Preserve raw values for paths, dataset attributes, and backend calls.  
**Rationale:** Prior fix intentionally preserved raw disk path/name for behavior. The current bug is visual; path mutation risks breaking navigation/unmount.

## D2: Use event-driven/debounced refresh, not polling
**Decision:** Refresh disk usage after operation completion and coalesce calls with a short debounce.  
**Rationale:** Disk usage should become current after mutations, but continuous polling wastes work and can cause UI churn during long operations.

## D3: Prefer updating existing disk row DOM
**Decision:** Update `.disk-nav-usage`, `.disk-nav-progress-fill`, and `title` in place from fresh `list_disks` data. Fall back to `insertSiteNavButtons()` only if row mapping is unreliable.  
**Rationale:** In-place update avoids flicker, preserves collapse state/selection better, and minimizes re-render cost.

## D4: Preserve safe DOM construction for disk rows
**Decision:** Do not reintroduce string-built disk rows or unsafe `innerHTML` for mount-provided values.  
**Rationale:** Recent work added safe DOM creation and progress bars; this fix must not regress XSS/path safety.
