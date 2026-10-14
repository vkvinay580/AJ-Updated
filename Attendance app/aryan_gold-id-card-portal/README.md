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

The included `config.php` uses the standard XAMPP MySQL defaults: user `root` with a blank password.

## Installation

1. Upload the project to your hosting, for example `public_html/id-card/`.
2. Create a MySQL database and user in cPanel.
3. Edit `config.php` with the database credentials and correct `base_url`.
4. Open `https://yourdomain.com/id-card/install.php`.
5. Create the first administrator account.
6. Delete `install.php` after successful setup.
7. Log in at `/admin/login.php`.
8. Share the public root URL with employees.

Alternatively, import `database.sql` in phpMyAdmin, then run `install.php` to create the admin user.

## Branding

- Replace `assets/img/logo.svg` with the official company logo while keeping the same filename, or update the image paths.
- Edit company address, website and emergency phone in `config.php`.
- Modify card colors in `assets/css/app.css` under `:root`.

## Production checklist

- Force HTTPS.
- Use a dedicated database user with only required privileges.
- Delete `install.php` after setup.
- Keep `config.php` outside the public web root where your hosting permits it.
- Add server-side backups for the database and `uploads/photos`.
- Confirm employee consent and retention policy with HR/legal.
- Consider adding role-based access, audit logs and encrypted backups before large-scale use.

## Notes

PNG export uses html2canvas from a CDN. Browser Print/Save PDF remains available if the CDN is blocked. For exact CR80 print production, send the exported artwork to your card printer and adjust dimensions/bleed according to the printer profile.
