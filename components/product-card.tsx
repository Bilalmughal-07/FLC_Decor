import Link from "next/link";
import { formatPrice, minProductPrice, type Product } from "@/lib/catalog";
import { ProductArt } from "./product-art";

export function ProductCard({ product }: { product: Product }) {
  const hasSale = product.variants.some((variant) => variant.salePrice);
  return <article className="product-card">
    <Link href={`/products/${product.slug}`} className="product-card-image"><ProductArt product={product} compact /><span className="product-card-meta">{hasSale ? "Selected price" : "Sample listing"}</span></Link>
    <div className="product-card-body"><div><p className="eyebrow">{product.category}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3></div><p className="product-price">From {formatPrice(minProductPrice(product))}</p></div>
  </article>;
}
