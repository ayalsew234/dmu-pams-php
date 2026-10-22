USE dmu_pams;

ALTER TABLE maintenance
    MODIFY status ENUM('Pending', 'Under Repair', 'In Progress', 'Completed', 'Cancelled')
        NOT NULL DEFAULT 'Pending';

UPDATE maintenance SET status = 'In Progress' WHERE status = 'Under Repair';

ALTER TABLE maintenance
    MODIFY status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled')
        NOT NULL DEFAULT 'Pending',
    ADD COLUMN actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER estimated_cost,
    ADD COLUMN spare_parts TEXT NULL AFTER actual_cost;

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
