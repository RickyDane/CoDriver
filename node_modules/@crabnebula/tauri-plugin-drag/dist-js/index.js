import { invoke, transformCallback } from '@tauri-apps/api/tauri';

/**
 * Starts a drag operation. Can either send a list of files or data to another app.
 *
 * ```typescript
 * import { startDrag } from "@crabnebula/tauri-plugin-drag";
 *
 * // drag a file:
 * startDrag({
 *  item: ["/path/to/file.png"],
 *  icon: "/path/to/preview.png"
 * });
 *
 * // drag Final Cut Pro data:
 * startDrag({
 *   item: {
 *    // alternatively, you can pass an object mapping each type to its own XML format
 *     data: '<fcpxml version="1.10">...</fcpxml>',
 *     types: [
 *       "com.apple.finalcutpro.xml.v1-10",
 *       "com.apple.finalcutpro.xml.v1-9",
 *       "com.apple.finalcutpro.xml"
 *     ]
 *   }
 * });
 * ```
 *
 * @param options the drag options containing data and preview image
 * @param onEvent on drag event handler
 */
async function startDrag(options, onEvent) {
    await invoke("plugin:drag|start_drag", {
        item: options.item,
        image: options.icon,
        onEventFn: onEvent ? transformCallback(onEvent) : null,
    });
}

export { startDrag };
