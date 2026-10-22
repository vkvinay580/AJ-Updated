# Vault operations

Production business, billing, branch/admin/accounts/head-office, Verification, and Attendance secrets are centralized in the HashiCorp Vault instance at `vault.aryangold.in`. Vault listens on `127.0.0.1:8200`; Apache terminates public TLS for human administration. Applications use the loopback listener.

## Isolation model

| Application | KV v2 path | AppRole | Policy |
| --- | --- | --- | --- |
| Business, billing, branch/admin/accounts/head-office, Verification | `secret/apps/business` | `aryan-business` | `aryan-business-read` |
| Attendance Laravel backend | `secret/apps/attendance` | `aryan-attendance` | `aryan-attendance-read` |
| Optional legacy outbound employee-sync receiver | `secret/apps/employee-sync` | `aryan-employee-sync` | `aryan-employee-sync-read` |
| Optional legacy employee ID-card portal | `secret/apps/id-card-portal` | `aryan-id-card-portal` | `aryan-id-card-read` |

Each policy grants `read` only to its one `secret/data/apps/...` path. AppRole login tokens live for five minutes, have a fifteen-minute maximum TTL and two uses, and are explicitly revoked after the startup read. Role IDs and secret IDs are stored below `/home/admin1/.config/aryangold-vault/<application>/` with `0700` directories and `0600` files. Treat the secret ID as a revocable bootstrap credential.

The primary operator UI credential is the fixed non-expiring root token generated on `2026-10-22`; its owner-only copy is kept outside the repository in `/home/aryan/private-aj-backups/vault/vault-login-token-2026-10-22.txt`. Use the Token method at `https://vault.aryangold.in/ui/vault/auth?with=token`. Vault cannot issue a truly non-expiring non-root token, so this credential has unrestricted root authority and must be revoked and regenerated immediately if disclosed. The `aryan-admin` userpass login remains available as a fallback and intentionally returns a different one-hour token on every login.

The Node custom server first loads non-secret `.env*` connection metadata, then loads Vault before requiring Next.js, so billing and Verification modules never initialize with missing or stale secret values. Database setup scripts use the same loader. Laravel loads its non-secret `.env` metadata and then Vault from `bootstrap/app.php`, before environment/config bootstrap. Laravel's config cache must remain disabled because it serializes resolved values to disk; route and view caches are safe. Both production paths fail closed when Vault is required, sealed, unavailable, or denies access.

## Host restart

Vault uses Shamir sealing and is intentionally sealed after a host restart. Run the owner-only workstation command:

```bash
/home/aryan/vault-deploy/unseal.sh
```

`vault.service` starts Vault itself. `aryangold.service` retries until unseal succeeds. Attendance requests remain unavailable until unseal and then recover on the next PHP request. Confirm `systemctl --user is-active vault.service aryangold.service`, the public site, a branch/admin login page, `/api/verification/app-update`, and Attendance `/api/app/update`.

## Secret updates and rotation

Write updates to the relevant KV path using an authorized human session, then restart `aryangold.service` for business secrets. Attendance reads Vault on each uncached Laravel bootstrap; run `php artisan config:clear` and never `config:cache`. Change both copies of the AJ/Attendance integration key in one maintenance window. Rotate an AppRole secret ID by generating a new ID, atomically replacing its owner-only file, validating startup, and destroying the old accessor.

Never print secret values, put them in shell history/arguments, copy them into `.env`, commit them, or include them in documentation. The retired employee-sync token that once appeared in repository history must never be reused. If legacy outbound sync is deliberately enabled, generate a fresh token and write it as `ARYANGOLD_EMPLOYEE_SYNC_TOKEN` to both the Attendance and employee-sync paths in one maintenance window. `DATA_ENCRYPTION_KEY` requires an application data migration rather than ordinary rotation. Back up Vault raft data separately from the Shamir shares; neither alone is sufficient for recovery.

## Validation

Run `npm run test:vault` locally. In production, validate Vault status, AppRole file permissions, service status, public endpoints, and a database-backed invalid-login request for each backend. An expected `401` from business and `422` from Attendance confirms request validation and database access without using a real account.
