import { cn } from "@/components/ds/utils";

interface CheckoutCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCard({
  title,
  subtitle,
  children,
  className,
}: CheckoutCardProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] md:p-6 lg:rounded-[22px]",
        className
      )}
    >
      <header className="mb-5">
        <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}
