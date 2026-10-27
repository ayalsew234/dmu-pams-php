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

For an existing database, run `upgrade-asset-review-flags.sql` once to enable asset review flags. System Administrators, Property Administrators, and Internal Auditors can flag assets for review and clear the flag when review is complete; changes are recorded in the system audit log.

System Administrators can permanently delete assets from the Asset Registry only when no transfers, maintenance tickets, stock issues, acknowledgements, incidents, disposal reviews, compliance inspections, or physical count records are linked to them. Deletions are recorded in the system audit log; linked assets must be retained to preserve their history.

The Depreciation & Disposal page calculates five-year straight-line depreciation from each asset's acquisition date, summarizes acquisition value, accumulated depreciation, and net book value, and supports searching and filtering assets by disposal recommendation and committee status. System Administrators and Property Administrators can submit eligible assets to committee review; rejected requests can be resubmitted, and the committee's pending, approved, or rejected state is shown on the disposal page.

The dashboard summarizes responsibilities for the System Administrator, Property Admin/Stock Officer, Procurement & Purchasing Officer, Storekeeper/Warehouse Custodian, Department Head/Dean, End-User/Faculty/Staff, Internal Auditor/Finance Officer, Maintenance/IT Technician, and Gate Security Officer. Procurement staff register suppliers, create purchase orders, record partial or complete deliveries, and match invoice totals against the received quantity and PO unit price. Each received unit is entered into the asset register with a generated asset tag and links back to its PO and GRN; received assets enter available stock. Storekeepers allocate temporary storage, issue selected stock to staff with a printable SIV, and print and record applied barcode/QR asset tags. Linking an SIV to an active End-User account makes the issued assets available in that user's personal inventory. End-Users can electronically acknowledge assigned assets, report loss/damage/theft, and create maintenance tickets for their own assets. Internal Auditors can verify physical counts, review asset-register valuation by campus and department, compare GRN quantities to generated asset records, investigate invoice variances and unresolved incidents, inspect system audit events, and record/track anti-fraud or compliance findings. Invoice mismatches remain visible for review. Transfer requests can be approved or rejected; approval updates the asset location. Maintenance tickets support Pending, In Progress, Completed, and Cancelled states, with technician diagnosis, actual cost, and parts notes. Approved gate passes support recorded check-out and check-in with driver and officer names, and gate security staff can search, verify, and report suspicious or invalid pass numbers.

For an existing database, run `upgrade-role-workflows.sql` once to add maintenance expense fields and gate transit records and migrate existing `Under Repair` tickets to `In Progress`. Then run `upgrade-maintenance-diagnosis.sql` once to add technician diagnosis. New databases get these structures from `schema.sql`.

## Accounts and role access

For an existing database, apply the following migrations once and in order after the core workflow and maintenance migrations: `upgrade-role-access.sql`, `upgrade-procurement-workflows.sql`, `upgrade-storekeeper-workflows.sql`, `upgrade-custodian-workflows.sql`, `upgrade-auditor-workflows.sql`, and `upgrade-disposal-committee.sql`. The workflow migrations add role access, procurement, warehouse, custodian, auditor, and disposal structures respectively. The committee migration backfills assets already marked `Pending Disposal` as unreviewed requests. These scripts are one-time upgrades, not a substitute for `schema.sql` on a new installation. New databases receive the structures through `schema.sql`. Open PAMS from `http://localhost/` to create the first System Administrator; first-account setup is restricted to a local computer and only works while the user table is empty. Use a unique username and a password of at least 12 characters. The administrator can then create, edit, disable, and re-enable accounts in **User & Role Management**. Department Head and End-User accounts require a department. Accounts are disabled rather than deleted so audit-log references remain meaningful.

