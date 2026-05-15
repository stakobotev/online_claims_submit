-- Add GIN full-text search index on Complaint title and body
-- Using 'simple' dictionary to support both English and Bulgarian text
CREATE INDEX "Complaint_fts_idx" ON "Complaint" USING GIN (to_tsvector('simple', "title" || ' ' || "body"));
