-- Restore the per-evaluation AD relationship field used by the Garuda EES
-- template. It is nullable so existing EES records remain valid and no
-- relationship is inferred for historical data.
ALTER TABLE "EesEvaluationItem"
ADD COLUMN "adRelated" TEXT;
