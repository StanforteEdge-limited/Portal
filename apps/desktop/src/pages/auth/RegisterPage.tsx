import { useState } from "react";
import { type CreateWorkspaceForm, CreateWorkspaceFormSchema } from "@stanforte/contract";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { authApi } from "@/shared/lib/core";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

type WorkspaceField = "name" | "email" | "password" | "confirm_password";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<CreateWorkspaceForm>({ resolver: typeboxResolver(CreateWorkspaceFormSchema), mode: "onBlur" });
  async function handleFormSubmit(form: CreateWorkspaceForm) {
    setError(null);
    if (form.password !== form.confirm_password) {
      setFieldError("confirm_password", { type: "validate", message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await authApi.createWorkspace({ name: form.name.trim(), email: form.email.trim().toLowerCase(), first_name: form.first_name?.trim() || undefined, last_name: form.last_name?.trim() || undefined, password: form.password });
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`, { replace: true });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create workspace."); } finally { setLoading(false); }
  }

  const message = (field: WorkspaceField) => String(errors[field]?.message ?? "");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-card backdrop-blur-xl lg:grid-cols-[1fr_1.15fr]">
        <aside className="hidden bg-primary-container p-10 text-white lg:block"><img src={brandLogo} alt="Stanforte Edge" className="h-11 w-auto object-contain" /><h1 className="mt-10 font-headline text-4xl font-bold leading-tight">Create your workspace</h1><p className="mt-4 text-sm leading-7 text-white/90">Set up your tenant, become its first administrator, and start from the dashboard.</p></aside>
        <div className="p-8 md:p-10"><h2 className="font-headline text-2xl font-bold text-primary">Start your workspace</h2><p className="mt-1 text-sm text-on-surface-variant">Your account and workspace are created together.</p>{error ? <div role="alert" className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <label className="block"><span className="field-label">Workspace name</span><input className="input-base" {...register("name")} placeholder="e.g. Stanforte Edge" />{message("name") ? <span className="mt-1 block text-xs text-danger">{message("name")}</span> : null}</label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="field-label">First name</span><input className="input-base" autoComplete="given-name" {...register("first_name")} /></label><label className="block"><span className="field-label">Last name</span><input className="input-base" autoComplete="family-name" {...register("last_name")} /></label></div>
            <label className="block"><span className="field-label">Email address</span><input className="input-base" type="email" autoComplete="email" {...register("email")} placeholder="you@company.com" />{message("email") ? <span className="mt-1 block text-xs text-danger">{message("email")}</span> : null}</label>
            <label className="block"><span className="field-label">Password</span><input className="input-base" type="password" autoComplete="new-password" {...register("password")} placeholder="At least 8 characters" />{message("password") ? <span className="mt-1 block text-xs text-danger">{message("password")}</span> : null}</label>
            <label className="block"><span className="field-label">Confirm password</span><input className="input-base" type="password" autoComplete="new-password" {...register("confirm_password")} />{message("confirm_password") ? <span className="mt-1 block text-xs text-danger">{message("confirm_password")}</span> : null}</label>
            <div className="rounded-2xl bg-surface-container-low p-4 text-xs text-on-surface-variant">Use at least 8 characters, including one uppercase letter, one lowercase letter, and one number.</div><Button type="submit" className="w-full justify-center py-4 text-base" disabled={loading}>{loading ? "Creating workspace..." : "Create workspace"}{!loading ? <Icon name="arrow_forward" className="ml-2 text-[18px]" /> : null}</Button>
          </form><p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link className="font-semibold text-brand-900" to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
