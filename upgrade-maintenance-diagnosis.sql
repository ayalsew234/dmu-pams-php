USE dmu_pams;

ALTER TABLE maintenance
    ADD COLUMN diagnosis TEXT NULL AFTER issue;
