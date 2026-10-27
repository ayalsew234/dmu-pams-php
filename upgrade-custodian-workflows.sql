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
    ADD COLUMN custodian_user_id BIGINT UNSIGNED NULL AFTER custodian,
    ADD INDEX idx_assets_custodian_user (custodian_user_id),
    ADD CONSTRAINT fk_assets_custodian_user
        FOREIGN KEY (custodian_user_id) REFERENCES users(id) ON DELETE SET NULL;

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
