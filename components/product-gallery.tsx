"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductArt } from "@/components/product-art";
import type { Product } from "@/lib/catalog";

type GalleryItem = { id: string; src: string | null; alt: string };
export function ProductGallery({ product, variantId }: { product: Product; variantId: string }) {
  const items = useMemo<GalleryItem[]>(() => {
    const variant = (product.images ?? []).filter((item) => item.variantId === variantId).map((item) => ({ ...item, src: item.src }));
    const shared = (product.images ?? []).filter((item) => !item.variantId).map((item) => ({ ...item, src: item.src }));
    return variant.length || shared.length ? [...variant, ...shared.filter((item) => !variant.some((other) => other.id === item.id))] : [{ id: "art", src: null, alt: `${product.name} illustrative sample artwork` }];
  }, [product, variantId]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [failedMedia, setFailedMedia] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, distance: 0, zoom: 1, panX: 0, panY: 0 });
  const selected = items[Math.min(index, items.length - 1)];
  const selectedHasImage = Boolean(selected.src && !failedMedia.includes(selected.id));
  const next = useCallback(() => { setIndex((value) => (value + 1) % items.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [items.length]);
  const previous = useCallback(() => { setIndex((value) => (value - 1 + items.length) % items.length); setZoom(1); setPan({ x: 0, y: 0 }); }, [items.length]);
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const trigger = triggerRef.current;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowRight") next(); if (event.key === "ArrowLeft") previous(); if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(4, value + .5)); if (event.key === "-") setZoom((value) => Math.max(1, value - .5)); if (event.key === "Tab") { const controls = document.querySelectorAll<HTMLElement>(".lightbox button"); if (!controls.length) return; const first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", keydown); trigger?.focus(); };
  }, [open, next, previous]);
  function onPointerDown(event: React.PointerEvent<HTMLElement>) { event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 1) gesture.current = { startX: event.clientX, startY: event.clientY, distance: 0, zoom, panX: pan.x, panY: pan.y }; if (pointers.current.size === 2) { const values = [...pointers.current.values()]; gesture.current.distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y); gesture.current.zoom = zoom; } }
  function onPointerMove(event: React.PointerEvent<HTMLElement>) { if (!pointers.current.has(event.pointerId)) return; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2) { const values = [...pointers.current.values()]; const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y); if (gesture.current.distance) setZoom(Math.min(4, Math.max(1, gesture.current.zoom * distance / gesture.current.distance))); } else if (zoom > 1) setPan({ x: gesture.current.panX + event.clientX - gesture.current.startX, y: gesture.current.panY + event.clientY - gesture.current.startY }); }
  function onPointerUp(event: React.PointerEvent<HTMLElement>) { const start = gesture.current; pointers.current.delete(event.pointerId); if (pointers.current.size === 0 && zoom === 1 && Math.abs(event.clientX - start.startX) > 65) { if (event.clientX < start.startX) next(); else previous(); } }
  const image = (item: GalleryItem, enlarged = false) => {
    const markFailed = () => setFailedMedia((current) => current.includes(item.id) ? current : [...current, item.id]);
    return item.src && !failedMedia.includes(item.id)
      ? <Image src={item.src} alt={item.alt} fill unoptimized sizes={enlarged ? "100vw" : "(max-width: 900px) 100vw, 50vw"} className="gallery-image" onError={markFailed} style={enlarged ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined} />
      : enlarged
        ? <div className="gallery-art-zoom" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><ProductArt product={product} /></div>
        : <ProductArt product={product} />;
  };
  return <div className="gallery-root"><button ref={triggerRef} type="button" className="gallery-main" onClick={() => setOpen(true)} aria-label={`Enlarge ${selected.alt}`}>{image(selected)}<span className="gallery-enlarge">Tap to enlarge</span><span className="gallery-count">{index + 1} / {items.length}</span></button><div className="gallery-thumbs" aria-label="Product images">{items.map((item, position) => <button type="button" key={`${item.id}-${position}`} className={index === position ? "is-active" : ""} aria-label={`Show image ${position + 1}: ${item.alt}`} aria-current={index === position ? "true" : undefined} onClick={() => setIndex(position)}>{image(item)}</button>)}</div>{!selectedHasImage ? <p className="gallery-note">Illustrative sample artwork · approved product photography is not configured.</p> : null}{open ? <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image gallery`}><div className="lightbox-top"><span>{index + 1} / {items.length}</span><div><button type="button" onClick={() => setZoom((value) => Math.max(1, value - .5))} aria-label="Zoom out">−</button><button type="button" onClick={() => setZoom((value) => Math.min(4, value + .5))} aria-label="Zoom in">+</button><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close image gallery">×</button></div></div><div className="lightbox-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>{image(selected, true)}</div><div className="lightbox-bottom"><button type="button" onClick={previous} aria-label="Previous image">← Previous</button><span>{selected.alt}</span><button type="button" onClick={next} aria-label="Next image">Next →</button></div></div> : null}</div>;
}
