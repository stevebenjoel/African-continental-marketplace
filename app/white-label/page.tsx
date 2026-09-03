import type { Metadata } from "next";
import { ProgramMarketplace } from "@/src/modules/catalogue/ui/program-marketplace";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "White-label Marketplace", description: "Source white-label products from verified PAC-SM manufacturers and submit your branding requirements.", alternates: { canonical: "/white-label" } };
export default function WhiteLabelPage() { return <ProgramMarketplace kind="white_label"/>; }
