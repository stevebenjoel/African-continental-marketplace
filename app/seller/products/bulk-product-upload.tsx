"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadError = { row: number; field: string; message: string };
export function BulkProductUpload({ categories }: { categories: { id: string; name: string }[] }) {
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<UploadError[]>([]), [imported, setImported] = useState(0), input = useRef<HTMLInputElement>(null), router = useRouter();
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setErrors([]); setImported(0);
    const file = input.current?.files?.[0];
    if (!file) { setErrors([{ row: 0, field: "file", message: "Choose a CSV file first" }]); setBusy(false); return; }
    const form = new FormData(); form.set("catalogue", file);
    try {
      const response = await fetch("/api/seller/products/bulk", { method: "POST", body: form }), result = await response.json() as { ok: boolean; imported?: number; errors?: UploadError[] };
      if (!response.ok || !result.ok) setErrors(result.errors ?? [{ row: 0, field: "file", message: "The CSV could not be processed" }]);
      else { setImported(result.imported ?? 0); if (input.current) input.current.value = ""; router.refresh(); }
    } catch { setErrors([{ row: 0, field: "network", message: "The upload was interrupted. No products were imported; please retry." }]); }
    finally { setBusy(false); }
  }
  return <section className="bulk-product-panel" aria-labelledby="bulk-product-title"><div className="bulk-product-intro"><span>BULK CATALOGUE</span><h2 id="bulk-product-title">Publish products from CSV</h2><p>Download the PAC-SM template, replace the demo rows with your products and upload the completed file. The entire file is validated before anything is published.</p><a href="/api/seller/products/bulk/template" download>Download demo CSV template</a></div><div className="bulk-product-workflow"><ol><li>Keep every column heading unchanged.</li><li>Use one product and one initial variant per row.</li><li>Upload no more than 50 products or 1 MB per file.</li><li>Add product images after the products are published.</li></ol><details><summary>Active category IDs for the category_id column</summary><div>{categories.map(category => <code key={category.id}>{category.id} — {category.name}</code>)}</div></details><form onSubmit={upload}><label>Completed PAC-SM CSV<input ref={input} name="catalogue" type="file" accept=".csv,text/csv" required /></label><button disabled={busy}>{busy ? "Validating and publishing…" : "Validate and publish CSV"}</button></form>{imported > 0 && <p className="bulk-success">{imported} product{imported === 1 ? "" : "s"} published successfully. You can now add images below.</p>}{errors.length > 0 && <div className="bulk-errors" role="alert"><strong>Nothing was imported. Correct the following:</strong><ul>{errors.slice(0, 100).map((error, index) => <li key={`${error.row}-${error.field}-${index}`}>{error.row > 0 ? `Row ${error.row}, ` : ""}{error.field}: {error.message}</li>)}</ul></div>}</div></section>;
}
