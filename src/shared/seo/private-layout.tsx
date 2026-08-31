import type { Metadata } from "next";
export const privatePageMetadata: Metadata = { robots: { index: false, follow: false, noarchive: true, nosnippet: true } };
export function PrivateLayout({ children }: { children: React.ReactNode }) { return children; }
