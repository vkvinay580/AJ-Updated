# Verification — 5 September 2026

Passed locally:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` (all 25 static pages generated)
- `gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug :app:assembleRelease`
- Three Java tests: production URL validation, origin comparison, protected export route restrictions.
- JavaScript helper checks: native save/share/print messages, external-origin rejection,
  and browser print fallback.
- Android 15 / Pixel 6 emulator: install and launch the APK, load the live HTTPS
  login page, display all three company choices, confirm the origin-restricted
  native bridge exists, open the native A4 print dialog, open/cancel the system file picker.
- Initial website update archive checked for exactly five source files plus instructions,
  using forward-slash paths for Linux/cPanel extraction.

Android lint completed with warnings about pinned dependency versions, the
JavaScript-enabled WebView needed by Next.js, and English text literals. There
are no lint errors. The legacy back handler has a narrow lint suppression because
API 33+ uses a separately registered native back dispatcher.

Not verified: authenticated customer/KYC/bill creation, real camera capture,
authenticated document save/share/report exports, and simultaneous account sessions.
These require a test account and the website integration deployed to the live server.
No live business records were created or changed. The website update was packaged,
not uploaded or deployed. Release output is unsigned; the provided installable APK
is the debug build.

Sidebar download update: targeted ESLint and the Android debug build/lint passed.
The refreshed production archive contains seven source files, the downloadable
APK, and deployment instructions. The APK download opens in the external browser
when selected inside the updated Android app.

Version 1.1.0 checks: Android debug build, unit tests and lint; targeted website
ESLint, TypeScript and production build passed. The new APK upgraded the emulator
installation to version code 2. Visual inspection confirmed the native toolbar
is gone. The icon source matches the website favicon byte-for-byte. The native
password-save acknowledgement/opt-out was exercised on the emulator; helper
checks covered opt-in, opt-out, no credential payload, older APK timeout and
browser fallback. Saving and subsequent autofill with a real password-manager
provider still need device testing after the login-page update is deployed.
The refreshed ZIP contains eight source files, the APK and deployment instructions.

Version 1.2.0 replaces password-manager saving with app-private AES-GCM storage
using Android Keystore. Website ESLint, TypeScript and production build passed;
Android build, lint and unit tests passed. Four Android 15 instrumentation tests
passed using synthetic credentials: encrypted persistence/reopening and deletion,
replacement/invalid input, corrupted-file recovery, and real WebView bridge
save/read/reload/clear with access rejected away from the login page. The test
origin is isolated from production. JavaScript checks passed for native save,
read, clear, browser fallback and storage-error reporting. WebView remote
debugging is disabled, including in the distributed testing APK.

Deploy both the website update and APK 1.2.0, then sign in once with the save
option checked. No production credentials or business records were used in tests.
