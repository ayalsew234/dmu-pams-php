CREATE DATABASE IF NOT EXISTS dmu_pams CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dmu_pams;

-- Application Users, Sessions, and Audit Log
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('system_admin', 'property_admin', 'procurement_officer', 'storekeeper', 'department_head', 'asset_custodian', 'internal_auditor', 'disposal_committee', 'technician', 'gate_security') NOT NULL,
    department VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created_at (created_at),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Procurement, goods receiving, and invoice matching
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

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    campus VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    custodian VARCHAR(255) NOT NULL,
    custodian_user_id BIGINT UNSIGNED NULL,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    acq_date DATE NOT NULL,
    `condition` ENUM('New', 'Good', 'Fair', 'Damaged', 'Obsolete') NOT NULL DEFAULT 'New',
    status ENUM('Active', 'Under Maintenance', 'Pending Disposal') NOT NULL DEFAULT 'Active',
    serial VARCHAR(100) NOT NULL,
    purchase_order_id VARCHAR(50) NULL,
    goods_receipt_note_id VARCHAR(50) NULL,
    stock_status ENUM('In Stock', 'Temporary Storage', 'Issued') NOT NULL DEFAULT 'Issued',
    storage_location VARCHAR(255) NULL,
    tagged_at TIMESTAMP NULL DEFAULT NULL,
    review_flagged_at TIMESTAMP NULL DEFAULT NULL,
    review_flagged_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assets_purchase_order (purchase_order_id),
    INDEX idx_assets_goods_receipt_note (goods_receipt_note_id),
    INDEX idx_assets_stock_status (stock_status),
    INDEX idx_assets_custodian_user (custodian_user_id),
    INDEX idx_assets_review_flagged_at (review_flagged_at),
    CONSTRAINT fk_assets_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
    CONSTRAINT fk_assets_goods_receipt_note FOREIGN KEY (goods_receipt_note_id) REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
    CONSTRAINT fk_assets_custodian_user FOREIGN KEY (custodian_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_assets_review_flagged_by FOREIGN KEY (review_flagged_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Staff asset assignment acknowledgements and incident reports
CREATE TABLE IF NOT EXISTS asset_acknowledgements (
    asset_id VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    signed_name VARCHAR(255) NOT NULL,
    acknowledged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset_id, user_id),
    INDEX idx_asset_acknowledgements_user (user_id),
    CONSTRAINT fk_asset_acknowledgement_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    CONSTRAINT fk_asset_acknowledgement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_incidents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    asset_id VARCHAR(50) NOT NULL,
    reporter_user_id BIGINT UNSIGNED NOT NULL,
    incident_type ENUM('Loss', 'Damage', 'Theft') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Reported', 'Under Review', 'Resolved') NOT NULL DEFAULT 'Reported',
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_incidents_reporter (reporter_user_id, reported_at),
    INDEX idx_asset_incidents_asset (asset_id),
    CONSTRAINT fk_asset_incident_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    CONSTRAINT fk_asset_incident_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compliance_inspections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    inspection_type ENUM('Anti-Fraud', 'Asset Compliance', 'Financial Review', 'Other') NOT NULL,
    risk_level ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    asset_id VARCHAR(50) NULL,
    findings TEXT NOT NULL,
    status ENUM('Open', 'Under Review', 'Closed') NOT NULL DEFAULT 'Open',
    inspected_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_compliance_inspections_status (status, created_at),
    INDEX idx_compliance_inspections_asset (asset_id),
    CONSTRAINT fk_compliance_inspection_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
    CONSTRAINT fk_compliance_inspection_user FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_disposal_cases (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    asset_id VARCHAR(50) NOT NULL,
    status ENUM('Requested', 'Inspected', 'Approved', 'Rejected') NOT NULL DEFAULT 'Requested',
    inspection_findings TEXT NULL,
    inspected_by BIGINT UNSIGNED NULL,
    inspected_by_name VARCHAR(190) NULL,
    inspected_at TIMESTAMP NULL,
    disposition ENUM('Scrap', 'Auction', 'Donation') NULL,
    decision_notes TEXT NULL,
    decided_by BIGINT UNSIGNED NULL,
    decided_by_name VARCHAR(190) NULL,
    decided_at TIMESTAMP NULL,
    certificate_no VARCHAR(60) NULL UNIQUE,
    certificate_issued_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_asset_disposal_case_asset_status (asset_id, status),
    INDEX idx_asset_disposal_case_status (status, created_at),
    CONSTRAINT fk_asset_disposal_case_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
    CONSTRAINT fk_asset_disposal_case_inspector FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_asset_disposal_case_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inter-Campus Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(50) PRIMARY KEY,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    from_campus VARCHAR(100) NOT NULL,
    to_campus VARCHAR(100) NOT NULL,
    from_dept VARCHAR(100) NOT NULL,
    to_dept VARCHAR(100) NOT NULL,
    transfer_date DATE NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    gate_pass VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Maintenance Tickets Table
CREATE TABLE IF NOT EXISTS maintenance (
    id VARCHAR(50) PRIMARY KEY,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    priority ENUM('Low', 'Medium', 'Urgent') DEFAULT 'Medium',
    issue TEXT NOT NULL,
    diagnosis TEXT NULL,
    reported_by VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    estimated_cost DECIMAL(12,2) DEFAULT 0.00,
    actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    spare_parts TEXT NULL,
    technician VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Gate Transit Clearance
CREATE TABLE IF NOT EXISTS gate_transit_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    transfer_id VARCHAR(50) NOT NULL,
    event_type ENUM('Check-out', 'Check-in') NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    gate_officer VARCHAR(255) NOT NULL,
    event_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_gate_transit_event (transfer_id, event_type),
    CONSTRAINT fk_gate_transit_transfer
        FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Physical Count Sessions
CREATE TABLE IF NOT EXISTS physical_count_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    status ENUM('Active', 'Completed') NOT NULL DEFAULT 'Active',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS physical_count_items (
    session_id BIGINT UNSIGNED NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    campus VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    is_verified TINYINT(1) NULL DEFAULT NULL,
    verified_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (session_id, asset_id),
    CONSTRAINT fk_physical_count_session
        FOREIGN KEY (session_id) REFERENCES physical_count_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Data Insertion
INSERT INTO assets (id, name, category, campus, department, building, room, custodian, cost, acq_date, `condition`, status, serial) VALUES
('DMU-AST-2026-001', 'Dell PowerEdge R750 Server', 'Electronics', 'Technology Institute', 'Computer Science', 'Block 402', 'Lab 03', 'Dr. Abebe Bikila (EMP-1042)', 450000.00, '2023-04-15', 'Good', 'Active', 'SN-DL-883912'),
('DMU-AST-2026-002', 'Shimadzu UV-VIS Spectrophotometer', 'Lab Equipment', 'Health Sciences', 'Pharmacy', 'Medical Hall B', 'Room 105', 'Sr. Tigist Worku (EMP-2105)', 820000.00, '2022-11-20', 'New', 'Active', 'SN-SH-99210'),
('DMU-AST-2026-003', 'Toyota Hilux Double Cab 4WD', 'Vehicles', 'Main Campus', 'Property Administration', 'Transport Pool', 'Bay 01', 'Ato Tadesse Gemechu (EMP-0012)', 3800000.00, '2021-02-10', 'Fair', 'Active', 'ENGINE-2TR-5541'),
('DMU-AST-2026-004', 'Ergonomic Executive Office Chair x20', 'Furniture', 'Main Campus', 'President Office', 'Admin Building', 'Office 201', 'W/ro Genet Assefa (EMP-0005)', 180000.00, '2024-01-05', 'New', 'Active', 'LOT-FURN-2024-8'),
('DMU-AST-2026-005', 'Massey Ferguson Agricultural Tractor', 'Vehicles', 'Agriculture Campus', 'Agronomy', 'Farm Workshop', 'Shed A', 'Dr. Kassahun Belay (EMP-3011)', 2400000.00, '2019-08-12', 'Damaged', 'Under Maintenance', 'MF-7718-ET'),
('DMU-AST-2026-006', 'HP LaserJet Enterprise Printer', 'Electronics', 'Main Campus', 'Registrar', 'Registrar Block', 'Counter 02', 'Ato Solomon Teklu (EMP-0450)', 65000.00, '2022-05-18', 'Good', 'Active', 'CN-HPLJ-4431'),
('DMU-AST-2026-007', 'Digital Compound Microscope System', 'Lab Equipment', 'Main Campus', 'Biology Dept', 'Science Faculty', 'Bio Lab 2', 'Dr. Mulugeta Yilma (EMP-1190)', 310000.00, '2020-10-30', 'Obsolete', 'Pending Disposal', 'MIC-OLYMPUS-88'),
('DMU-AST-2026-008', 'Cisco Catalyst 9300 Switch', 'Electronics', 'Technology Institute', 'ICT Center', 'Data Center', 'Server Room', 'Eng. Chala Mengistu (EMP-1822)', 290000.00, '2023-09-10', 'Good', 'Active', 'FOC2441L0XY');

INSERT INTO transfers (id, asset_id, asset_name, from_campus, to_campus, from_dept, to_dept, transfer_date, requested_by, status, gate_pass) VALUES
('TR-2026-01', 'DMU-AST-2026-001', 'Dell PowerEdge R750 Server', 'Main Campus', 'Technology Institute', 'ICT Center', 'Computer Science', '2026-01-15', 'Dr. Abebe Bikila', 'Approved', 'GP-90122'),
('TR-2026-02', 'DMU-AST-2026-006', 'HP LaserJet Enterprise Printer', 'Technology Institute', 'Main Campus', 'Dean Office', 'Registrar', '2026-02-02', 'Ato Solomon Teklu', 'Pending', 'GP-90145');

INSERT INTO maintenance (id, asset_id, asset_name, priority, issue, reported_by, report_date, status, estimated_cost, technician) VALUES
('MNT-2026-08', 'DMU-AST-2026-005', 'Massey Ferguson Agricultural Tractor', 'Urgent', 'Hydraulic lift failure during field operation', 'Dr. Kassahun Belay', '2026-02-10', 'In Progress', 85000.00, 'Selam Mechanical Services PLC'),
('MNT-2026-04', 'DMU-AST-2026-003', 'Toyota Hilux Double Cab 4WD', 'Medium', 'Brake pad replacement and 50,000 km routine service', 'Ato Tadesse Gemechu', '2026-02-01', 'Completed', 32000.00, 'DMU Garage Unit');