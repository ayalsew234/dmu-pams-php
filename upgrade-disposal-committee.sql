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

INSERT INTO asset_disposal_cases (asset_id, status, created_at)
SELECT asset.id, 'Requested', COALESCE(asset.created_at, CURRENT_TIMESTAMP)
FROM assets AS asset
LEFT JOIN asset_disposal_cases AS existing_case
    ON existing_case.asset_id = asset.id
WHERE asset.status = 'Pending Disposal'
  AND existing_case.id IS NULL;
