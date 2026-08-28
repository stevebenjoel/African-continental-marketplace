export const ACADEMY_PROJECT_SECTIONS=[
 {code:"opportunity",title:"Product and export opportunity",marks:10,prompt:"Describe the African product or service, customer problem, export rationale and evidence of opportunity."},
 {code:"market",title:"Market research and selection",marks:15,prompt:"Compare candidate markets, target segment, competition, demand evidence and justify the selected market."},
 {code:"readiness",title:"Product and packaging readiness",marks:10,prompt:"Assess specification, capacity, quality, packaging, labelling, shelf life and the improvement plan."},
 {code:"compliance",title:"Compliance and documentation",marks:15,prompt:"Identify product-and-destination requirements, authorities, evidence and the complete transaction document set."},
 {code:"pricing",title:"Costing, pricing and Incoterm",marks:15,prompt:"Present the cost build-up, currency, margin, sensitivity and justify the named Incoterm and place."},
 {code:"logistics",title:"Logistics and shipment plan",marks:10,prompt:"Map the route, mode, partners, milestones, cargo controls, delays and proof of delivery."},
 {code:"buyers",title:"Buyer acquisition strategy",marks:10,prompt:"Define lead sources, qualification, verification, pitch, negotiation and customer-retention approach."},
 {code:"finance",title:"Financing and working capital",marks:5,prompt:"Calculate the cash gap and propose a suitable, responsible payment and funding structure."},
 {code:"risk",title:"Risk management",marks:5,prompt:"Prioritise commercial, compliance, quality, logistics, payment and currency risks with controls."},
 {code:"defence",title:"Presentation and practical defence",marks:5,prompt:"Provide an executive summary and the evidence you will use in a 10–15 minute project defence."}
] as const;
export const academyProjectMarks=ACADEMY_PROJECT_SECTIONS.reduce((sum,item)=>sum+item.marks,0);
