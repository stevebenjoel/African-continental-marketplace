import{z}from"zod";
export const hsSuggestionSchema=z.object({hs6:z.string().regex(/^\d{6}$/),chapter:z.string().regex(/^\d{2}$/),heading:z.string().regex(/^\d{4}$/),confidencePercent:z.number().int().min(0).max(100),reasoning:z.string().min(40).max(3000),alternatives:z.array(z.object({hs6:z.string().regex(/^\d{6}$/),reason:z.string().min(5).max(300)})).max(3),questions:z.array(z.string().min(5).max(300)).max(8),attributesUsed:z.array(z.string().min(2).max(120)).max(20)});
export type HsSuggestion=z.infer<typeof hsSuggestionSchema>;
export function confidenceBand(value:number){return value>=90?"HIGH":value>=75?"MEDIUM":"LOW"}
export function requiresHumanReview(category:string,confidence:number){return confidence<75||/(pharma|chemical|medical|dual.use|machinery|animal|plant)/i.test(category)}
