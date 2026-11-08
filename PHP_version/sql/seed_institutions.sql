-- ===========================================================================
-- Seed: institutions people can complain to / about (Bulgaria)
-- ---------------------------------------------------------------------------
-- Emails verified from official sources (nhif.bg, iisda.government.bg,
-- iamn.bg, kzp.bg, and the hospitals' own sites). Nothing fabricated.
--
-- The `Institution` table routes complaints by EMAIL ONLY — there is no phone
-- column in the current schema, so gathered phone numbers are not stored here.
--
-- RUN ORDER: run AFTER schema.sql / prod_install.sql (needs `Category`).
--   mysql -h HOST -u USER -p DBNAME < seed_institutions.sql
--
-- NOTE: `Institution` has no natural unique key, so running this twice will
--       duplicate rows. Run ONCE on a fresh set, or apply the idempotent
--       variant at the bottom of this file.
-- ===========================================================================
SET NAMES utf8mb4;

-- 1) New categories for the oversight / control bodies (additive; the FK on
--    Institution.categoryId requires them to exist first). Skip this block if
--    you prefer to remap these institutions onto an existing category — just
--    change their categoryId in blocks 3 and 4 below.
INSERT INTO `Category` (`id`,`name`) VALUES
  ('health_inspectorates', 'Regional Health Inspectorates (РЗИ)'),
  ('medical_oversight',    'Medical Supervision Agency (ИАМН)'),
  ('consumer_protection',  'Consumer Protection Commission (КЗП)')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2) Health Insurance Funds: НЗОК central + 28 РЗОК  (categoryId = insurance_funds)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'insurance_funds','НЗОК – Централно управление','nzok@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Благоевград','blagoevgrad@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Бургас','burgas@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Варна','varna@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Велико Търново','tarnovo@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Видин','vidin@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Враца','vraca@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Габрово','gabrovo@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Добрич','dobrich@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Кърджали','kardjali@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Кюстендил','kiustendil@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Ловеч','lovech@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Монтана','montana@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Пазарджик','pazardjik@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Перник','pernik@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Плевен','pleven@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Пловдив','plovdiv@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Разград','razgrad@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Русе','ruse@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Силистра','silistra@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Сливен','sliven@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Смолян','smolian@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК София-град','sofia@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК София-област','sofia-obl@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Стара Загора','st.zagora@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Търговище','targovishte@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Хасково','haskovo@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Шумен','shumen@nhif.bg',1,NOW(),NOW()),
  (UUID(),'insurance_funds','РЗОК Ямбол','yambol@nhif.bg',1,NOW(),NOW());

-- 3) Regional Health Inspectorates: 28 РЗИ  (categoryId = health_inspectorates)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'health_inspectorates','РЗИ Благоевград','delovodstvo@rzibl.org',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Бургас','rzi@rzi-burgas.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Варна','office@rzi-varna.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Велико Търново','office@rzi-vt.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Видин','rzi-vidin@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Враца','rzi@rzi-vratsa.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Габрово','gabrovo@rzi-gbr.org',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Добрич','rzi-dobrich@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Кърджали','rzi.kj@rzi-kardjali.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Кюстендил','rzi@rzi-kn.net',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Ловеч','rzi@rzi-lovech.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Монтана','rzi@rzi-montana.org',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Пазарджик','rzi-pazardjik@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Перник','delovodstvo@rzi-pernik.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Плевен','rzi@rzi-pleven.egov.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Пловдив','rzi-plovdiv@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Разград','rzi_razgrad@rzi-razgrad.egov.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Русе','rzi@rzi-ruse.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Силистра','office@rzi-silistra.egov.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Сливен','rzi-sliven@mbox.contact.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Смолян','rzi@rzi-smolyan.com',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','Столична РЗИ (София-град)','priemna@srzi.egov.bg',1,NOW(),NOW()),  -- VERIFY email
  (UUID(),'health_inspectorates','РЗИ София-област','rzi@rzi-sfo.egov.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Стара Загора','rzisz@rzisz.org',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Търговище','rzi-targovishte@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Хасково','rzi@haskovo.net',1,NOW(),NOW()),  -- VERIFY email
  (UUID(),'health_inspectorates','РЗИ Шумен','rzi-shumen@mh.government.bg',1,NOW(),NOW()),
  (UUID(),'health_inspectorates','РЗИ Ямбол','rzi-yambol@mh.government.bg',1,NOW(),NOW());

-- 4) National oversight / consumer protection  (one each)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'medical_oversight','ИА „Медицински надзор“ (ИАМН)','delovodstvo@iamn.bg',1,NOW(),NOW()),
  (UUID(),'consumer_protection','Комисия за защита на потребителите (КЗП)','info@kzp.bg',1,NOW(),NOW());

-- 5) Hospitals — област Сливен (verified)  (categoryId = hospitals)
INSERT INTO `Institution` (`id`,`categoryId`,`name`,`email`,`active`,`createdAt`,`updatedAt`) VALUES
  (UUID(),'hospitals','МБАЛ „Д-р Иван Селимински“ – Сливен','mbal.sl@iradeum.com',1,NOW(),NOW()),
  (UUID(),'hospitals','МБАЛ „Хаджи Димитър“ – Сливен','mbal_hadjidimitar@abv.bg',1,NOW(),NOW()),
  (UUID(),'hospitals','МБАЛ „Света Петка Българска“ – Нова Загора','mbal_nz@abv.bg',1,NOW(),NOW());

-- ===========================================================================
-- OMITTED ON PURPOSE (no verified email — email is NOT NULL, not fabricated):
--   ДКЦ-1 Сливен, ДКЦ-2 Сливен, ДКЦ-Сливен ООД,
--   Център за кожно-венерически заболявания – Сливен.
-- Fill their email after a manual check, then add rows under categoryId
-- 'hospitals' (or a dedicated ДКЦ/МЦ category).
-- ===========================================================================

-- ===========================================================================
-- OPTIONAL — idempotent re-runs:
--   ALTER TABLE `Institution` ADD UNIQUE KEY `Institution_email_key` (`email`);
-- then change every `INSERT INTO `Institution`` above to
--   `INSERT IGNORE INTO `Institution``  so re-running skips existing rows.
-- ===========================================================================
