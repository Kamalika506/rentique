"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@base-ui/react/input";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";
import { useProductService } from "./provider";
import { productCategories, productFormSchema, type ProductFormValues, type ProductInput } from "./schema";
import { ProductImageManager } from "./product-image-manager";
import { ProductServiceError, toFormValues, type BoutiqueProduct } from "./service";
import styles from "./inventory.module.css";
import workspace from "../dashboard/dashboard.module.css";
import { api } from "@/lib/api-client";

export function EditProductRoute() { const { id } = useParams<{ id: string }>(); return <ProductEditor key={id} id={id} />; }
export function ProductEditor({ id }: { id?: string }) {
  const service = useProductService();
  const [product, setProduct] = useState<BoutiqueProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  useEffect(() => { if (!id) return; let active = true; service.getProduct(id).then((result) => { if (result.boutiqueId !== service.boutique.id) throw new ProductServiceError("NOT_FOUND", "This product is unavailable for this boutique."); if (active) { setProduct(result); setLoading(false); } }).catch((cause: unknown) => { if (active) { setError(cause instanceof ProductServiceError ? cause.message : "This product couldn't be loaded."); setLoading(false); } }); return () => { active = false; }; }, [id, service, request]);
  if (loading) return <p role="status">Loading product details…</p>;
  if (error) return <div className={workspace.panel}><div className={workspace.empty}><h1 className={workspace.heading}>Product unavailable</h1><p role="alert">{error}</p><div className={`${styles.actions} mt-5 justify-center`}><Button onClick={() => { setError(""); setLoading(true); setRequest((value) => value + 1); }}>Try again</Button><Link href="/boutique/products" className={workspace.link}>Back to products</Link></div></div></div>;
  return <ProductForm key={product?.version ?? "new"} product={product ?? undefined} onReload={() => { setProduct(null); setLoading(true); setError(""); setRequest((value) => value + 1); }} />;
}

