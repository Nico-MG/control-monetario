"use client";

import { useState } from "react";
import { signIn, signUp } from "@/app/actions";

type AuthPanelProps = {
  error?: string;
  notice?: string;
};

export function AuthPanel({ error, notice }: AuthPanelProps) {
  const [creatingAccount, setCreatingAccount] = useState(false);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">Control Monetario</p>
        <h1>{creatingAccount ? "Crea tu cuenta" : "Qué bueno verte"}</h1>
        <p>
          {creatingAccount
            ? "Tus finanzas se guardan de forma privada en tu espacio."
            : "Inicia sesión para ver y organizar tus finanzas."}
        </p>
        {error && <div className="notice error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        <form action={creatingAccount ? signUp : signIn}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                autoComplete="email"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                autoComplete={creatingAccount ? "new-password" : "current-password"}
                id="password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </div>
          </div>
          <div className="form-actions">
            <span className="form-hint">Acceso privado y protegido.</span>
            <button className="primary-button" type="submit">
              {creatingAccount ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </form>
        <p className="auth-switch">
          {creatingAccount ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
          <button onClick={() => setCreatingAccount((value) => !value)} type="button">
            {creatingAccount ? "Inicia sesión" : "Crear cuenta"}
          </button>
        </p>
      </section>
    </main>
  );
}
