import { cn } from "@/components/ds/utils";

/** Drop-in SVG logos — replace files in /public/payments/ */
const PAYMENT_LOGOS = [
  { id: "visa", label: "Visa", src: "/payments/visa.svg" },
  { id: "mastercard", label: "Mastercard", src: "/payments/mastercard.svg" },
  { id: "amex", label: "American Express", src: "/payments/amex.svg" },
  { id: "paypal", label: "PayPal", src: "/payments/paypal.svg" },
  { id: "apple-pay", label: "Apple Pay", src: "/payments/apple-pay.svg" },
] as const;

export function PaymentMethodBadges({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center justify-center gap-2",
        className
      )}
    >
      {PAYMENT_LOGOS.map(({ id, label, src }) => (
        <div
          key={id}
          className="relative h-10 w-14 shrink-0 overflow-hidden rounded-[6px] border border-border bg-white shadow-[var(--shadow-subtle)] dark:bg-[#f8fafc]"
          title={label}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
