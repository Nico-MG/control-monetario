"use client";

import { useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Goal,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  createBudget,
  createCategory,
  createExcelTemplateBudgets,
  createGoal,
  createTransaction,
  deleteBudget,
  deleteCategory,
  deleteGoal,
  deleteMonthlyGoal,
  deleteTransaction,
  saveMonthlyGoal,
  signOut,
  updateBudget,
  updateCategory,
  updateGoal,
  updateTransaction,
} from "@/app/actions";
import type { Database } from "@/lib/supabase/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type BudgetHistory = Database["public"]["Tables"]["budget_history"]["Row"];
type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
type MonthlyGoal = Database["public"]["Tables"]["monthly_goals"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Section = "resumen" | "presupuesto" | "metas" | "movimientos" | "administrar";

type DashboardProps = {
  username: string;
  month: string;
  initialSection?: string;
  today: string;
  error?: string;
  notice?: string;
  transactions: Transaction[];
  recentTransactions: Transaction[];
  budgets: Budget[];
  budgetHistory: BudgetHistory[];
  goals: SavingsGoal[];
  monthlyGoals: MonthlyGoal[];
  categories: Category[];
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

const sections: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "presupuesto", label: "Presupuesto", icon: Wallet },
  { id: "metas", label: "Metas", icon: Goal },
  { id: "movimientos", label: "Movimientos", icon: CreditCard },
  { id: "administrar", label: "Administrar", icon: Settings2 },
];

