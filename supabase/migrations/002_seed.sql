-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Create the 9 turboSMTP Support Agents
-- Run AFTER migration 001.
--
-- HOW TO USE:
--   Option A (Recommended): Use the seed script  scripts/seed-users.js
--   Option B: Manually create users in Supabase Dashboard → Authentication →
--             Users → Invite User, then update profiles table below.
--
-- The JS seed script (Option A) is easier — it creates auth users AND
-- sets their profile metadata in one step.
-- ═══════════════════════════════════════════════════════════════════════════

-- If you created users manually, update their profiles here.
-- Replace the UUIDs with the actual auth.users IDs from your Supabase dashboard.

-- Example (replace UUIDs):
/*
update public.profiles set
  name = 'Dina Ramadan',
  role = 'L1 Support Lead',
  shift = 'Morning (8-4)',
  color = '#ef4444',
  is_admin = true
where id = 'YOUR-DINA-UUID-HERE';
*/

-- Seed default schedule for current week (optional — adjust dates)
-- insert into public.schedule (date, user_id, shift) values
--   ('2025-04-28', 'UUID-AHMED',  'Morning'),
--   ('2025-04-28', 'UUID-SARA',   'Morning'),
--   ...
