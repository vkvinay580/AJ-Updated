# Local attendance app

Open `http://127.0.0.1:8000/` for the Aryan Gold employee web application and `http://127.0.0.1:8000/admin/login` for administrator sign-in.

Use an existing authorized account from the imported backup or the local accounts supplied in chat. The local database is separate from existing XAMPP databases. Complete frontend source, Android code, and assets for version 5.0.36 (5037) are now restored and locally rebranded for Aryan Gold. The full upstream user guide is retained in `UPSTREAM_USER_GUIDE.md`.

The production app connects to `https://attendance.aryangold.in/api` by default. Local employee web and Android builds connect to the local API only when the developer builds them with the documented `API_BASE_URL` override. Release Android builds reject cleartext HTTP; debug builds retain HTTP support for local development.

The Aryan Gold staff login page at `https://aryangold.in/login` provides direct Android APK downloads for both the AJ app and the Attendance app. The Attendance APK opens the hosted service at `https://attendance.aryangold.in`.

The employee web sign-in screen fills the available browser height while keeping visible breathing room above and below the login panel. The administrator dashboard now displays the Aryan Gold sidebar logo and uses the Aryan Gold icon whenever an administrator has no uploaded profile photo.

Attendance forms now use consistent high-contrast fields, focus borders, and full-height action buttons. On the My Attendance page, the employee name, branch name, employee ID, and branch ID are shown on separate aligned lines so long names remain readable. Desktop web dashboards can be scrolled normally and display a standard scrollbar when content extends below the window.

Version 5.0.36 (5037) is installed and running in the Pixel 7 emulator as Android package `aryan.attendance`, with local employee sign-in verified. It no longer shows the production update block or any legacy brand text. The local APK is available at `http://127.0.0.1:8000/downloads/aryan-attendance-5.0.36-local.apk`. This is a debug-signed local build; the previous archived emulator installation and old package were replaced. Local database accounts were retained.

Keep the local database and web server running while using the app. If the website cannot be reached, restart the server using the developer guide. Local email is written to Laravel logs.

## Employee documents

Employees can open **My Profile > My Documents** in the Attendance app to download documents uploaded for their account. Available types include offer letters, monthly payslips, experience letters, and relieving letters. Downloads open through the device browser and use a short-lived secure link.

HR Admin users can open an employee record and choose **Employee Documents**. Accounts users can open **Employee > Employee Documents** in the admin sidebar and search for an employee. Upload PDF, DOC, or DOCX files up to 20 MB. Payslips require a month and year. Documents remain private and are visible to the employee assigned to that record; no documents appear until an administrator uploads them.

## AJ branch portal connection

Attendance is the employee and branch directory for the separate AJ branch business portal. An AJ administrator can assign an active Attendance employee to one active branch and set or replace that employee's business password. The employee then signs in to the branch portal with branch ID, employee ID, and that password. Changing the assignment prevents the old branch from being used for business-portal login. Attendance sign-in and attendance marking continue to use their existing workflows.

Branch-portal sign-in now explains the exact corrective action: an employee without any branch assignment is told to contact an administrator for assignment; an employee attempting a different branch is told they are not assigned to the selected branch; an unset business password is identified separately; and an incorrect employee ID or password returns a credential error instead of a technical application message.

## Documentation change log

- 2026-10-14: Updated Add Admin so HR administrators select the role and visible menus and enter a strong temporary password twice; the system no longer assigns or stores a shared default password.
- 2026-10-14: Made the Attendance production API the default for fresh builds, migrated saved retired endpoints, restricted cleartext HTTP to debug Android builds, and updated backend and mobile security dependencies while preserving biometric unlock and saved sessions.
- 2026-10-14: Added a direct Attendance APK download to the Aryan Gold staff login page; the downloaded build connects to the hosted Attendance API.
- 2026-10-14: Added private employee document uploads and employee self-service downloads for offer letters, payslips, experience letters, and relieving letters.
- 2026-10-10: Added smoother administrator page transitions, navigation feedback, modal/dropdown motion, and accessible reduced-motion behavior; administrator workflows are unchanged.
- 2026-10-10: Restored normal map tiles on the administrator branch map by enabling the authenticated CARTO basemap; branch markers and required map attribution remain unchanged.
- 2026-10-10: Improved attendance form contrast and control sizing, aligned employee and branch identity details, and restored normal dashboard scrolling and scrollbar feedback on desktop web.
- 2026-10-06: Added balanced top and bottom spacing to the full-height employee web login and repaired the administrator dashboard logo/profile image fallbacks.
- 2026-10-06: Added clear AJ branch sign-in messages for missing or mismatched branch assignments, unset business passwords, invalid branches, inactive accounts, and incorrect employee credentials.
- 2026-10-06: Connected Attendance employees, branches, assignments, and passwords to the AJ branch business portal through authenticated server-to-server endpoints.
- 2026-10-05: Cleared local recruitment data, including candidate rows, form links, activity logs, and uploaded recruitment files, while keeping the five-branch/five-employee dataset intact.
- 2026-10-05: Cleaned the local Aryan Gold dataset so only the five `AGBPL` branches remain, with Vinay at Head Office and one default employee for each non-HO branch.
- 2026-10-05: Limited local backend administrator access to a single assigned admin username and removed the older seeded admin logins.
- 2026-10-05: Added Aryan Gold branch IDs `AGBPL000` through `AGBPL004`, set `AGBPL000` as Head Office, created local five-digit employee IDs for Admin and Vinay, and assigned Vinay to Head Office.
- 2026-10-05: Updated the web favicon and install icons at `http://127.0.0.1:8000/` to use the Aryan Gold app mark.
- 2026-10-05: Rebuilt and replaced the Laravel-served Flutter web bundle so `http://127.0.0.1:8000/` uses Aryan Gold metadata, manifest, assets, and compiled JavaScript.
- 2026-10-05: Renamed the Android package to `aryan.attendance`, removed remaining legacy brand/package references, rebuilt the emulator APK, and refreshed the backend download.
- 2026-10-05: Updated the Android emulator build so the login header uses a larger square Aryan Gold emblem that fits the phone layout.
- 2026-10-05: Enlarged app-wide Aryan Gold logo rendering by tightening the shared square logo and ID-card wordmark assets.
- 2026-10-05: Improved the employee web login header logo so it matches the teal Aryan Gold page design and appears at a readable size.
- 2026-10-05: Added Aryan Gold as the default admin theme, keeping the older theme choices available in Profile settings.
- 2026-10-05: Rebranded the local employee app, Android splash/launcher artwork, web metadata, admin portal, recruitment pages, ID-card logos, privacy page, and update messages for Aryan Gold using teal, gold, wine, and ivory styling.
- 2026-10-05: Increased the Aryan Gold logo size on the web sign-in screen while preserving the compact keyboard layout.
- 2026-10-05: Fixed the backend admin login page styling by restoring correct CSS, JavaScript, favicon, and logo asset URLs for the local server.
- 2026-10-05: Restored version 5.0.36 source with the existing app design and workflows, rebuilt Android and web, and verified employee login in the emulator and administrator login in the browser. The new local Android build connects to the local backend rather than production. Firebase push requires separate project configuration.
- 2026-10-05: Installed the recovered Android app in the emulator. Its production update requirement currently blocks native sign-in; use the local web application for local accounts. Local administrator and employee credentials were supplied separately.
- 2026-10-05: Added local access and startup information for the recovered attendance backup.
