"use client";
import { useMemo, useState } from "react";

export function CommissionRuleForm({ defaultEffectiveFrom }: { defaultEffectiveFrom: string }) {
  const [percent,setPercent]=useState(10),[sample,setSample]=useState(100000);
  const preview=useMemo(()=>{const pacsm=Math.round(sample*percent)/100;return{pacsm,vendor:sample-pacsm}},[percent,sample]);
  return <form action="/api/admin/finance/commission-rules" method="post" className="stack-form">
    <label>Rule name<input name="name" required minLength={3} maxLength={120} placeholder="Retail agriculture commission"/></label>
    <div className="form-grid"><label>Scope<select name="scopeType" defaultValue="global"><option value="global">Marketplace default</option><option value="channel">Channel default</option><option value="category">Category</option><option value="vendor">Vendor</option><option value="product">Product</option></select></label><label>Scope identifier<input name="scopeId" maxLength={120} placeholder="Vendor, category or product ID"/><small>Leave blank for marketplace or channel defaults.</small></label></div>
    <div className="form-grid"><label>Transaction channel<select name="channel" defaultValue="all"><option value="all">All channels</option><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="negotiated_wholesale">Negotiated wholesale</option><option value="procurement">Procurement</option><option value="offtake">Off-take</option><option value="pacsm_products">PAC-SM Products</option></select></label><label>Priority<input name="priority" type="number" min="0" max="1000" defaultValue="0" required/></label></div>
    <div className="form-grid"><label>PAC-SM percentage<input name="pacsmPercent" type="number" min="0" max="100" step="0.01" value={percent} onChange={event=>setPercent(Number(event.target.value))} required/></label><label>Vendor percentage<input value={`${Math.max(0,100-percent).toFixed(2)}%`} readOnly aria-label="Calculated vendor percentage"/><small>Calculated automatically so the allocation always totals 100%.</small></label></div>
    <div className="form-grid"><label>Processing-fee bearer<select name="feeBearer" defaultValue="platform"><option value="platform">PAC-SM</option><option value="vendor">Vendor</option><option value="proportional">Shared proportionately</option></select></label><label>Effective from (server time)<input name="effectiveFrom" type="datetime-local" defaultValue={defaultEffectiveFrom} required/></label></div>
    <label>Administrative reason<textarea name="reason" required minLength={10} maxLength={1000} placeholder="Explain the commercial reason and approval basis."/></label>
    <section className="admin-notice"><strong>Impact preview</strong><label>Example merchandise amount<input type="number" min="0" step="0.01" value={sample/100} onChange={event=>setSample(Math.round(Number(event.target.value)*100))}/></label><p>PAC-SM accrues <b>{(preview.pacsm/100).toLocaleString(undefined,{minimumFractionDigits:2})}</b>; vendor accrues <b>{(preview.vendor/100).toLocaleString(undefined,{minimumFractionDigits:2})}</b>. Delivery, taxes and processor charges remain separate.</p></section>
    <div className="inline-actions"><button name="action" value="draft">Save draft</button><button name="action" value="activate">Activate or schedule</button></div>
  </form>;
}
