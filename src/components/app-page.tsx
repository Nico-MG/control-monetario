import { Suspense } from "react";
import { connection } from "next/server";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard, type DashboardSection } from "@/components/dashboard";
import { SetupPanel } from "@/components/setup-panel";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type SearchParams = Promise<{ error?: string; notice?: string; month?: string; category?: string }>;
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

type AppPageProps = {
  section: DashboardSection;
  searchParams: SearchParams;
};

function isMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

async function loadAllTransactions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  const pageSize = 500;
  const transactions: Transaction[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return { data: null, error };
    }

    transactions.push(...data);
    if (data.length < pageSize) {
      return { data: transactions, error: null };
    }
  }
}

export function AppPage({ section, searchParams }: AppPageProps) {
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
      <AppPageContent section={section} searchParams={searchParams} />
    </Suspense>
  );
}

async function AppPageContent({ section, searchParams }: AppPageProps) {
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
  let transactions: Transaction[] = [];
  let historyTransactions: Transaction[] = [];
  let budgets: Database["public"]["Tables"]["budgets"]["Row"][] = [];
  let closedBudgetCategories: string[] = [];
  let goals: Database["public"]["Tables"]["savings_goals"]["Row"][] = [];
  let categories: Database["public"]["Tables"]["categories"]["Row"][] = [];
  let loadError: string | undefined;

  if (section === "overview" || section === "budgets") {
    const monthlyQuery = supabase
      .from("transactions")
      .select("*")
      .gte("date", monthStart)
      .lt("date", nextMonthStart)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    const budgetQuery = supabase
      .from("budgets")
      .select("*")
      .eq("month", monthStart)
      .order("category")
      .order("created_at", { ascending: true });

    if (section === "overview") {
      const [monthlyTransactions, monthlyBudgets] = await Promise.all([monthlyQuery, budgetQuery]);
      loadError = monthlyTransactions.error?.message ?? monthlyBudgets.error?.message;
      transactions = monthlyTransactions.data ?? [];
      budgets = monthlyBudgets.data ?? [];
    } else {
      const [monthlyTransactions, monthlyBudgets, statuses, categoryRows] = await Promise.all([
        monthlyQuery,
        budgetQuery,
        supabase
          .from("budget_category_status")
          .select("category, is_closed")
          .eq("month", monthStart),
        supabase.from("categories").select("*").order("name"),
      ]);
      loadError =
        monthlyTransactions.error?.message ??
        monthlyBudgets.error?.message ??
        statuses.error?.message ??
        categoryRows.error?.message;
      transactions = monthlyTransactions.data ?? [];
      budgets = monthlyBudgets.data ?? [];
      closedBudgetCategories =
        statuses.data?.filter(({ is_closed }) => is_closed).map(({ category }) => category) ?? [];
      categories = categoryRows.data ?? [];
    }
  } else if (section === "transactions") {
    const [allTransactions, categoryRows] = await Promise.all([
      loadAllTransactions(supabase),
      supabase.from("categories").select("*").order("name"),
    ]);
    loadError = allTransactions.error?.message ?? categoryRows.error?.message;
    historyTransactions = allTransactions.data ?? [];
    categories = categoryRows.data ?? [];
  } else if (section === "goals") {
    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .order("created_at", { ascending: false });
    loadError = error?.message;
    goals = data ?? [];
  } else {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    loadError = error?.message;
    categories = data ?? [];
  }

  if (loadError) {
    return (
      <main className="error-page">
        <section className="error-card">
          <div className="brand-mark">C</div>
          <p className="eyebrow">Control Monetario</p>
          <h1>No pudimos cargar esta sección</h1>
          <p>Revisa la configuración y las migraciones de Supabase; después vuelve a intentarlo.</p>
          <pre>{loadError}</pre>
        </section>
      </main>
    );
  }

  return (
    <Dashboard
      section={section}
      email={user.email ?? ""}
      month={month}
      today={new Date().toISOString().slice(0, 10)}
      error={params.error}
      notice={params.notice}
      selectedCategoryId={params.category}
      transactions={transactions}
      historyTransactions={historyTransactions}
      budgets={budgets}
      closedBudgetCategories={closedBudgetCategories}
      goals={goals}
      categories={categories}
    />
  );
}
