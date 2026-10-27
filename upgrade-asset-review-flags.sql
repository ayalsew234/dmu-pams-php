USE dmu_pams;

ALTER TABLE assets
    ADD COLUMN review_flagged_at TIMESTAMP NULL DEFAULT NULL AFTER tagged_at,
    ADD COLUMN review_flagged_by BIGINT UNSIGNED NULL AFTER review_flagged_at,
    ADD INDEX idx_assets_review_flagged_at (review_flagged_at),
    ADD CONSTRAINT fk_assets_review_flagged_by
        FOREIGN KEY (review_flagged_by) REFERENCES users(id) ON DELETE SET NULL;
