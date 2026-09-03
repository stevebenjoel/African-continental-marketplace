import type { Metadata } from "next";
import { ProgramMarketplace } from "@/src/modules/catalogue/ui/program-marketplace";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pre-order Marketplace", description: "Reserve upcoming products and production capacity from verified PAC-SM manufacturers.", alternates: { canonical: "/pre-orders" } };
export default function PreOrdersPage() { return <ProgramMarketplace kind="preorder"/>; }
