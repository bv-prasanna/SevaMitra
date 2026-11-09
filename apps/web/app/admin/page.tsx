"use client";
import{useCallback,useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";import{BarChart3,Layers3,UsersRound,ShieldCheck,Building2,ToggleRight,FileCheck2,ArrowRight,RefreshCw}from"lucide-react";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";
type Application={id:string;providerId:string;status:string;channel:string;submittedAt:string;reviewNote?:string|null};
type Document={id:string;type:string;label?:string|null};
export default function Admin(){
 const[notice,setNotice]=useState(""),[documents,setDocuments]=useState<Record<string,Document[]>>({}),[items,setItems]=useState<Application[]>([]),[msg,setMsg]=useState("Loading onboarding queue…"),[busy,setBusy]=useState<string|null>(null),[notes,setNotes]=useState<Record<string,string>>({});
 const api=new ApiClient(base,()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 const load=useCallback(async()=>{
  try{const a=await api.get<Application[]>("/provider-onboarding/applications");setItems(Array.isArray(a)?a:[]);setMsg("")}
  catch(e){setItems([]);setDocuments({});setMsg(e instanceof Error?e.message:"Unable to load applications; check admin permissions and sign-in")}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{void load()},[load]);
 async function loadDocuments(id:string){
  try{
   const data=await api.get<{documents:Document[]}>(`/provider-onboarding/applications/${id}`);
   setDocuments(prev=>({...prev,[id]:data.documents||[]}));
  }catch(e){setMsg(e instanceof Error?e.message:"Unable to retrieve application documents")}
 }
 async function download(id:string,documentId:string){
  try{
   const token=localStorage.getItem("sevamitra_token");
   if(!token)throw new Error("Sign in required");
   const res=await fetch(base.replace(/\/$/,"")+`/api/v1/provider-onboarding/applications/${id}/documents/${documentId}/download`,{headers:{Authorization:"Bearer "+token}});
   if(!res.ok)throw new Error("Document not available or permission denied");
   const blob=await res.blob();const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="provider-evidence";a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setMsg(e instanceof Error?e.message:"Download failed")}
 }
 async function act(x:Application,action:"claim"|"approve"|"reject"){
  if(action==="reject"&&!notes[x.id]?.trim()){setMsg("Rejection reason is required.");return}
  if(action!=="claim"&&!window.confirm(`${action==="approve"?"Approve":"Reject"} application ${x.id}?`))return;
  setBusy(x.id);setMsg("");setNotice("");
  try{
   if(action==="claim")await api.patch(`/provider-onboarding/applications/${x.id}/claim`,{});
   else await api.post(`/provider-onboarding/applications/${x.id}/review`,{decision:action==="approve"?"APPROVED":"REJECTED",...(action==="reject"?{reviewNote:notes[x.id]?.trim()??""}:{})});
   await load();setNotice(action==="claim"?"Application claimed for review.":action==="approve"?"Provider application approved.":"Provider application rejected.");
  }catch(e){setMsg(e instanceof Error?e.message:"Update failed")}finally{setBusy(null)}
 }
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Operations console</small></div></Link><Link href="/workspaces">Workspaces</Link></header>
  <section className="workspace adminHub"><div className="workspaceTop"><div><div className="pill">Operations console</div><h1>SevaMitra administration</h1><p>Control your service catalogue, onboarding, permissions and pilot operations from one place.</p></div><button className="primary" disabled={!!busy} onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button></div>
  {!!notice&&<p role="status" aria-live="polite">{notice}</p>}{!!msg&&<p role="alert">{msg}</p>}{!msg&&items.length===0&&<p>No onboarding applications are waiting for review.</p>}
  <h2>Management tools</h2><div className="adminToolGrid">
   {[
    {title:"Operations & reports",description:"Booking activity, trends and reporting",href:"/admin/operations",icon:BarChart3},
    {title:"Service catalogue",description:"Categories and live services",href:"/admin/catalogue",icon:Layers3},
    {title:"Agent approvals",description:"Onboarding and agent verification",href:"/admin/agents",icon:UsersRound},
    {title:"Roles & permissions",description:"Access controls and role matrix",href:"/admin/roles",icon:ShieldCheck},
    {title:"Provider organizations",description:"Companies, groups and employees",href:"/admin/organizations",icon:Building2},
    {title:"Emergency controls",description:"Pilot flags and booking restrictions",href:"/admin/runtime-flags",icon:ToggleRight},
   ].map(x=><Link className="adminToolCard" key={x.href} href={x.href}><x.icon size={23}/><strong>{x.title}</strong><span>{x.description}</span><ArrowRight className="adminToolArrow" size={17}/></Link>)}
  </div><div className="queueHeading"><div><div className="pill"><FileCheck2 size={15}/> Provider review</div><h2>Verification queue {items.length>0?"("+items.length+")":""}</h2><p>Only authorized reviewers can claim, approve or reject applications.</p></div></div><div className="adminModules">{items.map(x=><article key={x.id}><h3>{x.status} · {x.channel}</h3><p>Provider: <code>{x.providerId}</code></p><p>Application: <code>{x.id}</code></p><p>Submitted: {new Date(x.submittedAt).toLocaleDateString()}</p>{x.reviewNote&&<p>Note: {x.reviewNote}</p>}<button disabled={busy===x.id} onClick={()=>void loadDocuments(x.id)}>Review documents</button>{(documents[x.id]||[]).map(doc=><p key={doc.id}>{doc.type} · <button onClick={()=>void download(x.id,doc.id)}>Download privately</button></p>)}
   {(x.status==="SUBMITTED"||x.status==="UNDER_REVIEW")&&<><label htmlFor={`reason-${x.id}`}>Rejection reason</label><input id={`reason-${x.id}`} maxLength={1000} value={notes[x.id]||""} onChange={e=>setNotes(prev=>({...prev,[x.id]:e.target.value}))} placeholder="Required if rejecting"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
     {x.status==="SUBMITTED"&&<button disabled={busy===x.id} onClick={()=>void act(x,"claim")}>Claim</button>}
     <button disabled={busy===x.id} onClick={()=>void act(x,"approve")}>Approve</button>
     <button disabled={busy===x.id} onClick={()=>void act(x,"reject")}>Reject</button>
    </div></>}
  </article>)}</div></section></main>
}
