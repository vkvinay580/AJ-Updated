# Employee directory memory fix — production deployment



This archive is relative to the Laravel `public_html` application root. It fixes the PHP 128 MB memory exhaustion on `GET /admin/employee/index` by limiting each employee-directory response to 50 rows and by loading only the latest attendance row needed for each employee's branch details.



No database migration, environment change, PHP memory-limit increase, or Flutter rebuild is required.



## Deploy



Back up the two application files listed below. Upload the ZIP to the Laravel `public_html` root, replace `CPANEL_USER` with the hosting account name, and run:



```bash

cd /home/CPANEL_USER/public_html

unzip -o backend-employee-directory-memory-fix-public-html-20260821-v2.zip -d .

php artisan optimize:clear

php artisan view:cache

```



If the server does not provide `php` directly, use the hosting provider's PHP 8.2 CLI binary for the Artisan commands.



## Verify



1. Sign in to `https://aryangold.app/admin/employee/index` with an authorized administrator account.

2. Confirm the page opens without the **Allowed memory size exhausted** error.

3. Confirm each employee tab displays at most 50 rows and pagination appears when more records exist.

4. Change between **Employees**, **Inactive Employees**, **Outsource Employees**, and **Newly Onboarded** and confirm each list loads.

5. Apply state, city, and branch filters; confirm the filters and tab totals remain correct while changing tabs and pages.

6. Search for an employee by ID or name and confirm matches are found beyond the first 50 records; also verify search remains selected while changing pages or tabs.

7. Open an employee edit action and an inactive/active action to smoke-test row controls.



## Included application files



- `app/Http/Controllers/Admin/EmployeeController.php`

- `resources/views/admin/employee/index.blade.php`
