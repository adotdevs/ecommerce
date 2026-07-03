"use client";

import { Button } from "@/components/ds/button";
import { useCartStore } from "@/stores/cart-store";

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
  const addItem = useCartStore((s) => s.addItem);

  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={() =>
        addItem({
          productId: product._id,
          name: product.name,
          slug: product.slug,
          image: product.media?.[0]?.url,
          price: product.pricing.price,
          quantity: 1,
        })
      }
    >
      Add to Cart
    </Button>
  );
}
