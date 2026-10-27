USE dmu_pams;

ALTER TABLE users
    MODIFY role ENUM(
        'system_admin',
        'property_admin',
        'procurement_officer',
        'storekeeper',
        'department_head',
        'asset_custodian',
        'internal_auditor',
        'disposal_committee',
        'technician',
        'gate_security'
    ) NOT NULL;

ALTER TABLE assets
    ADD COLUMN stock_status ENUM('In Stock', 'Temporary Storage', 'Issued') NOT NULL DEFAULT 'Issued' AFTER goods_receipt_note_id,
    ADD COLUMN storage_location VARCHAR(255) NULL AFTER stock_status,
    ADD COLUMN tagged_at TIMESTAMP NULL DEFAULT NULL AFTER storage_location,
    ADD INDEX idx_assets_stock_status (stock_status);

UPDATE assets
SET stock_status = 'In Stock'
WHERE purchase_order_id IS NOT NULL AND goods_receipt_note_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_issue_vouchers (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_department VARCHAR(100) NOT NULL,
    purpose TEXT NULL,
    issue_date DATE NOT NULL,
    issued_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_siv_issue_date (issue_date),
    CONSTRAINT fk_siv_user FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_issue_voucher_items (
    voucher_id VARCHAR(50) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    serial VARCHAR(100) NOT NULL,
    condition_at_issue ENUM('New', 'Good', 'Fair', 'Damaged', 'Obsolete') NOT NULL,
    PRIMARY KEY (voucher_id, asset_id),
    INDEX idx_siv_item_asset (asset_id),
    CONSTRAINT fk_siv_item_voucher FOREIGN KEY (voucher_id) REFERENCES stock_issue_vouchers(id) ON DELETE CASCADE,
    CONSTRAINT fk_siv_item_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