function isSection(value: string | undefined): value is Section {
  return sections.some((section) => section.id === value);
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function percent(value: number) {
  return Math.round(value * 100);
}

function transactionTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function historyText(event: BudgetHistory) {
  if (event.action === "created") return "Presupuesto creado";
  if (event.action === "deleted") return "Presupuesto eliminado";
  return "Presupuesto modificado";
}

export function Dashboard({
  username,
  month,
  initialSection,
  today,
  error,
  notice,
  transactions,
  recentTransactions,
  budgets,
  budgetHistory,
  goals,
  monthlyGoals,
  categories,
}: DashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>(
    isSection(initialSection) ? initialSection : "resumen",
  );
  const [expenseSearch, setExpenseSearch] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const income = transactions.reduce(
    (total, transaction) => total + (transaction.type === "income" ? transaction.amount : 0),
    0,
  );
  const expenses = transactions.reduce(
    (total, transaction) => total + (transaction.type === "expense" ? transaction.amount : 0),
    0,
  );
  const planned = budgets.reduce((total, budget) => total + budget.amount, 0);
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === "expense") {
      spentByCategory.set(
        transaction.category,
        (spentByCategory.get(transaction.category) ?? 0) + transaction.amount,
      );
    }
  }
  const searchTerm = expenseSearch.trim().toLocaleLowerCase("es-CL");
  const matchingExpenses = searchTerm
    ? transactions.filter((transaction) =>
        transaction.type === "expense" &&
        `${transaction.description} ${transaction.notes ?? ""}`.toLocaleLowerCase("es-CL").includes(searchTerm),
      )
    : [];
  const matchedExpenseTotal = matchingExpenses.reduce((total, transaction) => total + transaction.amount, 0);
  const matchedByCategory = new Map<string, number>();
  for (const transaction of matchingExpenses) {
    matchedByCategory.set(
      transaction.category,
      (matchedByCategory.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  function changeSection(section: Section) {
    setActiveSection(section);
    touchStart.current = null;
  }

  function onTouchStart(event: React.TouchEvent<HTMLElement>) {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, select, button, a, form")) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const horizontal = touch.clientX - start.x;
    const vertical = touch.clientY - start.y;
    if (Math.abs(horizontal) < 60 || Math.abs(horizontal) <= Math.abs(vertical) * 1.3) return;

    const currentIndex = sections.findIndex((section) => section.id === activeSection);
    const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + (horizontal < 0 ? 1 : -1)));
    changeSection(sections[nextIndex].id);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#resumen" onClick={() => changeSection("resumen")}>
          <span className="brand-mark">C</span>
          <span>Control Monetario</span>
        </a>
        <p className="nav-label">Tu espacio</p>
        <nav aria-label="Secciones principales" className="side-nav">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              aria-current={activeSection === id ? "page" : undefined}
              className={activeSection === id ? "active" : ""}
              key={id}
              onClick={() => changeSection(id)}
              type="button"
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="account-card">
            <span className="avatar">{username.charAt(0).toUpperCase() || "U"}</span>
            <span className="account-email" title={username}>{username}</span>
            <form action={signOut}>
              <button className="logout-button" type="submit">Cerrar sesión</button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main-area" id="resumen">
        <header className="topbar">
          <div>
            <p className="eyebrow">Tu panorama financiero</p>
            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
            <p className="subhead">Organiza tu dinero para {formatMonth(month)}.</p>
          </div>
          <form className="month-picker" action="/">
            <CalendarDays aria-hidden="true" />
            <input aria-label="Mes" defaultValue={month} name="month" type="month" />
            <input name="section" type="hidden" value={activeSection} />
            <button className="text-link" type="submit">Ver</button>
          </form>
        </header>

        <nav aria-label="Cambiar sección" className="section-cards">
          {sections.map(({ id, label, icon: Icon }, index) => (
            <button
              aria-current={activeSection === id ? "page" : undefined}
              className={`section-card${activeSection === id ? " active" : ""}`}
              key={id}
              onClick={() => changeSection(id)}
              type="button"
            >
              <Icon />
              <span>{label}</span>
              <small>{index + 1} / {sections.length}</small>
            </button>
          ))}
        </nav>

        {error && <div className="notice error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        <div
          className="page-content"
          onTouchEnd={onTouchEnd}
          onTouchStart={onTouchStart}
        >
          {activeSection === "resumen" && (
            <section aria-label="Resumen del mes" className="view-page">
              <div className="summary-grid">
                <article className="summary-card">
                  <div className="summary-label">
                    <span>Ingresos</span><span className="summary-icon"><ArrowDownLeft /></span>
                  </div>
                  <div className="summary-value">{currency.format(income)}</div>
                  <div className="summary-note">{formatMonth(month)}</div>
                </article>
                <article className="summary-card">
                  <div className="summary-label">
                    <span>Gastos registrados</span><span className="summary-icon"><ArrowUpRight /></span>
                  </div>
                  <div className="summary-value">{currency.format(expenses)}</div>
                  <div className="summary-note">
                    {planned > 0 ? `${currency.format(planned)} presupuestados` : "Sin presupuesto definido"}
                  </div>
                </article>
                <article className="summary-card">
                  <div className="summary-label">
                    <span>Balance del mes</span><span className="summary-icon"><CircleDollarSign /></span>
                  </div>
                  <div className="summary-value">{currency.format(income - expenses)}</div>
                  <div className="summary-note">Ingresos menos gastos registrados</div>
                </article>
                <article className="summary-card">
                  <div className="summary-label">
                    <span>Ingresos − presupuesto</span><span className="summary-icon"><BarChart3 /></span>
                  </div>
                  <div className="summary-value">{currency.format(income - planned)}</div>
                  <div className="summary-note">
                    {income >= planned ? "Disponible para asignar" : "El plan supera tus ingresos"}
                  </div>
                </article>
              </div>

              <div className="content-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Cumplimiento del presupuesto</h2>
                      <p>Gasto registrado frente al monto planificado.</p>
                    </div>
                    <button className="text-link" onClick={() => changeSection("presupuesto")} type="button">
                      Ver detalle
                    </button>
                  </div>
                  {budgets.length > 0 ? (
                    <div className="budget-list">
                      {budgets.map((budget) => {
                        const spent = spentByCategory.get(budget.category) ?? 0;
                        const ratio = budget.amount > 0 ? spent / budget.amount : spent > 0 ? 1 : 0;
                        return (
                          <div key={budget.id}>
                            <div className="budget-row-head">
                              <strong>{budget.category}</strong>
                              <span>{currency.format(spent)} / {currency.format(budget.amount)}</span>
                            </div>
                            <div
                              aria-label={`${budget.category}: ${percent(ratio)}% del presupuesto`}
                              aria-valuemax={100}
                              aria-valuemin={0}
                              aria-valuenow={Math.min(percent(ratio), 100)}
                              className="progress-track"
                              role="progressbar"
                            >
                              <div
                                className={`progress-fill${ratio > 1 ? " over" : ""}`}
                                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                              />
                            </div>
                            <div className="progress-caption">
                              <span>{percent(ratio)}% utilizado</span>
                              <span>{ratio > 1 ? "Presupuesto excedido" : `${currency.format(budget.amount - spent)} disponible`}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">Todavía no hay presupuestos para este mes.</div>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Metas mensuales</h2>
                      <p>Avance calculado sobre tus ingresos del mes.</p>
                    </div>
                    <button className="text-link" onClick={() => changeSection("metas")} type="button">
                      Ver metas
                    </button>
                  </div>
                  {monthlyGoals.length > 0 ? monthlyGoals.map((goal) => {
                    const target = Math.round(income * goal.percentage / 100);
                    const ratio = target > 0 ? goal.saved_amount / target : 0;
                    return (
                      <article className="goal-card" key={goal.id}>
                        <div className="goal-title-row">
                          <strong>{goal.goal_type === "savings" ? "Ahorro" : "Inversión"} · {goal.percentage}%</strong>
                          <span>{percent(ratio)}%</span>
                        </div>
                        <div className="progress-track" role="progressbar" aria-valuenow={Math.min(percent(ratio), 100)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="progress-fill" style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                        </div>
                        <div className="goal-meta">
                          <span>{currency.format(goal.saved_amount)} de {currency.format(target)}</span>
                          <span>Meta mensual</span>
                        </div>
                      </article>
                    );
                  }) : <div className="empty-state">Aún no definiste metas mensuales.</div>}
                </section>
              </div>

              <section className="panel summary-recent">
                <div className="panel-heading">
                  <div>
                    <h2>Movimientos recientes</h2>
                    <p>Últimos registros de {formatMonth(month)}.</p>
                  </div>
                  <button className="text-link" onClick={() => changeSection("movimientos")} type="button">
                    Ver movimientos
                  </button>
                </div>
                <TransactionList transactions={recentTransactions.slice(0, 5)} />
              </section>
            </section>
          )}

          {activeSection === "presupuesto" && (
            <section aria-label="Presupuestos" className="view-page content-grid">
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Presupuesto por categoría</h2>
                      <p>Qué planeas gastar durante {formatMonth(month)}.</p>
                    </div>
                  </div>
                  <div className="budget-list">
                    {budgets.map((budget) => {
                      const spent = spentByCategory.get(budget.category) ?? 0;
                      const ratio = budget.amount > 0 ? spent / budget.amount : spent > 0 ? 1 : 0;
                      return (
                        <article className="budget-item" key={budget.id}>
                          <div className="budget-row-head">
                            <strong>{budget.category}</strong>
                            <span>{currency.format(spent)} gastados / {currency.format(budget.amount)}</span>
                          </div>
                          {budget.notes && <p className="item-comment">{budget.notes}</p>}
                          <div className="progress-track" role="progressbar" aria-valuenow={Math.min(percent(ratio), 100)} aria-valuemin={0} aria-valuemax={100}>
                            <div className={`progress-fill${ratio > 1 ? " over" : ""}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                          </div>
                          <div className="progress-caption">
                            <span>{budget.scheme === "fixed" ? "Fijo" : "Variable"} · {percent(ratio)}% utilizado</span>
                            <span>{ratio > 1 ? `Excedido en ${currency.format(spent - budget.amount)}` : `${currency.format(budget.amount - spent)} disponible`}</span>
                          </div>
                          <details className="edit-details">
                            <summary><Pencil /> Editar presupuesto</summary>
                            <form action={updateBudget} className="form-grid">
                              <input name="id" type="hidden" value={budget.id} />
                              <input name="month" type="hidden" value={month} />
                              <div className="field">
                                <label htmlFor={`budget-category-${budget.id}`}>Categoría</label>
                                <select defaultValue={budget.category} id={`budget-category-${budget.id}`} name="category" required>
                                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                                </select>
                              </div>
                              <div className="field">
                                <label htmlFor={`budget-amount-${budget.id}`}>Monto (CLP)</label>
                                <input defaultValue={budget.amount} id={`budget-amount-${budget.id}`} min="0" name="amount" required type="number" />
                              </div>
                              <div className="field">
                                <label htmlFor={`budget-scheme-${budget.id}`}>Tipo</label>
                                <select defaultValue={budget.scheme} id={`budget-scheme-${budget.id}`} name="scheme">
                                  <option value="fixed">Fijo</option><option value="variable">Variable</option>
                                </select>
                              </div>
                              <div className="field full">
                                <label htmlFor={`budget-notes-${budget.id}`}>Comentario</label>
                                <input defaultValue={budget.notes ?? ""} id={`budget-notes-${budget.id}`} maxLength={500} name="notes" />
                              </div>
                              <div className="form-actions full">
                                <button className="primary-button" type="submit">Guardar cambios</button>
                              </div>
                            </form>
                            <form action={deleteBudget} className="delete-form">
                              <input name="id" type="hidden" value={budget.id} />
                              <input name="month" type="hidden" value={month} />
                              <button className="danger-button" type="submit"><Trash2 /> Eliminar presupuesto</button>
                            </form>
                          </details>
                        </article>
                      );
                    })}
                    {budgets.length === 0 && (
                      <div className="empty-state">
                        Aún no hay categorías para este mes. Crea tu primera asignación.
                        <form action={createExcelTemplateBudgets} className="form-actions" style={{ justifyContent: "center" }}>
                          <input name="month" type="hidden" value={month} />
                          <button className="secondary-button" type="submit"><Plus /> Usar plantilla del Excel</button>
                        </form>
                      </div>
                    )}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Historial de asignaciones</h2>
                      <p>Revisa cuándo y cómo fuiste ajustando el plan.</p>
                    </div>
                  </div>
                  {budgetHistory.length > 0 ? (
                    <div className="history-list">
                      {budgetHistory.map((event) => (
                        <article className="history-item" key={event.id}>
                          <span className="history-mark"><Wallet /></span>
                          <div className="history-content">
                            <strong>{event.category} · {historyText(event)}</strong>
                            <span>
                              {event.action === "updated" && event.previous_amount !== null
                                ? `${currency.format(event.previous_amount)} → ${currency.format(event.amount ?? 0)}`
                                : event.action === "deleted"
                                  ? currency.format(event.previous_amount ?? 0)
                                  : currency.format(event.amount ?? 0)}
                              {event.notes ? ` · ${event.notes}` : ""}
                            </span>
                          </div>
                          <time dateTime={event.recorded_at}>{transactionTime(event.recorded_at)}</time>
                        </article>
                      ))}
                    </div>
                  ) : <div className="empty-state">Los cambios que hagas en el presupuesto aparecerán aquí con su fecha y hora.</div>}
                </section>
              </div>
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Agregar al presupuesto</h2>
                      <p>Asigna una cantidad y anota en qué planeas gastarla.</p>
                    </div>
                  </div>
                  <form action={createBudget}>
                    <input name="month" type="hidden" value={month} />
                    <div className="form-grid">
                      <div className="field full">
                        <label htmlFor="budget-category-new">Categoría</label>
                        <select defaultValue="" id="budget-category-new" name="category" required>
                          <option disabled value="">{categories.length > 0 ? "Selecciona una categoría" : "Crea una categoría primero"}</option>
                          {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="budget-amount-new">Monto planeado (CLP)</label>
                        <input id="budget-amount-new" min="0" name="amount" required type="number" />
                      </div>
                      <div className="field">
                        <label htmlFor="budget-scheme-new">Tipo de gasto</label>
                        <select defaultValue="variable" id="budget-scheme-new" name="scheme">
                          <option value="fixed">Fijo</option><option value="variable">Variable</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label htmlFor="budget-notes-new">Comentario</label>
                        <input id="budget-notes-new" maxLength={500} name="notes" placeholder="Ej. burritos, transporte al trabajo..." />
                      </div>
                    </div>
                    <div className="form-actions">
                      <span className="form-hint">Total planeado: {currency.format(planned)} / ingresos: {currency.format(income)}</span>
                      <button className="primary-button" type="submit"><Plus /> Guardar</button>
                    </div>
                  </form>
                </section>
                <section className={`balance-card${income - planned < 0 ? " negative" : ""}`}>
                  <span>Ingresos menos presupuesto</span>
                  <strong>{currency.format(income - planned)}</strong>
                  <p>{income >= planned ? "Este monto aún no está asignado a una categoría." : "El presupuesto supera los ingresos registrados."}</p>
                </section>
              </div>
            </section>
          )}

          {activeSection === "metas" && (
            <section aria-label="Metas" className="view-page content-grid">
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Metas de este mes</h2>
                      <p>Porcentaje de ingresos destinado a ahorro e inversión.</p>
                    </div>
                  </div>
                  {monthlyGoals.length > 0 ? monthlyGoals.map((goal) => {
                    const target = Math.round(income * goal.percentage / 100);
                    const ratio = target > 0 ? goal.saved_amount / target : 0;
                    return (
                      <article className="monthly-goal-card" key={goal.id}>
                        <div className="goal-title-row">
                          <strong>{goal.goal_type === "savings" ? "Ahorro mensual" : "Inversión mensual"}</strong>
                          <span>{goal.percentage}% de ingresos</span>
                        </div>
                        <div className="goal-target">{currency.format(target)} objetivo</div>
                        <div className="progress-track" role="progressbar" aria-valuenow={Math.min(percent(ratio), 100)} aria-valuemin={0} aria-valuemax={100}>
                          <div className="progress-fill" style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                        </div>
                        <div className="goal-meta">
                          <span>{currency.format(goal.saved_amount)} acumulados</span>
                          <span>{percent(ratio)}% cumplido</span>
                        </div>
                      </article>
                    );
                  }) : <div className="empty-state">Configura tus metas mensuales desde Administrar.</div>}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Gráfico de cumplimiento</h2>
                      <p>Lo que llevas ahorrado frente a tu objetivo del mes.</p>
                    </div>
                  </div>
                  {monthlyGoals.length > 0 ? (
                    <div className="goal-chart">
                      {monthlyGoals.map((goal) => {
                        const target = Math.round(income * goal.percentage / 100);
                        const ratio = target > 0 ? goal.saved_amount / target : 0;
                        return (
                          <div className="goal-chart-row" key={goal.id}>
                            <div className="budget-row-head">
                              <strong>{goal.goal_type === "savings" ? "Ahorro" : "Inversión"}</strong>
                              <span>{percent(ratio)}%</span>
                            </div>
                            <div className="progress-track goal-track" role="progressbar" aria-valuenow={Math.min(percent(ratio), 100)} aria-valuemin={0} aria-valuemax={100}>
                              <div className="progress-fill" style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                            </div>
                            <div className="progress-caption">
                              <span>{currency.format(goal.saved_amount)}</span><span>de {currency.format(target)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="empty-state">Al definir una meta, verás su avance mensual aquí.</div>}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Objetivos de ahorro</h2>
                    <p>Metas personales a largo plazo.</p>
                  </div>
                </div>
                {goals.length > 0 ? goals.map((goal) => {
                  const ratio = goal.target_amount > 0 ? goal.saved_amount / goal.target_amount : 0;
                  return (
                    <article className="goal-card" key={goal.id}>
                      <div className="goal-title-row">
                        <strong>{goal.title}</strong><span>{percent(ratio)}%</span>
                      </div>
                      <div className="progress-track" role="progressbar" aria-valuenow={Math.min(percent(ratio), 100)} aria-valuemin={0} aria-valuemax={100}>
                        <div className="progress-fill" style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                      </div>
                      <div className="goal-meta">
                        <span>{currency.format(goal.saved_amount)} ahorrados</span>
                        <span>Meta {currency.format(goal.target_amount)}</span>
                      </div>
                      <div className="goal-meta">
                        <span>{goal.due_date ? `Fecha objetivo: ${dateFormatter.format(new Date(`${goal.due_date}T00:00:00Z`))}` : "Sin fecha objetivo"}</span>
                      </div>
                    </article>
                  );
                }) : <div className="empty-state">Aún no hay metas a largo plazo. Puedes crearlas desde Administrar.</div>}
              </section>
            </section>
          )}

          {activeSection === "movimientos" && (
            <section aria-label="Movimientos" className="view-page content-grid">
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Movimientos de {formatMonth(month)}</h2>
                      <p>Edita la descripción o el comentario para recordar cada gasto.</p>
                    </div>
                  </div>
                  <div className="expense-insights">
                    <label className="search-input">
                      <Search aria-hidden="true" />
                      <span className="visually-hidden">Buscar gastos por descripción o comentario</span>
                      <input
                        onChange={(event) => setExpenseSearch(event.target.value)}
                        placeholder="Busca una palabra, ej. burrito"
                        value={expenseSearch}
                      />
                    </label>
                    {searchTerm && (
                      <div aria-live="polite" className="expense-search-result">
                        <strong>
                          {currency.format(matchedExpenseTotal)} en {matchingExpenses.length} gasto{matchingExpenses.length === 1 ? "" : "s"} con “{expenseSearch.trim()}”
                        </strong>
                        {matchingExpenses.length > 0 ? (
                          <ul>
                            {[...matchedByCategory.entries()].map(([category, amount]) => (
                              <li key={category}><span>{category}</span><span>{currency.format(amount)}</span></li>
                            ))}
                          </ul>
                        ) : <p>No encontramos gastos con esa palabra en este mes.</p>}
                      </div>
                    )}
                  </div>
                  {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
                    <article className="transaction-item" key={transaction.id}>
                      <TransactionRow transaction={transaction} />
                      {transaction.notes && <p className="item-comment">{transaction.notes}</p>}
                      <details className="edit-details">
                        <summary><Pencil /> Editar movimiento</summary>
                        <form action={updateTransaction} className="form-grid">
                          <input name="id" type="hidden" value={transaction.id} />
                          <input name="month" type="hidden" value={month} />
                          <div className="field full">
                            <label htmlFor={`transaction-description-${transaction.id}`}>Descripción</label>
                            <input defaultValue={transaction.description} id={`transaction-description-${transaction.id}`} maxLength={120} name="description" required />
                          </div>
                          <div className="field">
                            <label htmlFor={`transaction-type-${transaction.id}`}>Tipo</label>
                            <select defaultValue={transaction.type} id={`transaction-type-${transaction.id}`} name="type">
                              <option value="expense">Gasto</option><option value="income">Ingreso</option>
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`transaction-category-${transaction.id}`}>Categoría</label>
                            <select defaultValue={transaction.category} id={`transaction-category-${transaction.id}`} name="category" required>
                              {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`transaction-amount-${transaction.id}`}>Monto (CLP)</label>
                            <input defaultValue={transaction.amount} id={`transaction-amount-${transaction.id}`} min="1" name="amount" required type="number" />
                          </div>
                          <div className="field">
                            <label htmlFor={`transaction-date-${transaction.id}`}>Fecha</label>
                            <input defaultValue={transaction.date} id={`transaction-date-${transaction.id}`} name="date" required type="date" />
                          </div>
                          <div className="field full">
                            <label htmlFor={`transaction-notes-${transaction.id}`}>Comentario</label>
                            <input defaultValue={transaction.notes ?? ""} id={`transaction-notes-${transaction.id}`} maxLength={500} name="notes" />
                          </div>
                          <div className="form-actions full">
                            <button className="primary-button" type="submit">Guardar cambios</button>
                          </div>
                        </form>
                        <form action={deleteTransaction} className="delete-form">
                          <input name="id" type="hidden" value={transaction.id} />
                          <input name="month" type="hidden" value={month} />
                          <button className="danger-button" type="submit"><Trash2 /> Eliminar movimiento</button>
                        </form>
                      </details>
                    </article>
                  )) : <div className="empty-state">Todavía no hay movimientos en este mes.</div>}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Agregar movimiento</h2>
                    <p>Registra un ingreso o un gasto.</p>
                  </div>
                </div>
                <form action={createTransaction}>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="transaction-description">Descripción</label>
                      <input id="transaction-description" maxLength={120} name="description" placeholder="Ej. Compra supermercado" required />
                    </div>
                    <div className="field">
                      <label htmlFor="transaction-type">Tipo</label>
                      <select id="transaction-type" name="type">
                        <option value="expense">Gasto</option><option value="income">Ingreso</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="transaction-category">Categoría</label>
                      <select defaultValue="" id="transaction-category" name="category" required>
                        <option disabled value="">{categories.length > 0 ? "Selecciona una categoría" : "Crea una categoría primero"}</option>
                        {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="transaction-amount">Monto (CLP)</label>
                      <input id="transaction-amount" min="1" name="amount" required type="number" />
                    </div>
                    <div className="field">
                      <label htmlFor="transaction-date">Fecha</label>
                      <input defaultValue={today} id="transaction-date" name="date" required type="date" />
                    </div>
                    <div className="field full">
                      <label htmlFor="transaction-notes">Comentario (opcional)</label>
                      <input id="transaction-notes" maxLength={500} name="notes" placeholder="Ej. burrito, almuerzo con amigos..." />
                    </div>
                  </div>
                  <div className="form-actions">
                    <span className="form-hint">La fecha y hora del registro se guardan automáticamente.</span>
                    <button className="primary-button" type="submit"><Plus /> Guardar</button>
                  </div>
                </form>
              </section>
            </section>
          )}

          {activeSection === "administrar" && (
            <section aria-label="Administrar categorías y metas" className="view-page content-grid">
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Categorías</h2>
                      <p>Organiza y renombra tus categorías. Al renombrar, se actualizan sus registros.</p>
                    </div>
                  </div>
                  <form action={createCategory} className="category-form">
                    <div className="field">
                      <label htmlFor="new-category">Nueva categoría</label>
                      <input autoComplete="off" id="new-category" maxLength={60} name="name" placeholder="Ej. Salud" required />
                    </div>
                    <button className="primary-button" type="submit"><Plus /> Crear</button>
                  </form>
                  <div className="manage-list">
                    {categories.map((category) => (
                      <article className="manage-item" key={category.id}>
                        <form action={updateCategory} className="manage-edit-form">
                          <input name="id" type="hidden" value={category.id} />
                          <div className="field">
                            <label htmlFor={`category-${category.id}`}>Nombre</label>
                            <input defaultValue={category.name} id={`category-${category.id}`} maxLength={60} name="name" required />
                          </div>
                          <button aria-label={`Guardar cambios en ${category.name}`} className="icon-button" title="Guardar cambios" type="submit"><Pencil /></button>
                        </form>
                        <form action={deleteCategory}>
                          <input name="id" type="hidden" value={category.id} />
                          <input name="name" type="hidden" value={category.name} />
                          <button aria-label={`Eliminar ${category.name}`} className="icon-button danger" title="Eliminar categoría" type="submit"><Trash2 /></button>
                        </form>
                      </article>
                    ))}
                    {categories.length === 0 && <div className="empty-state">Aún no tienes categorías.</div>}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Metas mensuales</h2>
                      <p>Define el porcentaje de tus ingresos que quieres ahorrar o invertir.</p>
                    </div>
                  </div>
                  {(["savings", "investment"] as const).map((goalType) => {
                    const goal = monthlyGoals.find((item) => item.goal_type === goalType);
                    return (
                      <article className="monthly-manage-item" key={goalType}>
                        <h3>{goalType === "savings" ? "Ahorro mensual" : "Inversión mensual"}</h3>
                        <form action={saveMonthlyGoal} className="form-grid">
                          <input name="month" type="hidden" value={month} />
                          <input name="goal_type" type="hidden" value={goalType} />
                          <div className="field">
                            <label htmlFor={`goal-percent-${goalType}`}>Porcentaje de ingresos</label>
                            <input defaultValue={goal?.percentage ?? 10} id={`goal-percent-${goalType}`} max="100" min="1" name="percentage" required type="number" />
                          </div>
                          <div className="field">
                            <label htmlFor={`goal-saved-${goalType}`}>Acumulado este mes (CLP)</label>
                            <input defaultValue={goal?.saved_amount ?? 0} id={`goal-saved-${goalType}`} min="0" name="saved_amount" required type="number" />
                          </div>
                          <div className="form-actions full">
                            <span className="form-hint">Ingresos actuales: {currency.format(income)}</span>
                            <button className="secondary-button" type="submit">{goal ? "Guardar cambios" : "Crear meta"}</button>
                          </div>
                        </form>
                        {goal && (
                          <form action={deleteMonthlyGoal} className="delete-form">
                            <input name="id" type="hidden" value={goal.id} />
                            <input name="month" type="hidden" value={month} />
                            <button className="danger-button" type="submit"><Trash2 /> Eliminar meta mensual</button>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </section>
              </div>
              <div className="stack">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Metas a largo plazo</h2>
                      <p>Crea y administra objetivos personales de ahorro.</p>
                    </div>
                  </div>
                  {goals.map((goal) => (
                    <details className="manage-goal" key={goal.id}>
                      <summary><span><Goal /> {goal.title}</span><Pencil /></summary>
                      <form action={updateGoal} className="form-grid">
                        <input name="id" type="hidden" value={goal.id} />
                        <div className="field full">
                          <label htmlFor={`goal-title-${goal.id}`}>Nombre</label>
                          <input defaultValue={goal.title} id={`goal-title-${goal.id}`} maxLength={100} name="title" required />
                        </div>
                        <div className="field">
                          <label htmlFor={`goal-target-${goal.id}`}>Monto objetivo (CLP)</label>
                          <input defaultValue={goal.target_amount} id={`goal-target-${goal.id}`} min="1" name="target_amount" required type="number" />
                        </div>
                        <div className="field">
                          <label htmlFor={`goal-saved-${goal.id}`}>Ahorrado (CLP)</label>
                          <input defaultValue={goal.saved_amount} id={`goal-saved-${goal.id}`} min="0" name="saved_amount" required type="number" />
                        </div>
                        <div className="field full">
                          <label htmlFor={`goal-date-${goal.id}`}>Fecha objetivo</label>
                          <input defaultValue={goal.due_date ?? ""} id={`goal-date-${goal.id}`} name="due_date" type="date" />
                        </div>
                        <div className="form-actions full">
                          <button className="primary-button" type="submit">Guardar cambios</button>
                        </div>
                      </form>
                      <form action={deleteGoal} className="delete-form">
                        <input name="id" type="hidden" value={goal.id} />
                        <button className="danger-button" type="submit"><Trash2 /> Eliminar meta</button>
                      </form>
                    </details>
                  ))}
                  {goals.length === 0 && <div className="empty-state">Aún no tienes metas a largo plazo.</div>}
                  <form action={createGoal} className="form-grid create-goal-form">
                    <div className="field full">
                      <label htmlFor="goal-title-new">Nueva meta</label>
                      <input id="goal-title-new" maxLength={100} name="title" placeholder="Ej. Viaje, casa, fondo de emergencia" required />
                    </div>
                    <div className="field">
                      <label htmlFor="goal-target-new">Monto objetivo (CLP)</label>
                      <input id="goal-target-new" min="1" name="target_amount" required type="number" />
                    </div>
                    <div className="field">
                      <label htmlFor="goal-saved-new">Ahorrado hasta ahora</label>
                      <input defaultValue="0" id="goal-saved-new" min="0" name="saved_amount" required type="number" />
                    </div>
                    <div className="field full">
                      <label htmlFor="goal-date-new">Fecha objetivo (opcional)</label>
                      <input id="goal-date-new" name="due_date" type="date" />
                    </div>
                    <div className="form-actions full">
                      <button className="primary-button" type="submit"><Plus /> Crear meta</button>
                    </div>
                  </form>
                </section>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <div className="empty-state">Todavía no hay movimientos. Registra el primero en la sección Movimientos.</div>;
  }
  return <div className="transaction-list">{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div>;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <article className="transaction">
      <span className="transaction-icon">
        {transaction.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
      </span>
      <div>
        <div className="transaction-title">{transaction.description}</div>
        <div className="transaction-detail">
          {transaction.category} · {dateFormatter.format(new Date(`${transaction.date}T00:00:00Z`))}
          {" · "}{transactionTime(transaction.created_at)}
        </div>
      </div>
      <span className={`transaction-amount ${transaction.type}`}>
        {transaction.type === "income" ? "+" : "−"}{currency.format(transaction.amount)}
      </span>
    </article>
  );
}
