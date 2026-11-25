"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function messageUrl(kind: "error" | "notice", message: string) {
  return `/?${kind}=${encodeURIComponent(message)}`;
}

function requireIntegerAmount(value: string, allowZero = false) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1)) {
    return null;
  }
  return amount;
}

function requirePercentage(value: string) {
  const percentage = Number(value);
  const cents = Math.round(percentage * 100);
  if (
    !Number.isFinite(percentage) ||
    percentage <= 0 ||
    percentage > 100 ||
    Math.abs(percentage * 100 - cents) > 0.000001
  ) {
    return null;
  }
  return percentage;
}

function isMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function authenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/?error=Debes%20iniciar%20sesi%C3%B3n%20para%20continuar.");
  }

  return supabase;
}

async function requireCategory(
  supabase: Awaited<ReturnType<typeof authenticatedClient>>,
  name: string,
) {
  const { data, error } = await supabase
    .from("categories")
    .select("transaction_type, scheme, is_active")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    redirect(messageUrl("error", "No pudimos validar las categorías. Revisa la migración de Supabase."));
  }
  if (!data || !data.is_active) {
    redirect(messageUrl("error", "Selecciona una categoría de la lista."));
  }
  return data;
}

export async function signIn(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || !password) {
    redirect(messageUrl("error", "Ingresa tu correo y contraseña."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(messageUrl("error", "No pudimos iniciar sesión. Revisa tus datos e inténtalo otra vez."));
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || password.length < 8) {
    redirect(messageUrl("error", "Ingresa un correo y una contraseña de al menos 8 caracteres."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(messageUrl("error", "No pudimos crear tu cuenta. Verifica los datos o intenta iniciar sesión."));
  }

  redirect(messageUrl("notice", "Cuenta creada. Si está activada la confirmación, revisa tu correo."));
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect(messageUrl("error", "No pudimos cerrar la sesión. Inténtalo otra vez."));
  }
  redirect("/");
}

export async function createTransaction(formData: FormData) {
  const description = field(formData, "description");
  const category = field(formData, "category");
  const type = field(formData, "type");
  const date = field(formData, "date");
  const amount = requireIntegerAmount(field(formData, "amount"));

  if (
    !description ||
    description.length > 120 ||
    !category ||
    !amount ||
    !isDate(date) ||
    (type !== "income" && type !== "expense")
  ) {
    redirect(messageUrl("error", "Revisa los datos del movimiento e inténtalo de nuevo."));
  }

  const supabase = await authenticatedClient();
  const categoryData = await requireCategory(supabase, category);
  if (categoryData.transaction_type !== type) {
    redirect(messageUrl("error", "Selecciona una categoría del mismo tipo que el movimiento."));
  }

  const { error } = await supabase.from("transactions").insert({
    description,
    category,
    type,
    amount,
    date,
    notes: field(formData, "notes") || null,
  });

  if (error) {
    redirect(messageUrl("error", "No pudimos guardar el movimiento. Revisa la configuración de Supabase."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Movimiento guardado."));
}

export async function createBudget(formData: FormData) {
  const category = field(formData, "category");
  const month = field(formData, "month");
  const entryType = field(formData, "entry_type");
  const amount =
    entryType === "amount" ? requireIntegerAmount(field(formData, "amount"), true) : 0;
  const incomePercentage =
    entryType === "percentage" ? requirePercentage(field(formData, "income_percentage")) : null;
  const comment = field(formData, "comment");

  if (
    !category ||
    !isMonth(month) ||
    (entryType !== "amount" && entryType !== "percentage") ||
    amount === null ||
    (entryType === "percentage" && incomePercentage === null) ||
    comment.length > 500
  ) {
    redirect(messageUrl("error", "Revisa los datos del presupuesto."));
  }

  const supabase = await authenticatedClient();
  const categoryData = await requireCategory(supabase, category);
  if (categoryData.transaction_type !== "expense") {
    redirect(messageUrl("error", "Solo puedes presupuestar categorías de gasto."));
  }

  if (incomePercentage !== null) {
    const { data: existingEntries, error: existingEntriesError } = await supabase
      .from("budgets")
      .select("income_percentage")
      .eq("month", `${month}-01`)
      .eq("category", category);

    if (existingEntriesError) {
      redirect(messageUrl("error", "No pudimos revisar los porcentajes ya asignados."));
    }

    const assignedPercentage = existingEntries.reduce(
      (total, entry) => total + (entry.income_percentage ?? 0),
      0,
    );
    if (assignedPercentage + incomePercentage > 100) {
      redirect(messageUrl("error", "Los porcentajes de esta categoría no pueden superar el 100%."));
    }
  }

  const { error } = await supabase.from("budgets").insert({
    category,
    month: `${month}-01`,
    amount: amount ?? 0,
    scheme: categoryData.scheme,
    comment: comment || null,
    income_percentage: incomePercentage,
  });

  if (error) {
    redirect(messageUrl("error", "No pudimos guardar el presupuesto."));
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Monto agregado al presupuesto.")}`);
}

export async function closeBudgetCategory(formData: FormData) {
  const category = field(formData, "category");
  const month = field(formData, "month");

  if (!category || !isMonth(month)) {
    redirect(messageUrl("error", "Selecciona un mes y una categoría válidos."));
  }

  const supabase = await authenticatedClient();

  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const [budgets, expenses, incomes] = await Promise.all([
    supabase
      .from("budgets")
      .select("amount, income_percentage")
      .eq("month", monthStart)
      .eq("category", category),
    supabase
      .from("transactions")
      .select("amount")
      .eq("category", category)
      .eq("type", "expense")
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
    supabase
      .from("transactions")
      .select("amount")
      .eq("type", "income")
      .gte("date", monthStart)
      .lt("date", nextMonthStart),
  ]);

  if (budgets.error || expenses.error || incomes.error) {
    redirect(messageUrl("error", "No pudimos validar el presupuesto de la categoría."));
  }

  const monthlyIncome = incomes.data.reduce((total, entry) => total + entry.amount, 0);
  const budgetAmount = budgets.data.reduce(
    (total, entry) =>
      total +
      (entry.income_percentage === null
        ? entry.amount
        : Math.round((monthlyIncome * entry.income_percentage) / 100)),
    0,
  );
  const spentAmount = expenses.data.reduce((total, entry) => total + entry.amount, 0);
  if (budgetAmount <= 0 || spentAmount < budgetAmount) {
    redirect(messageUrl("error", "Solo puedes cerrar una categoría cuando hayas completado su presupuesto."));
  }

  const { error } = await supabase.from("budget_category_status").upsert(
    { month: monthStart, category, is_closed: true },
    { onConflict: "user_id,month,category" },
  );

  if (error) {
    redirect(messageUrl("error", "No pudimos cerrar la categoría."));
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Categoría cerrada para este mes.")}`);
}

export async function reopenBudgetCategory(formData: FormData) {
  const category = field(formData, "category");
  const month = field(formData, "month");

  if (!category || !isMonth(month)) {
    redirect(messageUrl("error", "Selecciona un mes y una categoría válidos."));
  }

  const supabase = await authenticatedClient();

  const { data, error } = await supabase
    .from("budget_category_status")
    .delete()
    .eq("month", `${month}-01`)
    .eq("category", category)
    .select("category")
    .maybeSingle();

  if (error || !data) {
    redirect(messageUrl("error", "No pudimos reabrir la categoría."));
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Categoría reabierta.")}`);
}

export async function createExcelTemplateBudgets(formData: FormData) {
  const month = field(formData, "month");
  if (!isMonth(month)) {
    redirect(messageUrl("error", "Selecciona un mes válido."));
  }

  const template = [
    ["Arriendo", 400000, "fixed"],
    ["Auto/Seguro", 385000, "fixed"],
    ["Ahorro", 77634, "fixed"],
    ["Comida", 120000, "fixed"],
    ["Salidas", 145000, "variable"],
    ["Bencina", 120000, "fixed"],
    ["Gastos Comunes", 45000, "fixed"],
    ["Restaurant", 60000, "variable"],
    ["Subcripciones", 40000, "variable"],
    ["Luz/Agua/Gas", 30000, "fixed"],
    ["T. Crédito", 275116, "variable"],
    ["Otros", 4250, "variable"],
  ] as const;

  const supabase = await authenticatedClient();
  const { data: existingCategories, error: categoriesError } = await supabase
    .from("categories")
    .select("name, transaction_type, scheme, is_active");

  if (categoriesError) {
    redirect(messageUrl("error", "No pudimos cargar las categorías."));
  }

  const { data: existingBudgets, error: budgetsError } = await supabase
    .from("budgets")
    .select("category")
    .eq("month", `${month}-01`);

  if (budgetsError) {
    redirect(messageUrl("error", "No pudimos revisar el presupuesto del mes."));
  }

  const categoriesByName = new Map(
    existingCategories.map((category) => [category.name.toLocaleLowerCase(), category]),
  );
  const existingBudgetCategories = new Set(
    existingBudgets.map(({ category }) => category.toLocaleLowerCase()),
  );
  const templateCategories = [...new Set(template.map(([category]) => category))]
    .filter((name) => !existingBudgetCategories.has(name.toLocaleLowerCase()));
  const templateSchemeByName = new Map(
    template.map(([name, , scheme]) => [name.toLocaleLowerCase(), scheme]),
  );
  const newCategories = templateCategories
    .filter((name) => !categoriesByName.has(name.toLocaleLowerCase()))
    .map((name) => ({
      name,
      transaction_type: "expense" as const,
      scheme: templateSchemeByName.get(name.toLocaleLowerCase()) ?? "fixed",
      is_active: true,
    }));

  for (const [name] of template) {
    const existing = categoriesByName.get(name.toLocaleLowerCase());
    if (existing && (!existing.is_active || existing.transaction_type !== "expense")) {
      redirect(
        messageUrl(
          "error",
          `La categoría ${name} debe estar activa y ser de gasto para usar la plantilla.`,
        ),
      );
    }
  }

  if (newCategories.length > 0) {
    const { error } = await supabase.from("categories").insert(newCategories);
    if (error) {
      redirect(messageUrl("error", "No pudimos agregar las categorías de la plantilla."));
    }
    for (const category of newCategories) {
      categoriesByName.set(category.name.toLocaleLowerCase(), category);
    }
  }

  const budgetEntries = template
    .filter(([category]) => !existingBudgetCategories.has(category.toLocaleLowerCase()))
    .map(([category, amount]) => ({
      category: categoriesByName.get(category.toLocaleLowerCase())?.name ?? category,
      amount,
      scheme: categoriesByName.get(category.toLocaleLowerCase())?.scheme ?? "fixed",
      month: `${month}-01`,
      comment: null,
      income_percentage: null,
    }));

  if (budgetEntries.length > 0) {
    const { error } = await supabase.from("budgets").insert(budgetEntries);

    if (error) {
      redirect(messageUrl("error", "No pudimos cargar el presupuesto base."));
    }
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Plantilla del Excel agregada al mes.")}`);
}

export async function createCategory(formData: FormData) {
  const name = field(formData, "name");
  const transactionType = field(formData, "transaction_type");
  const scheme = field(formData, "scheme");

  if (
    !name ||
    name.length > 60 ||
    (transactionType !== "income" && transactionType !== "expense") ||
    (scheme !== "fixed" && scheme !== "variable")
  ) {
    redirect(messageUrl("error", "Revisa el nombre, tipo y esquema de la categoría."));
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name, transaction_type: transactionType, scheme });

  if (error?.code === "23505") {
    redirect(messageUrl("error", "Ya existe una categoría con ese nombre."));
  }
  if (error) {
    redirect(messageUrl("error", "No pudimos crear la categoría."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Categoría creada."));
}

export async function updateCategory(formData: FormData) {
  const categoryId = field(formData, "category_id");
  const name = field(formData, "name");
  const transactionType = field(formData, "transaction_type");
  const scheme = field(formData, "scheme");

  if (
    !categoryId ||
    !name ||
    name.length > 60 ||
    (transactionType !== "income" && transactionType !== "expense") ||
    (scheme !== "fixed" && scheme !== "variable")
  ) {
    redirect(messageUrl("error", "Revisa los datos de la categoría."));
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc("update_finance_category", {
    p_category_id: categoryId,
    p_name: name,
    p_transaction_type: transactionType,
    p_scheme: scheme,
  });

  if (error?.code === "23505") {
    redirect(messageUrl("error", "Ya existe una categoría con ese nombre."));
  }
  if (error) {
    redirect(
      messageUrl(
        "error",
        error.message.includes("changed to income")
          ? "No puedes cambiar a ingreso una categoría que ya tiene presupuestos."
          : "No pudimos actualizar la categoría.",
      ),
    );
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Categoría actualizada."));
}

export async function deleteCategory(formData: FormData) {
  const categoryId = field(formData, "category_id");
  if (!categoryId) {
    redirect(messageUrl("error", "Selecciona una categoría válida."));
  }

  const supabase = await authenticatedClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: false })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(messageUrl("error", "No pudimos quitar la categoría de los selectores."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Categoría eliminada de los selectores; el historial se conservó."));
}

export async function restoreCategory(formData: FormData) {
  const categoryId = field(formData, "category_id");
  if (!categoryId) {
    redirect(messageUrl("error", "Selecciona una categoría válida."));
  }

  const supabase = await authenticatedClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: true })
    .eq("id", categoryId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(messageUrl("error", "No pudimos restaurar la categoría."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Categoría restaurada."));
}

export async function createGoal(formData: FormData) {
  const title = field(formData, "title");
  const targetAmount = requireIntegerAmount(field(formData, "target_amount"));
  const savedAmount = requireIntegerAmount(field(formData, "saved_amount") || "0", true);
  const dueDate = field(formData, "due_date");

  if (
    !title ||
    title.length > 100 ||
    !targetAmount ||
    savedAmount === null ||
    (dueDate && !isDate(dueDate))
  ) {
    redirect(messageUrl("error", "Revisa los datos de la meta de ahorro."));
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.from("savings_goals").insert({
    title,
    target_amount: targetAmount,
    saved_amount: savedAmount,
    due_date: dueDate || null,
  });

  if (error) {
    redirect(messageUrl("error", "No pudimos guardar la meta."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Meta de ahorro creada."));
}

export async function updateGoalProgress(formData: FormData) {
  const goalId = field(formData, "goal_id");
  const savedAmount = requireIntegerAmount(field(formData, "saved_amount"), true);

  if (!goalId || savedAmount === null) {
    redirect(messageUrl("error", "Ingresa un monto ahorrado válido."));
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase
    .from("savings_goals")
    .update({ saved_amount: savedAmount })
    .eq("id", goalId);

  if (error) {
    redirect(messageUrl("error", "No pudimos actualizar el progreso de la meta."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Progreso de la meta actualizado."));
}
