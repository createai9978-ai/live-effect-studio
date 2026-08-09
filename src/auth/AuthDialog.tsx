import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "../utils/cn";
import { useAuth } from "./AuthContext";

/** Sign-in / sign-up sheet. Rendered as an overlay so the studio never unmounts. */
export default function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "up" && name.trim().length < 2) return "Enter a display name.";
    if (email.length > 255 || password.length > 128 || name.length > 80) return "Input is too long.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === "in") {
        await signIn(email.trim(), password);
        toast.success("Signed in");
        onClose();
      } else {
        const { needsConfirm } = await signUp(email.trim(), password, name.trim());
        if (needsConfirm) {
          toast.info("Check your inbox", { description: "Confirm your email to finish signing up." });
        } else {
          toast.success("Welcome to NOVA Studio");
          onClose();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-[nova-fade_.2s_ease-out]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to NOVA Studio"
    >
      <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141824]/95 shadow-2xl shadow-black/60 animate-[nova-pop_.28s_cubic-bezier(.22,1,.36,1)]">
        <div className="relative border-b border-white/[0.06] px-5 py-4">
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,var(--nova-accent,#00E5FF),transparent)" }}
          />
          <h2 className="text-[15px] font-semibold text-zinc-100">
            {mode === "in" ? "Sign in" : "Create your account"}
          </h2>
          <p className="mt-1 text-[11.5px] text-zinc-500">
            Studio branding and inline editing are reserved for admins.
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3.5 rounded p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5">
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-[12.5px] font-medium text-zinc-100 transition hover:bg-white/[0.09] active:scale-[.98] disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
              <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0012 24z" />
              <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 010-4.6v-3H1.8a12 12 0 000 10.6l3.8-3z" />
              <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.6 11.6 0 0012 0 12 12 0 001.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-2 py-1">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">or</span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          {mode === "up" && (
            <Field label="Display name" value={name} onChange={setName} maxLength={80} placeholder="Alex Kim" />
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            maxLength={255}
            placeholder="you@studio.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            maxLength={128}
            placeholder="At least 8 characters"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />

          {error && (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg px-3 py-2.5 text-[12.5px] font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            style={{
              background: "linear-gradient(90deg, var(--nova-accent-2,#8A2BE2), var(--nova-accent,#00E5FF))",
            }}
          >
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError(null);
            }}
            className="w-full text-center text-[11.5px] text-zinc-500 transition hover:text-zinc-200"
          >
            {mode === "in" ? "No account yet? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[12.5px] text-zinc-100 outline-none transition",
          "placeholder:text-zinc-600 focus:border-[color:var(--nova-accent,#00E5FF)] focus:ring-2 focus:ring-[color:var(--nova-accent,#00E5FF)]/20"
        )}
      />
    </label>
  );
}
