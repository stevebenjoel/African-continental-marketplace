type Row = Record<string, unknown> & { $id: string };
const money = (minor: number, currency: string) => new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100);
const errorMessages: Record<string, string> = {
  expired: "This negotiation has expired. Start a new request from the wholesale product page.",
  not_your_turn: "No response is needed from you now. The other party must respond to the latest offer.",
  counter_disabled: "Counteroffers are disabled for this product. Accept or reject the current offer.",
  invalid_price: "Enter a valid unit price greater than zero.",
  invalid_quantity: "The quantity is below the product's minimum wholesale quantity.",
  seller_limit: "That counteroffer is outside the seller's permitted pricing limits.",
  unavailable: "The response could not be saved. Refresh the negotiation and try again."
};
export function NegotiationErrorNotice({ code }: { code?: string }) { return code ? <p className="form-error">{errorMessages[code] ?? errorMessages.unavailable}</p> : null; }
export function NegotiationSummary({ negotiation }: { negotiation: Row }) { return <section className="cart-vendor"><p className="kicker">{String(negotiation.negotiationNumber)}</p><h1>{String(negotiation.productName)}</h1><div className="review-table"><div className="review-row"><span>Status</span><strong>{String(negotiation.status).replaceAll("_", " ")}</strong></div><div className="review-row"><span>Quantity</span><strong>{String(negotiation.quantity)}</strong></div><div className="review-row"><span>Regular unit price</span><span>{money(Number(negotiation.regularUnitPriceMinor), String(negotiation.currency))}</span></div><div className="review-row"><span>Current negotiated price</span><strong>{money(Number(negotiation.currentUnitPriceMinor), String(negotiation.currency))}</strong></div><div className="review-row"><span>Negotiated total</span><strong>{money(Number(negotiation.currentUnitPriceMinor) * Number(negotiation.quantity), String(negotiation.currency))}</strong></div><div className="review-row"><span>Offer expires</span><span>{new Date(String(negotiation.expiresAt)).toLocaleString("en-GB")}</span></div></div></section>; }
export function NegotiationTimeline({ offers }: { offers: Row[] }) { return <section className="cart-vendor"><h2>Offer timeline</h2>{offers.map(offer => <article key={offer.$id}><strong>#{String(offer.sequence)} · {String(offer.proposedBy)}</strong><p>{money(Number(offer.unitPriceMinor), String(offer.currency))} × {String(offer.quantity)} units</p><p>{String(offer.message || "No additional message")}</p><small>{new Date(String(offer.createdAt)).toLocaleString("en-GB")}</small></article>)}</section>; }
