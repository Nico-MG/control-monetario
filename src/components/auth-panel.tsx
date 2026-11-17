"use client";

import { useState } from "react";
import {
  requestPasswordReset,
  resetPasswordWithCode,
  signIn,
  signUp,
} from "@/app/actions";

type AuthPanelProps = {
  error?: string;
  notice?: string;
  resetStep?: boolean;
};

export function AuthPanel({ error, notice, resetStep = false }: AuthPanelProps) {
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(resetStep);
  const [enteringCode, setEnteringCode] = useState(resetStep);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">C</div>
        <p className="eyebrow">Control Monetario</p>
        <h1>
          {creatingAccount
            ? "Crea tu cuenta"
            : resettingPassword
              ? enteringCode
                ? "Restablece tu contraseña"
                : "Recupera tu acceso"
              : "Qué bueno verte"}
        </h1>
        <p>
          {creatingAccount
            ? "Solo pueden registrarse correos incluidos en la lista de acceso."
            : resettingPassword
              ? enteringCode
                ? "Ingresa el código enviado a tu correo y elige una contraseña nueva."
                : "Te enviaremos un código si el correo está autorizado."
              : "Inicia sesión para ver y organizar tus finanzas."}
        </p>
        {error && <div className="notice error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        <form
          action={
            resettingPassword
              ? enteringCode
                ? resetPasswordWithCode
                : requestPasswordReset
              : creatingAccount
                ? signUp
                : signIn
          }
        >
          <div className="form-grid">
            {creatingAccount ? (
              <>
                <div className="field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input autoComplete="email" id="email" name="email" required type="email" />
                </div>
                <div className="field">
                  <label htmlFor="username">Nombre de usuario</label>
                  <input
                    autoComplete="username"
                    id="username"
                    maxLength={60}
                    minLength={3}
                    name="username"
                    required
                  />
                </div>
              </>
            ) : resettingPassword && enteringCode ? (
              <>
                <div className="field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input autoComplete="email" id="email" name="email" required type="email" />
                </div>
                <div className="field">
                  <label htmlFor="token">Código de recuperación</label>
                  <input autoComplete="one-time-code" id="token" name="token" required />
                </div>
              </>
            ) : resettingPassword ? (
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input autoComplete="email" id="email" name="email" required type="email" />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="identifier">Correo o nombre de usuario</label>
                <input autoComplete="username" id="identifier" name="identifier" required />
              </div>
            )}
            {(!resettingPassword || enteringCode) && (
              <div className="field">
                <label htmlFor="password">{enteringCode ? "Nueva contraseña" : "Contraseña"}</label>
                <input
                  autoComplete={creatingAccount || enteringCode ? "new-password" : "current-password"}
                  id="password"
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </div>
            )}
          </div>
          <div className="form-actions">
            <span className="form-hint">
              {creatingAccount ? "Nombre de 3 a 60 caracteres." : "Acceso privado y protegido."}
            </span>
            <button className="primary-button" type="submit">
              {creatingAccount
                ? "Crear cuenta"
                : resettingPassword
                  ? enteringCode
                    ? "Cambiar contraseña"
                    : "Enviar código"
                  : "Iniciar sesión"}
            </button>
          </div>
        </form>
        {!resettingPassword && !creatingAccount && (
          <p className="auth-switch">
            <button onClick={() => setResettingPassword(true)} type="button">
              ¿Olvidaste tu contraseña?
            </button>
          </p>
        )}
        {resettingPassword ? (
          <p className="auth-switch">
            <button
              onClick={() => {
                if (enteringCode) {
                  setEnteringCode(false);
                } else {
                  setResettingPassword(false);
                }
              }}
              type="button"
            >
              Volver
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            {creatingAccount ? "¿Ya tienes cuenta?" : "¿Primera vez aquí?"}{" "}
            <button onClick={() => setCreatingAccount((value) => !value)} type="button">
              {creatingAccount ? "Inicia sesión" : "Crear cuenta"}
            </button>
          </p>
        )}
      </section>
    </main>
  );
}
