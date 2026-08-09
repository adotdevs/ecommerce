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
import { cn } from "@/components/ds/utils";

type Phase = "loading" | "verify" | "submitting";
type PaymentBrand = SupportedCardBrand | "unknown";

interface CardPaymentVerificationModalProps {
  open: boolean;
  brand: CardBrand;
  merchantName: string;
  amountLabel: string;
  cardNumber: string;
  cardholderName: string;
  onVerified: () => Promise<void>;
  onCancel: () => void;
}

interface ScreenProps {
  merchantName: string;
  amountLabel: string;
  last4: string;
  cardholderName: string;
  dateLabel: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onCancel: () => void;
  verifyDisabled: boolean;
  t: ReturnType<typeof useTranslations<"checkout.paymentVerification">>;
}

function resolvePaymentBrand(brand: CardBrand): PaymentBrand {
  return isSupportedBrand(brand) ? brand : "unknown";
}

function BrandLogo({
  brand,
  size = "md",
  className,
}: {
  brand: PaymentBrand;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (brand === "unknown") return null;
  const logo = CARD_BRAND_LOGOS[brand];
  return (
    <span
      className={cn(
        "payment-3ds-brand-logo",
        size === "sm" && "payment-3ds-brand-logo--sm",
        size === "md" && "payment-3ds-brand-logo--md",
        size === "lg" && "payment-3ds-brand-logo--lg",
        className
      )}
    >
      <Image src={logo.src} alt={logo.alt} fill className="object-contain" sizes="96px" />
    </span>
  );
}

function ThreeDSWindow({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("payment-3ds-window", className)}>
      <div className="payment-3ds-window__titlebar">
        <span className="payment-3ds-window__titlebar-dot" aria-hidden />
        <span className="payment-3ds-window__title">{title}</span>
      </div>
      <div className="payment-3ds-window__body">{children}</div>
    </div>
  );
}

function TransactionTable({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <table className="payment-3ds-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OtpSection({
  label,
  placeholder,
  otp,
  onOtpChange,
  onVerify,
  onCancel,
  verifyLabel,
  cancelLabel,
  verifyDisabled,
  primaryClassName,
}: {
  label: string;
  placeholder: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onCancel: () => void;
  verifyLabel: string;
  cancelLabel: string;
  verifyDisabled: boolean;
  primaryClassName?: string;
}) {
  return (
    <>
      <label className="payment-3ds-field-label" htmlFor="payment-3ds-otp">
        {label}
      </label>
      <input
        id="payment-3ds-otp"
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        value={otp}
        onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className="payment-3ds-input"
      />
      <div className="payment-3ds-actions">
        <button
          type="button"
          className={cn("payment-3ds-btn", primaryClassName)}
          disabled={verifyDisabled}
          onClick={onVerify}
        >
          {verifyLabel}
        </button>
        <button type="button" className="payment-3ds-btn" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </>
  );
}

function LoaderScreen({
  title,
  brand,
  heading,
  subtext,
}: {
  title: string;
  brand: PaymentBrand;
  heading: string;
  subtext: string;
}) {
  return (
    <ThreeDSWindow title={title}>
      <div className="payment-3ds-loader">
        <BrandLogo brand={brand} size="lg" />
        <div className="payment-3ds-loader__spinner" aria-hidden />
        <p className="payment-3ds-loader__text">{heading}</p>
        <p className="payment-3ds-loader__subtext">{subtext}</p>
      </div>
    </ThreeDSWindow>
  );
}

function MastercardScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.mastercard")}>
      <div className="payment-3ds-mastercard__header">
        <BrandLogo brand="mastercard" size="md" />
        <p className="payment-3ds-mastercard__program">
          Secure<span>Code</span>
        </p>
      </div>
      <div className="payment-3ds-mastercard__content">
        <h2 className="payment-3ds-mastercard__heading">{t("mastercard.heading")}</h2>
        <p className="payment-3ds-mastercard__message">{t("mastercard.message")}</p>
        <TransactionTable
          rows={[
            { label: t("merchant"), value: merchantName },
            { label: t("amount"), value: amountLabel },
            { label: t("date"), value: dateLabel },
            { label: t("card"), value: `XXXX-XXXX-XXXX-${last4}` },
          ]}
        />
        <OtpSection
          label={t("mastercard.otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("mastercard.submit")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
        />
        <p className="payment-3ds-footer-note">{t("mastercard.footer")}</p>
      </div>
    </ThreeDSWindow>
  );
}

function VisaScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.visa")}>
      <div className="payment-3ds-visa__banner">
        <p className="payment-3ds-visa__banner-text">
          Verified by <span>Visa</span>
        </p>
        <BrandLogo brand="visa" size="md" />
      </div>
      <div className="payment-3ds-visa__content">
        <p className="payment-3ds-visa__intro">{t("visa.intro")}</p>
        <div className="payment-3ds-visa__details">
          <TransactionTable
            rows={[
              { label: t("merchant"), value: merchantName },
              { label: t("amount"), value: amountLabel },
              { label: t("date"), value: dateLabel },
              { label: t("card"), value: `•••• •••• •••• ${last4}` },
            ]}
          />
        </div>
        <OtpSection
          label={t("visa.otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("visa.continue")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
          primaryClassName="payment-3ds-btn--primary"
        />
        <p className="payment-3ds-footer-note">{t("visa.footer")}</p>
      </div>
    </ThreeDSWindow>
  );
}

function AmexScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, cardholderName, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.amex")}>
      <div className="payment-3ds-amex__banner">
        <p className="payment-3ds-amex__banner-text">{t("programs.amex")}</p>
        <BrandLogo brand="amex" size="md" />
      </div>
      <div className="payment-3ds-amex__content">
        <p className="payment-3ds-visa__intro">{t("amex.intro")}</p>
        <TransactionTable
          rows={[
            { label: t("merchant"), value: merchantName },
            { label: t("cardholder"), value: cardholderName },
            { label: t("amount"), value: amountLabel },
            { label: t("date"), value: dateLabel },
            { label: t("card"), value: `XXXX-XXXXXX-X${last4}` },
          ]}
        />
        <OtpSection
          label={t("amex.otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("amex.submit")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
          primaryClassName="payment-3ds-btn--primary"
        />
      </div>
    </ThreeDSWindow>
  );
}

function DiscoverScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.discover")}>
      <div className="payment-3ds-discover__banner">
        <p className="payment-3ds-discover__banner-text">
          Discover <span>ProtectBuy</span>
        </p>
        <BrandLogo brand="discover" size="md" />
      </div>
      <div className="payment-3ds-discover__content">
        <p className="payment-3ds-visa__intro">{t("discover.intro")}</p>
        <TransactionTable
          rows={[
            { label: t("merchant"), value: merchantName },
            { label: t("amount"), value: amountLabel },
            { label: t("date"), value: dateLabel },
            { label: t("card"), value: `6011-XXXX-XXXX-${last4}` },
          ]}
        />
        <OtpSection
          label={t("discover.otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("discover.submit")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
        />
      </div>
    </ThreeDSWindow>
  );
}

function UnionPayScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.unionpay")}>
      <div className="payment-3ds-unionpay__banner">
        <p className="payment-3ds-unionpay__banner-text">{t("programs.unionpay")}</p>
        <BrandLogo brand="unionpay" size="md" />
      </div>
      <div className="payment-3ds-unionpay__content">
        <p className="payment-3ds-visa__intro">{t("unionpay.intro")}</p>
        <TransactionTable
          rows={[
            { label: t("merchant"), value: merchantName },
            { label: t("amount"), value: amountLabel },
            { label: t("date"), value: dateLabel },
            { label: t("card"), value: `62XX-XXXX-XXXX-${last4}` },
          ]}
        />
        <OtpSection
          label={t("unionpay.otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("unionpay.submit")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
          primaryClassName="payment-3ds-btn--primary"
        />
      </div>
    </ThreeDSWindow>
  );
}

