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

## 2. Add environment variables

Use the Node.js application's environment-variable interface. Copy the names from `.env.production.example` and set:

- `NODE_ENV` = `production`
- `HOSTNAME` = `0.0.0.0`
- `NEXT_PUBLIC_SITE_URL` = `https://aryangold.in`
- `DB_HOST` = `localhost`
- `DB_PORT` = `3306`
- `DB_USER` = the assigned cPanel database user
- `DB_PASSWORD` = the database password (do not store it in a public file)
- `DB_NAME` = the assigned cPanel database name
- `DB_CONNECTION_LIMIT` = `10`
- `DB_SSL` = `false`
- `DATA_ENCRYPTION_KEY` = a new random secret of at least 32 characters
- `INITIAL_ADMIN_EMAIL` = the desired admin email
- `INITIAL_ADMIN_PASSWORD` = a new strong admin password
- `ATTENDANCE_API_URL` = `https://attendance.aryangold.in/api`
- `ATTENDANCE_INTEGRATION_KEY` = a long random secret shared only with the Attendance backend
- `BRANCH_PORTAL_URL` = `https://biz.aryangold.in`

`NEXT_PUBLIC_SITE_URL` and `BRANCH_PORTAL_URL` are trusted browser origins for API CSRF checks. Enter origins only—HTTPS scheme and hostname, with no page path, username, password, or trailing application route—and restart the Node.js application after changing either value.

Keep `DATA_ENCRYPTION_KEY` permanently backed up. Changing or losing it makes stored Aadhaar/PAN values unreadable.

## 3. Install, initialize, and build

Open the application terminal in cPanel and run:

```bash
npm install
npm run db:setup
npm run build
```

The setup command creates all tables, registers Aryan Gold, Aryan Jewels, and Lakshmi Bullion, and creates the first administrator. It never prints the database password.

## 4. Start the application

Click **Restart Application** in cPanel. Then verify:

- `https://aryangold.in`
- `https://aryangold.in/contact`
- `https://aryangold.in/admin/login`
- `https://biz.aryangold.in` (map this subdomain to the same Node.js application)

Deploy the Laravel Attendance app at `https://attendance.aryangold.in` and set its `ARYANGOLD_BUSINESS_INTEGRATION_KEY` to the same secret. The browser never calls this integration directly; AJ performs all employee, assignment, and login verification server-to-server.

When cPanel requires the Attendance document root to live below the main `public_html` directory, retain the repository's root `.htaccess` host exclusion for `attendance.aryangold.in`. It prevents the main Next.js reverse proxy from intercepting Laravel requests while leaving `aryangold.in` and `biz.aryangold.in` on the Node.js application. The root and Laravel `public/.htaccess` files redirect public requests to HTTPS while keeping HTTP ACME challenge paths available for certificate renewal.

Before deploying either application, create DNS records and AutoSSL certificates for `aryangold.in`, `attendance.aryangold.in`, and `biz.aryangold.in`. The attendance and branch subdomains will not work until those records resolve to the hosting account.

For Attendance, copy the variable names from `Attendance app/Backend/.env.production.example` into the hosting environment, set the assigned production database name/user/password, preserve the existing `APP_KEY`, and run:

```bash
composer install --no-dev --optimize-autoloader
php artisan optimize:clear
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Verify `https://attendance.aryangold.in/api/app/update` before distributing the Attendance APK. The AJ database and Attendance database remain separate; back up both before applying schema changes.

Enable **AutoSSL** for the domain before accepting real KYC documents. Camera capture requires HTTPS on deployed sites.

## Persistent files and backups

KYC uploads, customer company ID cards, and old-gold wearing images are stored under `storage/kyc`, branch pledge bills under `storage/pledges`, and private chat attachments under `storage/chat`. Keep these folders writable by the Node.js application and back them up together with the MySQL database. Never move them under `public`; documents are served only through authenticated routes.

Recommended permissions are `750` for `storage` and its subdirectories, subject to the hosting provider's ownership configuration.

Team chat camera capture, voice notes, and browser notifications require HTTPS plus user-granted camera, microphone, and notification permissions. The application accepts up to 10 chat attachments per send, limited to 20 MB each and 50 MB combined; confirm the hosting request-body limit is at least 50 MB if large multi-file sends are required.
