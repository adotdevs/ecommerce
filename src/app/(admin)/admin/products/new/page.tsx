"use client";

import { ProductForm } from "@/components/admin/products/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-h2 text-foreground">Add product</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Create a new product with images, categories, pricing, and merchandising settings.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
