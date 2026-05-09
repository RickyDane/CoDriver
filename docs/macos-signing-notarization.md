# macOS signing and notarization

CoDriver macOS release artifacts must be signed with an Apple **Developer ID Application** certificate and notarized by Apple. Unsigned or non-notarized DMGs/apps commonly open as “CoDriver is damaged and can’t be opened” after download because Gatekeeper blocks quarantined builds.

## GitHub Actions secrets

Configure these repository secrets before publishing macOS releases:

| Secret | Required | Description |
| --- | --- | --- |
| `APPLE_CERTIFICATE` | Yes | Base64-encoded `.p12` export containing the Developer ID Application certificate and private key. |
| `APPLE_CERTIFICATE_PASSWORD` | Yes | Password used when exporting the `.p12`. |
| `KEYCHAIN_PASSWORD` | Yes | Random password used only by CI for the temporary keychain. |
| `APPLE_ID` | Yes | Apple ID email used for notarization. |
| `APPLE_PASSWORD` | Yes | App-specific password for that Apple ID. |
| `APPLE_TEAM_ID` | Yes | Apple Developer Team ID. |

Create the certificate secret on macOS:

```bash
base64 -i DeveloperIDApplication.p12 | pbcopy
```

Paste the copied value into `APPLE_CERTIFICATE`. Do not commit the `.p12`, passwords, API keys, or generated keychains.

## Release behavior

The release workflows import the Developer ID certificate into a temporary keychain on macOS runners, select the `Developer ID Application:` identity, then run `tauri-apps/tauri-action`. Tauri v1.6 signs the macOS app bundle with the selected identity and uses `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` for notarization.

The current app is distributed outside the Mac App Store, so `src-tauri/tauri.conf.json` intentionally leaves `tauri.bundle.macOS.entitlements` as `null`. Do not enable App Sandbox entitlements unless the app has been tested with sandbox restrictions; CoDriver is a file explorer and needs broad filesystem access.

## Local verification

After downloading a CI-built DMG or app, verify it on macOS:

```bash
spctl --assess --type open --verbose=4 CoDriver_*.dmg
xcrun stapler validate CoDriver_*.dmg
hdiutil attach CoDriver_*.dmg
spctl --assess --type execute --verbose=4 /Volumes/CoDriver/CoDriver.app
codesign --verify --deep --strict --verbose=4 /Volumes/CoDriver/CoDriver.app
codesign -dv --verbose=4 /Volumes/CoDriver/CoDriver.app
xcrun stapler validate /Volumes/CoDriver/CoDriver.app
```

For local ad-hoc builds only, quarantine can be removed for testing:

```bash
xattr -dr com.apple.quarantine /path/to/CoDriver.app
```

Do not use `xattr` as a release fix. Proper release artifacts must pass `spctl` without removing quarantine.
