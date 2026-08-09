import { cn } from "@/components/ds/utils";

export function AccountSectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] md:p-6",
        className
      )}
    >
      <header className="mb-5 border-b border-border/60 pb-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}
