# Local attendance app

Open `http://127.0.0.1:8000/` for the Aryan Gold employee web application and `http://127.0.0.1:8000/admin/login` for administrator sign-in.

Use an existing authorized account from the imported backup or the local accounts supplied in chat. The local database is separate from existing XAMPP databases. The current Android and web release is version 5.0.40 (5041), branded for Aryan Gold. The full upstream user guide is retained in `UPSTREAM_USER_GUIDE.md`.

The production app connects to `https://attendance.aryangold.in/api` by default. Local employee web and Android builds connect to the local API only when the developer builds them with the documented `API_BASE_URL` override. Release Android builds reject cleartext HTTP; debug builds retain HTTP support for local development.

The Aryan Gold staff login page at `https://aryangold.in/login` provides direct Android APK downloads for both the AJ app and the Attendance app. The Attendance APK opens the hosted service at `https://attendance.aryangold.in`.

The employee web sign-in screen fills the available browser height while keeping visible breathing room above and below the login panel. The administrator dashboard now displays the Aryan Gold sidebar logo and uses the Aryan Gold icon whenever an administrator has no uploaded profile photo.

Attendance forms now use consistent high-contrast fields, focus borders, and full-height action buttons. On the My Attendance page, the employee name, branch name, employee ID, and branch ID are shown on separate aligned lines so long names remain readable. Desktop web dashboards can be scrolled normally and display a standard scrollbar when content extends below the window.

Version 5.0.40 (5041) is available from the Attendance download link on the Aryan Gold staff login page as Android package `aryan.attendance`. It adds cohesive motion across page navigation, sign-in and dashboard state changes, dialogs, selection sheets, dashboard shortcuts, form submissions, and loading-to-result changes while retaining the full-viewport Aryan Gold splash. Motion remains restrained and follows the device or browser reduced-motion preference. The direct-download APK uses the same signing certificate as version 5.0.37, so it can update that directly distributed build in place.

The launch screen introduces the employee workspace with a short staged Aryan Gold animation and loading indicator. The sign-in page uses the light cream, teal and gold theme with a clearer secure-login panel. Page changes use subtle fade-and-slide motion. Devices and browsers configured to reduce animation receive a shortened static launch and transition experience.

The application uses a light cream background (`#FDF4E6`), deep teal (`#006A64`) for primary actions, gold (`#F5C21B`) for restrained highlights, and dark red (`#A11E1E`) for warnings and destructive actions.

Keep the local database and web server running while using the app. If the website cannot be reached, restart the server using the developer guide. Local email is written to Laravel logs.

Hiring and joining forms now ask for a preferred work location from a dropdown of currently active Aryan Gold branches. The hiring selection is carried into the joining form when that branch remains active. If an older saved choice is no longer available, select a current branch before submitting.

The hosted employee web app now loads its Flutter scripts, images, fonts, and WebAssembly files on the production cPanel server even when PHP's optional file-type detector is unavailable. If an old browser tab still shows **Frontend web build not found** or **Server Error**, close it and reopen `https://attendance.aryangold.in` so the repaired bootstrap files are requested again.

Employee app sign-in now works on case-sensitive Linux production databases. If the app previously returned **Server Error** after valid branch ID, employee ID, and password details were entered, retry the same credentials; no APK or endpoint change is required.

Attendance selfie uploads now work on the production cPanel PHP setup for check-in and check-out. If marking attendance previously showed **Server Error** immediately after submitting the selfie, retry the attendance action; valid JPG, PNG, GIF, BMP, and WebP images up to 5 MB are accepted, and no APK update is required.

Other employee photo uploads now use the same production-safe validation. Profile photos, ID-card photos, work-visit photos, and TE-tracker photos accept valid JPG, PNG, GIF, BMP, and WebP images up to 5 MB without requiring PHP's optional file-type extension. If one of these uploads previously returned **Server Error**, submit it again.

Employee salary summaries now continue loading when the optional historical PF allowlist is not installed on the server. Current salary, attendance, UAN, and PF eligibility values stored in the production database remain the source of the displayed summary.

Approved bank-detail changes can now be submitted from the app without a server error. Account numbers and other protected identifiers are stored encrypted, and optional passbook images accept valid JPG, PNG, GIF, BMP, or WebP files up to 5 MB. Submitted changes still wait for administrator verification before replacing current bank details.

Administrators can verify submitted bank-detail changes individually or in bulk even when the employee does not yet have a payroll-detail row or optional Aadhaar, PAN, or UAN values. Verification creates the required payroll record and keeps supplied financial identifiers encrypted.

