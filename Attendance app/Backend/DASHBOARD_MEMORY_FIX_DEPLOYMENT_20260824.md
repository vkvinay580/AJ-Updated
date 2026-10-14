# Admin dashboard 128 MB memory hotfix

This code-only hotfix prevents `/admin/dashboard` from loading the complete attendance and recruitment-candidate histories into PHP memory. Latest employee attendance is selected in SQL with grouped maximum attendance IDs, while recruitment dashboard aggregates are calculated through 500-row lazy batches. Shift-history rows are loaded directly and attached to the dashboard employee models, avoiding relationship-discovery failures from stale mixed deployments while preserving punctuality calculations. Dashboard counts, charts, branch classification, permissions, and `Employee::shiftHistories()` remain available elsewhere.

The archive contains only `app/Http/Controllers/Admin/AdminController.php` and this guide. It does not contain `vendor`, `.env`, migrations, uploads, logs, caches, or Flutter files.

## Deployment

Back up the existing controller, then extract the archive over the Laravel `public_html` root. Run:

```bash
php artisan optimize:clear
php artisan route:clear
php artisan config:cache
php artisan view:cache
```

Do not run Composer or database migrations. Do not run `php artisan route:cache`; the restored historical baseline contains the legacy closure route `/admin/test`.

If PHP still serves the previous controller, restart PHP-FPM/LSAPI or clear OPcache through the hosting panel.

## Verification

1. Open `/admin/dashboard` as the previously failing administrator.
2. Confirm employee totals, HO/branch totals, attendance summaries, punctuality rows, and recruitment charts render.
3. Open `/admin/employee/index` and confirm search, filters, and pagination still work.
4. Confirm `storage/logs/laravel.log` has no new memory-exhaustion entry for the request time.
