-- ===========================================================================
-- Seed: additional Sliven-area medical establishments (from Contacts_2.docx)
-- ---------------------------------------------------------------------------
-- Name/email pairs taken verbatim from Contacts_2.docx. Email only — the
-- `Institution` table has no phone column.
--
-- RUN ORDER: run AFTER schema.sql / prod_install.sql, and alongside
--   seed_institutions.sql. The 5 rows that already exist in
--   seed_institutions.sql are commented out below to avoid duplicates.
--
--   mysql -h HOST -u USER -p DBNAME < seed_institutions_contacts2.sql
--
-- NOTE: `Institution` has no natural unique key, so run ONCE. Some rows below
--       legitimately share an email (see "shared email" notes) — if you later
--       add a UNIQUE(email) key, those collide; keep them distinct instead.
-- ===========================================================================
SET NAMES utf8mb4;

-- 1) New categories for the establishment types in this file (additive; the FK
--    on Institution.categoryId requires them to exist first). Remap if you'd
--    rather fold these into an existing category.
INSERT INTO `Category` (`id`,`name`) VALUES
  ('medical_centers', 'Medical & Diagnostic Centers (ДКЦ/МЦ)'),
  ('emergency_care',  'Emergency Medical Care (ЦСМП)')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2) Hospitals (болници) — Сливен област  (categoryId = hospitals)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'hospitals','СБПЛР – Котел','dsbr_kotel@abv.bg',1,NOW(),NOW()),
  (UUID(),'hospitals','СХБАЛ „Амброаз Паре“ – Сливен','shbal@ambroazpare.bg',1,NOW(),NOW());

-- 3) Diagnostic-consultative & medical centers (ДКЦ/МЦ)  (categoryId = medical_centers)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'medical_centers','ДКЦ 1 – Сливен','upravitel@dkc1sliven.eu',1,NOW(),NOW()),
  (UUID(),'medical_centers','ДКЦ 2 – Сливен','dkc2sliven@abv.bg',1,NOW(),NOW()),
  (UUID(),'medical_centers','МЦ „Д-р Георги Вълкович Миркович“ – Сливен','mbal.sl@iradeum.com',1,NOW(),NOW()),  -- shared email with МБАЛ „Д-р Иван Селимински“
  (UUID(),'medical_centers','МЦ „Кардиомед“ – Сливен','cardiomed_2020@abv.bg',1,NOW(),NOW());

-- 4) Emergency medical care (ЦСМП)  (categoryId = emergency_care)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'emergency_care','ЦСМП – Сливен','csmpsliven@abv.bg',1,NOW(),NOW()),
  (UUID(),'emergency_care','Филиал за спешна медицинска помощ – Котел','csmpsliven@abv.bg',1,NOW(),NOW());  -- shared email with ЦСМП – Сливен

-- ===========================================================================
-- ALREADY SEEDED in seed_institutions.sql — kept here for reference only,
-- commented out so this file does not create duplicates. Uncomment ONLY if you
-- are NOT also running seed_institutions.sql.
-- ---------------------------------------------------------------------------
-- INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
--   (UUID(),'health_inspectorates','РЗИ Сливен','rzi-sliven@mbox.contact.bg',1,NOW(),NOW()),
--   (UUID(),'insurance_funds','РЗОК Сливен','sliven@nhif.bg',1,NOW(),NOW()),
--   (UUID(),'medical_oversight','ИА „Медицински надзор“ (ИАМН)','delovodstvo@iamn.bg',1,NOW(),NOW()),
--   (UUID(),'hospitals','МБАЛ „Д-р Иван Селимински“ – Сливен','mbal.sl@iradeum.com',1,NOW(),NOW()),
--   (UUID(),'hospitals','МБАЛ „Хаджи Димитър“ – Сливен','mbal_hadjidimitar@abv.bg',1,NOW(),NOW());
-- ===========================================================================
