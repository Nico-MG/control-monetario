# Control Monetario

Aplicación personal de finanzas hecha con Next.js, Supabase y lista para publicar en Vercel.

## Desarrollo local

1. Instala Node.js 20.9 o superior.
2. Instala dependencias con `npm install`.
3. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
4. Copia `.env.example` a `.env.local` y completa la URL y la clave publicable. En Supabase, ve a **Settings → API Keys → Secret keys**, copia una clave `sb_secret_...` y guárdala como `SUPABASE_SERVICE_ROLE_KEY`.
5. Ejecuta los archivos de `supabase/migrations` en orden en el SQL Editor de Supabase.
6. Agrega los correos autorizados y sus nombres de usuario en **SQL Editor**. Por ejemplo:

   ```sql
   insert into public.allowed_users (email, username)
   values ('persona@ejemplo.com', 'persona');
   ```

7. Inicia con `npm run dev`.

Solo las direcciones añadidas a `allowed_users` pueden crear una cuenta o iniciar sesión; el nombre asociado (de 3 a 60 caracteres, incluyendo espacios y tildes) también se usa para iniciar sesión. La whitelist no es legible desde el navegador y las políticas RLS bloquean a cualquier usuario que no figure en ella. Las cuentas existentes deben añadirse manualmente a la tabla para conservar el acceso.

Las categorías se administran desde la aplicación. La migración de categorías conserva las que ya se usaban en movimientos y presupuestos. Aplica también las migraciones más recientes de `supabase/migrations` para habilitar comentarios e historial de presupuestos, y metas mensuales de ahorro e inversión.

Para habilitar la recuperación por código, configura en Supabase **Authentication → Email Templates → Reset Password** una plantilla que muestre `{{ .Token }}` (código OTP), en lugar de depender solo del enlace de recuperación.

## Instalar como aplicación

La aplicación se puede instalar desde el menú del navegador cuando está publicada en HTTPS (o se ejecuta en `localhost`). En iPhone o iPad, abre la página en Safari y usa **Compartir → Agregar a pantalla de inicio**.

Si no hay conexión, se muestra una página de reintento. Los movimientos, las sesiones y otros datos personales no se almacenan en caché ni están disponibles sin conexión.

## Despliegue en Vercel

1. Sube este repositorio a GitHub y crea un proyecto nuevo en Vercel importándolo.
2. En **Settings → Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` para los entornos que vayas a usar. La clave de servicio es privada: no debe llevar el prefijo `NEXT_PUBLIC_` ni usarse en el navegador.
3. En Supabase, aplica la migración y configura **Authentication → URL Configuration** con la URL de producción de Vercel como Site URL y sus URLs de vista previa/local como Redirect URLs si las necesitas.
4. Despliega desde Vercel. No expongas la clave de servicio en el navegador ni la configures con prefijo `NEXT_PUBLIC_`.

## Funcionalidad inicial

- Resumen mensual en pesos chilenos, ingresos, gastos y balance.
- Registro de movimientos con fecha, categoría y comentarios.
- Presupuestos por categoría con esquema fijo/variable.
- Comentarios para cada asignación e historial de cambios con fecha y hora.
- Plantilla optativa de categorías y montos del presupuesto del Excel.
- Metas mensuales de ahorro e inversión como porcentaje de los ingresos.
- Gráficos de cumplimiento, comparación de ingresos y presupuesto, y administración de categorías, metas y movimientos.
- Búsqueda de gastos por palabras en la descripción o el comentario, con totales y desglose por categoría.
- Navegación móvil por secciones con botones grandes y gestos laterales de página a página.
- Acceso autenticado y aislamiento de filas mediante Row Level Security.

Los movimientos y metas personales del Excel no se importan automáticamente. La plantilla presupuestaria es una opción explícita disponible desde la app.
