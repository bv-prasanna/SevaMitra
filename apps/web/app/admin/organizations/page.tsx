"use client";
import {useCallback,useEffect,useState} from "react";
import Feedback from "../../components/Feedback";
import {ApiClient} from "@sevamitra/api-client";

const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);
type Company={id:string;name:string;ownerUserId:string;status:string;createdAt:string};
type Group={id:string;name:string;companyId:string};
type Staff={id:string;displayName:string;isActive:boolean;designation:string|null;groupId:string|null};
type Membership={id:string;providerId:string;groupId:string|null;status:string};
type CompanyDetail=Company&{groups:Group[];staff:Staff[];memberships:Membership[]};

export default function Organizations(){
 const[companies,setCompanies]=useState<Company[]>([]),[selected,setSelected]=useState<CompanyDetail|null>(null),
 [companyName,setCompanyName]=useState(""),[groupName,setGroupName]=useState(""),[staffName,setStaffName]=useState(""),[staffGroup,setStaffGroup]=useState(""),[providerId,setProviderId]=useState(""),[memberGroup,setMemberGroup]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const refresh=useCallback(async():Promise<boolean>=>{
  setLoading(true);setError("");
  try{const rows=await api.get<Company[]>("/provider-organizations/companies");setCompanies(Array.isArray(rows)?rows:[]);return true}
  catch(e){setCompanies([]);setSelected(null);setError(e instanceof Error?e.message:"Unable to load organizations. Check admin permissions and try again.");return false}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function open(id:string):Promise<boolean>{
  setError("");
  try{setSelected(await api.get<CompanyDetail>(`/provider-organizations/companies/${id}`));return true}
  catch(e){setSelected(null);setError(e instanceof Error?e.message:"Unable to load the selected organization.");return false}
 }
 async function perform(fn:()=>Promise<unknown>,success:string,refreshId?:string){
  setBusy(true);setError("");setNotice("");
  try{
   await fn();const listOk=await refresh();const detailOk=refreshId&&listOk?await open(refreshId):true;
   if(listOk&&detailOk)setNotice(success);
   else setError("Update was submitted, but the latest records could not be confirmed. Refresh before repeating the action.");
  }catch(e){setError(e instanceof Error?e.message:"Operation failed. Verify the current state before retrying.")}
  finally{setBusy(false)}
 }
 return <main>
 <section className="workspace"><div className="workspaceTop"><div><div className="pill">Company & team management</div><h1>Provider organizations</h1><p>Manage verified company structures, provider groups and staff. Requires <code>provider.organization.manage</code>.</p></div><button disabled={busy||loading} onClick={()=>void refresh()}>{loading?"Loading…":"Refresh organizations"}</button></div>
 {error&&<Feedback kind="error">{error}</Feedback>}{notice&&<Feedback kind="success">{notice}</Feedback>}
 <article><h2>Create company (pending verification)</h2><label htmlFor="new-company-name">Company name</label><input id="new-company-name" minLength={2} maxLength={150} value={companyName} placeholder="Company name" onChange={e=>setCompanyName(e.target.value)}/>
 <button disabled={busy||companyName.trim().length<2} onClick={()=>void perform(()=>api.post("/provider-organizations/companies",{name:companyName.trim()}),"Company submitted for approval")}>Create company</button></article>
 <h2>Companies ({companies.length})</h2>{!loading&&!error&&companies.length===0&&<div className="uatEmptyState"><h3>No companies yet</h3><p>Create a company to start its approval process.</p></div>}<div className="adminModules">{companies.map(c=><article key={c.id}><h3>{c.name}</h3><p><span className="uatBadge" data-state={c.status.toLowerCase()}>{c.status}</span></p><p><button onClick={()=>void open(c.id)}>Manage →</button></p></article>)}</div>
 {selected&&<section style={{marginTop:24}}><h2>{selected.name}</h2><p><span className="uatBadge" data-state={selected.status.toLowerCase()}>{selected.status}</span></p>
 {selected.status==="PENDING"&&<button disabled={busy} onClick={()=>{if(confirm("Approve this provider company?"))void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/approve`,{}),"Company approved",selected.id)}}>Approve company</button>}
 <div className="adminModules"><article><h3>Groups ({selected.groups.length})</h3>{selected.groups.map(g=><p key={g.id}>{g.name} — {g.id}</p>)}<label htmlFor="new-provider-group">New group name</label><input id="new-provider-group" value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={150}/><button disabled={busy||groupName.trim().length<2} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/groups`,{name:groupName.trim()}),"Group created",selected.id)}>Create group</button></article>
 <article><h3>Staff ({selected.staff.length})</h3>{selected.staff.map(st=><p key={st.id}>{st.displayName} — {st.isActive?"Active":"Pending"}</p>)}<label htmlFor="new-provider-staff">Staff name</label><input id="new-provider-staff" maxLength={150} placeholder="Staff member name" onChange={e=>setStaffName(e.target.value)}/><label>Group (optional)<select value={staffGroup} onChange={e=>setStaffGroup(e.target.value)}><option value="">Unassigned</option>{selected.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><button disabled={busy||staffName.trim().length<2} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/staff`,{displayName:staffName.trim(),...(staffGroup?{groupId:staffGroup}:{})}),"Staff record added pending approval",selected.id)}>Add staff</button></article>
 <article><h3>Provider members ({selected.memberships.length})</h3>{selected.memberships.map(m=><p key={m.id}>{m.providerId} · {m.status}</p>)}<label htmlFor="member-provider">Verified provider ID</label><input id="member-provider" placeholder="Verified provider UUID" onChange={e=>setProviderId(e.target.value)} maxLength={36}/><label>Group (optional)<select value={memberGroup} onChange={e=>setMemberGroup(e.target.value)}><option value="">Unassigned</option>{selected.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><button disabled={busy||!/^[0-9a-f-]{36}$/i.test(providerId)} onClick={()=>void perform(()=>api.post(`/provider-organizations/companies/${selected.id}/memberships`,{providerId,...(memberGroup?{groupId:memberGroup}:{})}),"Verified provider linked",selected.id)}>Link verified provider</button></article>
 </div></section>}
 </section></main>;
}
