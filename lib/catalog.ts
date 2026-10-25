export type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  regularPrice: number;
  salePrice?: number;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  description: string;
  materialNote: string;
  featured: boolean;
  createdAt: string;
  art: string;
  variants: Variant[];
};

export const categories = [
  { name: "Wall Accents", slug: "wall-accents", eyebrow: "Quiet geometry", art: "arch" },
  { name: "Entryway Details", slug: "entryway-details", eyebrow: "A considered welcome", art: "sun" },
  { name: "Tabletop Forms", slug: "tabletop-forms", eyebrow: "Small focal points", art: "bloom" },
  { name: "Giftable Pieces", slug: "giftable-pieces", eyebrow: "Thoughtful details", art: "orbit" },
];

export const products: Product[] = [
  {
    id: "p-sunline",
    slug: "sunline-arch",
    name: "Sunline Arch",
    category: "Wall Accents",
    categorySlug: "wall-accents",
    description: "A measured arc of light and line, designed to add a quiet focal point to a wall.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: true,
    createdAt: "2026-10-04",
    art: "arch",
    variants: [
      { id: "v-sunline-brass", sku: "DEMO-SUN-24-BR", size: "24 in", color: "Brass", regularPrice: 649900, stock: 8 },
      { id: "v-sunline-ink", sku: "DEMO-SUN-24-IN", size: "24 in", color: "Ink", regularPrice: 599900, stock: 4 },
      { id: "v-sunline-sage", sku: "DEMO-SUN-30-SA", size: "30 in", color: "Sage", regularPrice: 829900, salePrice: 759900, stock: 2 },
    ],
  },
  {
    id: "p-noor",
    slug: "noor-petal-grid",
    name: "Noor Petal Grid",
    category: "Wall Accents",
    categorySlug: "wall-accents",
    description: "Petal-like geometry with enough rhythm to sit beautifully above a console or bed.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: true,
    createdAt: "2026-09-26",
    art: "bloom",
    variants: [
      { id: "v-noor-ink", sku: "DEMO-NOOR-18-IN", size: "18 in", color: "Ink", regularPrice: 469900, stock: 12 },
      { id: "v-noor-brass", sku: "DEMO-NOOR-24-BR", size: "24 in", color: "Brass", regularPrice: 699900, stock: 5 },
    ],
  },
  {
    id: "p-mehrab",
    slug: "mehrab-line",
    name: "Mehrab Line",
    category: "Entryway Details",
    categorySlug: "entryway-details",
    description: "An architectural outline that brings softness and structure to an entrance or reading nook.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: true,
    createdAt: "2026-09-12",
    art: "mehrab",
    variants: [
      { id: "v-mehrab-brass", sku: "DEMO-MEHR-24-BR", size: "24 in", color: "Brass", regularPrice: 729900, stock: 6 },
      { id: "v-mehrab-ink", sku: "DEMO-MEHR-30-IN", size: "30 in", color: "Ink", regularPrice: 849900, stock: 0 },
    ],
  },
  {
    id: "p-orbit",
    slug: "orbit-table-mark",
    name: "Orbit Table Mark",
    category: "Tabletop Forms",
    categorySlug: "tabletop-forms",
    description: "A compact circular form for shelves, sideboards and the corners that need one more detail.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: false,
    createdAt: "2026-10-13",
    art: "orbit",
    variants: [
      { id: "v-orbit-sage", sku: "DEMO-ORBT-10-SA", size: "10 in", color: "Sage", regularPrice: 329900, stock: 11 },
      { id: "v-orbit-brass", sku: "DEMO-ORBT-10-BR", size: "10 in", color: "Brass", regularPrice: 349900, stock: 9 },
    ],
  },
  {
    id: "p-lattice",
    slug: "lattice-quiet",
    name: "Lattice Quiet",
    category: "Wall Accents",
    categorySlug: "wall-accents",
    description: "A repeating lattice that creates texture without asking the whole room to follow it.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: false,
    createdAt: "2026-08-21",
    art: "lattice",
    variants: [
      { id: "v-lattice-24-br", sku: "DEMO-LATT-24-BR", size: "24 in", color: "Brass", regularPrice: 579900, stock: 3 },
      { id: "v-lattice-36-br", sku: "DEMO-LATT-36-BR", size: "36 in", color: "Brass", regularPrice: 979900, stock: 1 },
    ],
  },
  {
    id: "p-nest",
    slug: "nesting-leaves",
    name: "Nesting Leaves",
    category: "Giftable Pieces",
    categorySlug: "giftable-pieces",
    description: "A layered leaf silhouette for gifting, bookshelves and little moments of warmth.",
    materialNote: "Sample listing — final material details are not yet configured.",
    featured: false,
    createdAt: "2026-10-18",
    art: "leaf",
    variants: [
      { id: "v-nest-sage", sku: "DEMO-NEST-12-SA", size: "12 in", color: "Sage", regularPrice: 389900, stock: 14 },
      { id: "v-nest-ink", sku: "DEMO-NEST-12-IN", size: "12 in", color: "Ink", regularPrice: 369900, stock: 10 },
    ],
  },
];

export function getProduct(slug: string) { return products.find((product) => product.slug === slug); }
export function getVariant(variantId: string) { return products.flatMap((product) => product.variants).find((variant) => variant.id === variantId); }
export function effectivePrice(variant: Variant) { return variant.salePrice ?? variant.regularPrice; }
export function formatPrice(minor: number) { return `PKR ${(minor / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`; }
export function minProductPrice(product: Product) { return Math.min(...product.variants.map(effectivePrice)); }
