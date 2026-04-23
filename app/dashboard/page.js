import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";
import HRShell from "../../components/HRShell";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Fetch all profiles (for team view, schedule, etc.)
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .order("name");

  // Fetch all leave balances
  const { data: balances } = await supabase
    .from("leave_balances")
    .select("*");

  // Fetch leave requests
  // Admins get all; agents get only their own (RLS enforces this server-side too)
  const { data: leaveRequests } = await supabase
    .from("leave_requests")
    .select("*, profiles!leave_requests_user_id_fkey(name, role, color)")
    .order("submitted_at", { ascending: false });

  // Fetch schedule (next 60 days)
  const today = new Date().toISOString().split("T")[0];
  const in60  = new Date(Date.now() + 60*24*60*60*1000).toISOString().split("T")[0];
  const { data: schedule } = await supabase
    .from("schedule")
    .select("*")
    .gte("date", today)
    .lte("date", in60);

  // Fetch notifications (admin only — RLS handles this)
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <HRShell
      currentUser={profile || { id: session.user.id, name: session.user.email, role: "Agent", shift: "Morning (8-4)", color: "#6366f1", is_admin: false }}
      allProfiles={allProfiles || []}
      balances={balances || []}
      leaveRequests={leaveRequests || []}
      schedule={schedule || []}
      notifications={notifications || []}
    />
  );
}
