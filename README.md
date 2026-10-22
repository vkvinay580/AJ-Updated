# Aryan Gold Business Suite

A responsive gold-trading website and private, multi-company administration system for Aryan Gold, Aryan Jewels, and Lakshmi Bullion.

## Included

- Public Aryan Gold landing site with no visible link to the administration area.
- Company-specific login at `/admin/login`.
- Customer phone lookup: an existing number goes directly to billing; a new number starts registration.
- Aadhaar and/or PAN KYC with encrypted identification numbers and protected uploads.
- Optional customer working proof with company name, address, designation, a camera-captured or uploaded company ID card, and an old-gold wearing image.
- Upload or live webcam capture for KYC documents and an optional customer photograph.
- Branch billing can assign a customer home-verification visit to an admin-created TE. The Aryan Verification Android app records photos, an optional compressed visit video, references, an authentication person and mobile number, and a verified/could-not-verify outcome. Results appear under customer KYC and notify the requesting BM.
- Gold sale and purchase bills with multiple items, purity, weight, rate, tax, adjustment, and payment method.
- Company-isolated customer, KYC, and bill search.
- Print-ready invoices with browser PDF download support.
- Private cross-role chat for Admin, Branch, Head Office/Floor, and Accounts users, with unread notifications, read receipts, camera capture, voice notes, and protected document attachments.
- Password hashing, HTTP-only same-site sessions, rate-limited login, origin checks, audit logs, upload signature checks, and private file delivery.

## Run locally

Node.js 22, MySQL/MariaDB, and HashiCorp Vault are recommended. Copy `.env.example` to `.env.local`, create a development AppRole with read-only access to `secret/data/apps/business`, place its role ID and secret ID in the documented owner-only files, and then run:

```bash
npm install
npm run db:setup
npm run dev
```

Open `http://localhost:3000`. The admin sign-in route is intentionally not linked from the public site.