const emptyValues: ProductFormValues = { name: "", description: "", category: "", rentalPriceUnit: "PER_DAY", occasionTags: "", colours: "", size: "", fabricStyle: "", rentalPriceMinor: "", depositMinor: "0", quantity: "1", images: [] };
function ProductForm({ product, onReload }: { product?: BoutiqueProduct; onReload: () => void }) {
  const service = useProductService();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<ProductInput | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { let active = true; if (service.mode === "live") api<{ id: string; name: string }[]>("/api/categories").then(items => { if (active) setCategories(items); }).catch(() => { if (active) setFeedback("Categories could not be loaded. Please refresh before saving."); }); return () => { active = false; }; }, [service]);
  const { register, handleSubmit, control, getValues, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<ProductFormValues, unknown, ProductInput>({ resolver: zodResolver(productFormSchema), mode: "onTouched", defaultValues: product ? toFormValues(product) : emptyValues });
  const images = useWatch({ control, name: "images" });
  const busy = uploading || isSubmitting || saved;
  async function save(input: ProductInput) {
    if (uploading || saved) return;
    clearErrors("root"); setFeedback("");
    try { if (product) await service.updateProduct(product.id, input, product.version); else await service.createProduct(input); setSaved(true); setFeedback(`Product ${product ? "updated" : "added"}${service.mode === "demo" ? " in this demo session" : ""}. Returning to inventory…`); router.push("/boutique/products"); }
    catch (cause) { setError("root", { message: cause instanceof ProductServiceError ? cause.message : "The product couldn't be saved. Please try again." }); }
  }
  function field(name: Exclude<keyof ProductFormValues, "images" | "description" | "category" | "rentalPriceUnit">, label: string, hint?: string, numeric = false) {
    return <div><label className={styles.label} htmlFor={name}>{label}<Input id={name} {...register(name)} className={styles.input} inputMode={numeric ? name === "quantity" ? "numeric" : "decimal" : "text"} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${name}-error`} /></label><p id={`${name}-hint`} className={styles.hint}>{hint}</p><p id={`${name}-error`} className={styles.error}>{errors[name]?.message}</p></div>;
  }
  return <>
    <Link href="/boutique/products" className={workspace.link}>← Back to products</Link><div className={`${workspace.pageHeading} mt-5`}><div><h1 className={workspace.heading}>{product ? "Edit product" : "Add a product"}</h1><p className={workspace.muted}>Collection details, rental pricing and stock. Images and occasion tags are optional.</p></div>{product?.archived && <span className={workspace.pill}>Archived product</span>}</div>
    <form noValidate onSubmit={handleSubmit(save)} aria-busy={busy}>
      <fieldset disabled={isSubmitting || saved} className={styles.formGrid}><legend className="sr-only">Product details</legend>
        <section className={workspace.panel}><div className={workspace.panelHead}><h2 className={workspace.panelTitle}>Product details</h2></div><div className={styles.fields}>
          <div className={styles.wide}>{field("name", "Product name *")}</div>
          <div className={styles.wide}><label className={styles.label} htmlFor="description">Description *<textarea {...register("description")} id="description" rows={5} className={styles.input} maxLength={2000} aria-invalid={Boolean(errors.description)} aria-describedby="description-error" /></label><p className={styles.hint}>20–2,000 characters.</p><p className={styles.error} id="description-error">{errors.description?.message}</p></div>
          <div><label className={styles.label} htmlFor="category">Category *<select {...register("category")} id="category" className={styles.input} aria-invalid={Boolean(errors.category)} aria-describedby="category-error">{categories.length ? <><option value="">Choose a category</option>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</> : productCategories.map(category => <option key={category}>{category}</option>)}</select></label><p className={styles.error} id="category-error">{errors.category?.message}</p></div>
          {field("size", "Size *", "e.g. M, XL or Free size")}{field("occasionTags", "Occasion tags", "Comma-separated, up to 10 tags")}{field("colours", "Colours *", "Comma-separated, e.g. Ivory, Gold")}
          <div className={styles.wide}>{field("fabricStyle", "Fabric / style *", "e.g. Silk / embroidered")}</div>
        </div></section>
        <div><section className={workspace.panel}><div className={workspace.panelHead}><h2 className={workspace.panelTitle}>Pricing & stock</h2></div><div className={styles.fields}>{field("rentalPriceMinor", "Rental price (INR) *", "Amount in rupees, up to 2 decimal places", true)}{field("depositMinor", "Deposit (INR) *", "Zero is allowed", true)}<label className={styles.label}>Pricing unit<select {...register("rentalPriceUnit")} defaultValue={product?.rentalPriceUnit ?? "PER_DAY"} className={styles.input}><option value="PER_DAY">Per day</option><option value="PER_RENTAL">Per rental</option></select></label><div className={styles.wide}>{field("quantity", "Stock quantity *", "Whole units, 0–10,000. Zero means out of stock.", true)}</div></div></section>
          <section className={workspace.panel}><div className={workspace.panelHead}><h2 className={workspace.panelTitle}>Product images</h2></div><ProductImageManager images={images} productId={product?.id} disabled={isSubmitting || saved} error={errors.images?.message} onPendingChange={setUploading} onChange={(update) => { setValue("images", update(getValues("images")), { shouldValidate: true, shouldDirty: true }); }} /></section>
        </div>
      </fieldset>
      {errors.root && <div role="alert" className={styles.error}>{errors.root.message}{product && <div className="mt-3">Your edits are retained. Reloading replaces them with the latest saved product. <Button type="button" variant="outline" onClick={onReload} disabled={busy}>Reload latest product</Button></div>}</div>}
      <p role="status" className="my-4 text-sm text-[#4c2544]">{feedback}</p><div className={styles.actions}><Button type="submit" disabled={busy} className="h-11">{isSubmitting ? "Saving…" : saved ? "Saved" : product ? "Save changes" : "Create product"}</Button><Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => { void handleSubmit((input) => setPreview(input))(); }}>Preview product</Button><Link href="/boutique/products" className={workspace.link}>Cancel</Link></div>
    </form>{preview && <ProductPreview product={preview} archived={product?.archived} open onOpenChange={(open) => { if (!open) setPreview(null); }} />}
  </>;
}
