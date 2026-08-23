"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalHomeLink() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return <Link className="global-home-link" href="/" aria-label="Back to PAC-SM home"><span aria-hidden="true">⌂</span><strong>Back to home</strong></Link>;
}
