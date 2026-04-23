import { createClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { requestId, action } = await request.json(); // action: "approved" | "rejected"
  if (!requestId || !["approved","rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Update request status
  const { data: req, error } = await supabase
    .from("leave_requests")
    .update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: session.user.id })
    .eq("id", requestId)
    .select("*, profiles!leave_requests_user_id_fkey(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approved, fire Teams notification
  if (action === "approved") {
    try {
      await sendTeamsNotification(supabase, req, session.user.id);
    } catch (e) {
      console.error("Teams webhook failed:", e.message);
      // Don't fail the whole request if Teams is down
    }
  }

  return NextResponse.json({ success: true, request: req });
}

async function sendTeamsNotification(supabase, req, adminId) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes("YOUR_WEBHOOK")) return;

  const member = req.profiles;
  const dateRange = req.start_date === req.end_date
    ? req.start_date
    : `${req.start_date} → ${req.end_date}`;

  // Find same-shift colleagues scheduled on that day
  const { data: scheduled } = await supabase
    .from("schedule")
    .select("user_id, profiles!schedule_user_id_fkey(name, shift)")
    .eq("date", req.start_date);

  const colleagues = (scheduled || [])
    .filter(s => s.user_id !== req.user_id && s.profiles?.shift === member.shift)
    .map(s => s.profiles?.name)
    .filter(Boolean);

  // Microsoft Teams Adaptive Card payload
  const payload = {
    type: "message",
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          {
            type: "Container",
            style: "emphasis",
            items: [{
              type: "TextBlock",
              text: "📢 Leave Absence Alert — turboSMTP Support",
              weight: "Bolder",
              size: "Medium",
              color: "Accent",
            }],
          },
          {
            type: "FactSet",
            facts: [
              { title: "Agent",    value: `${member.name} (${member.role})` },
              { title: "Dates",    value: dateRange },
              { title: "Type",     value: `${req.type} leave` },
              { title: "Duration", value: `${req.days} working day(s)` },
              { title: "Shift",    value: member.shift },
            ],
          },
          ...(colleagues.length > 0 ? [{
            type: "TextBlock",
            text: `**Same-shift colleagues on ${req.start_date}:** ${colleagues.join(", ")}`,
            wrap: true,
            color: "Warning",
          }] : []),
          {
            type: "TextBlock",
            text: "Please coordinate ticket coverage. Thank you!",
            wrap: true,
            isSubtle: true,
          },
        ],
      },
    }],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Teams responded ${res.status}`);

  // Log notification
  await supabase.from("notifications").insert({
    leave_req_id: req.id,
    message: `Absence alert sent for ${member.name} — ${dateRange}`,
    sent_by: adminId,
    teams_status: "sent",
  });
}
