import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
export const dynamic = "force-dynamic";
export default async function ProductUploadEntryPage() { const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/sell/upload"); const vendor = await findVendorByOwner(user.$id); if (!vendor) redirect("/vendor/register"); if (["approved", "active"].includes(String(vendor.status))) redirect("/seller/products"); redirect("/vendor/register"); }
