# Rollback to the employee-directory memory-fix baseline

This code-only archive restores the Laravel 9.52.21 application state immediately after `backend-employee-directory-memory-fix-public-html-20260821-v2.zip`. It keeps the 50-row employee-directory pagination/search fix and restores `Employee::shiftHistories()` together with the matching dashboard controller.

The archive intentionally excludes `vendor`, `.env`, uploaded files, employee documents, logs, caches, and tests. Production already reports Laravel 9.52.21, so do not replace `vendor` and do not run Composer for this rollback.

This is an exact historical rollback. Its Laravel 9 dependency lock currently reports 43 Composer security advisories; upgrading those dependencies would no longer be the requested employee-directory-fix baseline.

## Required order

Back up the database and application files first. Keep the existing `.env` and `APP_KEY`.

Before extracting the rollback archive, use the currently deployed code to reverse the later encryption migration if it is recorded as migrated:

```bash
php artisan down
php artisan optimize:clear
php artisan migrate:rollback --path=database/migrations/2026_08_22_000001_encrypt_employee_financial_identifiers.php --force
```

If Artisan reports that there is nothing to roll back, continue. Do not run `key:generate`.

Extract the rollback ZIP over the Laravel `public_html` root. Then remove only the later files that did not exist at the target baseline:

```bash
rm -f app/Casts/EncryptedString.php
rm -f app/Http/Controllers/ProtectedMediaController.php
rm -f app/Http/Middleware/SecurityHeaders.php
rm -f app/Support/SafeOutboundUrl.php
rm -f app/Support/SpreadsheetDiskCache.php
rm -f app/Support/SpreadsheetImportGuard.php
rm -f app/Support/SpreadsheetMemory.php
rm -f database/migrations/2026_08_22_000001_encrypt_employee_financial_identifiers.php
rm -f public/storage/.htaccess
rm -f public/EmployeeDocuments/.htaccess
rm -f storage/app/public/.htaccess
```

Finish with:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:clear
php artisan view:cache
php artisan up
```

Keep routes uncached for this historical baseline. It contains the legacy closure route `/admin/test`, which Laravel cannot serialize for `route:cache`.

Do not run `php artisan migrate --force` during this rollback. The archive contains no new migration.

## Verification

1. Open `/admin/dashboard` and confirm the `shiftHistories` relationship error is gone.
2. Open `/admin/employee/index`; verify search, tabs, filters, 50-row pagination, and employee actions.
3. Verify admin login, VM login, attendance, salary, recruitment, and direct document/photo links.
4. The Imunify360 bot-protection message is generated before Laravel. Ask the host to exclude `/api/attendance/history` (preferably authenticated `/api/*`) from bot protection or allowlist the affected mobile traffic. This archive cannot change Imunify360 policy.
