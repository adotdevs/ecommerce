import { cn } from "@/components/ds/utils";

interface AuthFormCardProps {
  title: string;
  description?: string;
  storeName?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthFormCard({
  title,
  description,
  storeName,
  children,
  className,
}: AuthFormCardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-border bg-card p-6 shadow-[var(--shadow-subtle)] sm:p-8",
        className
      )}
    >
      {storeName && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
          {storeName}
        </p>
      )}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}
