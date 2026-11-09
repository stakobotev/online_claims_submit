-- ===========================================================================
-- De-duplicate the `Institution` table
-- ---------------------------------------------------------------------------
-- A "duplicate" = two or more rows identical on (categoryId, name, email).
-- (NOT email alone: some distinct institutions legitimately share an email,
--  e.g. МЦ „Миркович“ & МБАЛ „Селимински“ = mbal.sl@iradeum.com, and the
--  Котел emergency branch & ЦСМП – Сливен = csmpsliven@abv.bg.)
--
-- For each duplicate group we KEEP one row (the smallest id) and remove the
-- rest. Because Complaint.institutionId is a FK to Institution(id) with no
-- ON DELETE rule (RESTRICT), we first repoint any complaints from the rows
-- being removed onto the surviving row, then delete.
--
-- SAFE TO RE-RUN. Wrapped in a transaction — nothing is committed if a step
-- fails. BACK UP the table first if this is production:
--   mysqldump -h HOST -u USER -p DBNAME Institution > Institution_backup.sql
--
-- RUN: mysql -h HOST -u USER -p DBNAME < dedupe_institutions.sql
-- ===========================================================================
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- STEP 0 (optional dry run): see what WOULD be removed before changing data.
-- Run just this SELECT on its own first if you want to preview.
-- ---------------------------------------------------------------------------
-- SELECT categoryId, name, email,
--        COUNT(*)      AS copies,
--        COUNT(*) - 1  AS to_delete,
--        MIN(id)       AS keeper_id
-- FROM `Institution`
-- GROUP BY categoryId, name, email
-- HAVING COUNT(*) > 1
-- ORDER BY copies DESC, name;

START TRANSACTION;

-- Surviving row per duplicate group (materialised so we can reference the
-- Institution table safely while deleting from it).
DROP TEMPORARY TABLE IF EXISTS `_inst_keepers`;
CREATE TEMPORARY TABLE `_inst_keepers` (
  `keeper_id`  VARCHAR(36)  NOT NULL,
  `categoryId` VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  PRIMARY KEY (`categoryId`,`name`,`email`)
) ENGINE=InnoDB;

INSERT INTO `_inst_keepers` (`keeper_id`,`categoryId`,`name`,`email`)
SELECT MIN(`id`), `categoryId`, `name`, `email`
FROM `Institution`
GROUP BY `categoryId`, `name`, `email`;

-- 1) Repoint complaints that reference a soon-to-be-deleted duplicate onto the
--    surviving row, so no FK is orphaned.
UPDATE `Complaint` c
JOIN `Institution`   dup ON dup.`id` = c.`institutionId`
JOIN `_inst_keepers` k   ON k.`categoryId` = dup.`categoryId`
                        AND k.`name`       = dup.`name`
                        AND k.`email`      = dup.`email`
SET c.`institutionId` = k.`keeper_id`
WHERE c.`institutionId` <> k.`keeper_id`;

-- 2) Delete every row that is not the keeper for its group.
DELETE FROM `Institution`
WHERE `id` NOT IN (SELECT `keeper_id` FROM `_inst_keepers`);

DROP TEMPORARY TABLE IF EXISTS `_inst_keepers`;

COMMIT;

-- ---------------------------------------------------------------------------
-- STEP 3 (optional): prevent duplicates from ever coming back. A UNIQUE key on
-- (categoryId, name, email) lets future seed runs use INSERT IGNORE safely.
-- Run only AFTER the de-dupe above has succeeded.
-- ---------------------------------------------------------------------------
-- ALTER TABLE `Institution`
--   ADD UNIQUE KEY `Institution_identity_key` (`categoryId`,`name`,`email`);
