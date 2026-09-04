"use client";

import { useState } from "react";

export function PurchaseQuantityForm({ offerId, productSlug, minimum, maximum, compact = false }: {
  offerId: string;
  productSlug: string;
  minimum: number;
  maximum: number;
  compact?: boolean;
}) {
  const purchasable = maximum >= minimum;
  const [quantity, setQuantity] = useState(minimum);
  const update = (next: number) => setQuantity(Math.min(maximum, Math.max(minimum, Math.trunc(next || minimum))));

  return <form className={`purchase-quantity-form${compact ? " compact" : ""}`} method="post" action="/api/cart/items">
    <input type="hidden" name="offerId" value={offerId}/>
    <input type="hidden" name="productSlug" value={productSlug}/>
    <input type="hidden" name="purchaseType" value="standard"/>
    <label>
      <span>Quantity</span>
      <span className="purchase-stepper">
        <button type="button" aria-label="Decrease quantity" onClick={() => update(quantity - 1)} disabled={!purchasable || quantity <= minimum}>−</button>
        <input aria-label="Quantity" name="quantity" type="number" inputMode="numeric" min={minimum} max={maximum} step="1" required value={quantity} onChange={event => setQuantity(Number(event.target.value))} onBlur={() => update(quantity)}/>
        <button type="button" aria-label="Increase quantity" onClick={() => update(quantity + 1)} disabled={!purchasable || quantity >= maximum}>+</button>
      </span>
    </label>
    <button className="purchase-submit" type="submit" disabled={!purchasable}>{purchasable ? "Add to cart" : "Standard purchase unavailable"}</button>
  </form>;
}
