# Local development

## Recovered backup

The original GitHub backup omitted backend routes, views, dependencies, and Flutter source.
Missing backend files were restored from `Backend/public_html-no-media-20260821-222854 (1).zip`, preserving existing tracked files. The archive also supplies `Backend/build/web`, the previous compiled Flutter website.
The restoration archive and generated local web bundle are kept out of the project repository; the restored source and the documented Flutter build steps are included instead.

Complete frontend source for 5.0.36+5037 was restored from `aryan-gold/attendance_app` commit `557e01dff11a839ded29495aac623fc42e6ff899`. The existing pubspec and lockfile match that source exactly. Missing platform directories, assets, Dart code, and existing tests were copied before local Aryan Gold rebranding. Full upstream guides are retained in `UPSTREAM_DEVELOPER_GUIDE.md` and `UPSTREAM_USER_GUIDE.md`.

The Aryan Gold rebrand keeps existing Dart workflows, routes, local API settings, and backend behavior intact while renaming the Android namespace/application ID to `aryan.attendance`. It replaces the consumed PNG assets with Aryan Gold asset names, adds `assets/images/aryan_gold_splash_logo.png`, updates Android launcher/notification/native splash resources, web favicon/PWA icons, backend admin logo assets, and ID-card logo assets. The visible palette uses deep teal, gold, wine, and warm ivory.

Local builds use Flutter 3.44.8, Java from Android Studio, and the Android SDK under the current user's LocalAppData. Build Android with `flutter build apk --debug --dart-define=API_BASE_URL=http://127.0.0.1:8000/api`, using `adb reverse tcp:8000 tcp:8000`. Production signing and Firebase configuration are external to the repository; the local build uses debug signing and does not enable Firebase push.

The direct Attendance APK linked from AJ's `/login` page is built with `flutter build apk --release --no-pub --dart-define=API_BASE_URL=https://attendance.aryangold.in/api` and copied from `build/app/outputs/flutter-apk/app-release.apk` to AJ's `public/downloads/aryan-attendance.apk`. The current local build has no release keystore and uses debug signing; replace it with the properly release-signed APK before distributing updates to devices with the Play Store signed version installed.

The private repository contains dated development database snapshots in `../../../database/backups/`: `aj_dev-2026-10-14.sql` and `attendance_local-2026-10-14.sql`. They include confidential employee and business records; restrict access and do not copy them into public repositories or environments. Other database dumps, employee roster/payroll exports, the May 2026 PF employee allowlist, uploaded ID-card photos, runtime sessions, local `.env` files, and compiled local build output remain excluded from Git. Restore the optional PF allowlist from its authorized secure source; do not replace it with fabricated records.

To restore a snapshot into a local MySQL/MariaDB server, provide local credentials through the normal client environment and import the file, for example: `mysql -u <local-user> -p < database/backups/attendance_local-2026-10-14.sql`. The dump creates the database named in the file. The AJ snapshot can be imported the same way from `database/backups/aj_dev-2026-10-14.sql`. Keep restored databases local and access-controlled.

The machine's empty Java proxy-host settings prevented Gradle from automatically downloading Android SDK components. Command-line Android tools installed platforms 35 and 36, build tools 35.0.0 and 36.0.0, NDK 28.2.13676358, and CMake 3.22.1. The malformed empty `systemProp.http.proxyHost` and `systemProp.https.proxyHost` entries were removed from the user's `.gradle/gradle.properties`, after preserving a sibling `gradle.properties.attendance-backup`. Other settings were retained, and the Gradle daemon was restarted. Windows desktop builds were disabled only in the local Flutter tool configuration to avoid requiring system Developer Mode for desktop plugin symlinks; platform source remains available.

Validation: `flutter analyze --no-pub --no-fatal-infos` reports only two existing informational web-library deprecation messages. All 17 restored Flutter tests pass. The standard JavaScript web build succeeds; its dependencies currently do not support the optional WebAssembly build. Laravel serves the new `frontend/build/web` bundle before the archived backend bundle.

Android debug build completed at `build/app/outputs/flutter-apk/app-debug.apk` (5.0.36 / 5037) with Android package `aryan.attendance`. A copy is available in `Backend/public/downloads/aryan-attendance-5.0.36-local.apk`. Its current Aryan Gold rebrand SHA-256 is `717c0d986a793cb194ef09defee222f9f79d8f79ce2bf1d7ff2dbcc7a123af07`. The archived APK used a different signing certificate, so the old emulator installation and old package were removed before installing this local debug build. The local database was retained.

The Pixel 7 API 34 emulator reports package `aryan.attendance`, version 5.0.36 (5037). Its app reaches the login screen without an update block and successfully signs in to the local employee dashboard. Notification and alarm permissions are available through the emulator permission prompts. Local administrator sign-in reaches `/admin/dashboard` with HTTP 200; employee login, profile, latest attendance, and notification requests also succeed. No attendance or site-visit submission was made during verification. Production signing, push integration, and real-device camera/GPS attendance are outside these local checks.