After sign-in, users see only their assigned modules. API routes also enforce the role permissions; hiding a page is not the security boundary. Procurement & Purchasing Officer accounts manage suppliers, purchase orders, goods receiving, invoice matching, and asset intake. Storekeeper accounts can access warehouse stock, storage allocation, SIV issuing, and barcode tag status, but cannot browse or manage the general asset registry. Department Head accounts must be assigned a department and only receive that department's asset and transfer/ticket records. End-User accounts must also be assigned a department; they can only view assets whose current custodian is their account in that department, acknowledge those assignments, report incidents against them, and view/create maintenance tickets for those same assets. For personal inventory to be linked reliably, use the Warehouse issue form's staff-account selector when issuing an asset to an End-User. Internal Auditor accounts can view the full asset register, run and verify physical counts, view read-only audit events and financial/compliance reports, and record or update compliance inspection findings; they cannot register assets, approve transfers, alter invoices, or change disposal status. Asset Disposal Committee accounts can inspect submitted disposal requests, approve or reject Scrap/Auction/Donation proposals, and print a uniquely numbered certificate with the recorded committee member and time. This is an application-recorded electronic acknowledgement, not a cryptographic signature, and approval does not claim that physical disposal has occurred. Technicians can view the asset registry read-only and manage work orders. Gate Security accounts see only the scanner and transit clearance. System Administrator accounts can manage accounts; Property Admin can read the audit log and oversee procurement and warehouse operations.

The matrix's "Department Head / Dean: Approve Asset Transfers (Local Dept)" is implemented as approval/rejection only for requests originating in that user's assigned department. Property Admin and System Administrator can decide any pending transfer. "Delete user" is a soft-disable to preserve audit history. System configuration and database backups remain operational/deployment responsibilities, not application modules.

The application uses PHP sessions with HttpOnly/SameSite cookies and CSRF tokens for API mutations. Use HTTPS when accessed over a network; local setup alone is restricted to localhost. Protect database backups and configure the web server and database credentials before production use.

## Repository maintenance

The root `.gitignore` excludes local environment files, dependency and build directories, logs, temporary files, compressed database exports, and editor/operating-system artifacts. Keep real database credentials and database backups out of version control. The tracked SQL schema and upgrade scripts are intentionally not ignored.

## API

- `GET api/auth.php?action=status`, `POST api/auth.php?action=setup` (first local admin only), `POST api/auth.php?action=login`, and `POST api/auth.php?action=logout`
- `GET api/auth.php?action=users`, `POST api/auth.php?action=users`, `POST api/auth.php?action=user-update`, and `POST api/auth.php?action=user-status` (System Administrator only)
- `GET api/audit-logs.php` (System Administrator, Property Admin, and Internal Auditor)
- `GET api/auditor.php` / `POST api/auditor.php` / `PATCH api/auditor.php` (Internal Auditor financial/reconciliation summaries, open incidents, compliance findings, and finding status)
- `GET api/disposal-committee.php` / `POST api/disposal-committee.php` / `PATCH api/disposal-committee.php` (committee case list, inspection findings, disposition decisions, and certificate issuance)
- `GET api/assets.php` / `POST api/assets.php` / `PATCH api/assets.php` (role-checked asset access and disposal flag using `{"assetId":"..."}`)
- `GET api/transfers.php` / `POST api/transfers.php`
- `GET api/transfers.php?gatePass=GP-90122` (verify and retrieve a gate pass)
- `PATCH api/transfers.php` (decide a pending transfer using `{"transferId":"...","status":"Approved"}`)
- `GET api/gate-clearance.php?gatePass=GP-90122` / `POST api/gate-clearance.php` (record check-out/check-in with transfer ID, driver, and gate officer)
- `GET api/maintenance.php` / `POST api/maintenance.php` / `PATCH api/maintenance.php` (technicians update work-order status, diagnosis, actual cost, and parts notes)
- `GET api/custodian.php` / `POST api/custodian.php` (End-User personal inventory, electronic assignment acknowledgements, and loss/damage/theft reports)
- `GET api/physical-count.php` (active session), `POST api/physical-count.php` (start session), and `PATCH api/physical-count.php` (save verification using `{"sessionId":1,"assetId":"...","isVerified":true}`; System Administrator, Property Admin, and Internal Auditor)
- `GET api/procurement.php` (suppliers, purchase orders, and receiving records; Procurement Officer, Property Admin, or System Administrator)
- `POST api/procurement.php` with `action: "vendor"`, `"order"`, or `"receive"` to register a supplier, create a purchase order, or receive goods and create asset records
- `PATCH api/procurement.php` (match/update an invoice against a goods receipt)
- `GET api/warehouse.php` (stock assets and SIV history; Storekeeper, Property Admin, or System Administrator)
- `POST api/warehouse.php` with `action: "allocate"`, `"release"`, or `"issue"` to manage temporary storage and stock issues; `"mark-tagged"` records physical tag application

POST endpoints accept JSON request bodies and return JSON responses. Database connection failures are reported as HTTP 500 responses; invalid submissions return HTTP 400.