import { cn } from "@/components/ds/utils";
import { SUPPORTED_CARD_LOGOS } from "@/lib/checkout/card-validation";

const PAYMENT_LOGOS = [
  ...SUPPORTED_CARD_LOGOS.map(({ brand, src, alt }) => ({
    id: brand,
    label: alt,
    src,
  })),
  { id: "paypal", label: "PayPal", src: "/payments/paypal.svg" },
] as const;

export function PaymentMethodBadges({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center justify-center gap-1.5 overflow-x-auto",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {PAYMENT_LOGOS.map(({ id, label, src }) => (
        <div
          key={id}
          className="relative h-9 w-12 shrink-0 overflow-hidden rounded-[6px] border border-border bg-white shadow-[var(--shadow-subtle)] dark:bg-[#f8fafc]"
          title={label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="h-full w-full object-contain p-0.5"
          />
        </div>
      ))}
    </div>
  );
}
