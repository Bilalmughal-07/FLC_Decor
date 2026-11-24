import Link from "next/link";
import { categories as sampleCategories, products as sampleProducts } from "@/lib/catalog";
import Image from "next/image";
import { listCatalog } from "@/lib/catalog-store";
import { ProductCard } from "@/components/product-card";
import { PageShell } from "@/components/page-shell";
import { ProductArt } from "@/components/product-art";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const databaseData = process.env.CATALOG_RUNTIME === "database"
    ? await listCatalog(new URLSearchParams({ limit: "100", sort: "featured" }))
    : undefined;
  const categories = databaseData
    ? databaseData.categories.filter((category) => !category.parentId).map((category) => ({ ...category, art: "arch", eyebrow: "Explore the collection" }))
    : sampleCategories;
  const products = databaseData?.products ?? sampleProducts;
  const heroProduct = products[0];
  const showcaseProduct = products[2] ?? products[0];
  const featured = products.filter((product) => product.featured);

  return <PageShell>
    <section className="hero section-grid">
      <div className="hero-copy">
        <p className="eyebrow">Fahad Laser / FLC Decor</p>
        <h1>Turn your walls into a <span className="hero-accent">statement.</span></h1>
        <p className="hero-lede">Discover decor designed to bring character, warmth and detail to the spaces you love.</p>
        <div className="hero-actions"><Link className="button button-dark" href="/shop">Explore the collection <span>↗</span></Link><Link className="text-link" href="/custom-orders">Have a design in mind? <span>→</span></Link></div>
        <p className="micro-note">{databaseData ? "Production checkout and delivery policy are not configured." : "A curated sample catalog · prices and stock are illustrative."}</p>
      </div>
      <div className="hero-stage"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />{heroProduct?.images?.[0] ? <Image src={heroProduct.images[0].src} alt={heroProduct.images[0].alt} fill unoptimized priority sizes="(max-width: 900px) 100vw, 50vw" className="hero-media" /> : heroProduct ? <ProductArt product={heroProduct} /> : <div className="hero-empty-art" aria-hidden="true" />}<div className="hero-caption"><span>FLC Decor</span><span>Quiet forms, considered spaces</span></div></div>
    </section>
    <section className="section section-intro"><div><p className="eyebrow">Shop by feeling</p><h2>Details that give a room its rhythm.</h2></div><p className="section-lede">Start with a shape, a corner or a mood. Browse the collection by form, finish and size.</p></section>
    <section className="category-grid">{categories.map((category, index) => <Link className={`category-tile category-${index + 1}`} href={`/categories/${category.slug}`} key={category.slug}><span className="category-index">{String(index + 1).padStart(2, "0")}</span><span className={`category-art category-art-${category.art}`} /><span><p className="eyebrow">{category.eyebrow}</p><h3>{category.name}</h3></span><span className="tile-arrow"><Icon name="arrow-up-right" /></span></Link>)}</section>
    <section className="section featured-section"><div className="section-heading"><div><p className="eyebrow">Selected pieces</p><h2>Pieces worth a second look.</h2></div><Link className="text-link" href="/shop">View all pieces<Icon name="arrow-right" /></Link></div>{featured.length ? <div className="product-grid">{featured.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <p>Featured pieces will appear here once selected for the collection.</p>}</section>
    <section className="story section-grid"><div className="story-art"><div className="story-quote">“The right detail can change<br />the feeling of a room.”</div><span className="story-circle" /></div><div className="story-copy"><p className="eyebrow">Our approach</p><h2>Less noise. More character.</h2><p>FLC Decor brings together expressive design and an easy way to discover decor that suits your style.</p><Link className="text-link" href="/about">Read our approach <Icon name="arrow-right" /></Link></div></section>
    {showcaseProduct ? <section className="showcase section"><div className="showcase-copy"><p className="eyebrow">A little depth</p><h2>Designed to catch the light.</h2><p>Shape, shadow and space let each piece breathe. Product information always comes first.</p><Link className="button button-outline" href={`/products/${showcaseProduct.slug}`}>View {showcaseProduct.name} <Icon name="arrow-up-right" /></Link></div><div className="showcase-stage"><div className="showcase-shadow" />{showcaseProduct.images?.[0] ? <Image src={showcaseProduct.images[0].src} alt={showcaseProduct.images[0].alt} fill unoptimized sizes="(max-width: 900px) 100vw, 50vw" className="showcase-media" /> : <ProductArt product={showcaseProduct} />}</div></section> : null}
    <section className="custom-banner"><div><p className="eyebrow">A design in mind?</p><h2>Your idea deserves a conversation.</h2><p>Custom inquiries are handled through our confirmed WhatsApp contact.</p></div><Link className="button button-light" href="/custom-orders">Start a conversation <Icon name="arrow-up-right" /></Link></section>
  </PageShell>;
}
