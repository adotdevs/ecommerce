import type { IProduct } from "@/models/Product";
import { Product } from "@/models";

export async function deductProductStock(
  product: IProduct,
  variantId: string | undefined,
  quantity: number
): Promise<void> {
  if (quantity <= 0) return;
  if (product.inventory?.trackInventory === false) return;

  await deductProductStockAtomic(String(product._id), variantId, quantity);
}

export async function deductProductStockAtomic(
  productId: string,
  variantId: string | undefined,
  quantity: number
): Promise<void> {
  if (quantity <= 0) return;

  const product = await Product.findById(productId).select(
    "variants inventory status trackInventory"
  );
  if (!product || product.status !== "published") {
    throw new Error("Product unavailable");
  }
  if (product.inventory?.trackInventory === false) return;

  if (product.variants?.length) {
    if (!variantId) {
      throw new Error("Variant is required for this product");
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        status: "published",
        variants: {
          $elemMatch: { id: variantId, stock: { $gte: quantity } },
        },
      },
      { $inc: { "variants.$[v].stock": -quantity } },
      {
        arrayFilters: [{ "v.id": variantId }],
        new: true,
      }
    );

    if (!updated) {
      throw new Error("Insufficient stock");
    }

    const totalStock = updated.variants.reduce(
      (sum, variant) => sum + Math.max(0, Number(variant.stock) || 0),
      0
    );
    await Product.updateOne(
      { _id: productId },
      { $set: { "inventory.stock": totalStock } }
    );
    return;
  }

  const updated = await Product.findOneAndUpdate(
    {
      _id: productId,
      status: "published",
      "inventory.stock": { $gte: quantity },
    },
    { $inc: { "inventory.stock": -quantity } },
    { new: true }
  );

  if (!updated) {
    throw new Error("Insufficient stock");
  }
}

export async function restoreProductStockAtomic(
  productId: string,
  variantId: string | undefined,
  quantity: number
): Promise<void> {
  if (quantity <= 0) return;

  const product = await Product.findById(productId).select(
    "variants inventory status trackInventory"
  );
  if (!product || product.inventory?.trackInventory === false) return;

  if (product.variants?.length) {
    if (!variantId) return;

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        "variants.id": variantId,
      },
      { $inc: { "variants.$[v].stock": quantity } },
      {
        arrayFilters: [{ "v.id": variantId }],
        new: true,
      }
    );

    if (!updated) return;

    const totalStock = updated.variants.reduce(
      (sum, variant) => sum + Math.max(0, Number(variant.stock) || 0),
      0
    );
    await Product.updateOne(
      { _id: productId },
      { $set: { "inventory.stock": totalStock } }
    );
    return;
  }

  await Product.updateOne(
    { _id: productId },
    { $inc: { "inventory.stock": quantity } }
  );
}

export async function restoreProductStock(
  product: IProduct,
  variantId: string | undefined,
  quantity: number
): Promise<void> {
  await restoreProductStockAtomic(String(product._id), variantId, quantity);
}
