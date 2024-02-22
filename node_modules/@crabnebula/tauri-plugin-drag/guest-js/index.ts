import { invoke, transformCallback } from "@tauri-apps/api/tauri";

export type DragItem =
  | string[]
  | { data: string | Record<string, string>; types: string[] };

export type DragResult = "Dropped" | "Cancelled";

/**
 * Logical position of the cursor.
 */
export interface CursorPosition {
  x: Number;
  y: Number;
}

export interface Options {
  item: DragItem;
  icon: string;
}

export interface CallbackPayload {
  result: DragResult;
  cursorPos: CursorPosition;
}

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
export async function startDrag(
  options: Options,
  onEvent?: (result: CallbackPayload) => void
): Promise<void> {
  await invoke("plugin:drag|start_drag", {
    item: options.item,
    image: options.icon,
    onEventFn: onEvent ? transformCallback(onEvent) : null,
  });
}
