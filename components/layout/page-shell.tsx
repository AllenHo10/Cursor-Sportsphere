import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  width?: "default" | "wide";
  variant?: "page" | "auth" | "landing";
  className?: string;
}

export function PageShell({
  children,
  width = "default",
  variant = "page",
  className,
}: PageShellProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto flex w-full flex-col px-4 py-6 sm:px-6",
        variant === "page" && "gap-6",
        variant === "page" && (width === "wide" ? "max-w-6xl" : "max-w-3xl"),
        variant === "auth" &&
          "min-h-svh max-w-md items-center justify-center",
        variant === "landing" &&
          "min-h-svh max-w-3xl items-start justify-center gap-6",
        className
      )}
    >
      {children}
    </main>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4 sm:p-6">
      {title ? <p className="font-medium">{title}</p> : null}
      <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>
        {children}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ children = "Loading..." }: { children?: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {children}
    </p>
  );
}
