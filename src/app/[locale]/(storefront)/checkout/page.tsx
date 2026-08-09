import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { CheckoutFlow } from "@/components/storefront/checkout/CheckoutFlow";

export default async function CheckoutPage() {
  const { storeName } = resolveBranding(await getSiteSettings());

  return <CheckoutFlow merchantName={storeName} />;
}
