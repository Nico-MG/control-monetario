"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Goal,
  LayoutDashboard,
  Plus,
  Wallet,
} from "lucide-react";
import {
  createBudget,
  createCategory,
  createExcelTemplateBudgets,
  createGoal,
  createTransaction,
  signOut,
  updateGoalProgress,
} from "@/app/actions";
import type { Database } from "@/lib/supabase/database.types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

type DashboardProps = {
  email: string;
  month: string;
  today: string;
  error?: string;
  notice?: string;
  transactions: Transaction[];
  recentTransactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
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

export function Dashboard({
  email,
  month,
  today,
  error,
  notice,
  transactions,
  recentTransactions,
  budgets,
  goals,
  categories,
}: DashboardProps) {
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#resumen">
          <span className="brand-mark">C</span>
          <span>Control Monetario</span>
        </a>
        <p className="nav-label">Tu espacio</p>
        <nav className="side-nav">
          <a className="active" href="#resumen"><LayoutDashboard /> Resumen</a>
          <a href="#presupuestos"><Wallet /> Presupuestos</a>
          <a href="#metas"><Goal /> Metas de ahorro</a>
          <a href="#movimientos"><CreditCard /> Movimientos</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="account-card">
            <span className="avatar">{email.charAt(0).toUpperCase() || "U"}</span>
            <span className="account-email" title={email}>{email}</span>
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
            <h1>Resumen mensual</h1>
            <p className="subhead">Un vistazo claro a lo que entra, sale y estás construyendo.</p>
          </div>
          <form className="month-picker" action="/">
            <CalendarDays aria-hidden="true" />
            <input aria-label="Mes" defaultValue={month} name="month" type="month" />
            <button className="text-link" type="submit">Ver</button>
          </form>
        </header>

        {error && <div className="notice error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        <section aria-label="Resumen del mes" className="summary-grid">
          <article className="summary-card">
            <div className="summary-label">
              <span>Ingresos</span><span className="summary-icon"><ArrowDownLeft /></span>
            </div>
            <div className="summary-value">{currency.format(income)}</div>
            <div className="summary-note">{formatMonth(month)}</div>
          </article>
          <article className="summary-card">
            <div className="summary-label">
              <span>Gastos</span><span className="summary-icon"><ArrowUpRight /></span>
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
        </section>

        <div className="content-grid">
          <div className="stack">
            <section className="panel" id="presupuestos">
              <div className="panel-heading">
                <div>
                  <h2>Presupuesto por categoría</h2>
                  <p>Seguimiento de gastos para {formatMonth(month)}.</p>
                </div>
              </div>
              {budgets.length > 0 ? (
                <div className="budget-list">
                  {budgets.map((budget) => {
                    const spent = spentByCategory.get(budget.category) ?? 0;
                    const ratio = budget.amount > 0 ? spent / budget.amount : spent > 0 ? 1 : 0;
                    const width = Math.min(ratio * 100, 100);
                    return (
                      <div key={budget.id}>
                        <div className="budget-row-head">
                          <strong>{budget.category}</strong>
                          <span>{currency.format(spent)} / {currency.format(budget.amount)}</span>
                        </div>
                        <div
                          aria-label={`${budget.category}: ${percent(ratio)}% del presupuesto`}
                          className="progress-track"
                          role="progressbar"
                          aria-valuenow={Math.min(percent(ratio), 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`progress-fill${ratio > 1 ? " over" : ""}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="progress-caption">
                          <span>{budget.scheme === "fixed" ? "Fijo" : "Variable"}</span>
                          <span>
                            {ratio > 1
                              ? `Excedido en ${currency.format(spent - budget.amount)}`
                              : `${currency.format(budget.amount - spent)} disponible`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  Aún no hay categorías para este mes. Puedes cargar el plan de referencia del Excel
                  o crear un presupuesto abajo.
                  <form action={createExcelTemplateBudgets} className="form-actions" style={{ justifyContent: "center" }}>
                    <input name="month" type="hidden" value={month} />
                    <button className="secondary-button" type="submit"><Plus /> Usar plantilla del Excel</button>
                  </form>
                </div>
              )}
              <form action={createBudget} className="form-grid" style={{ marginTop: 20 }}>
                <input name="month" type="hidden" value={month} />
                <div className="field">
                  <label htmlFor="budget-category">Categoría</label>
                  <select defaultValue="" id="budget-category" name="category" required>
                    <option disabled value="">
                      {categories.length > 0 ? "Selecciona una categoría" : "Crea una categoría primero"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="budget-amount">Monto planeado (CLP)</label>
                  <input id="budget-amount" min="0" name="amount" required type="number" />
                </div>
                <div className="field">
                  <label htmlFor="budget-scheme">Tipo</label>
                  <select defaultValue="fixed" id="budget-scheme" name="scheme">
                    <option value="fixed">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </div>
                <div className="form-actions" style={{ alignItems: "end", justifyContent: "end", marginTop: 0 }}>
                  <button className="primary-button" type="submit"><Plus /> Guardar categoría</button>
                </div>
              </form>
              <form action={createCategory} className="category-form">
                <div className="field">
                  <label htmlFor="new-category">Crear categoría</label>
                  <input
                    autoComplete="off"
                    id="new-category"
                    maxLength={60}
                    name="name"
                    placeholder="Ej. Salud"
                    required
                  />
                </div>
                <button className="secondary-button" type="submit"><Plus /> Agregar a la lista</button>
              </form>
            </section>

            <section className="panel" id="movimientos">
              <div className="panel-heading">
                <div>
                  <h2>Movimientos recientes</h2>
                  <p>Los últimos ingresos y gastos que registraste.</p>
                </div>
              </div>
              {recentTransactions.length > 0 ? (
                <div className="transaction-list">
                  {recentTransactions.map((transaction) => (
                    <article className="transaction" key={transaction.id}>
                      <span className="transaction-icon">
                        {transaction.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </span>
                      <div>
                        <div className="transaction-title">{transaction.description}</div>
                        <div className="transaction-detail">
                          {transaction.category} · {dateFormatter.format(new Date(`${transaction.date}T00:00:00Z`))}
                        </div>
                      </div>
                      <span className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === "income" ? "+" : "−"}{currency.format(transaction.amount)}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Todavía no hay movimientos. Registra el primero en el formulario.</div>
              )}
            </section>
          </div>

          <div className="stack right-column">
            <section className="panel" id="nuevo-movimiento">
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
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="transaction-category">Categoría</label>
                    <select defaultValue="" id="transaction-category" name="category" required>
                      <option disabled value="">
                        {categories.length > 0 ? "Selecciona una categoría" : "Crea una categoría primero"}
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
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
                    <input id="transaction-notes" maxLength={500} name="notes" placeholder="Un detalle para recordar" />
                  </div>
                </div>
                <div className="form-actions">
                  <span className="form-hint">Monto en pesos chilenos.</span>
                  <button className="primary-button" type="submit"><Plus /> Guardar</button>
                </div>
              </form>
            </section>

            <section className="panel" id="metas">
              <div className="panel-heading">
                <div>
                  <h2>Metas de ahorro</h2>
                  <p>Avanza paso a paso hacia tus objetivos.</p>
                </div>
              </div>
              {goals.length > 0 ? (
                goals.map((goal) => {
                  const ratio = goal.target_amount > 0 ? goal.saved_amount / goal.target_amount : 0;
                  return (
                    <article className="goal-card" key={goal.id}>
                      <div className="goal-title-row">
                        <strong>{goal.title}</strong><span>{percent(ratio)}%</span>
                      </div>
                      <div
                        aria-label={`${goal.title}: ${percent(ratio)}% ahorrado`}
                        className="progress-track"
                        role="progressbar"
                        aria-valuenow={Math.min(percent(ratio), 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="progress-fill" style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                      </div>
                      <div className="goal-meta">
                        <span>{currency.format(goal.saved_amount)} ahorrados</span>
                        <span>Meta {currency.format(goal.target_amount)}</span>
                      </div>
                      <form action={updateGoalProgress} className="form-actions">
                        <input name="goal_id" type="hidden" value={goal.id} />
                        <label className="form-hint" htmlFor={`goal-progress-${goal.id}`}>Actualizar ahorro:</label>
                        <input
                          aria-label={`Ahorro actual de ${goal.title}`}
                          defaultValue={goal.saved_amount}
                          id={`goal-progress-${goal.id}`}
                          min="0"
                          name="saved_amount"
                          required
                          style={{ width: 105, minHeight: 34, border: "1px solid #e6eae4", borderRadius: 8, padding: "0 8px", fontSize: 11 }}
                          type="number"
                        />
                        <button className="text-link" type="submit">Actualizar</button>
                      </form>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">Crea una meta para darle seguimiento a tus ahorros.</div>
              )}
              <form action={createGoal} className="form-grid" style={{ marginTop: 16 }}>
                <div className="field full">
                  <label htmlFor="goal-title">Nombre de la meta</label>
                  <input id="goal-title" maxLength={100} name="title" placeholder="Ej. Viaje, casa, fondo de emergencia" required />
                </div>
                <div className="field">
                  <label htmlFor="goal-target">Monto objetivo (CLP)</label>
                  <input id="goal-target" min="1" name="target_amount" required type="number" />
                </div>
                <div className="field">
                  <label htmlFor="goal-saved">Ahorrado hasta ahora</label>
                  <input defaultValue="0" id="goal-saved" min="0" name="saved_amount" required type="number" />
                </div>
                <div className="field full">
                  <label htmlFor="goal-date">Fecha objetivo (opcional)</label>
                  <input id="goal-date" name="due_date" type="date" />
                </div>
                <div className="form-actions" style={{ gridColumn: "1 / -1", justifyContent: "end" }}>
                  <button className="primary-button" type="submit"><Plus /> Crear meta</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
