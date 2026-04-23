import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export const metadata = { title: "Dashboard — turboSMTP HR" };

export default async function DashboardLayout({ children }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
