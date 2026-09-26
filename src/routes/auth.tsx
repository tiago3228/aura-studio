import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveProfessionalLogin } from "@/lib/professional-credentials.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Aura Clínicas" },
      {
        name: "description",
        content: "Acesse o painel da sua clínica de estética: agenda, financeiro e prontuários.",
      },
      { property: "og:title", content: "Entrar — Aura Clínicas" },
      {
        property: "og:description",
        content: "Acesse o painel da sua clínica de estética: agenda, financeiro e prontuários.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<
    "login" | "signup" | "forgot-password" | "set-password" | "reset-password"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resolveLogin = useServerFn(resolveProfessionalLogin);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=invite")) {
        setEmail(data.session.user.email ?? "");
        setMode("set-password");
      } else if (data.session && window.location.hash.includes("type=recovery")) {
        setEmail(data.session.user.email ?? "");
        setMode("reset-password");
      } else if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
        setMode("login");
        return;
      } else if (mode === "set-password" || mode === "reset-password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success(
          mode === "set-password"
            ? "Senha criada. Bem-vindo ao Aura."
            : "Senha redefinida. Bem-vindo ao Aura.",
        );
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos configurar sua clínica.");
      } else {
        const login = email.includes("@")
          ? email
          : (await resolveLogin({ data: { username: email } })).email;
        const { error } = await supabase.auth.signInWithPassword({ email: login, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(
        message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : message.includes("already registered")
            ? "Este e-mail já possui conta. Faça login."
            : message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight">
          Aura<span className="text-gold">.</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-4xl leading-tight font-semibold text-balance">
            A gestão da sua clínica, sem planilhas e sem retrabalho.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-pretty opacity-80">
            Agenda inteligente com bloqueio de conflitos, prontuário digital com assinatura,
            comissões automáticas e um assistente de IA que conhece os números da sua clínica.
          </p>
        </div>
        <p className="text-xs opacity-60">Dados isolados por clínica, criptografados em repouso.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <Link to="/" className="font-display text-lg font-semibold lg:hidden">
            Aura<span className="text-gold">.</span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-semibold lg:mt-0">
            {mode === "set-password"
              ? "Crie sua senha de acesso"
              : mode === "reset-password"
                ? "Redefina sua senha"
                : mode === "forgot-password"
                  ? "Recuperar acesso"
                  : mode === "login"
                    ? "Entrar na sua conta"
                    : "Criar conta da clínica"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "set-password" || mode === "reset-password"
              ? "Defina uma nova senha para acessar o Aura."
              : mode === "forgot-password"
                ? "Informe seu e-mail e enviaremos um link para redefinir sua senha."
                : mode === "login"
                  ? "Use seu e-mail profissional para acessar o painel."
                  : "Leva menos de um minuto para começar."}
          </p>

          {mode !== "forgot-password" && mode !== "reset-password" && mode !== "set-password" ? (
            <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.63 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.94S8.78 6.3 12 6.3c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.76 14.55 2.9 12 2.9 6.98 2.9 2.9 6.98 2.9 12s4.08 9.1 9.1 9.1c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.16-1.5Z"
                />
              </svg>
              Continuar com Google
            </Button>
          ) : null}

          {mode !== "forgot-password" && mode !== "reset-password" && mode !== "set-password" ? (
            <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Seu nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marina Alves"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail ou usuário</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@clinica.com.br"
                required
              />
            </div>
            {mode !== "forgot-password" ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "set-password"
                ? "Criar senha e entrar"
                : mode === "reset-password"
                  ? "Redefinir senha e entrar"
                  : mode === "forgot-password"
                    ? "Enviar link de recuperação"
                    : mode === "login"
                      ? "Entrar"
                      : "Criar conta"}
            </Button>
            {mode === "login" ? (
              <button
                type="button"
                className="w-full text-center text-sm font-semibold text-primary hover:underline"
                onClick={() => setMode("forgot-password")}
              >
                Esqueci minha senha
              </button>
            ) : null}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "set-password"
              ? "Convite de colaborador"
              : mode === "reset-password"
                ? "Link de recuperação"
                : mode === "forgot-password"
                  ? "Lembrou sua senha?"
                  : mode === "login"
                    ? "Ainda não tem conta?"
                    : "Já tem conta?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "set-password"
                ? "Usar outra conta"
                : mode === "login"
                  ? "Criar agora"
                  : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
