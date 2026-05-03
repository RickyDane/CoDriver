feat(files): add copy and move conflict handling

Add conflict resolution for copy and move operations so users can
choose whether to replace, merge, skip, or cancel when destination
items already exist. The new flow validates operations before making
changes and uses safer replace, merge, and move behavior to reduce
accidental data loss.
