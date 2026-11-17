export function SetupPanel() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">Control Monetario</p>
        <h1>Conecta tu espacio privado</h1>
        <p>
          La aplicación está lista. Para habilitar el acceso seguro y guardar tus datos,
          configura estas variables. La clave secreta la encuentras en Supabase, en
          <strong> Settings → API Keys → Secret keys</strong> (comienza con <code>sb_secret_</code>):
        </p>
        <pre>{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=`}</pre>
        <ol>
          <li>Crea un proyecto en Supabase y copia su URL, clave publicable y clave secreta.</li>
          <li>Agrega las variables en <code>.env.local</code> y en Vercel. Nunca expongas la clave de servicio en el navegador.</li>
          <li>Ejecuta la migración de <code>supabase/migrations</code> en el SQL Editor.</li>
        </ol>
        <p>
          Guía paso a paso en el <a href="https://supabase.com/dashboard">panel de Supabase</a>.
        </p>
      </section>
    </main>
  );
}
