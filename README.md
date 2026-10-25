# DMU Property Asset & Management System

## Requirements

- XAMPP (Apache, PHP 8+, and MySQL/MariaDB)
- A browser with JavaScript enabled
- Internet access for the Tailwind CSS, Chart.js, QRCode.js, and html5-qrcode CDN resources

## Setup

1. Place this project under the XAMPP `htdocs` directory.
2. Start Apache and MySQL from the XAMPP Control Panel.
3. Import `schema.sql` using phpMyAdmin or the MySQL command line. The script creates the `dmu_pams` database and its sample asset, transfer, and maintenance records.
4. If your MySQL connection differs from the XAMPP defaults, set `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in the PHP environment before starting Apache. Defaults are `127.0.0.1`, `dmu_pams`, `root`, and an empty password.
5. Open `http://localhost/dmu-pams-php/` (adjust the URL to match the project folder name).

The frontend loads assets, transfers, and maintenance tickets through the PHP endpoints in `api/`. Data changes are saved to MySQL and are available after reloading the page. Gate Security Scanner supports gate-pass QR scanning and manual voucher-number lookup; camera access requires browser permission and a secure context such as localhost or HTTPS. When accessing PAMS from another device, serve it over HTTPS; browsers generally block camera access to non-local HTTP addresses.

The Inventory Audit tab starts a physical count session using a snapshot of the current asset register. Assets can be counted automatically by scanning their QR tags with a camera or verified manually; both methods save changes immediately. Camera access requires browser permission and a secure context such as localhost or HTTPS. Starting another session completes the previous active session while keeping its count records.

For an existing database, create the `physical_count_sessions` and `physical_count_items` tables by running their `CREATE TABLE` statements from `schema.sql` before using Inventory Audit. Do not re-import the full schema into a database that already contains the sample records.

The dashboard summarizes responsibilities for the System Administrator, Property Admin/Stock Officer, Department Head/Dean, Maintenance/IT Technician, and Gate Security Officer. Transfer requests can be approved or rejected; approval updates the asset location. Maintenance tickets support Pending, In Progress, Completed, and Cancelled states, with technician diagnosis, actual cost, and parts notes. Approved gate passes support recorded check-out and check-in with driver and officer names, and gate security staff can search, verify, and report suspicious or invalid pass numbers.

For an existing database, run `upgrade-role-workflows.sql` once to add maintenance expense fields and gate transit records and migrate existing `Under Repair` tickets to `In Progress`. Then run `upgrade-maintenance-diagnosis.sql` once to add technician diagnosis. New databases get these structures from `schema.sql`.

## Accounts and role access

For an existing database, run `upgrade-role-access.sql` once after the workflow upgrade. New databases receive the account and audit-log tables through `schema.sql`. Open PAMS from `http://localhost/` to create the first System Administrator; first-account setup is restricted to a local computer and only works while the user table is empty. Use a unique username and a password of at least 12 characters. The administrator can then create, edit, disable, and re-enable accounts in **User & Role Management**. Accounts are disabled rather than deleted so audit-log references remain meaningful.

After sign-in, users see only their assigned modules. API routes also enforce the role permissions; hiding a page is not the security boundary. Department Head accounts must be assigned a department and only receive that department's asset and transfer/ticket records. Technicians can view the asset registry read-only and manage work orders. Gate Security accounts see only the scanner and transit clearance. System Administrator accounts can manage accounts; Property Admin can read the audit log.

The matrix's "Department Head / Dean: Approve Asset Transfers (Local Dept)" is implemented as approval/rejection only for requests originating in that user's assigned department. Property Admin and System Administrator can decide any pending transfer. "Delete user" is a soft-disable to preserve audit history. System configuration and database backups remain operational/deployment responsibilities, not application modules.

The application uses PHP sessions with HttpOnly/SameSite cookies and CSRF tokens for API mutations. Use HTTPS when accessed over a network; local setup alone is restricted to localhost. Protect database backups and configure the web server and database credentials before production use.

## Repository maintenance

The root `.gitignore` excludes local environment files, dependency and build directories, logs, temporary files, compressed database exports, and editor/operating-system artifacts. Keep real database credentials and database backups out of version control. The tracked SQL schema and upgrade scripts are intentionally not ignored.

## API

- `GET api/auth.php?action=status`, `POST api/auth.php?action=setup` (first local admin only), `POST api/auth.php?action=login`, and `POST api/auth.php?action=logout`
- `GET api/auth.php?action=users`, `POST api/auth.php?action=users`, `POST api/auth.php?action=user-update`, and `POST api/auth.php?action=user-status` (System Administrator only)
- `GET api/audit-logs.php` (System Administrator and read-only Property Admin)
- `GET api/assets.php` / `POST api/assets.php` / `PATCH api/assets.php` (role-checked asset access and disposal flag using `{"assetId":"..."}`)
- `GET api/transfers.php` / `POST api/transfers.php`
- `GET api/transfers.php?gatePass=GP-90122` (verify and retrieve a gate pass)
- `PATCH api/transfers.php` (decide a pending transfer using `{"transferId":"...","status":"Approved"}`)
- `GET api/gate-clearance.php?gatePass=GP-90122` / `POST api/gate-clearance.php` (record check-out/check-in with transfer ID, driver, and gate officer)
- `GET api/maintenance.php` / `POST api/maintenance.php` / `PATCH api/maintenance.php` (technicians update work-order status, diagnosis, actual cost, and parts notes)
- `GET api/physical-count.php` (active session), `POST api/physical-count.php` (start session), and `PATCH api/physical-count.php` (save verification using `{"sessionId":1,"assetId":"...","isVerified":true}`)

POST endpoints accept JSON request bodies and return JSON responses. Database connection failures are reported as HTTP 500 responses; invalid submissions return HTTP 400.