The local backend update metadata is aligned to 5.0.36 (5037). It serves the local APK from `/downloads/aryan-attendance-5.0.36-local.apk` after the build is installed. Its user-facing update message now uses Aryan Gold branding. No live deployment is changed.

The local Laravel environment uses XAMPP PHP 8.2 and MariaDB on port 3306, the separate `attendance_local` database imported from `attendance.sql`, and `http://127.0.0.1:8000`. Environment secrets remain in the ignored `Backend/.env`. Mail uses the log driver.

The Flutter web login keeps its card expanded to the available viewport height and applies web-only vertical outer padding plus a complete rounded shadow boundary. Admin layout images must be resolved with `ProjectAsset::url(...)`, which normalizes both Artisan's public document root and shared-hosting project-root URLs. The header checks an uploaded admin image exists before falling back to the bundled Aryan Gold icon.

The shared Flutter theme defines consistent 48-pixel minimum Filled/Outlined button targets, accessible field borders and focus states, and floating high-contrast snackbars. `_HiddenScrollbarBehavior` now delegates to Flutter's Material desktop scrollbar implementation on desktop web while retaining the compact mobile behavior. The dashboard uses always-scrollable clamping physics on every platform; do not restore `NeverScrollableScrollPhysics` for web because it prevents shorter browser windows from reaching lower dashboard actions.

## Employee documents

The `employee_documents` table stores employee ID, document type, optional display title, optional payslip period, original filename, MIME type, size, uploader, and a private storage path. Files use the Laravel local disk under `storage/app/private/employee-documents/{employee_id}`; they are not served from `public/storage`.

HR Admin users manage documents from the employee edit page. Accounts users use the **Employee Documents** sidebar page to search for an employee and manage their files. Uploads are limited to PDF, DOC, and DOCX files up to 20 MB; payslips require a `YYYY-MM` period. The employee API exposes `GET /api/employee/documents` behind Sanctum authentication. It returns only the authenticated employee's records and relative signed download URLs that expire after 15 minutes. `GET /api/employee/documents/{employee}/{document}/download` validates the relative signature and confirms document ownership before streaming the attachment. Keep the signed route private to the API-generated URLs and include `storage/app/private/employee-documents` in local and production backups.

## AJ business integration

The Laravel API is the source of truth for business-portal employees, active branches, `employee.assigned_branch_id`, and `employee_app_credentials`. AJ calls `GET /api/business/directory`, `POST /api/business/assign`, and `POST /api/business/login` from its server only. Every request must carry `X-Aryan-Integration-Key`, matched in constant time against `ARYANGOLD_BUSINESS_INTEGRATION_KEY`. Never expose this key to browser code. Production AJ and Attendance must use the same independently generated secret; local development uses the ignored environment files. Set the same 32-byte (64-character hexadecimal) value as `ATTENDANCE_INTEGRATION_KEY` in AJ's `.env.local` and `ARYANGOLD_BUSINESS_INTEGRATION_KEY` in the Attendance backend's `.env`. After rotating it, restart AJ and clear Laravel's configuration cache before testing the integration.

The assignment endpoint updates `assigned_branch_id` and optionally creates or replaces the branch-specific password hash. The login endpoint requires an active employee, active branch, matching current assignment, matching branch credential, and valid password. The directory response intentionally omits password hashes and other personal data.

`POST /api/business/login` validates those conditions in a defined order and returns Laravel JSON validation errors suitable for direct display by AJ: unknown employee or bad password, inactive employee, missing assignment, invalid/inactive branch, assignment mismatch, or missing branch credential. AJ sends `Accept: application/json`, extracts the first field validation message, and validates successful response shape before creating a branch session so an incomplete upstream payload cannot cause a `branchId` runtime error.

The recovered `Backend/build/web/main.dart.js` API defaults were changed from the production hosts to `http://127.0.0.1:8000/api`. This adjustment belongs only to this local compiled build and must be repeated if it is restored from the archive. Pending Laravel migrations are applied only to the local database.

MariaDB required a supporting `employee_id` index on `id_card_submissions` before the soft-delete migration could drop its unique index. The supporting index was added to the local database, then all pending migrations completed. Frontend HTML, its bootstrap script, its compiled JavaScript, and the administrator login returned HTTP 200. Authenticated workflows require account credentials and were not exercised.

`Backend/public/index.php` delegates to the backup's cPanel entry point. Start the web server from `Backend` with:

```powershell
& E:/xampp/php/php.exe artisan serve --host=127.0.0.1 --port=8000
```

MariaDB must be running before using database-backed pages. Existing databases were left intact. No queue worker or scheduler is started for this local preview.

## Documentation change log

