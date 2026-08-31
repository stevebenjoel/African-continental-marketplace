import type { Metadata } from "next";
import { getBrandCatalogue } from "@/src/modules/catalogue/domain/brand-catalogue";
import { BrandCataloguePage } from "@/src/modules/catalogue/ui/brand-catalogue-page";
const thermocool = getBrandCatalogue("thermocool")!;
export const metadata: Metadata = { title: "Thermocool Products", description: thermocool.description, alternates: { canonical: "/brands/thermocool" }, robots: { index: false, follow: true } };
export default function ThermocoolProductsPage() { return <BrandCataloguePage brand={thermocool}/>; }
