# UI/UX Spec: Image Background Removal

Implement a new "Remove Background" feature within the existing Image Edit modal, leveraging Gemini AI to cutout subjects and save them as transparent PNGs.

## 1. User Interface

### Modal Integration
- Add a new tab to the `.modal-tabs` container in `showImageEditPopup` (in `ui/main_logic.js`).
- **Icon**: `fa-solid fa-scissors`
- **Label**: `Remove Background`

### Tab View (`.bg-remove-tab-view`)
- **Description**: "Uses Gemini AI to automatically detect the main subject and remove the background, saving the result as a transparent PNG."
- **Filename Input**: `bg-remove-filename-input`
  - Default value: `{original_name}_no_bg.png`
  - Validation: Ensure `.png` extension is maintained.

### API Key Warning
- Reuse the existing `.api-key-warning` pattern to ensure a Gemini API key is configured before allowing the operation.

### Footer Action
- **Button**: `bg-remove-item-button`
  - **Icon**: `fa-solid fa-scissors`
  - **Label**: `Remove Background`
  - **Visibility**: Only visible when the "Remove Background" tab is active.

## 2. Backend Implementation (Rust)

### New Command: `remove_background`
- **Parameters**:
  - `api_key: String`
  - `from_path: String`
  - `output_path: String`
- **Behavior**:
  - Read source image and convert to Base64.
  - Call Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview:generateContent`).
  - **Prompt**: `"Remove the background from this image. Return only the subject on a transparent background. Generate only the resulting image."`
  - Decode the returned Base64 image data.
  - Save to `output_path`.

## 3. Workflow

1. User selects an image and opens the "Image edit" context menu.
2. User selects the "Remove Background" tab.
3. UI generates a default filename with `_no_bg.png` suffix.
4. User clicks "Remove Background".
5. A new "Action" is created in the UI to track progress.
6. `remove_background` command is invoked.
7. Upon success:
   - Show a success toast.
   - Refresh the file list.
8. Upon failure:
   - Show an error toast with the Gemini API error.

## 4. Technical Constraints
- Output MUST be PNG to support transparency.
- Gemini API key must be present in settings.
