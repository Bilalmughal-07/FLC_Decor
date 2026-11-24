"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice, minProductPrice, type Product } from "@/lib/catalog";
import { ProductArt } from "./product-art";
import { Icon } from "./icon";

export function ProductCard({ product }: { product: Product }) {
  const hasSale = product.variants.some((variant) => variant.salePrice);
  const image = product.images?.find((item) => !item.variantId) ?? product.images?.[0];
  const imageSrc = image?.thumbnailSrc ?? image?.src ?? null;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const imageFailed = imageSrc !== null && failedImageSrc === imageSrc;
  return <article className="product-card">
    <Link href={`/products/${product.slug}`} className="product-card-image">{image && !imageFailed ? <Image src={imageSrc ?? image.src} alt={image.alt} fill unoptimized sizes="(max-width: 640px) 48vw, (max-width: 900px) 50vw, 25vw" className="card-photo" onError={() => setFailedImageSrc(imageSrc)} /> : <ProductArt product={product} compact />}<span className="product-card-meta">{hasSale ? "Sale price" : <>View piece <Icon name="arrow-up-right" /></>}</span></Link>
    <div className="product-card-body"><div className="product-card-copy"><p className="eyebrow">{product.category}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3></div><p className="product-price"><span>From</span> {formatPrice(minProductPrice(product))}</p></div>
  </article>;
}
