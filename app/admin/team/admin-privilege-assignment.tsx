"use client";
import { useMemo,useState } from "react";

type RegisteredUser={id:string;email:string;name:string;status:boolean;verified:boolean;protected:boolean};
type RoleOption={id:string;name:string;description:string};

export function AdminPrivilegeAssignment({users,roles}:{users:RegisteredUser[];roles:RoleOption[]}){
  const[search,setSearch]=useState(""),[selectedId,setSelectedId]=useState("");
  const matches=useMemo(()=>{const term=search.trim().toLowerCase(),filtered=term?users.filter(user=>`${user.name} ${user.email}`.toLowerCase().includes(term)):users;return filtered.slice(0,250)},[search,users]);
  const selected=users.find(user=>user.id===selectedId);
  return <form action="/api/admin/team" method="post"><section className="admin-user-picker"><label>Find a registered account<input value={search} onChange={event=>setSearch(event.target.value)} type="search" placeholder="Search by name or email" autoComplete="off"/></label><label>Select registered email<select required name="userId" size={Math.min(8,Math.max(3,matches.length))} value={selectedId} onChange={event=>setSelectedId(event.target.value)}><option value="">Choose an account</option>{matches.map(user=><option disabled={user.protected||!user.status} value={user.id} key={user.id}>{user.email}{user.name?` — ${user.name}`:""}{user.protected?" — Super Admin":!user.status?" — Disabled":user.verified?" — Verified":" — Unverified"}</option>)}</select></label><p>{matches.length} of {users.length} registered accounts shown{users.length>250&&!search?". Search to narrow the directory.":"."}</p>{selected&&<aside><strong>{selected.email}</strong><span>{selected.name||"No display name"} · {selected.verified?"Email verified":"Email unverified"}</span></aside>}</section><fieldset><legend>Administrative privileges</legend><div className="admin-role-options">{roles.map(role=><label key={role.id}><input type="checkbox" name="roles" value={role.id}/><span><strong>{role.name}</strong><small>{role.description}</small></span></label>)}</div></fieldset><button disabled={!selectedId}>Grant selected privileges</button></form>
}
