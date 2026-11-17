import { Suspense } from "react";
import { connection } from "next/server";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { SetupPanel } from "@/components/setup-panel";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

type HomeProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string; reset?: string; section?: string }>;
};

export const instant = false;

function isMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export default function Home({ searchParams }: HomeProps) {
  return (
    <Suspense
      fallback={
        <main className="setup-page">
          <section className="setup-card">
            <div className="brand-mark">C</div>
            <p className="eyebrow">Control Monetario</p>
            <h1>Preparando tu espacio</h1>
            <p>Cargando tus finanzas...</p>
          </section>
        </main>
      }
    >
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return <SetupPanel />;
  }

  await connection();
  const supabase = await createServerSupabaseClient({ allowCookieWrites: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return <AuthPanel error={params.error} notice={params.notice} resetStep={params.reset === "code"} />;
  }

  const admin = createAdminSupabaseClient();
  const { data: allowedUser, error: whitelistError } = await admin
    .from("allowed_users")
    .select("username")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (whitelistError) {
    return (
      <AuthPanel
        error="No pudimos validar tu acceso. Revisa la configuración del servidor."
        notice={params.notice}
        resetStep={params.reset === "code"}
      />
    );
  }
  if (!allowedUser) {
    return <AuthPanel error="Tu correo no está autorizado para acceder." resetStep={params.reset === "code"} />;
  }

  const month = isMonth(params.month) ? params.month : new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);

  const [monthlyTransactions, budgets, budgetHistory, goals, monthlyGoals, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .gte("date", monthStart)
      .lt("date", nextMonthStart)
      .order("date", { ascending: false }),
    supabase.from("budgets").select("*").eq("month", `${month}-01`).order("category"),
    supabase
      .from("budget_history")
      .select("*")
      .eq("month", `${month}-01`)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
    supabase.from("monthly_goals").select("*").eq("month", `${month}-01`).order("goal_type"),
    supabase.from("categories").select("*").order("name"),
  ]);

  const loadError =
    monthlyTransactions.error?.message ??
    budgets.error?.message ??
    budgetHistory.error?.message ??
    goals.error?.message ??
    monthlyGoals.error?.message ??
    categories.error?.message;

  if (loadError) {
    return (
      <main className="error-page">
        <section className="error-card">
          <div className="brand-mark">C</div>
          <p className="eyebrow">Control Monetario</p>
          <h1>No pudimos cargar tus finanzas</h1>
          <p>Revisa que la migración de Supabase esté aplicada y vuelve a intentarlo.</p>
          <pre>{loadError}</pre>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      key={`${month}-${params.section ?? "resumen"}`}
      username={allowedUser.username}
      month={month}
      initialSection={params.section}
      today={new Date().toISOString().slice(0, 10)}
      error={params.error}
      notice={params.notice}
      transactions={monthlyTransactions.data ?? []}
      recentTransactions={monthlyTransactions.data ?? []}
      budgets={budgets.data ?? []}
      budgetHistory={budgetHistory.data ?? []}
      goals={goals.data ?? []}
      monthlyGoals={monthlyGoals.data ?? []}
      categories={categories.data ?? []}
    />
  );
}
