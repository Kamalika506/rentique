"use client";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import type { ProductInput } from "./schema";
import { formatINR, productStockStatus } from "./service";
import styles from "./inventory.module.css";

export function ProductPreview({ product, archived = false, open, onOpenChange }: { product: ProductInput; archived?: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className={styles.backdrop} /><Dialog.Popup className={styles.dialog}>
    <Dialog.Title className="text-xl font-semibold text-[#4c2544]">{product.name}</Dialog.Title><Dialog.Description className="mt-2 text-xs text-[#746d73]">Product preview · {productStockStatus({ quantity: product.quantity, archived })}</Dialog.Description>
    <div className={styles.images}>{product.images.length ? product.images.map((image) => <Image key={image.id} src={image.url} alt={image.alt || product.name} width={90} height={100} className={styles.image} unoptimized />) : <p className={styles.hint}>No product images yet.</p>}</div>
    <p className="whitespace-pre-wrap text-sm leading-7">{product.description}</p>
    <dl className={styles.details}>{[["Category", product.category], ["Occasions", product.occasionTags.join(", ") || "Not specified"], ["Colours", product.colours.join(", ")], ["Size", product.size], ["Fabric / style", product.fabricStyle], ["Quantity", product.quantity], ["Rental price", formatINR(product.rentalPriceMinor)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <Dialog.Close className={`${styles.close} mt-6`}>Close preview</Dialog.Close>
  </Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
