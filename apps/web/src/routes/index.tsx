import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Your Infinite Canvas
          </h1>
          <p className="text-xl text-muted-foreground">
            A professional canvas for managing images, creating diagrams, and
            visualizing your ideas. Unlimited space, unlimited possibilities.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            {session ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border bg-secondary px-6 py-3 text-lg font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Infinite Canvas"
            description="Unlimited space to organize your images and ideas. Pan, zoom, and navigate freely."
            icon="🎨"
          />
          <FeatureCard
            title="Image Management"
            description="Add images from URLs and place them anywhere on your canvas. Access from any device."
            icon="🖼️"
          />
          <FeatureCard
            title="Drawing & Annotations"
            description="Draw, annotate, and create diagrams directly on your canvas with built-in tools."
            icon="✏️"
          />
          <FeatureCard
            title="Multiple Canvases"
            description="Create and manage multiple canvases for different projects and use cases."
            icon="📁"
          />
          <FeatureCard
            title="Cloud Sync"
            description="Your work is saved automatically. Access your canvases from anywhere."
            icon="☁️"
          />
          <FeatureCard
            title="Browser Extension"
            description="Coming soon: Save images from any website directly to your canvas."
            icon="🧩"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        <p>Built with Fabric.js, TanStack Start, and Drizzle ORM</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
