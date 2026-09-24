import { supabase } from '@/lib/supabase';
import type { AvailabilityData } from '@/components/calendar/availability';

export async function fetchCalendarAvailability(companyId: string, locationId: string, startDate: string, endDate: string): Promise<AvailabilityData> {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00'); end.setDate(end.getDate() + 1);
  const [rules, exceptions] = await Promise.all([
    supabase.from('staff_schedule_rule')
      .select('staff_id, day_of_week, start_time, end_time, effective_from, effective_to')
      .eq('company_id', companyId).eq('location_id', locationId).eq('is_active', true),
    supabase.from('staff_schedule_exception').select('staff_id, starts_at, ends_at, kind')
      .eq('company_id', companyId).eq('location_id', locationId)
      .lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()),
  ]);
  if (rules.error) throw rules.error;
  if (exceptions.error) throw exceptions.error;
  return { rules: rules.data ?? [], exceptions: (exceptions.data ?? []).flatMap(row => row.kind === 'unavailable' || row.kind === 'available_addition' ? [{ ...row, kind: row.kind }] : []) };
}
