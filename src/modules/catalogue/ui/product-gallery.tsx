"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type GalleryMedia = Readonly<{ id: string; altText: string }>;

export function ProductGallery({ media, productName, tone = "retail" }: { media: readonly GalleryMedia[]; productName: string; tone?: "retail" | "wholesale" }) {
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? ""), [expanded, setExpanded] = useState(false);
  const strip = useRef<HTMLDivElement>(null), selected = media.find(item => item.id === selectedId) ?? media[0];
  const select = (id: string) => { setSelectedId(id); setExpanded(false); };
  const scroll = (direction: -1 | 1) => strip.current?.scrollBy({ left: direction * Math.max(220, strip.current.clientWidth * .75), behavior: "smooth" });

  if (!selected) return <div className={`product-gallery product-gallery-${tone}`}><div className="product-gallery-main product-media-fallback"><span>{productName.slice(0,2).toUpperCase()}</span></div></div>;
  return <div className={`product-gallery product-gallery-${tone}`}>
    <button type="button" className="product-gallery-main" onClick={()=>setExpanded(true)} aria-label={`Enlarge ${selected.altText}`}>
      <Image src={`/api/catalogue/media/${selected.id}`} alt={selected.altText} fill sizes="(max-width: 760px) 100vw, 55vw" priority/>
      <span className="product-gallery-enlarge">⛶ Enlarge photo</span>
    </button>
    {media.length>1&&<div className="product-gallery-strip-shell"><button type="button" className="product-gallery-arrow previous" onClick={()=>scroll(-1)} aria-label="Scroll product photos left">‹</button><div className="product-gallery-strip" ref={strip} role="list" aria-label={`${productName} photos`}>{media.map((item,index)=><button type="button" role="listitem" className={item.id===selected.id?"selected":""} key={item.id} onClick={()=>select(item.id)} aria-label={`Show photo ${index+1}: ${item.altText}`} aria-current={item.id===selected.id?"true":undefined}><Image src={`/api/catalogue/media/${item.id}`} alt="" fill sizes="90px"/><span>{index+1}</span></button>)}</div><button type="button" className="product-gallery-arrow next" onClick={()=>scroll(1)} aria-label="Scroll product photos right">›</button></div>}
    {expanded&&<div className="product-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${productName} enlarged photo`} onClick={()=>setExpanded(false)}><button type="button" className="product-gallery-close" onClick={()=>setExpanded(false)} aria-label="Close enlarged photo">×</button><div onClick={event=>event.stopPropagation()}><Image src={`/api/catalogue/media/${selected.id}`} alt={selected.altText} fill sizes="95vw" priority/></div></div>}
  </div>;
}
