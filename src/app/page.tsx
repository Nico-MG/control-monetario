import { Suspense } from "react";
import { connection } from "next/server";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { SetupPanel } from "@/components/setup-panel";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

type HomeProps = {
  searchParams: Promise<{ error?: string; notice?: string; month?: string }>;
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

  if (!user) {
    return <AuthPanel error={params.error} notice={params.notice} />;
  }

  const month = isMonth(params.month) ? params.month : new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);

  const [monthlyTransactions, recentTransactions, budgets, goals, categories] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .gte("date", monthStart)
      .lt("date", nextMonthStart)
      .order("date", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .limit(8),
    supabase.from("budgets").select("*").eq("month", `${month}-01`).order("category"),
    supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
  ]);

  const loadError =
    monthlyTransactions.error?.message ??
    recentTransactions.error?.message ??
    budgets.error?.message ??
    goals.error?.message ??
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
      email={user.email ?? ""}
      month={month}
      today={new Date().toISOString().slice(0, 10)}
      error={params.error}
      notice={params.notice}
      transactions={monthlyTransactions.data ?? []}
      recentTransactions={recentTransactions.data ?? []}
      budgets={budgets.data ?? []}
      goals={goals.data ?? []}
      categories={categories.data ?? []}
    />
  );
}
