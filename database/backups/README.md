# Database backups

Do not commit database dumps to this repository. Production and development dumps may contain employee, customer, authentication, and business records.

Store encrypted backups outside Git with access limited to authorized operators. Use `npm run db:setup` to create or upgrade the AJ schema. From `Attendance app/Backend`, `php artisan migrate --force` loads the schema-only bootstrap for an empty Attendance database and applies later migrations. It does not create employees, branches, credentials, or administrators.
