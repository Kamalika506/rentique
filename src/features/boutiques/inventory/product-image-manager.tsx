"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_IMAGES, productImageSchema, type ProductImage } from "./schema";
import { ProductServiceError } from "./service";
import { useProductService } from "./provider";
import { reorderImages, validateImageFiles } from "./image-upload";
import styles from "./inventory.module.css";

interface UploadTask { id: string; file: File; previewUrl: string; status: "queued" | "uploading" | "failed"; progress?: number; error?: string }
export function ProductImageManager({ images, productId, disabled, error, onChange, onPendingChange }: {
  images: ProductImage[]; productId?: string; disabled: boolean; error?: string;
  onChange: (update: (current: ProductImage[]) => ProductImage[]) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const service = useProductService();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [feedback, setFeedback] = useState("");
  const urls = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const running = useRef(false);
  useEffect(() => { mounted.current = true; const ownedUrls = urls.current; return () => { mounted.current = false; controller.current?.abort(); for (const url of ownedUrls) URL.revokeObjectURL(url); ownedUrls.clear(); }; }, []);
  useEffect(() => { onPendingChange(tasks.length > 0); }, [tasks, onPendingChange]);
  function release(url: string) { URL.revokeObjectURL(url); urls.current.delete(url); }
  async function run(batch: UploadTask[]) {
    if (running.current || disabled) return;
    running.current = true; setProcessing(true); setFeedback("");
    for (const task of batch) {
      if (!mounted.current) break;
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: "uploading", progress: undefined, error: undefined } : item));
      const abort = new AbortController(); controller.current = abort;
      try {
        const result = await service.uploadImages([task.file], { productId, signal: abort.signal, onProgress: (loaded, total) => { if (mounted.current && total > 0) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, progress: Math.min(100, Math.round(loaded / total * 100)) } : item)); } });
        if (!mounted.current) break;
        if (result.length !== 1) throw new ProductServiceError("UNAVAILABLE", "The upload did not return one verified image.");
        const image = productImageSchema.parse(result[0]);
        if (service.mode === "live" && image.source !== "cloudinary") throw new ProductServiceError("FORBIDDEN", "A verified Cloudinary asset is required for a live product.");
        onChange((current) => [...current, image]);
        setTasks((current) => current.filter((item) => item.id !== task.id)); release(task.previewUrl);
        setFeedback(service.mode === "demo" ? "Image added in demo memory." : "Verified Cloudinary image added to the product draft.");
      } catch (cause) {
        if (mounted.current) setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: "failed", error: cause instanceof ProductServiceError ? cause.message : "This image couldn't be added. Retry or choose another file." } : item));
      }
    }
    controller.current = null; running.current = false;
    if (mounted.current) setProcessing(false);
  }
  function select(files: File[]) {
    setSelectionError("");
    try {
      validateImageFiles(files);
      if (images.length + tasks.length + files.length > MAX_IMAGES) throw new ProductServiceError("VALIDATION", "Use no more than 6 saved and queued images in total.");
      const batch = files.map((file): UploadTask => { const previewUrl = URL.createObjectURL(file); urls.current.add(previewUrl); return { id: crypto.randomUUID(), file, previewUrl, status: "queued" }; });
      onPendingChange(true); setTasks((current) => [...current, ...batch]); void run(batch);
    } catch (cause) { setSelectionError(cause instanceof ProductServiceError ? cause.message : "These files couldn't be selected. Please try again."); }
  }
  return <div className="p-6">
    <label htmlFor="product-images" className={styles.label}>Choose images<input id="product-images" type="file" accept="image/jpeg,image/png,image/webp" multiple className={styles.input} disabled={disabled || processing || images.length + tasks.length >= MAX_IMAGES} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) select(files); }} aria-describedby="images-hint images-error" aria-invalid={Boolean(selectionError || error)} /></label>
    <p id="images-hint" className={styles.hint}>Up to 6 JPG, PNG or WebP images, 5 MB each. First image is the cover. {service.mode === "demo" ? "Progress shows local file reading; no Cloudinary upload occurs." : "Upload progress measures transfer; asset verification completes before adding the image."}</p>
    <p id="images-error" role="alert" className={styles.error}>{selectionError || error}</p>
    <p role="status" className={styles.hint}>{feedback}</p>
    <div className={styles.images}>{images.map((image, index) => <div key={image.id}>
      <Image src={image.url} alt={image.alt || "Product image"} width={90} height={100} className={styles.image} unoptimized />
      <p className={styles.hint}>{index === 0 ? "Cover image" : `Image ${index + 1}`} · {image.source === "demo" ? "Demo" : "Cloudinary"}</p>
      <label className={`${styles.label} mt-2`}>Image {index + 1} description<input className={styles.input} value={image.alt} disabled={disabled || processing} maxLength={160} onChange={(event) => { const alt = event.target.value; onChange((current) => current.map((item) => item.id === image.id ? { ...item, alt } : item)); }} /></label>
      <div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={disabled || processing || index === 0} onClick={() => onChange((current) => reorderImages(current, index, -1))} aria-label={`Move image ${index + 1} earlier`}>Earlier</Button><Button type="button" variant="outline" size="sm" disabled={disabled || processing || index === images.length - 1} onClick={() => onChange((current) => reorderImages(current, index, 1))} aria-label={`Move image ${index + 1} later`}>Later</Button><Button type="button" variant="ghost" size="sm" disabled={disabled || processing} onClick={() => { onChange((current) => current.filter((item) => item.id !== image.id)); setFeedback("Image removed from the draft. Save the product to keep this change."); }} aria-label={`Remove image ${index + 1}`}>Remove</Button></div>
    </div>)}</div>
    {tasks.map((task) => <div key={task.id} className="my-4 rounded border border-[#e4dfd7] p-3"><div className="flex gap-4"><Image src={task.previewUrl} alt={`Selected file: ${task.file.name}`} width={90} height={100} className={styles.image} unoptimized /><div className="min-w-0 flex-1"><p className="break-all text-xs">{task.file.name}</p><p role="status" className={styles.hint}>{task.status === "failed" ? "Failed" : task.status === "queued" ? "Queued" : task.progress === 100 ? service.mode === "demo" ? "Completing local preview…" : "Verifying uploaded asset…" : service.mode === "demo" ? "Reading local file…" : "Uploading…"}</p>{task.status === "uploading" && <progress max={100} value={task.progress} aria-label={`Progress for ${task.file.name}`} className="mt-2 w-full accent-[#4c2544]" />}{task.error && <p role="alert" className={styles.error}>{task.error}</p>}</div></div><div className="mt-3 flex gap-2">{task.status === "failed" && <Button type="button" variant="outline" size="sm" disabled={disabled || processing} onClick={() => { void run([task]); }}>Retry image</Button>}<Button type="button" variant="ghost" size="sm" disabled={disabled || processing} onClick={() => { setTasks((current) => current.filter((item) => item.id !== task.id)); release(task.previewUrl); }}>Remove selected file</Button></div></div>)}
    {tasks.length > 0 && <p className={styles.hint}>Finish uploading, or retry/remove failed files, before saving the product.</p>}
    {!images.length && !tasks.length && <p className={styles.hint}>No images added yet. You can add them later.</p>}
    <p className={styles.hint}>Removing images changes this draft only. Cloudinary asset deletion requires the authorized backend media lifecycle.</p>
  </div>;
}
