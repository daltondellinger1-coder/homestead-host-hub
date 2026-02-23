
-- Create unit_type enum
CREATE TYPE public.unit_type AS ENUM ('1br', '2br', 'cottage');

-- Add unit_type column to units table with default
ALTER TABLE public.units ADD COLUMN unit_type public.unit_type NOT NULL DEFAULT '1br';