- 2026-10-14: Added complete local data snapshots for AJ (`aj_dev`) and Attendance (`attendance_local`) to the private repository and documented their confidential handling and restore steps.
- 2026-10-14: Documented the clean-clone build inputs and the private local data excluded from the project repository.
- 2026-10-14: Built the direct-download Attendance APK against the hosted API and documented its AJ public download path and signing limitation.
- 2026-10-10: Added shared motion timing, smoother page and navigation feedback, modal/dropdown transitions, and reduced-motion safeguards to the Attendance administrator web UI.
- 2026-10-10: Configured the local browser-visible CARTO basemap key, changed the admin branch map to the authenticated Voyager raster endpoint, and documented cache/restart requirements without recording the key.
- 2026-10-10: Regenerated the local AJ/Attendance integration secret, configured both ignored environment files with the same value, and documented restart and cache requirements without recording the secret.
- 2026-10-10: Standardized Flutter form/button feedback, restored the Material desktop web scrollbar and scroll physics, and separated My Attendance identity fields for responsive alignment.
- 2026-10-06: Added web-only top/bottom login spacing and full card rounding, corrected dashboard logo/profile URLs through `ProjectAsset`, and documented the bundled admin-image fallback.
- 2026-10-06: Hardened AJ branch-login response handling and documented the distinct JSON errors for credentials, employee status, branch assignment, branch validity, and password setup.
- 2026-10-06: Added authenticated AJ business integration endpoints for the live employee/branch directory, admin branch assignment and password setup, and branch login verification.
- 2026-10-05: Truncated `recruitment_candidate_activity_logs`, `recruitment_candidates`, and `recruitment_form_links`; cleared `Backend/public/storage/recruitment`; verified branches, employees, and the single admin remain intact.
- 2026-10-05: Updated `AryanGoldBranchAndEmployeeSeeder` to prune old employee/branch rows and related local references, keep only the five `AGBPL` branches, keep one backend admin, seed Vinay for Head Office, and seed one default employee plus branch-opening assignment for each non-HO branch.
- 2026-10-05: Updated `AryanGoldBranchAndEmployeeSeeder` so local admin seeding prunes other admin rows and leaves only the assigned admin username; verified old admin logins redirect back to `/admin/login`.
- 2026-10-05: Added `AryanGoldBranchAndEmployeeSeeder`, seeded `AGBPL000` Head Office plus Tambaram, Adyar, Malleshwaram, and T Nagar branches, switched head-office constants from `AGPL000` to `AGBPL000`, rebuilt web/APK, reinstalled the emulator app, and refreshed the backend APK hash.
- 2026-10-05: Regenerated Flutter web favicon and PWA icon PNGs from `aryan_gold_launcher.png`, added a favicon cache-buster, rebuilt web, and replaced `Backend/build/web`.
- 2026-10-05: Rebuilt `frontend/build/web` with the local API define, replaced `Backend/build/web`, cleared Laravel caches, and verified the served index, manifest, and `main.dart.js` no longer contain legacy brand text.
- 2026-10-05: Renamed Android namespace/application ID to `aryan.attendance`, moved the Kotlin activity package, renamed legacy asset/config/service identifiers, scrubbed remaining legacy brand/package references, rebuilt and reinstalled the APK, and refreshed the backend download hash.
- 2026-10-05: Updated `_LoginBrandLogo` to use the square `aryan_gold_logo.png` emblem on mobile and the wide `aryan_gold_login_logo.png` wordmark on web, rebuilt the debug APK, installed it on the emulator, and refreshed the local APK download.
- 2026-10-05: Replaced the padded shared `aryan_gold_logo.png` with a tight square emblem, tightened `aryan_gold_id_card_logo.png`, increased source logo slots on loading/update/ID-card views, and copied the updated assets to the existing generated web bundle.
- 2026-10-05: Added a dedicated `aryan_gold_login_logo.png` source asset for the employee web login header, updated `_LoginBrandLogo` to use the wider dark-header logo ratio, and patched the existing generated web bundle because Flutter was not available on PATH in this shell.
- 2026-10-05: Added `aryan-gold-theme` as the backend admin default across theme validation, login/layout fallbacks, profile previews, migration defaults, and local old-default admin rows while preserving existing themes.
- 2026-10-05: Added the Aryan Gold rebrand across Flutter assets, app labels, web metadata, Android splash and icon resources, Laravel admin/recruitment/privacy/ID-card views, backend update defaults, local environment wording, and maintained docs. Existing package IDs, routes, API URLs, and workflows were retained.
- 2026-10-05: Enlarged the web sign-in logo by raising the web-only login brand heights and adding a viewport-aware width cap to the logo widget.
- 2026-10-05: Updated `resources/views/admin/login.blade.php` to resolve admin CSS, JavaScript, favicon, and logo assets through `ProjectAsset::url(...)`, matching the authenticated admin layout and supporting both project-root and public-document-root serving.
- 2026-10-05: Restored complete latest frontend source and assets, retained upstream guides, configured local Android tooling, and aligned backend update metadata with version 5.0.36 (5037).
- 2026-10-05: Found the native 5.0.22 APK in `Backend/production-artifacts/attendance-backend-2026-08-11-deploy.zip`, installed it on Pixel 7 API 34, and launched its main activity. It contacts production and is blocked by the production 5.0.34 minimum-version requirement. No native source is available to rebuild it with the local API. A local HR administrator and one employee password were configured and verified only in `attendance_local`; credentials are omitted from documentation.
- 2026-10-05: Restored missing deployment files and documented the local XAMPP setup and compiled frontend limitation.
