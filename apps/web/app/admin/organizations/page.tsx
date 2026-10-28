"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";

const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);
type Company={id:string;name:string;ownerUserId:string;status:string;createdAt:string};
type Group={id:string;name:string;companyId:string};
type Staff={id:string;displayName:string;isActive:boolean;designation:string|null;groupId:string|null};
type Membership={id:string;providerId:string;groupId:string|null;status:string};
type CompanyDetail=Company&{groups:Group[];staff:Staff[];memberships:Membership[]};

export default function Organizations(){
 const[companies,setCompanies]=useState<Company[]>([]),[selected,setSelected]=useState<CompanyDetail|null>(null),
 [companyName,setCompanyName]=useState(""),[groupName,setGroupName]=useState(""),[staffName,setStaffName]=useState(""),[staffGroup,setStaffGroup]=useState(""),[providerId,setProviderId]=useState(""),[memberGroup,setMemberGroup]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{try{
  const rows=await api.get<Company[]>("/provider-organizations/companies");setCompanies(rows);
  setMsg("");}catch(e){setMsg(e instanceof Error?e.message:"Cannot load companies. Admin permission required.");}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function open(id:string){try{setSelected(await api.get<CompanyDetail>(`/provider-organizations/companies/${id}`));setMsg("")}catch(e){setMsg(e instanceof Error?e.message:"Cannot load company")}}
 async function perform(fn:()=>Promise<unknown>,success:string,refreshId?:string){
  setBusy(true);setMsg("");
  try{await fn();await refresh();if(refreshId)await open(refreshId);setMsg(success)}
  catch(e){setMsg(e instanceof Error?e.message:"Request failed")}finally{setBusy(false)}
 }
 return <main><header className="nav"><Link href="/admin" className="brand">← SevaMitra Admin</Link><Link href="/workspaces">Workspaces</Link></header>
 <section className="workspace"><h1>Provider organizations</h1><p>Manage verified company structures, provider groups and staff. This section requires <code>provider.organization.manage</code>.</p>
 {!!msg&&<p role="status">{msg}</p>}
 <article style={{padding:18,border:"1px solid #ddd",borderRadius:12}}><h2>Create company (pending verification)</h2><input maxLength={150} value={companyName} placeholder="Company name" onChange={e=>setCompanyName(e.target.value)}/>
 <button disabled={busy||companyName.trim().length<2} onClick={()=>void perform(()=>api.post("/provider-organizations/companies",{name:companyName.trim()}),"Company submitted for approval")}>Create company</button></article>
 <h2>Companies</h2><div className="adminModules">{companies.map(c=><article key={c.id}><h3>{c.name}</h3><p>Status: {c.status}</p><small>{c.id}</small><p><button onClick={()=>void open(c.id)}>Manage →</button></p></article>)}</div>
 {selected&&<section style={{marginTop:24}}><h2>{selected.name}</h2><p>Status: {selected.status} · Owner {selected.ownerUserId}</p>
 {selected.status==="PENDING"&&<button disabled={busy} onClick={()=>{if(confirm("Approve this provider company?"))void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/approve`,{}),"Company approved",selected.id)}}>Approve company</button>}
 <div className="adminModules"><article><h3>Groups ({selected.groups.length})</h3>{selected.groups.map(g=><p key={g.id}>{g.name} — {g.id}</p>)}<input placeholder="New group name" value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={150}/><button disabled={busy||groupName.trim().length<2} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/groups`,{name:groupName.trim()}),"Group created",selected.id)}>Create group</button></article>
 <article><h3>Staff ({selected.staff.length})</h3>{selected.staff.map(st=><p key={st.id}>{st.displayName} — {st.isActive?"Active":"Pending"}</p>)}<input value={staffName} maxLength={150} placeholder="Staff member name" onChange={e=>setStaffName(e.target.value)}/><label>Group (optional)<select value={staffGroup} onChange={e=>setStaffGroup(e.target.value)}><option value="">Unassigned</option>{selected.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><button disabled={busy||staffName.trim().length<2} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/staff`,{displayName:staffName.trim(),...(staffGroup?{groupId:staffGroup}:{})}),"Staff record added pending approval",selected.id)}>Add staff</button></article>
 <article><h3>Provider members ({selected.memberships.length})</h3>{selected.memberships.map(m=><p key={m.id}>{m.providerId} · {m.status}</p>)}<input value={providerId} placeholder="Verified provider UUID" onChange={e=>setProviderId(e.target.value)} maxLength={36}/><label>Group (optional)<select value={memberGroup} onChange={e=>setMemberGroup(e.target.value)}><option value="">Unassigned</option>{selected.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><button disabled={busy||!providerId} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/memberships`,{providerId,...(memberGroup?{groupId:memberGroup}:{})}),"Verified provider linked",selected.id)}>Link verified provider</button></article>
 </div></section>}
 </section></main>;
}
