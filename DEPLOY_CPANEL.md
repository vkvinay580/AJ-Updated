# Deploying Aryan Gold to cPanel

The project is configured for the `aryangold.in` domain and the cPanel MySQL/MariaDB database `admin1_aryan`.

## 1. Create the Node.js application

In **cPanel → Setup Node.js App**:

- Node.js version: **22.x** (20.9+ is the minimum)
- Application mode: **Production**
- Application root: `aryangold`
- Application URL: `https://aryangold.in`
- Startup file: `server.js`

Upload `aryan-gold-cpanel.zip` into the application root and extract it there.

## 2. Configure Vault and non-secret environment variables

Provision the `aryan-business` AppRole as described in [VAULT_OPERATIONS.md](./VAULT_OPERATIONS.md). Store its role ID and secret ID in `/home/admin1/.config/aryangold-vault/business/` with directory mode `700` and file mode `600`. Put database, encryption, integration, bootstrap-user, and Verification Firebase secrets at `secret/apps/business`.

Use `.env.production` only for non-secret runtime settings:

- `NODE_ENV` = `production`
- `HOSTNAME` = `0.0.0.0`
- `NEXT_PUBLIC_SITE_URL` = `https://aryangold.in`
- `DB_CONNECTION_LIMIT` = `10`
- `DB_SSL` = `false`
- `ATTENDANCE_API_URL` = `https://attendance.aryangold.in/api`
- `BRANCH_PORTAL_URL` = `https://biz.aryangold.in`
- `VAULT_REQUIRED` = `true`
- `VAULT_ADDR` = `http://127.0.0.1:8200`
- `VAULT_SECRET_PATH` = `secret/data/apps/business`

`NEXT_PUBLIC_SITE_URL` and `BRANCH_PORTAL_URL` are trusted browser origins for API CSRF checks. Enter origins only—HTTPS scheme and hostname, with no page path, username, password, or trailing application route—and restart the Node.js application after changing either value.

Keep the Vault data and unseal shares backed up separately. Never rotate `DATA_ENCRYPTION_KEY` without a data re-encryption migration; changing or losing it makes stored Aadhaar/PAN values unreadable.

## 3. Install, initialize, and build

Open the application terminal in cPanel and run:

```bash
npm install
npm run db:setup
npm run build
```

The setup command creates all tables, registers Aryan Gold, Aryan Jewels, and Lakshmi Bullion, and creates the first administrator. It never prints the database password.

## 4. Start the application

Install and enable `aryangold.service` from the Vault deployment bundle. It starts the Node app with `VAULT_REQUIRED=true` and retries after a reboot until Vault is manually unsealed. Do not retain the older `@reboot npm start` cron entry. Then verify:

- `https://aryangold.in`
- `https://aryangold.in/contact`
- `https://aryangold.in/admin/login`
- `https://biz.aryangold.in` (map this subdomain to the same Node.js application)

Deploy the Laravel Attendance app at `https://attendance.aryangold.in` and store its `ARYANGOLD_BUSINESS_INTEGRATION_KEY` in the Attendance Vault path with the same value as `ATTENDANCE_INTEGRATION_KEY` in the business path. The browser never calls this integration directly; AJ performs all employee, assignment, and login verification server-to-server.

When cPanel requires the Attendance document root to live below the main `public_html` directory, retain the repository's root `.htaccess` host exclusion for `attendance.aryangold.in`. It prevents the main Next.js reverse proxy from intercepting Laravel requests while leaving `aryangold.in` and `biz.aryangold.in` on the Node.js application. The root and Laravel `public/.htaccess` files redirect public requests to HTTPS while keeping HTTP ACME challenge paths available for certificate renewal.

Before deploying either application, create DNS records and AutoSSL certificates for `aryangold.in`, `attendance.aryangold.in`, and `biz.aryangold.in`. The attendance and branch subdomains will not work until those records resolve to the hosting account.

For Attendance, provision the independently scoped `aryan-attendance` AppRole and put its secrets at `secret/apps/attendance`. Keep only the non-secret names from `Attendance app/Backend/.env.production.example` in `.env`; the Vault loader runs before Laravel reads environment configuration. Then run:

```bash
composer install --no-dev --optimize-autoloader
php artisan optimize:clear
php artisan migrate --force
php artisan config:clear
php artisan route:cache
php artisan view:cache
```

Do not run `php artisan config:cache` with Vault-backed configuration: Laravel would serialize resolved secret values into `bootstrap/cache/config.php`. The small loopback Vault read therefore occurs during each PHP request; route and view caches remain enabled.

Verify `https://attendance.aryangold.in/api/app/update` before distributing the Attendance APK. The AJ database and Attendance database remain separate; back up both before applying schema changes.

Legacy outbound employee sync remains disabled unless `ARYANGOLD_EMPLOYEE_SYNC_URL` is explicitly configured. If it is required, provision the separate `aryan-employee-sync` AppRole and `secret/apps/employee-sync` path for the receiver's database credentials and a newly generated `ARYANGOLD_EMPLOYEE_SYNC_TOKEN`; store that same new token in the Attendance path. Never reuse the token removed from repository history.

Enable **AutoSSL** for the domain before accepting real KYC documents. Camera capture requires HTTPS on deployed sites.

## Persistent files and backups

KYC uploads, customer company ID cards, and old-gold wearing images are stored under `storage/kyc`, branch pledge bills under `storage/pledges`, private chat attachments under `storage/chat`, and TE visit photos/videos under `storage/verification`. Keep these folders writable by the Node.js application and back them up together with the MySQL database. Never move them under `public`; documents are served only through authenticated routes.

Recommended permissions are `750` for `storage` and its subdirectories, subject to the hosting provider's ownership configuration.

## Aryan Verification deployment

For an existing installation, run `node scripts/setup-verification.mjs` before activating the new code to add only the eight verification tables in `database/schema.sql`. Fresh installations use `npm run db:setup`. Run `npm install` so the production package contains the ffprobe binary used to validate visit videos. Include the schema file and `public/downloads/aryan-verification.apk` in the deployment package. Confirm the download card on `https://aryangold.in/login` and APK at `https://aryangold.in/downloads/aryan-verification.apk` after restarting.

For instant FCM notifications, store `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in the business Vault path. Attendance stores the complete service-account JSON as `FIREBASE_SERVICE_ACCOUNT_JSON` in its own Vault path. Build each app with the matching public Android Firebase configuration described in `verification_app/README.md`. Never bundle a service-account key in an APK, Git, `.env`, or a standalone production JSON file. Without FCM configuration, Android background work periodically checks assignments; timing depends on connectivity and battery restrictions.

Allow request bodies of at least 42 MB for verification uploads (up to 12 images at 8 MB each, one compressed two-minute MP4 at 25 MB, and 40 MB total per submission). Check the full workflow using dedicated test accounts: create TE, assign customer in billing, receive assignment, submit both outcomes with photo/video evidence, inspect KYC playback, and check the requesting BM's notification. Verification photographs and videos remain behind authenticated routes.

Team chat camera capture, voice notes, and browser notifications require HTTPS plus user-granted camera, microphone, and notification permissions. The application accepts up to 10 chat attachments per send, limited to 20 MB each and 50 MB combined; confirm the hosting request-body limit is at least 50 MB if large multi-file sends are required.
