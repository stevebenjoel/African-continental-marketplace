"use client";
import Link from "next/link";
import { useCallback,useEffect,useRef,useState } from "react";

type Item={id:string;priority:string;title:string;body:string;href:string;status:string;createdAt:string};
type Feed={unread:number;soundEnabled:boolean;items:Item[]};

export default function AdminNotificationBell(){
  const [feed,setFeed]=useState<Feed>({unread:0,soundEnabled:true,items:[]}),[open,setOpen]=useState(false),previousUnread=useRef(0);
  const sound=useCallback(()=>{try{const AudioContextClass=window.AudioContext||(window as typeof window&{webkitAudioContext:typeof AudioContext}).webkitAudioContext,context=new AudioContextClass(),oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=880;gain.gain.value=.06;oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.16)}catch{/* Browser sound permission is optional. */}},[]);
  const refresh=useCallback(async()=>{const response=await fetch("/api/admin/notifications",{cache:"no-store"});if(!response.ok)return;const next=await response.json() as Feed;if(next.soundEnabled&&next.unread>previousUnread.current&&previousUnread.current>0)sound();previousUnread.current=next.unread;setFeed(next)},[sound]);
  useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(),15000);return()=>window.clearInterval(timer)},[refresh]);
  const read=async(item:Item)=>{if(item.status==="unread")await fetch(`/api/admin/notifications/${item.id}/read`,{method:"POST"});await refresh();setOpen(false)};
  const toggleSound=async()=>{const next=!feed.soundEnabled;await fetch("/api/admin/notifications/preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({soundEnabled:next})});setFeed(current=>({...current,soundEnabled:next}));if(next)sound()};
  const readAll=async()=>{await fetch("/api/admin/notifications/read-all",{method:"POST"});await refresh()};
  return <div className="admin-bell"><button type="button" aria-label={`Administrative notifications, ${feed.unread} unread`} onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">🔔</span>{feed.unread>0&&<b>{feed.unread>99?"99+":feed.unread}</b>}</button>{open&&<section className="admin-bell-panel"><header><div><strong>Operations alerts</strong><small>{feed.unread} unread</small></div><div className="admin-bell-actions"><button type="button" onClick={()=>void readAll()} disabled={!feed.unread}>Read all</button><button type="button" onClick={toggleSound}>{feed.soundEnabled?"Mute alarm":"Enable alarm"}</button></div></header><div>{feed.items.length?feed.items.map(item=><Link className={`admin-alert ${item.priority} ${item.status}`} href={item.href} key={item.id} onClick={()=>void read(item)}><span>{item.priority}</span><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></Link>):<p className="admin-alert-empty">No administrative alerts.</p>}</div><footer><Link href="/admin/reconciliation" onClick={()=>setOpen(false)}>Open daily reconciliation →</Link></footer></section>}</div>;
}
