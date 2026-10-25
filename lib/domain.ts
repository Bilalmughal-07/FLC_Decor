import { effectivePrice, getVariant, type Variant } from "./catalog";

export function validVariantCombination(variant: Variant | undefined) {
  return Boolean(variant?.id && variant.size && variant.color && effectivePrice(variant) > 0);
}

export function quoteItems(items: Array<{ variantId: string; quantity: number }>) {
  return items.map((item) => {
    const variant = getVariant(item.variantId);
    if (!validVariantCombination(variant) || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("INVALID_VARIANT");
    return { variantId: item.variantId, quantity: item.quantity, unitPrice: effectivePrice(variant!) };
  });
}
