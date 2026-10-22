# Aryan Gold Employee ID Card Portal

A responsive PHP + MySQL portal for collecting employee details, reviewing submissions, and generating premium front-and-back ID cards.

## Included

- Public employee submission link
- Photo upload validation
- Secure PDO prepared statements
- CSRF protection and password hashing
- Admin login and dashboard
- Search, filters, review status and notes
- Front and back employee ID card preview
- PNG export and browser Print/Save PDF
- Responsive premium maroon, gold and white UI

## Requirements

- PHP 8.1+
- MySQL 5.7+ or MySQL 8+
- Apache with `mod_rewrite`/`.htaccess` support recommended
- PHP extensions: PDO MySQL, Fileinfo

## XAMPP local testing

1. Copy the `aryan_gold-id-card-portal` folder to `C:\xampp\htdocs\`.
2. Start Apache and MySQL in XAMPP.
3. Open `http://localhost/aryan_gold-id-card-portal/install.php`.
4. Create the administrator account. The installer creates the configured database and tables automatically.
5. Log in at `http://localhost/aryan_gold-id-card-portal/admin/login.php`.

The included `config.php` uses the standard XAMPP MySQL defaults only when `VAULT_ENABLED=false` is explicitly set for local testing: user `root` with a blank password. If local MySQL uses a password, provide `DB_PASSWORD` through the local process environment; do not write it into `config.php`.

## Installation

1. Upload the project to your hosting, for example `public_html/id-card/`.
2. Create a MySQL database and user in cPanel.
3. Provision the `id-card-portal` Vault AppRole and store `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` at `secret/apps/id-card-portal`; edit only the non-secret `base_url` and company details in `config.php`. Set `VAULT_REQUIRED=true` in the production PHP environment.
4. Open `https://yourdomain.com/id-card/install.php`.
5. Create the first administrator account.
6. Delete `install.php` after successful setup.
7. Log in at `/admin/login.php`.
8. Share the public root URL with employees.

Alternatively, import `database.sql` in phpMyAdmin, then run `install.php` to create the admin user.

## Branding

- The bundled `assets/img/aryan_gold-logo.png`, `aryan_gold-logo-official.png`, `favicon.png`, and `logo.svg` wrapper use the official Aryan Gold mark from `aryangoldbuyers.com`.
- Edit company address, website and emergency phone in `config.php`.
- Modify card colors in `assets/css/app.css` under `:root`.

## Production checklist

- Force HTTPS.
- Use a dedicated database user with only required privileges.
- Delete `install.php` after setup.
- Keep AppRole bootstrap files owner-only under `~/.config/aryangold-vault/id-card-portal`; `config.php` contains no production password.
- Add server-side backups for the database and `uploads/photos`.
- Confirm employee consent and retention policy with HR/legal.
- Consider adding role-based access, audit logs and encrypted backups before large-scale use.

## Notes

PNG export uses html2canvas from a CDN. Browser Print/Save PDF remains available if the CDN is blocked. For exact CR80 print production, send the exported artwork to your card printer and adjust dimensions/bleed according to the printer profile.
