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
