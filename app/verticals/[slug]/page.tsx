import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findPlatformVertical, PLATFORM_VERTICALS } from "@/src/content/platform-verticals";

export function generateStaticParams() {
  return PLATFORM_VERTICALS.filter(vertical => !vertical.available).map(vertical => ({ slug: vertical.slug }));
}

type VerticalPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: VerticalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const vertical = findPlatformVertical(slug);
  if (!vertical || vertical.available) return {};
  return { title: `${vertical.name} — Coming soon`, description: `${vertical.summary}. PAC-SM ${vertical.name} is being prepared as part of the continental marketplace expansion.`, robots: { index: false, follow: true } };
}

export default async function VerticalComingSoonPage({ params }: VerticalPageProps) {
  const { slug } = await params;
  const vertical = findPlatformVertical(slug);
  if (!vertical) notFound();
  if (vertical.available) redirect(vertical.href);
  return <main className="vertical-preview" style={{ "--vertical-accent": vertical.accent } as React.CSSProperties}>
    <nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/products">Shop the marketplace</Link></nav>
    <section><div className="vertical-preview-icon" aria-hidden="true">{vertical.icon}</div><p className="kicker">PAC-SM CONTINENTAL EXPANSION</p><h1>PAC-SM {vertical.name}</h1><strong>Coming soon</strong><p>{vertical.summary} will join PAC-SM through a carefully verified, transaction-ready experience. The existing marketplace remains open while this vertical is prepared.</p><div><Link className="vertical-primary" href="/products">Continue shopping →</Link><Link href="/">Return home</Link></div></section>
    <aside><span>One PAC-SM account</span><span>Evidence-backed verification</span><span>Protected transactions</span></aside>
  </main>;
}
