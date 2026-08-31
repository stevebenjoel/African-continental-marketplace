import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBrandCatalogue } from "@/src/modules/catalogue/domain/brand-catalogue";
import { BrandCataloguePage } from "@/src/modules/catalogue/ui/brand-catalogue-page";

export async function generateMetadata({ params }: { params: Promise<{ brandSlug: string }> }): Promise<Metadata> { const { brandSlug } = await params, brand = getBrandCatalogue(brandSlug); if (!brand) return { title: "Brand not found", robots: { index: false, follow: false } }; return { title: `${brand.name} Products`, description: brand.description, alternates: { canonical: `/brands/${brand.slug}` }, openGraph: { title: `${brand.name} on PAC-SM`, description: brand.description, url: `/brands/${brand.slug}`, type: "website" } }; }
export default async function BrandPage({ params }: { params: Promise<{ brandSlug: string }> }) { const { brandSlug } = await params, brand = getBrandCatalogue(brandSlug); if (!brand) notFound(); return <BrandCataloguePage brand={brand}/>; }
