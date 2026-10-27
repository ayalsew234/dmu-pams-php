USE dmu_pams;

ALTER TABLE users
    MODIFY role ENUM(
        'system_admin',
        'property_admin',
        'procurement_officer',
        'department_head',
        'asset_custodian',
        'internal_auditor',
        'disposal_committee',
        'technician',
        'gate_security'
    ) NOT NULL;

CREATE TABLE IF NOT EXISTS vendors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    tax_number VARCHAR(100) NULL,
    address TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    vendor_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    campus VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
    room VARCHAR(50) NOT NULL DEFAULT 'Unassigned',
    order_date DATE NOT NULL,
    expected_date DATE NULL,
    status ENUM('Ordered', 'Partially Received', 'Received', 'Cancelled') NOT NULL DEFAULT 'Ordered',
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_purchase_orders_vendor (vendor_id),
    INDEX idx_purchase_orders_status (status),
    CONSTRAINT fk_purchase_orders_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    CONSTRAINT fk_purchase_orders_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_receipt_notes (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    purchase_order_id VARCHAR(50) NOT NULL,
    quantity_received INT UNSIGNED NOT NULL,
    received_date DATE NOT NULL,
    received_by BIGINT UNSIGNED NULL,
    invoice_number VARCHAR(100) NULL,
    invoice_amount DECIMAL(12,2) NULL,
    invoice_status ENUM('Pending', 'Matched', 'Discrepant') NOT NULL DEFAULT 'Pending',
    invoice_difference DECIMAL(12,2) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_grn_purchase_order (purchase_order_id),
    INDEX idx_grn_invoice_status (invoice_status),
    CONSTRAINT fk_grn_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    CONSTRAINT fk_grn_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE assets
    ADD COLUMN purchase_order_id VARCHAR(50) NULL AFTER serial,
    ADD COLUMN goods_receipt_note_id VARCHAR(50) NULL AFTER purchase_order_id,
    ADD INDEX idx_assets_purchase_order (purchase_order_id),
    ADD INDEX idx_assets_goods_receipt_note (goods_receipt_note_id),
    ADD CONSTRAINT fk_assets_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_assets_goods_receipt_note
        FOREIGN KEY (goods_receipt_note_id) REFERENCES goods_receipt_notes(id) ON DELETE SET NULL;
