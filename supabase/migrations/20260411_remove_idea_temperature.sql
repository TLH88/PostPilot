-- Remove the idea temperature (hot/warm/cold) feature.
-- No value was derived from categorizing ideas by temperature. The column
-- was nullable text with default 'warm', so dropping it is non-destructive
-- to the rest of the schema.

ALTER TABLE ideas DROP COLUMN IF EXISTS temperature;
