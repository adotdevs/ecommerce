"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/button";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { cn } from "@/components/ds/utils";

interface AddToCartButtonProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    pricing: { price: number };
    media?: { url: string }[];
  };
  disabled?: boolean;
}

export function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const t = useTranslations("common");
  const { addToCart, justAdded } = useAddToCart();

  return (
    <Button
      size="lg"
      disabled={disabled}
      variant={justAdded ? "accent" : "primary"}
      className={cn(justAdded && "bg-brand-accent text-white hover:bg-brand-accent")}
      onClick={() => {
        if (justAdded) return;
        addToCart({
          productId: product._id,
          name: product.name,
          slug: product.slug,
          image: product.media?.[0]?.url,
          price: product.pricing.price,
          quantity: 1,
        });
      }}
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" />
          {t("addedToCart")}
        </>
      ) : (
        t("addToCart")
      )}
    </Button>
  );
}