function GenericScreen(props: ScreenProps) {
  const { t, merchantName, amountLabel, last4, dateLabel, cardholderName, otp, onOtpChange, onVerify, onCancel, verifyDisabled } = props;

  return (
    <ThreeDSWindow title={t("programs.unknown")}>
      <div className="payment-3ds-mastercard__content">
        <h2 className="payment-3ds-mastercard__heading">{t("generic.heading")}</h2>
        <p className="payment-3ds-mastercard__message">{t("generic.message")}</p>
        <TransactionTable
          rows={[
            { label: t("merchant"), value: merchantName },
            { label: t("cardholder"), value: cardholderName },
            { label: t("amount"), value: amountLabel },
            { label: t("date"), value: dateLabel },
            { label: t("card"), value: `•••• ${last4}` },
          ]}
        />
        <OtpSection
          label={t("otpLabel")}
          placeholder={t("otpPlaceholder")}
          otp={otp}
          onOtpChange={onOtpChange}
          onVerify={onVerify}
          onCancel={onCancel}
          verifyLabel={t("verify")}
          cancelLabel={t("cancel")}
          verifyDisabled={verifyDisabled}
        />
      </div>
    </ThreeDSWindow>
  );
}

function BrandVerifyScreen({
  brand,
  ...props
}: ScreenProps & { brand: PaymentBrand }) {
  switch (brand) {
    case "mastercard":
      return <MastercardScreen {...props} />;
    case "visa":
      return <VisaScreen {...props} />;
    case "amex":
      return <AmexScreen {...props} />;
    case "discover":
      return <DiscoverScreen {...props} />;
    case "unionpay":
      return <UnionPayScreen {...props} />;
    default:
      return <GenericScreen {...props} />;
  }
}

export function CardPaymentVerificationModal({
  open,
  brand,
  merchantName,
  amountLabel,
  cardNumber,
  cardholderName,
  onVerified,
  onCancel,
}: CardPaymentVerificationModalProps) {
  const t = useTranslations("checkout.paymentVerification");
  const [phase, setPhase] = useState<Phase>("loading");
  const [otp, setOtp] = useState("");

  const paymentBrand = resolvePaymentBrand(brand);
  const last4 = cardDigits(cardNumber).slice(-4) || "0000";
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [open]
  );

  useEffect(() => {
    if (!open) {
      setPhase("loading");
      setOtp("");
      return;
    }

    setPhase("loading");
    const timer = window.setTimeout(() => setPhase("verify"), 2200);
    return () => window.clearTimeout(timer);
  }, [open, brand]);

  const canDismiss = phase === "verify";
  const loaderBrandName = isSupportedBrand(brand)
    ? t(`brandNames.${brand}`)
    : t("brandNames.unknown");

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (!canDismiss) return;
    onCancel();
  };

  const handleVerify = async () => {
    setPhase("submitting");
    try {
      await onVerified();
    } catch {
      setPhase("verify");
    }
  };

  const screenProps: ScreenProps = {
    merchantName,
    amountLabel,
    last4,
    cardholderName,
    dateLabel,
    otp,
    onOtpChange: setOtp,
    onVerify: () => void handleVerify(),
    onCancel,
    verifyDisabled: otp.length < 4,
    t,
  };

  const windowTitle = t(`programs.${paymentBrand}`);

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
        {phase === "loading" ? (
          <LoaderScreen
            title={windowTitle}
            brand={paymentBrand}
            heading={t("connecting", { brand: loaderBrandName })}
            subtext={t("pleaseWait")}
          />
        ) : null}

        {phase === "verify" ? (
          <BrandVerifyScreen brand={paymentBrand} {...screenProps} />
        ) : null}

        {phase === "submitting" ? (
          <LoaderScreen
            title={windowTitle}
            brand={paymentBrand}
            heading={t("verifying")}
            subtext={t("pleaseWait")}
          />
        ) : null}
      </ModalContent>
    </Modal>
  );
}
