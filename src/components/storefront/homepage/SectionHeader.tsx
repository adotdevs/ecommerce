import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ds/button";
import { cn } from "@/components/ds/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  align = "left",
  className,
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "store-section-header",
        centered && "flex-col items-center text-center",
        className
      )}
    >
      <div className={cn(centered && "mx-auto")}>
        {eyebrow && <p className="store-section-eyebrow">{eyebrow}</p>}
        <h2 className="store-section-title">{title}</h2>
        {subtitle && <p className="store-section-subtitle">{subtitle}</p>}
      </div>
      {viewAllHref && viewAllLabel && (
        <Button variant="outline" asChild className="shrink-0">
          <Link href={viewAllHref}>
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
