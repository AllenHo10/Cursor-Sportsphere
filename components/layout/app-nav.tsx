import { AppNavBar } from "@/components/layout/app-nav-bar";
import { createClient } from "@/lib/supabase/server";

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return <AppNavBar />;
}
