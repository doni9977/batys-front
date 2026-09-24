import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Lock, User, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { login } from "../lib/api";

export const Route = createFileRoute("/registration")({
  head: () => ({
    meta: [
      { title: "Регистрация доступа — BatysMonitor" },
      { name: "description", content: "Защищённый вход в цифровую карту экономических рисков" },
    ],
  }),
  component: RegistrationRoutePage,
});

function RegistrationRoutePage() {
  const navigate = useNavigate();
  return <RegistrationPage onAuthenticated={() => navigate({ to: "/" })} />;
}

export function RegistrationPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setMessage("");
      await login(username, password);
      onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить вход");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="registration-shell">
      <div className="registration-background" aria-hidden="true">
        <video className="registration-video" autoPlay muted loop playsInline preload="auto" poster="/afm.png">
          <source src="/AFM.mp4" type="video/mp4" />
        </video>
      </div>

      <section className="registration-card" aria-labelledby="registration-title">
        <header className="registration-header">
          <div className="registration-logo">
            <img src="/afm.png" alt="AFM" />
          </div>
          <h1 id="registration-title">Регистрация доступа</h1>
          <p>Цифровая карта экономических рисков</p>
        </header>

        <form className="registration-form" onSubmit={handleSubmit}>
          <label>
            <span>Логин / ИИН сотрудника</span>
            <div className="registration-input-wrap">
              <User aria-hidden="true" />
              <input
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
          </label>

          <label>
            <span>Пароль</span>
            <div className="registration-input-wrap">
              <Lock aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="registration-icon-button"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </label>

          <button type="submit" className="registration-submit" disabled={isSubmitting}>
            <KeyRound aria-hidden="true" />
            {isSubmitting ? "Проверка..." : "Войти в систему"}
          </button>

          <button type="button" className="registration-help" onClick={() => setMessage("Для восстановления доступа обратитесь к системному администратору.")}>
            <UserPlus aria-hidden="true" />
            Запросить доступ
          </button>
        </form>

        {message ? <p className="registration-message" role="status">{message}</p> : null}

        <footer className="registration-footer">
          <span className="registration-status-dot" />
          <span>Защищённое соединение · TLS 1.3</span>
        </footer>
      </section>
    </main>
  );
}
