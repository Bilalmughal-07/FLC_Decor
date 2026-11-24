"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MediaAsset = { id: string; state: "PENDING" | "APPROVED" | "ORPHANED" | "PURGED"; width: number; height: number; bytes: number; processingErrorCode: string | null; previewUrl: string; products: Array<{ productId: string }>; variants: Array<{ variantId: string }> };
type Attachment = { mediaId: string; sortOrder: number; altText?: string; media: { id: string; state: string } };
type Product = { id: string; name: string; media: Attachment[]; variants: Array<{ id: string; sku: string; media: Attachment[] }> };
type UploadRow = { id: string; file: File; progress: number; state: "queued" | "uploading" | "complete" | "failed"; error?: string };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message ?? "Media operation failed.");
  return body;
}

export function AdminMediaManager({ products, onChanged }: { products: Product[]; onChanged: () => Promise<void> }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [altText, setAltText] = useState("");
  const [replaceMain, setReplaceMain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedProduct = products.find((item) => item.id === productId);
  const selectedVariant = selectedProduct?.variants.find((item) => item.id === variantId);
  const attachments = useMemo(() => (selectedVariant ? selectedVariant.media : selectedProduct?.media ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder || a.mediaId.localeCompare(b.mediaId)), [selectedProduct, selectedVariant]);
  const load = useCallback(async () => {
    const data = await request("/api/admin/media");
    setAssets(data.media);
    setStorageConfigured(data.storageConfigured);
  }, []);
  useEffect(() => { Promise.resolve().then(load).catch((issue) => setError(issue instanceof Error ? issue.message : "Media could not be loaded.")); }, [load]);

  function uploadFile(row: UploadRow) {
    setUploads((current) => current.map((item) => item.id === row.id ? { ...item, state: "uploading", progress: 0, error: undefined } : item));
    const form = new FormData(); form.set("file", row.file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploads((current) => current.map((item) => item.id === row.id ? { ...item, progress: Math.round(event.loaded / event.total * 100) } : item)); };
    xhr.onload = () => {
      const body = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads((current) => current.map((item) => item.id === row.id ? { ...item, state: "complete", progress: 100 } : item));
        setMessage(`${row.file.name} is staged for approval.`); load().catch(() => undefined);
      } else setUploads((current) => current.map((item) => item.id === row.id ? { ...item, state: "failed", error: body.error?.message ?? "Upload failed." } : item));
    };
    xhr.onerror = () => setUploads((current) => current.map((item) => item.id === row.id ? { ...item, state: "failed", error: "Upload connection failed." } : item));
    xhr.send(form);
  }
  function queue(files: FileList | File[]) {
    setError(""); setMessage("");
    const rows = [...files].filter((file) => file.type.startsWith("image/")).map((file) => ({ id: crypto.randomUUID(), file, progress: 0, state: "queued" as const }));
    setUploads((current) => [...rows, ...current]);
    rows.forEach(uploadFile);
  }
  async function mutate(label: string, action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); await Promise.all([load(), onChanged()]); setMessage(label); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Media operation failed."); }
    finally { setBusy(false); }
  }
  async function assign(event: React.FormEvent) {
    event.preventDefault();
    if (!productId || !mediaId) return;
    const path = variantId ? `/api/admin/variants/${variantId}/media` : `/api/admin/products/${productId}/media`;
    await mutate(replaceMain ? "Main image replaced." : "Image assigned.", async () => {
      await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(variantId ? { mediaId, sortOrder: replaceMain ? 0 : attachments.length } : { mediaId, altText, sortOrder: replaceMain ? 0 : attachments.length }) });
      const previousMain = attachments[0];
      if (replaceMain && previousMain && previousMain.mediaId !== mediaId) {
        const removePath = `${path}?mediaId=${encodeURIComponent(previousMain.mediaId)}`;
        const response = await fetch(removePath, { method: "DELETE" });
        if (!response.ok) throw new Error("The new main image was assigned, but the previous association could not be removed.");
      }
      setReplaceMain(false);
    });
  }
  async function setOrder(attachment: Attachment, sortOrder: number) {
    const path = selectedVariant ? `/api/admin/variants/${selectedVariant.id}/media` : `/api/admin/products/${selectedProduct!.id}/media`;
    const productAlt = attachment.altText || altText || "Product image";
    await mutate("Image order updated.", () => request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(selectedVariant ? { mediaId: attachment.mediaId, sortOrder } : { mediaId: attachment.mediaId, altText: productAlt, sortOrder }) }));
  }
  async function detach(attachment: Attachment) {
    const path = selectedVariant ? `/api/admin/variants/${selectedVariant.id}/media?mediaId=${encodeURIComponent(attachment.mediaId)}` : `/api/admin/products/${selectedProduct!.id}/media?mediaId=${encodeURIComponent(attachment.mediaId)}`;
    await mutate("Image association removed; the shared asset was preserved.", () => fetch(path, { method: "DELETE" }).then((response) => { if (!response.ok) throw new Error("Image could not be detached."); }));
  }
  const approved = assets.filter((asset) => asset.state === "APPROVED");
  return <div className="admin-panel admin-media-panel">
    <div className="media-panel-heading"><div><p className="eyebrow">Cloudflare R2</p><h3>Product media</h3></div><span className={`status-pill ${storageConfigured ? "" : "is-warning"}`}>{storageConfigured ? "Configured" : "Disabled"}</span></div>
    {!storageConfigured ? <p className="demo-alert"><span>Storage disabled</span> Add scoped R2 configuration to enable uploads. Existing approved references remain safe.</p> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}
    <div className={`media-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); queue(event.dataTransfer.files); }}>
      <strong>Drop product images here</strong><span>JPEG, PNG or WebP · up to 10 MB · re-encoded and staged privately</span><button type="button" className="button button-outline" disabled={!storageConfigured} onClick={() => fileInput.current?.click()}>Choose images</button><input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) queue(event.target.files); event.target.value = ""; }} />
    </div>
    {uploads.length ? <div className="upload-queue" aria-label="Upload progress">{uploads.map((row) => <div key={row.id} className="upload-row"><div><strong>{row.file.name}</strong><span>{row.state === "failed" ? row.error : `${row.progress}% · ${row.state}`}</span></div><progress max={100} value={row.progress} />{row.state === "failed" ? <button type="button" onClick={() => uploadFile(row)}>Retry</button> : null}</div>)}</div> : null}
    <div className="media-library">{assets.filter((asset) => asset.state !== "PURGED").map((asset) => <article key={asset.id} className="media-card"><div className="media-preview">{storageConfigured && asset.processingErrorCode !== "R2_UPLOAD_FAILED" ? <Image src={asset.previewUrl} alt="Admin media preview" fill unoptimized sizes="160px" /> : <span>Preview unavailable</span>}</div><div><strong>{asset.width} × {asset.height}</strong><span>{Math.ceil(asset.bytes / 1024)} KB · {asset.state}</span>{asset.processingErrorCode ? <small>{asset.processingErrorCode}</small> : null}</div><div className="media-card-actions">{asset.state === "PENDING" ? <button type="button" disabled={busy || !storageConfigured} onClick={() => mutate("Image approved and promoted.", () => request(`/api/admin/media/${asset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve" }) }))}>Approve</button> : null}<button type="button" disabled={busy || !storageConfigured || asset.products.length > 0 || asset.variants.length > 0} onClick={() => mutate("Image deleted.", () => fetch(`/api/admin/media/${asset.id}`, { method: "DELETE" }).then(async (response) => { if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error?.message ?? "Delete failed."); } }))}>Delete</button></div></article>)}</div>
    <form className="media-assignment" onSubmit={assign}><h4>Assign an approved image</h4><label>Product<select required value={productId} onChange={(event) => { setProductId(event.target.value); setVariantId(""); }}><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Gallery scope<select value={variantId} disabled={!selectedProduct} onChange={(event) => setVariantId(event.target.value)}><option value="">Shared product gallery</option>{selectedProduct?.variants.map((item) => <option key={item.id} value={item.id}>Variant · {item.sku}</option>)}</select></label><label>Approved image<select required value={mediaId} onChange={(event) => setMediaId(event.target.value)}><option value="">Select image</option>{approved.map((asset) => <option key={asset.id} value={asset.id}>{asset.id.slice(0, 8)} · {asset.width}×{asset.height}</option>)}</select></label>{!variantId ? <label>Alt text<input required value={altText} maxLength={240} onChange={(event) => setAltText(event.target.value)} /></label> : null}<label className="media-check"><input type="checkbox" checked={replaceMain} onChange={(event) => setReplaceMain(event.target.checked)} /> Replace the current main image</label><button className="button button-dark" disabled={busy || !approved.length}>Assign image</button></form>
    {selectedProduct ? <div className="media-ordering"><h4>{selectedVariant ? `${selectedVariant.sku} gallery` : `${selectedProduct.name} gallery`}</h4>{attachments.length ? attachments.map((attachment, index) => <div className="media-order-row" key={attachment.mediaId}><Image src={`/api/admin/media/${attachment.mediaId}/content?kind=thumbnail`} alt={attachment.altText ?? "Variant image"} width={58} height={58} unoptimized /><span>{index === 0 ? "Main image" : `Position ${index + 1}`}<small>{attachment.altText}</small></span><div><button type="button" disabled={busy || index === 0} onClick={() => setOrder(attachment, Math.max(0, attachments[index - 1].sortOrder - 1))}>Earlier</button><button type="button" disabled={busy || index === 0} onClick={() => setOrder(attachment, 0)}>Make main</button><button type="button" disabled={busy} onClick={() => detach(attachment)}>Detach</button></div></div>) : <p>No images assigned to this gallery.</p>}</div> : null}
    <button type="button" className="text-button" disabled={busy || !storageConfigured} onClick={() => mutate("Media cleanup reconciliation completed.", () => request("/api/admin/media/reconcile", { method: "POST" }))}>Retry pending cleanup</button>
  </div>;
}