The setup command creates the administrator specified by `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. The same administrator has access to all three companies but receives a session scoped to the company selected at login.

## Production configuration

Production secrets are loaded from HashiCorp Vault before Next.js initializes. The active `.env.production` contains only public/runtime configuration and Vault connection metadata. If an administrator already exists, rerunning `db:setup` does not overwrite its password.

```text
VAULT_ENABLED=true
VAULT_REQUIRED=true
VAULT_ADDR=http://127.0.0.1:8200
VAULT_APPLICATION=business
VAULT_SECRET_PATH=secret/data/apps/business
NEXT_PUBLIC_SITE_URL=https://aryangold.in
ATTENDANCE_API_URL=https://attendance.aryangold.in/api
BRANCH_PORTAL_URL=https://biz.aryangold.in
```

The business Vault path owns database credentials, the data-encryption key, bootstrap role credentials, the Attendance integration key, and Verification Firebase server credentials. Attendance uses a separate AppRole and `secret/data/apps/attendance`. See [VAULT_OPERATIONS.md](./VAULT_OPERATIONS.md) for policy, bootstrap, rotation, outage, and recovery procedures. AppRole bootstrap files are revocable credentials—not application secrets—and must remain owner-only.

`NEXT_PUBLIC_SITE_URL` drives canonical metadata, the sitemap, robots file, and primary-site origin validation. `BRANCH_PORTAL_URL` is also included in the same-origin allowlist so browser POST requests from the mapped branch subdomain pass CSRF protection behind cPanel's reverse proxy. Both values must be HTTPS origins without paths or credentials. Create DNS and TLS for the attendance and branch subdomains before publishing the Android apps. The Attendance production runtime settings are documented in `Attendance app/Backend/.env.production.example`; production secret values belong only in Vault.

Back up the database, `storage/kyc`, `storage/pledges`, `storage/chat`, and `storage/verification` together. Customer KYC files, company ID cards, and old-gold wearing images are stored under `storage/kyc`; private documents, verification photos, and chat attachments are never placed in the public directory.

## Team chat

Authenticated users can open the floating chat button, search by username or name, select a user, and start a private conversation. Unread messages show a badge and an in-app “Received message from” notification with a short ding after the user has interacted with the page. Users can optionally enable browser notifications.

Chat accepts messages, camera images, uploaded images, PDFs, text/CSV, Word, Excel, PowerPoint, OpenDocument, and common audio files. Up to 10 files can be selected in one send, with a 20 MB per-file and 50 MB combined limit. Voice notes use the device microphone. Attachments are stored in `storage/chat` and are delivered only after verifying that the signed-in user belongs to the conversation. Camera, microphone, and browser notifications require the corresponding device permission; production camera and microphone access require HTTPS.

## Data model

The MySQL/MariaDB schema is stored in [database/schema.sql](./database/schema.sql) and applied with `npm run db:setup`:

- `companies` and `admin_company_access`
- `admins` and expiring `sessions`
- `chat_users` and `chat_messages` (cross-role directory, private conversations, unread/read state, and protected attachment metadata)
- `customers` (phone unique inside each company, optional employment details, private company ID card metadata, and old-gold wearing-image metadata)
- `kyc_records` (encrypted number, search hash, masked last four, private file path)
- `te_users`, `te_sessions`, `te_device_tokens` (TE credentials, expiring app sessions, notification registrations)
- `customer_verification_requests`, `customer_verification_photos`, `customer_verification_videos`, `customer_verification_references`, `branch_notifications` (visit assignment, evidence, result, and requesting BM alerts)
- `bills`, `bill_items`, and `invoice_sequences` (concurrency-safe company-specific bill numbers)
- `audit_logs`

## Verification

```bash
npm run lint
npm run build
```

`node scripts/test-verification.mjs` exercises TE access, assignment races, both outcomes, protected photos, KYC, BM notifications and revocation against an isolated temporary MariaDB instance and the production build. It requires local `mariadb-install-db`/`mariadbd` executables and free localhost ports 33417 and 3137; it never connects to the production database.

The database initializer is idempotent and upgrades an existing AJ schema in place. Run it against a backed-up database before restarting production. Apply Laravel migrations separately from `Attendance app/Backend` with `php artisan migrate --force`. An empty Attendance database uses the committed schema-only bootstrap; employee, branch, credential, and administrator records must be provisioned separately by an authorized operator.

For the prepared cPanel workflow, see [DEPLOY_CPANEL.md](./DEPLOY_CPANEL.md).

## Android app

The connected Android app lives in [android](./android/README.md) and targets
`https://aryangold.in`. It shares the existing screens, backend, and data, with
native camera permissions, file uploads, saving, sharing, and printing. See its
README for APK builds, installation, and the website integration deployment steps.

## Aryan Verification app

Source and build instructions are in [verification_app](verification_app/README.md). The Android APK is packaged at `public/downloads/aryan-verification.apk` and linked from `/login`, branch billing, and Admin → Verification & TEs. After deployment, download it at `https://aryangold.in/downloads/aryan-verification.apk`.

Create a TE in Admin → Verification & TEs, then request house verification either while registering a new branch customer or later from branch billing. Customer creation and its optional initial verification assignment are saved together. A verified result requires at least two visit photos, one reference, and an authentication person's name/mobile; the TE may also attach one compressed visit video up to two minutes. Could-not-verify requires a reason. Billing remains available while a visit is pending.

The app checks for assignments in Android background work at a requested 15-minute interval; Android may defer delivery. Instant push requires server Firebase credentials and matching Firebase Android build configuration, as documented in the app README. No Firebase secrets are included in the APK.

## Attendance app development

The Attendance Flutter frontend, Laravel API, and migrations are in `Attendance app/`.
After cloning, follow the [Attendance developer guide](<Attendance app/frontend/docs/DEVELOPER_GUIDE.md>)
for the local PHP, Composer, MySQL, and Flutter setup, Android emulator API routing,
and private payroll configuration. Database dumps, local credentials, payroll exports,
and uploaded documents must remain outside Git. The optional PF allowlist must come
from its authorized secure source.


## How to run

These files were pushed from the local project folder. Install the matching runtime for the project before running it.

### Node.js

```powershell
npm install
npm run dev
```

The `node_modules`, `.next`, `dist`, and other generated dependency/build folders are intentionally not committed; recreate them with the commands above.
