"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { CheckoutSteps } from "@/components/storefront/checkout/CheckoutSteps";
import { ContactInformation } from "@/components/storefront/checkout/ContactInformation";
import { ShippingAddressForm } from "@/components/storefront/checkout/ShippingAddressForm";
import { ShippingMethodSelect } from "@/components/storefront/checkout/ShippingMethodSelect";
import { PaymentMethodSelect } from "@/components/storefront/checkout/PaymentMethodSelect";
import { BillingAddress } from "@/components/storefront/checkout/BillingAddress";
import { ReviewOrder } from "@/components/storefront/checkout/ReviewOrder";
import {
  CheckoutPrimaryButton,
  SecureNote,
} from "@/components/storefront/checkout/CheckoutPrimaryButton";
import { CheckoutOrderSummary } from "@/components/storefront/checkout/CheckoutOrderSummary";
import { SuccessOrder } from "@/components/storefront/checkout/SuccessOrder";
import { TrustBar } from "@/components/storefront/checkout/TrustBar";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStockLimits } from "@/hooks/use-cart-stock-limits";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { useCurrency, useCountry } from "@/stores/locale-store";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { toastError } from "@/hooks/use-toast";
import { calculateCheckoutTotals } from "@/lib/checkout/shipping";
import {
  mapPaymentToApi,
  splitFullName,
  validatePaymentStep,
  validateShippingStep,
} from "@/lib/checkout/utils";
import type {
  CheckoutFieldErrors,
  CheckoutFormState,
  CheckoutStep,
  PlacedOrderResult,
} from "@/lib/checkout/types";
import { cn } from "@/components/ds/utils";

function createInitialForm(
  email: string,
  country: string
): CheckoutFormState {
  return {
    email,
    emailOffers: true,
    fullName: "",
    phone: "",
    street: "",
    apartment: "",
    city: "",
    state: "",
    postalCode: "",
    country,
    saveAddress: true,
    shippingMethod: "standard",
    paymentMethod: "card",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    saveCard: false,
    billingSameAsShipping: true,
    billingFullName: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: country,
  };
}

export function CheckoutFlow() {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const sessionId = useCartStore((s) => s.sessionId);
  const clearCart = useCartStore((s) => s.clearCart);
  const hydrated = useCartHydrated();
  useCartStockLimits(hydrated);
  const { accessToken, user } = useAuthStore();
  const currency = useCurrency();
  const country = useCountry();

  const [step, setStep] = useState<CheckoutStep>("shipping");
  const [form, setForm] = useState(() =>
    createInitialForm(user?.email ?? "", country)
  );
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<PlacedOrderResult | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const subtotalUsd = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );
  const discountUsd = 0;
  const { shippingUsd, taxUsd, totalUsd } = useMemo(
    () =>
      calculateCheckoutTotals(subtotalUsd, form.shippingMethod, discountUsd),
    [subtotalUsd, form.shippingMethod, discountUsd]
  );
  const totalFmt = useFormattedPrice(totalUsd);

  const updateForm = (patch: Partial<CheckoutFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    const cleared = { ...errors };
    for (const key of Object.keys(patch)) delete cleared[key];
    setErrors(cleared);
  };

  const goToPayment = () => {
    const nextErrors = validateShippingStep(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToReview = () => {
    const nextErrors = validatePaymentStep(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const placeOrder = async () => {
    setLoading(true);
    const { firstName, lastName } = splitFullName(form.fullName);

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          currency,
          sessionId,
          shippingMethod: form.shippingMethod,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            slug: i.slug,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
          })),
          shippingAddress: {
            firstName,
            lastName,
            street: form.apartment
              ? `${form.street}, ${form.apartment}`
              : form.street,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
            phone: form.phone,
          },
          paymentMethod: mapPaymentToApi(form.paymentMethod),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const order = data.data;
        setOrderResult({
          orderNumber: order.orderNumber,
          email: form.email,
          total: order.total ?? totalUsd,
          currency: order.currency ?? currency,
          paymentMethod: form.paymentMethod,
          createdAt: order.createdAt ?? new Date().toISOString(),
        });
        clearCart();
        setStep("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toastError(t("orderFailed"), data.error ?? t("orderFailedDesc"));
      }
    } catch {
      toastError(t("orderFailed"), t("orderFailedDesc"));
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }

  if (items.length === 0 && step !== "success") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">{t("empty")}</h1>
        <Button
          className="mt-4 rounded-full"
          onClick={() => router.push("/products")}
        >
          {tc("shopNow")}
        </Button>
      </div>
    );
  }

  if (step === "success" && orderResult) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <SuccessOrder order={orderResult} />
        <TrustBar />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {t("title")}
      </h1>
      <CheckoutSteps currentStep={step} />

      <button
        type="button"
        className="mb-4 flex w-full items-center justify-between rounded-[18px] border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-subtle)] lg:hidden"
        onClick={() => setMobileSummaryOpen((o) => !o)}
      >
        <span className="text-sm font-semibold text-foreground">
          {t("orderSummary")} · {totalFmt}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            mobileSummaryOpen && "rotate-180"
          )}
        />
      </button>

      {mobileSummaryOpen && (
        <div className="mb-6 lg:hidden">
          <CheckoutOrderSummary
            items={items}
            itemCount={itemCount}
            subtotalUsd={subtotalUsd}
            shippingUsd={shippingUsd}
            taxUsd={taxUsd}
            discountUsd={discountUsd}
            totalUsd={totalUsd}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          {step === "shipping" && (
            <>
              <ContactInformation
                form={form}
                errors={errors}
                onChange={updateForm}
              />
              <ShippingAddressForm
                form={form}
                errors={errors}
                onChange={updateForm}
              />
              <ShippingMethodSelect
                form={form}
                subtotalUsd={subtotalUsd}
                onChange={updateForm}
                onContinue={goToPayment}
              />
            </>
          )}

          {step === "payment" && (
            <>
              <PaymentMethodSelect
                form={form}
                errors={errors}
                onChange={updateForm}
              />
              <BillingAddress
                form={form}
                errors={errors}
                onChange={updateForm}
              />
              <div className="rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] md:p-6">
                <CheckoutPrimaryButton onClick={goToReview}>
                  {t("continueToReview")}
                </CheckoutPrimaryButton>
                <SecureNote>{t("securePayment")}</SecureNote>
              </div>
            </>
          )}

          {step === "review" && (
            <ReviewOrder
              form={form}
              subtotalUsd={subtotalUsd}
              totalUsd={totalUsd}
              loading={loading}
              onEditShipping={() => setStep("shipping")}
              onEditPayment={() => setStep("payment")}
              onPlaceOrder={placeOrder}
            />
          )}
        </div>

        <div className="hidden lg:block">
          <CheckoutOrderSummary
            items={items}
            itemCount={itemCount}
            subtotalUsd={subtotalUsd}
            shippingUsd={shippingUsd}
            taxUsd={taxUsd}
            discountUsd={discountUsd}
            totalUsd={totalUsd}
          />
        </div>
      </div>

      <TrustBar />
    </div>
  );
}
