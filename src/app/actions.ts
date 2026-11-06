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

async function categoryExists(supabase: Awaited<ReturnType<typeof authenticatedClient>>, name: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  return { exists: data !== null, error };
}

async function requireCategory(supabase: Awaited<ReturnType<typeof authenticatedClient>>, name: string) {
  const result = await categoryExists(supabase, name);

  if (result.error) {
    redirect(messageUrl("error", "No pudimos validar las categorías. Revisa la migración de Supabase."));
  }
  if (!result.exists) {
    redirect(messageUrl("error", "Selecciona una categoría de la lista."));
  }
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
  await requireCategory(supabase, category);

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
  const scheme = field(formData, "scheme");
  const amount = requireIntegerAmount(field(formData, "amount"), true);

  if (
    !category ||
    !isMonth(month) ||
    amount === null ||
    (scheme !== "fixed" && scheme !== "variable")
  ) {
    redirect(messageUrl("error", "Revisa los datos del presupuesto."));
  }

  const supabase = await authenticatedClient();
  await requireCategory(supabase, category);

  const { error } = await supabase.from("budgets").upsert(
    { category, month: `${month}-01`, amount, scheme },
    { onConflict: "user_id,month,category" },
  );

  if (error) {
    redirect(messageUrl("error", "No pudimos guardar el presupuesto."));
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Presupuesto actualizado.")}`);
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
    .select("name");

  if (categoriesError) {
    redirect(messageUrl("error", "No pudimos cargar las categorías."));
  }

  const canonicalNames = new Map(
    existingCategories.map(({ name }) => [name.toLocaleLowerCase(), name]),
  );
  const newCategories = [...new Set(template.map(([category]) => category))]
    .filter((name) => !canonicalNames.has(name.toLocaleLowerCase()))
    .map((name) => ({ name }));

  if (newCategories.length > 0) {
    const { error } = await supabase.from("categories").insert(newCategories);
    if (error) {
      redirect(messageUrl("error", "No pudimos agregar las categorías de la plantilla."));
    }
  }

  for (const [category] of template) {
    const key = category.toLocaleLowerCase();
    if (!canonicalNames.has(key)) {
      canonicalNames.set(key, category);
    }
  }

  const { error } = await supabase.from("budgets").upsert(
    template.map(([category, amount, scheme]) => ({
      category: canonicalNames.get(category.toLocaleLowerCase()) ?? category,
      amount,
      scheme,
      month: `${month}-01`,
    })),
    { onConflict: "user_id,month,category", ignoreDuplicates: true },
  );

  if (error) {
    redirect(messageUrl("error", "No pudimos cargar el presupuesto base."));
  }

  revalidatePath("/");
  redirect(`/?month=${month}&notice=${encodeURIComponent("Plantilla del Excel agregada al mes.")}`);
}

export async function createCategory(formData: FormData) {
  const name = field(formData, "name");

  if (!name || name.length > 60) {
    redirect(messageUrl("error", "Ingresa un nombre de categoría de hasta 60 caracteres."));
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.from("categories").insert({ name });

  if (error?.code === "23505") {
    redirect(messageUrl("error", "Ya existe una categoría con ese nombre."));
  }
  if (error) {
    redirect(messageUrl("error", "No pudimos crear la categoría."));
  }

  revalidatePath("/");
  redirect(messageUrl("notice", "Categoría creada."));
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
