import { BriefcaseMedical, LockKeyhole, LogIn } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, hasValidSession, normalizeNextPath } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const nextPath = normalizeNextPath(getFirstParam(params?.next) ?? "/");

  if (hasValidSession(cookieStore.get(AUTH_COOKIE_NAME)?.value)) {
    redirect(nextPath);
  }

  const hasError = getFirstParam(params?.error) === "1";

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span aria-hidden="true">
            <BriefcaseMedical size={28} />
          </span>
          <div>
            <p>Private preview</p>
            <h1 id="login-title">Atrium</h1>
          </div>
        </div>

        <form className="login-form" action="/api/login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            <span>Username</span>
            <input name="username" type="text" autoComplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {hasError ? <p className="login-error">Those credentials did not match.</p> : null}
          <button type="submit">
            <LogIn size={18} />
            Sign in
          </button>
        </form>

        <p className="login-boundary">
          <LockKeyhole size={16} />
          Educational intake workspace. No diagnosis or emergency guidance.
        </p>
      </section>
    </main>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
