import type { Product } from "@/lib/catalog";

export function ProductArt({ product, compact = false }: { product: Product; compact?: boolean }) {
  return <div className={`product-art art-${product.art} ${compact ? "is-compact" : ""}`} aria-label={`Sample artwork preview for ${product.name}`} role="img">
    <span className="art-glow" />
    <span className="art-shape art-shape-one" />
    <span className="art-shape art-shape-two" />
    <span className="art-shape art-shape-three" />
    <span className="art-label">FLC / SAMPLE</span>
  </div>;
}
