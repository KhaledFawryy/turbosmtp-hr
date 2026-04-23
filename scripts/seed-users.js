/**
 * seed-users.js
 * Creates all 9 turboSMTP support agents in Supabase Auth + sets their profiles.
 *
 * Usage:
 *   1. npm install @supabase/supabase-js dotenv   (one-time)
 *   2. Fill in your SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   3. node scripts/seed-users.js
 *
 * The SERVICE_ROLE key bypasses RLS — never expose it in the browser.
 * Find it in: Supabase Dashboard → Settings → API → service_role (secret)
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // add this line to your .env.local
);

const AGENTS = [
  // ── 9 Support Agents ────────────────────────────────────────────────────
  { name: "Abdullah El Quady", email: "abdullah.elquady@turbosmtp.com", password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#6366f1", is_admin: false },
  { name: "Merna Badr",        email: "merna.badr@turbosmtp.com",       password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#8b5cf6", is_admin: false },
  { name: "Mai Seif",          email: "mai.seif@turbosmtp.com",         password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#ec4899", is_admin: false },
  { name: "Noha Ibrahim",      email: "noha.ibrahim@turbosmtp.com",     password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Evening (2-10)", color: "#14b8a6", is_admin: false },
  { name: "Fatma Samir",       email: "fatma.samir@turbosmtp.com",      password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Evening (2-10)", color: "#f59e0b", is_admin: false },
  { name: "Kholoud Tarek",     email: "kholoud.tarek@turbosmtp.com",    password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#10b981", is_admin: false },
  { name: "Amira Sadek",       email: "amira.sadek@turbosmtp.com",      password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Night (10-6)",   color: "#3b82f6", is_admin: false },
  { name: "Dina Qoutb",        email: "dina.qoutb@turbosmtp.com",       password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#ef4444", is_admin: false },
  { name: "Nermine Hermel",    email: "nermine.hermel@turbosmtp.com",   password: "TurboHR@2025!", role: "L1 Support Agent", shift: "Morning (8-4)",  color: "#f97316", is_admin: false },
  // ── 2 Admins ─────────────────────────────────────────────────────────────
  { name: "Khaled Mohamed",    email: "Khaled@turbo-smtp.com",   password: "Admin@123", role: "L1 Support Manager", shift: "Morning (8-4)", color: "#0ea5e9", is_admin: true  },
  { name: "Ahmed Hussien",     email: "Ahmed@turbo-smtp.com",    password: "Admin@123", role: "L1 Support Manager", shift: "Morning (8-4)", color: "#a855f7", is_admin: true  },
];

async function seed() {
  console.log("🌱  Seeding turboSMTP HR users...\n");

  for (const agent of AGENTS) {
    // 1. Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: agent.email,
      password: agent.password,
      email_confirm: true, // skip email verification for seeded users
      user_metadata: {
        name:     agent.name,
        role:     agent.role,
        shift:    agent.shift,
        color:    agent.color,
        is_admin: agent.is_admin,
      },
    });

    if (error) {
      console.error(`  ✗  ${agent.name}: ${error.message}`);
      continue;
    }

    // 2. Update profile (trigger handle_new_user already ran, but let's ensure is_admin)
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ is_admin: agent.is_admin })
      .eq("id", data.user.id);

    if (profileErr) {
      console.warn(`  ⚠  ${agent.name} profile update: ${profileErr.message}`);
    } else {
      console.log(`  ✓  ${agent.name} (${agent.email})${agent.is_admin ? " [ADMIN]" : ""}`);
    }
  }

  console.log("\n✅  Done! All 11 members created (9 agents + 2 admins).");
  console.log("   Default password for all: TurboHR@2025!");
  console.log("   → Ask everyone to change their password on first login.\n");
}

seed().catch(console.error);
