"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@base-ui/react/input";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductService } from "./provider";
import { productCategories } from "./schema";
import { ProductServiceError, formatINR, productStockStatus, type BoutiqueProduct } from "./service";
import { ProductPreview } from "./product-preview";
import styles from "../dashboard/dashboard.module.css";
import formStyles from "./inventory.module.css";

export function ProductListing() {
  const service = useProductService();
  const [products, setProducts] = useState<BoutiqueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<BoutiqueProduct | null>(null);
  const [confirm, setConfirm] = useState<BoutiqueProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { let active = true; service.listProducts().then((items) => { if (active) { setProducts(items.filter((item) => item.boutiqueId === service.boutique.id)); setLoading(false); } }).catch((cause: unknown) => { if (active) { setError(cause instanceof ProductServiceError ? cause.message : "Products couldn't be loaded. Please try again."); setLoading(false); } }); return () => { active = false; }; }, [service, request]);
  function reload() { setLoading(true); setProducts([]); setError(""); setFeedback(""); setRequest((value) => value + 1); }
  async function archive() {
    if (!confirm) return;
    setSaving(true); setError("");
    try { const result = await service.setArchived(confirm.id, !confirm.archived, confirm.version); setProducts((items) => items.map((item) => item.id === result.id ? result : item)); setFeedback(`${result.name} ${result.archived ? "archived" : "unarchived"}${service.mode === "demo" ? " in this demo session" : ""}.`); setConfirm(null); }
    catch (cause) { setError(cause instanceof ProductServiceError ? cause.message : "The product couldn't be updated. Please try again."); setConfirm(null); }
    finally { setSaving(false); }
  }
  const filtered = products.filter((product) => (!category || product.category === category) && (status === "all" || (status === "archived" ? product.archived : status === "active" ? !product.archived : status === "out" ? !product.archived && product.quantity === 0 : !product.archived && product.quantity > 0)) && `${product.name} ${product.id} ${product.colours.join(" ")} ${product.occasionTags.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className={styles.pageHeading}><div><h1 className={styles.heading}>Your products</h1><p className={styles.muted}>Manage collection details, stock and archived listings.</p></div><div className={formStyles.actions}><Button variant="outline" disabled={loading || saving} onClick={reload}>Refresh products</Button><Link href="/boutique/products/new" className={styles.action}><Plus size={16} />Add product</Link></div></div>
    <p role="status" className="mb-4 text-sm text-[#4c2544]">{feedback}</p>
    {error && <div className="mb-5" role="alert"><p className={formStyles.error}>{error}</p><Button variant="outline" className="mt-3" onClick={reload} disabled={loading || saving}>Reload products</Button></div>}
    <div className={styles.filters}><label className={styles.field}>Search products<Input type="search" className={styles.input} value={search} onValueChange={setSearch} placeholder="Name, reference, colour or tag" /></label><label className={styles.field}>Category<select className={styles.input} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{productCategories.map((value) => <option key={value}>{value}</option>)}</select></label><label className={styles.field}>Stock & status<select className={styles.input} value={status} onChange={(event) => setStatus(event.target.value)}>{[["all", "All products"], ["active", "Unarchived"], ["in", "In stock"], ["out", "Out of stock"], ["archived", "Archived"]].map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label><Button variant="ghost" onClick={() => { setSearch(""); setCategory(""); setStatus("all"); }}>Clear filters</Button></div>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Boutique inventory</h2><span className={styles.muted}>{filtered.length} of {products.length} products</span></div>
      {loading ? <p role="status" className="flex items-center gap-3 p-8"><LoaderCircle className="animate-spin" size={18} />Loading products…</p> : error && !products.length ? <div className={styles.empty}><h3>Inventory unavailable</h3><p>Reload the inventory to try again. No demo fallback is used for service failures.</p></div> : !filtered.length ? <div className={styles.empty}><h3>{products.length ? "No products match your filters" : "Your collection starts here"}</h3><p>{products.length ? "Clear the filters or search for another product." : "Add your first product with its details, pricing and stock."}</p>{!products.length && <Link href="/boutique/products/new" className={`${styles.link} mt-5 inline-block`}>Add your first product</Link>}</div> : <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Boutique products"><table className={styles.table}><caption className="sr-only">Products belonging to the current boutique</caption><thead><tr>{["Product", "Category", "Rental / deposit", "Stock", "Status", "Actions"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td>{product.name}<p className={styles.muted}>{product.size} · {product.id}</p></td><td>{product.category}</td><td>{formatINR(product.rentalPriceMinor)}<p className={styles.muted}>Deposit {formatINR(product.depositMinor)}</p></td><td>{product.quantity}</td><td><span className={styles.pill}>{productStockStatus(product)}</span></td><td><div className="flex gap-3"><Button variant="ghost" size="sm" onClick={() => setPreview(product)} disabled={saving} aria-label={`Preview ${product.name}`}>Preview</Button><Link className={styles.link} href={`/boutique/products/${encodeURIComponent(product.id)}/edit`} aria-label={`Edit ${product.name}`}>Edit</Link><Button variant="outline" size="sm" onClick={() => setConfirm(product)} disabled={saving} aria-label={`${product.archived ? "Unarchive" : "Archive"} ${product.name}`}>{product.archived ? "Unarchive" : "Archive"}</Button></div></td></tr>)}</tbody></table></div>}
    </section><p className={styles.muted}>Stock quantity describes owned units, not availability for specific rental dates. Archiving does not cancel existing bookings.</p>
    {preview && <ProductPreview product={preview} archived={preview.archived} open onOpenChange={(open) => { if (!open) setPreview(null); }} />}
    <Dialog.Root open={Boolean(confirm)} onOpenChange={(open) => { if (!open && !saving) setConfirm(null); }}><Dialog.Portal><Dialog.Backdrop className={formStyles.backdrop} /><Dialog.Popup className={formStyles.dialog}><Dialog.Title className="text-xl text-[#4c2544]">{confirm?.archived ? "Unarchive" : "Archive"} product?</Dialog.Title><Dialog.Description className="my-5 text-sm leading-7">{confirm?.name}. {confirm?.archived ? "This restores the product to the unarchived inventory." : "This keeps its record and stock but marks it archived. Existing bookings are unchanged."}</Dialog.Description><div className={formStyles.actions}><Button onClick={archive} disabled={saving}>{saving ? "Updating…" : confirm?.archived ? "Unarchive product" : "Archive product"}</Button><Button variant="outline" onClick={() => setConfirm(null)} disabled={saving}>Cancel</Button></div></Dialog.Popup></Dialog.Portal></Dialog.Root>
  </>;
}
