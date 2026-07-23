import { Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client.ts";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-card px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-foreground no-underline">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            C
          </span>
          Canvas App
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">
                {session.user?.email}
              </span>
              <button
                onClick={() => authClient.signOut()}
                className="rounded-md border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
