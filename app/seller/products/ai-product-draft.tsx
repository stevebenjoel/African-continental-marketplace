"use client";
import { useState } from "react";
import type { ProductDraft } from "@/src/modules/catalogue/domain/product-ai-draft";
const form = () => document.querySelector<HTMLFormElement>("form.product-form");
const field = (target: HTMLFormElement, name: string) => target.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
export function AiProductDraft() {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [knownFacts, setKnownFacts] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function generate() {
    const target = form(); if (!target) return;
    const name = field(target, "name")?.value.trim() ?? "";
    if (name.length < 3) { setError("Enter the product name first (at least three characters)."); return; }
    const category = (target.elements.namedItem("categoryId") as HTMLSelectElement | null)?.selectedOptions[0]?.text ?? "";
    setLoading(true); setError(""); setDraft(null);
    try { const response = await fetch("/api/seller/products/ai-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, category, knownFacts }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setDraft(body.draft); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The draft could not be generated."); }
    finally { setLoading(false); }
  }
  function apply(replace: boolean) {
    const target = form(); if (!target || !draft) return;
    const values = { slug: draft.suggestedSlug, description: draft.description, specifications: draft.specifications.join("\n"), variantName: draft.variantName, variantAttributes: draft.variantAttributes };
    for (const [name, value] of Object.entries(values)) { const input = field(target, name); if (input && (replace || !input.value.trim())) { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); } }
  }
  return <section className="ai-product-assist"><div><span className="ai-badge">AI catalogue assistant</span><h2>Turn a product name into an editable draft</h2><p>Add facts you know, then generate safe suggestions. AI cannot publish the product and must not be trusted for certifications, origin, ingredients, price or regulatory claims.</p></div><label>Optional known facts<textarea value={knownFacts} onChange={event => setKnownFacts(event.target.value)} maxLength={1500} placeholder="Example: 500 g roasted cashews, unsalted, packed in a resealable pouch. Do not include personal or confidential information." /></label><button type="button" onClick={generate} disabled={loading}>{loading ? "Drafting…" : "Generate with AI"}</button>{error && <p className="form-error" role="alert">{error}</p>}{draft && <div className="ai-draft-preview"><h3>Review before applying</h3><p>{draft.description}</p><strong>Suggested specifications</strong><ul>{draft.specifications.map(item => <li key={item}>{item}</li>)}</ul>{draft.questionsForSeller.length > 0 && <><strong>Facts still needed</strong><ul>{draft.questionsForSeller.map(item => <li key={item}>{item}</li>)}</ul></>}<small>Keywords: {draft.searchKeywords.join(", ")}</small><div className="ai-draft-actions"><button type="button" onClick={() => apply(false)}>Fill empty fields</button><button type="button" className="secondary" onClick={() => apply(true)}>Replace draft fields</button></div></div>}</section>;
}