After verification, bank-detail requests appear in the **Approved / Verified** tab. The page shows separate totals for requests waiting for employee submission and requests that are fully verified. Completed verified rows are retained for review and cannot be selected for rejection.

Attendance administrators can use the eye button beside each field on **Admin > Change Password** to show or hide the old password, new password, and confirmation password independently. Passwords remain hidden when the page first opens.

## Employee documents

Employees can open **My Profile > My Documents** in the Attendance app to download professionally formatted PDF employment documents. The system makes each document available only when its source records are ready:

- **Offer Letter** appears after a positive salary is saved. It shows monthly and annual salary plus the payroll deductions that may apply.
- **Experience Letter** appears after the Date of Joining is saved. If a Last Working Date exists, the letter uses it as the end of service; otherwise it states that employment continues to the present date.
- **Payslip** appears for a completed month only when the employee has a positive salary and attendance or administrator regularization activity for that month. It includes attendance totals, gross payable salary, PF, advances, security deposit and net pay using the same payroll rules as the Salary screen. The current incomplete month is never published as a payslip.
- **Relieving Letter** appears after the Last Working Date is saved.

Generated PDFs carry the footer **Digitally generated through Aryan Attendance Application.** Files manually uploaded by HR continue to appear in the same list. Downloads open through the device browser and use a short-lived secure link. Pull down or use **Refresh** after HR updates salary, joining date, attendance or last-working-date records.

HR Admin users can open an employee record and choose **Employee Documents**. Accounts users can open **Employee > Employee Documents** in the admin sidebar and search for an employee. They can also upload supplementary PDF, DOC, or DOCX files up to 20 MB; manually uploaded payslips require a month and year. Generated and uploaded documents remain private and are visible only to the employee assigned to that record.

## AJ branch portal connection

Attendance is the employee and branch directory for the separate AJ branch business portal. An AJ administrator can assign an active Attendance employee to one active branch and set or replace that employee's business password. The employee then signs in to the branch portal with branch ID, employee ID, and that password. Changing the assignment prevents the old branch from being used for business-portal login. Attendance sign-in and attendance marking continue to use their existing workflows.

Branch-portal sign-in now explains the exact corrective action: an employee without any branch assignment is told to contact an administrator for assignment; an employee attempting a different branch is told they are not assigned to the selected branch; an unset business password is identified separately; and an incorrect employee ID or password returns a credential error instead of a technical application message.

## Documentation change log

- 2026-10-19: Replaced free-form hiring and joining location choices with a required dropdown of currently active Aryan Gold branches and carried the hiring preference into joining.
- 2026-10-16: Added a shared motion system for page navigation, authentication and dashboard state changes, dialogs, bottom sheets, staggered shortcut entrances, press feedback, submission controls, and loading-to-result changes; preserved reduced-motion behavior and released Android and web version 5.0.40 (5041).
- 2026-10-16: Redesigned the Aryan Gold launch experience with premium teal-and-gold motion, responsive concentric brand rings, a secure-workspace progress treatment, and a full-viewport web boot splash; released Android and web version 5.0.39 (5040).
- 2026-10-15: Added the animated Aryan Gold splash screen, subtle cross-platform page transitions with reduced-motion support, and a richer responsive employee login design; released Android and web version 5.0.38 (5039).
- 2026-10-15: Added automatically timed professional PDF offer letters, experience letters, completed-month payslips and relieving letters under My Documents, refreshed the application with the light cream/teal/gold/red palette, and released app version 5.0.37 (5038) for Android and web.
- 2026-10-15: Fixed production server errors across the remaining employee photo-upload APIs, including profile, ID-card, work-visit, and TE-tracker photos.
- 2026-10-15: Made fully verified bank-detail requests visible in the Approved / Verified administrator tab.
- 2026-10-15: Fixed the administrator bulk bank-detail verification error for employees with missing payroll or optional identity details.
- 2026-10-15: Fixed bank-detail submission failures caused by passbook image validation and undersized encrypted database fields.
- 2026-10-15: Fixed salary-summary refresh failures caused by a missing optional historical PF allowlist file.
- 2026-10-15: Fixed the production server error that occurred while validating check-in and check-out selfie uploads.
- 2026-10-15: Fixed employee app sign-in on the production Linux database by consistently using the deployed lowercase employee-details table name.
- 2026-10-15: Added independent show/hide controls to every Attendance administrator change-password field.
- 2026-10-14: Restored the hosted employee web app by making its Flutter scripts and assets compatible with the production cPanel PHP configuration.
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
