# Aryan Gold Business Suite

A responsive gold-trading website and private, multi-company administration system for Aryan Gold, Aryan Jewels, and Lakshmi Bullion.

## Included

- Public Aryan Gold landing site with no visible link to the administration area.
- Company-specific login at `/admin/login`.
- Customer phone lookup: an existing number goes directly to billing; a new number starts registration.
- Aadhaar and/or PAN KYC with encrypted identification numbers and protected uploads.
- Upload or live webcam capture for KYC documents and an optional customer photograph.
- Gold sale and purchase bills with multiple items, purity, weight, rate, tax, adjustment, and payment method.
- Company-isolated customer, KYC, and bill search.
- Print-ready invoices with browser PDF download support.
- Private cross-role chat for Admin, Branch, Head Office/Floor, and Accounts users, with unread notifications, read receipts, camera capture, voice notes, and protected document attachments.
- Password hashing, HTTP-only same-site sessions, rate-limited login, origin checks, audit logs, upload signature checks, and private file delivery.

## Run locally

Node.js 22 and MySQL/MariaDB are recommended. Copy `.env.example` to `.env.local`, enter the local database settings, and then run:

```bash
npm install
npm run db:setup
npm run dev
```

Open `http://localhost:3000`. The admin sign-in route is intentionally not linked from the public site.

The setup command creates the administrator specified by `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. The same administrator has access to all three companies but receives a session scoped to the company selected at login.

## Production configuration

Use environment variables instead of storing database credentials in source control. If an administrator already exists, rerunning `db:setup` does not overwrite its password.

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DATA_ENCRYPTION_KEY=replace-with-a-long-random-secret
INITIAL_ADMIN_EMAIL=your-admin@example.com
INITIAL_ADMIN_PASSWORD=replace-with-a-strong-unique-password
```

Back up the database, `storage/kyc`, `storage/pledges`, and `storage/chat` together. Private documents and chat attachments are never placed in the public directory.

## Team chat

Authenticated users can open the floating chat button, search by username or name, select a user, and start a private conversation. Unread messages show a badge and an in-app “Received message from” notification with a short ding after the user has interacted with the page. Users can optionally enable browser notifications.

Chat accepts messages, camera images, uploaded images, PDFs, text/CSV, Word, Excel, PowerPoint, OpenDocument, and common audio files. Up to 10 files can be selected in one send, with a 20 MB per-file and 50 MB combined limit. Voice notes use the device microphone. Attachments are stored in `storage/chat` and are delivered only after verifying that the signed-in user belongs to the conversation. Camera, microphone, and browser notifications require the corresponding device permission; production camera and microphone access require HTTPS.

## Data model

The MySQL/MariaDB schema is stored in [database/schema.sql](./database/schema.sql) and applied with `npm run db:setup`:

- `companies` and `admin_company_access`
- `admins` and expiring `sessions`
- `chat_users` and `chat_messages` (cross-role directory, private conversations, unread/read state, and protected attachment metadata)
- `customers` (phone unique inside each company)
- `kyc_records` (encrypted number, search hash, masked last four, private file path)
- `bills`, `bill_items`, and `invoice_sequences` (concurrency-safe company-specific bill numbers)
- `audit_logs`

## Verification

```bash
npm run lint
npm run build
```

For the prepared cPanel workflow, see [DEPLOY_CPANEL.md](./DEPLOY_CPANEL.md).

## Android app

The connected Android app lives in [android](./android/README.md) and targets
`https://aryangold.in`. It shares the existing screens, backend, and data, with
native camera permissions, file uploads, saving, sharing, and printing. See its
README for APK builds, installation, and the website integration deployment steps.

## Attendance app development

The Attendance Flutter frontend, Laravel API, and migrations are in `Attendance app/`.
After cloning, follow the [Attendance developer guide](<Attendance app/frontend/docs/DEVELOPER_GUIDE.md>)
for the local PHP, Composer, MySQL, and Flutter setup, Android emulator API routing,
and private payroll configuration. This private repository also contains current
development database snapshots for `aj_dev` and `attendance_local` under
`database/backups/`. They include real development records and must be handled as
confidential employee and business data. Local credentials, payroll exports, and
uploaded documents remain excluded from Git; the optional PF allowlist still must
come from its authorized secure source.


## How to run

These files were pushed from the local project folder. Install the matching runtime for the project before running it.

### Node.js

```powershell
npm install
npm run dev
```

The 
ode_modules, .next, dist, and other generated dependency/build folders are intentionally not committed; recreate them with the commands above.

