import { createClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, startDate, endDate, days, reason, memberId } = body;

  if (!type || !startDate || !endDate || !days || !reason) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Admins can submit on behalf of anyone; agents only for themselves
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
  const targetUserId = profile?.is_admin && memberId ? memberId : session.user.id;

  // Check balance
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("user_id", targetUserId)
    .single();

  const remaining = {
    annual: (balance?.annual_total || 21) - (balance?.annual_used || 0),
    sick:   (balance?.sick_total   || 6)  - (balance?.sick_used   || 0),
    public: (balance?.public_total || 6)  - (balance?.public_used || 0),
  };

  if (remaining[type] < days) {
    return NextResponse.json({ error: `Insufficient ${type} leave balance (${remaining[type]} days remaining)` }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id:    targetUserId,
      type,
      start_date: startDate,
      end_date:   endDate,
      days,
      reason,
      status:     "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, request: data });
}
