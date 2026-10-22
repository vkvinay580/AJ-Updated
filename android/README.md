# Aryan Gold Android

Connected Android app for **https://aryangold.in**, opening `/admin` and redirecting
to login when the saved session has expired.
The app runs the project's responsive screens in an Android WebView and uses
the existing Next.js API, sessions, company isolation, MySQL database, and private
file storage. It has no separate database or offline write queue. Saved changes
appear on other devices when the relevant screen is loaded/refreshed; it does not
add live push updates to screens that are already open.

## Features

- Existing login/company selection, dashboard, customers, KYC, billing, bill import,
  stock ledger, reports, password changes, and public website screens.
- Native Android camera permission for the existing live camera capture UI.
- Single- and multi-file selection for team-chat attachments.
- Native microphone permission for team-chat voice notes, limited to the configured trusted website origin.
- System file picker for KYC, images, signatures, and Excel imports.
- Save invoice PDFs and PDF/Excel reports using Android's file destination picker.
- Share invoice PDFs through Android's share sheet, including WhatsApp when installed.
- Print invoices through Android's print service; Save as PDF downloads the
  server-generated invoice instead.
- Android back navigation, tap-to-retry connection failure feedback, persistent
  sign-in cookies, and support for simultaneous website/app sessions.
- Full-screen website without Home, Reload, or Server buttons, plus the canonical
  `aryangoldbuyers.com` Aryan Gold mark as the adaptive launcher icon.
- **Save password in this app** remembers the last successfully used email,
  password and company on this device. Android Keystore AES-GCM encryption protects
  the saved entry in app-private, non-backed-up storage. The login form fills it
  on return; sign-in still requires tapping the sign-in button. Unchecking the
  option deletes the saved entry. No password-manager provider is required.

## Install and build

The development APK is `app/build/outputs/apk/debug/app-debug.apk`. Transfer it
to an Android 8.0+ phone and open it to install, allowing installation from the app
used to open it when Android asks. Keep Android System WebView updated.

Open this `android` folder in Android Studio, install SDK 36, and use JDK 17.
Alternatively set `ANDROID_HOME` to your SDK directory and run:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

On macOS/Linux use `sh ./gradlew` with the same arguments. The Gradle wrapper is included.
No website or database credentials belong in the APK.

The default website is compiled as `https://aryangold.in`. To build for another
deployment use `-PwebsiteUrl=https://your-domain.com`. Release builds require HTTPS.
There is no in-app server selector. Use a trusted HTTPS development deployment
and the build property above when testing a different backend.

For a local emulator backend, start the website on port 3000, then run:

```powershell
adb reverse tcp:3000 tcp:3000
.\gradlew.bat :app:assembleDebug -PdebugWebsiteUrl=http://localhost:3000
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aryangold.suite/.MainActivity
```

`debugWebsiteUrl` applies only to debug builds. Release builds continue to require
an HTTPS origin. Repeat `adb reverse` after restarting the emulator.

For distribution, use Android Studio **Build > Generate Signed App Bundle / APK**
and create/store your own release signing key securely. The debug APK is for
testing and is not a Play Store release. WebView debugging is disabled in all
builds. Release builds block cleartext HTTP. Version 1.3.1 (code 5) updates the previous APK in place
when signed with the same key.

## Deploy the website integration

Upload these changed/new source files to the existing cPanel application root:

1. The updated application source, including `lib/chat.ts`, `app/api/chat`,
   `components/chat/ChatDock.tsx`, the authenticated workspace components, and
   `app/globals.css`.
2. `database/schema.sql` and `scripts/setup-db.mjs`.
3. `public/downloads/aryan-gold.apk`.

The admin sidebar offers **Download Android app** using the public APK path.
The bundled download is currently the debug/testing build.

Run `npm run db:setup` and `npm run build` in the cPanel Node.js environment, then restart the application.
Keep all existing production environment settings, encryption keys, database,
and `storage` files. The setup command creates the chat directory/message tables
and `storage/chat`; existing records and passwords remain intact.
The Android folder does not need to be uploaded to the web server.

Until these website changes are deployed, ordinary screens work but the existing
browser print/blob-download/share buttons will not have their native Android hooks.
Logging in will also retain the previous single-session behavior until `lib/auth.ts`
is deployed. Logout revokes only the current device's session; changing the password
continues to revoke other sessions.

## Verification on a device

Use a test account and test records for changes to the live service:

1. Sign in on the website and app with the same company; both should stay signed in.
2. Open customers and bills, verify company isolation and search, and navigate back.
3. Register/edit a test customer; try camera allow/deny and file upload, including PDFs.
4. Create a test bill with photos/signature. Reload the website register to confirm it.
5. Open that bill; test Print, Save as PDF, Share, and share after saving a new bill.
6. Export PDF and Excel reports, open the files, and try cancelling the save picker.
7. Import a test spreadsheet and check stock adjustments/ledger.
8. Disconnect networking and reload; reconnect and retry. Check the bill register
   before resubmitting an interrupted save to avoid duplicates.
9. Sign out on one device; verify the other session still works. A password change
   should revoke other devices, and company data should remain isolated.
10. With **Save password in this app** selected, sign in successfully once, sign
    out, and verify the saved email/password/company fill the login form. Force
    stop/reopen the app and repeat. Uncheck the option, reopen login and verify
    the saved entry is gone. A failed sign-in must not replace a saved password.
    If a password is changed elsewhere, enter the new password and sign in once
    to update this device's saved entry. Logout keeps saved credentials; clearing
    app data or uninstalling removes them.
11. Open Team chat, select a user, send text and multiple documents, capture a photo, and
    record a voice note. Verify camera and microphone denial shows a recoverable
    message and granting each permission allows the requested capture only.

Automated Java tests check HTTPS/origin validation and the authenticated export
route allowlist. They do not replace authenticated device testing.

## Native boundaries

The message bridge is limited to the configured origin and main frame using
[AndroidX WebView's message listener](https://developer.android.com/reference/androidx/webkit/WebViewCompat.WebMessageListener).
Native downloads accept only known document/export routes, send the app's session
cookie to that origin, refuse redirects, check status/content type, and limit files
to 100 MB. Private share files use temporary read grants and are cleaned on a later
launch after 24 hours. App backups are disabled. SSL errors are never bypassed.
Printing uses [Android's WebView print adapter](https://developer.android.com/training/printing/html-docs).
