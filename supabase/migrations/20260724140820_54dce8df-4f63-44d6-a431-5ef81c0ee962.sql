-- Cleaner accounts need the unit name for their own assignments, but no
-- unrelated unit rows or guest/financial data.

DROP POLICY IF EXISTS "Cleaners read units for assigned cleaning tasks" ON public.units;

CREATE POLICY "Cleaners read units for assigned cleaning tasks"
ON public.units
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['cleaner'])
  AND EXISTS (
    SELECT 1
    FROM public.cleaning_tasks task
    WHERE task.unit_id = units.id
      AND task.assigned_cleaner_user_id = auth.uid()
      AND task.status NOT IN ('ready', 'cancelled')
  )
);