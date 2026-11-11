# Control Monetario

Aplicación personal de finanzas hecha con Next.js, Supabase y lista para publicar en Vercel.

## Desarrollo local

1. Instala Node.js 20.9 o superior.
2. Instala dependencias con `npm install`.
3. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
4. Copia `.env.example` a `.env.local` y completa la URL y la clave publicable (`anon`).
5. Ejecuta los archivos de `supabase/migrations` en orden en el SQL Editor de Supabase.
6. Inicia con `npm run dev`.

La app permite crear cuenta/iniciar sesión con correo y contraseña. Supabase Auth gestiona las sesiones; las políticas RLS restringen los movimientos, presupuestos y metas al usuario autenticado propietario de cada fila.

Las categorías se administran desde la aplicación. La migración de categorías conserva las que ya se usaban en movimientos y presupuestos.

## Instalar como aplicación

La aplicación se puede instalar desde el menú del navegador cuando está publicada en HTTPS (o se ejecuta en `localhost`). En iPhone o iPad, abre la página en Safari y usa **Compartir → Agregar a pantalla de inicio**.

Si no hay conexión, se muestra una página de reintento. Los movimientos, las sesiones y otros datos personales no se almacenan en caché ni están disponibles sin conexión.

## Despliegue en Vercel

1. Sube este repositorio a GitHub y crea un proyecto nuevo en Vercel importándolo.
2. En **Settings → Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para los entornos que vayas a usar.
3. En Supabase, aplica la migración y configura **Authentication → URL Configuration** con la URL de producción de Vercel como Site URL y sus URLs de vista previa/local como Redirect URLs si las necesitas.
4. Despliega desde Vercel. No configures la `service_role` key en el navegador ni en estas variables públicas.

## Funcionalidad inicial

- Resumen mensual en pesos chilenos, ingresos, gastos y balance.
- Registro de movimientos con fecha, categoría y comentarios.
- Presupuestos por categoría con esquema fijo/variable.
- Plantilla optativa de categorías y montos del presupuesto del Excel.
- Metas de ahorro con objetivo y progreso inicial.
- Acceso autenticado y aislamiento de filas mediante Row Level Security.

Los movimientos y metas personales del Excel no se importan automáticamente. La plantilla presupuestaria es una opción explícita disponible desde la app.
