"use client";
import{useCallback,useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";import{BarChart3,Layers3,UsersRound,ShieldCheck,Building2,ToggleRight,FileCheck2,ArrowRight,RefreshCw}from"lucide-react";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";
type Application={id:string;providerId:string;status:string;channel:string;submittedAt:string;reviewNote?:string|null};
type Document={id:string;type:string;fileUrl?:string;label?:string|null;categoryId?:string|null;expiresAt?:string|null;expiredAt?:string|null;reviewStatus?:string;reviewNote?:string|null;renewalOfId?:string|null};
type WorkspaceAccess={admin:boolean;adminPermissions?:string[]};
export default function Admin(){
 const[notice,setNotice]=useState(""),[documents,setDocuments]=useState<Record<string,Document[]>>({}),[items,setItems]=useState<Application[]>([]),[msg,setMsg]=useState("Loading onboarding queue…"),[busy,setBusy]=useState<string|null>(null),[notes,setNotes]=useState<Record<string,string>>({});
 const[allowed,setAllowed]=useState<string[]>([]),[documentNotes,setDocumentNotes]=useState<Record<string,string>>({});
 const can=(...permissions:string[])=>allowed.includes('*')||permissions.every(key=>allowed.includes(key));
 const canProviderReview=can('provider.onboarding.review');
 const api=new ApiClient(base,()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 const load=useCallback(async()=>{
  try{
   const workspaces=await api.get<WorkspaceAccess>("/auth/workspaces");
   if(!workspaces.admin){setAllowed([]);setItems([]);setMsg("Your account does not have permission to use the administration console.");return false}
   const permissions=workspaces.adminPermissions??['provider.onboarding.review'];
   setAllowed(permissions);
   if(!permissions.includes('*')&&!permissions.includes('provider.onboarding.review')){
    setItems([]);setMsg("");return true;
   }
   const a=await api.get<Application[]>("/provider-onboarding/applications");
   setItems(Array.isArray(a)?a:[]);setMsg("");return true
  }
  catch(e){setItems([]);setDocuments({});setAllowed([]);
   setMsg(e instanceof Error?e.message:"Unable to load the permitted admin tools. Check your permissions and sign-in.");return false}
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
 async function reviewDocument(applicationId:string,doc:Document,decision:"APPROVED"|"REJECTED"){
  if(decision==="REJECTED"&&!documentNotes[doc.id]?.trim()){setMsg("A rejection reason is required for this document.");return}
  if(!window.confirm((decision==="APPROVED"?"Approve":"Reject")+" "+doc.type.replaceAll("_"," ")+"?"))return;
  setBusy(applicationId);setMsg("");setNotice("");
  try{
   await api.patch(`/provider-onboarding/applications/${applicationId}/documents/${doc.id}/review`,{
    decision,...(decision==="REJECTED"?{reviewNote:documentNotes[doc.id]?.trim()??""}:{})
   });
   await loadDocuments(applicationId);
   setNotice(decision==="APPROVED"?"Compliance document approved.": "Compliance document rejected; affected service categories are on hold.");
  }catch(e){setMsg(e instanceof Error?e.message:"Unable to review document")}finally{setBusy(null)}
 }
 async function act(x:Application,action:"claim"|"approve"|"reject"){
  if(action==="reject"&&!notes[x.id]?.trim()){setMsg("Rejection reason is required.");return}
  if(action!=="claim"&&!window.confirm(`${action==="approve"?"Approve":"Reject"} application ${x.id}?`))return;
  setBusy(x.id);setMsg("");setNotice("");
  try{
   if(action==="claim")await api.patch(`/provider-onboarding/applications/${x.id}/claim`,{});
   else await api.post(`/provider-onboarding/applications/${x.id}/review`,{decision:action==="approve"?"APPROVED":"REJECTED",...(action==="reject"?{reviewNote:notes[x.id]?.trim()??""}:{})});
   const confirmed=await load();
   if(confirmed)setNotice(action==="claim"?"Application claimed for review.":action==="approve"?"Provider application approved.":"Provider application rejected.");
   else setMsg("Decision was submitted, but the verification queue could not be refreshed. Check the current state before retrying.");
  }catch(e){setMsg(e instanceof Error?e.message:"Update failed")}finally{setBusy(null)}
 }
 return <main>
  <section className="workspace adminHub"><div className="workspaceTop"><div><div className="pill">Operations console</div><h1>SevaMitra administration</h1><p>Control your service catalogue, onboarding, permissions and pilot operations from one place.</p></div><button className="primary" disabled={!!busy} onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button></div>
  {!!notice&&<p role="status" aria-live="polite">{notice}</p>}{!!msg&&<p role="alert">{msg}</p>}{!msg&&canProviderReview&&items.length===0&&<p>No onboarding applications are waiting for review.</p>}
  <h2>Management tools</h2><div className="adminToolGrid">
   {[
    {title:"Operations & reports",description:"Booking activity, trends and reporting",href:"/admin/operations",permissions:["agent.review","provider.onboarding.review"],icon:BarChart3},
    {title:"Service catalogue",description:"Categories and live services",href:"/admin/catalogue",permissions:["catalogue.manage"],icon:Layers3},
    {title:"Agent approvals",description:"Onboarding and agent verification",href:"/admin/agents",permissions:["agent.review"],icon:UsersRound},
    {title:"Tax, pricing & billing",description:"Geographic tax rules, dynamic pricing and invoices",href:"/admin/finance",permissions:["finance.tax.manage","finance.pricing.manage","finance.billing.manage"],icon:Building2},
    {title:"Roles & permissions",description:"Access controls and role matrix",href:"/admin/roles",permissions:["iam.role.view"],icon:ShieldCheck},
    {title:"Provider organizations",description:"Companies, groups and employees",href:"/admin/organizations",permissions:["provider.organization.manage"],icon:Building2},
    {title:"Emergency controls",description:"Pilot flags and booking restrictions",href:"/admin/runtime-flags",permissions:["runtime-flags.view"],icon:ToggleRight},
   ].filter(x=>can(...x.permissions)).map(x=><Link className="adminToolCard" key={x.href} href={x.href}><x.icon size={23}/><strong>{x.title}</strong><span>{x.description}</span><ArrowRight className="adminToolArrow" size={17}/></Link>)}
  </div>{canProviderReview&&<><div className="queueHeading"><div><div className="pill"><FileCheck2 size={15}/> Provider review</div><h2>Verification queue {items.length>0?"("+items.length+")":""}</h2><p>Only authorized reviewers can claim, approve or reject applications.</p></div></div><div className="adminModules">{items.map(x=><article key={x.id}><h3>{x.status} · {x.channel}</h3><p>Provider: <code>{x.providerId}</code></p><p>Application: <code>{x.id}</code></p><p>Submitted: {new Date(x.submittedAt).toLocaleDateString()}</p>{x.reviewNote&&<p>Note: {x.reviewNote}</p>}<button disabled={busy===x.id} onClick={()=>void loadDocuments(x.id)}>Review documents</button>{(documents[x.id]||[]).map(doc=><div key={doc.id} style={{padding:12,border:"1px solid #D9E7DD",borderRadius:12,marginTop:10}}>
    <strong>{doc.type.replaceAll("_"," ")}</strong><p>Status: {doc.reviewStatus||"PENDING"} · Scope: {doc.categoryId?"Category-specific":"All provider services"}</p>
    <p>Expires: {doc.expiresAt?new Date(doc.expiresAt).toLocaleDateString():"No expiry date recorded"}{doc.renewalOfId?" · Renewal submitted":""}</p>
    {doc.reviewNote&&<p>Reviewer note: {doc.reviewNote}</p>}
    {doc.fileUrl?.startsWith("r2://")?<button onClick={()=>void download(x.id,doc.id)}>Download privately</button>:<p role="alert">Legacy external reference. Ask the provider to upload a private replacement before review.</p>}
    {["PENDING","REJECTED"].includes(doc.reviewStatus||"PENDING")&&<button disabled={busy===x.id} onClick={()=>void reviewDocument(x.id,doc,"APPROVED")}>Approve document</button>}
    {["PENDING","REJECTED","APPROVED"].includes(doc.reviewStatus||"PENDING")&&<><label>Document rejection reason</label><input maxLength={1000} value={documentNotes[doc.id]||""} onChange={e=>setDocumentNotes(prev=>({...prev,[doc.id]:e.target.value}))} placeholder="Required if rejecting"/><button disabled={busy===x.id} onClick={()=>void reviewDocument(x.id,doc,"REJECTED")}>Reject document</button></>}
   </div>)}
   {(x.status==="SUBMITTED"||x.status==="UNDER_REVIEW")&&<><label htmlFor={`reason-${x.id}`}>Rejection reason</label><input id={`reason-${x.id}`} maxLength={1000} value={notes[x.id]||""} onChange={e=>setNotes(prev=>({...prev,[x.id]:e.target.value}))} placeholder="Required if rejecting"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
     {x.status==="SUBMITTED"&&<button disabled={busy===x.id} onClick={()=>void act(x,"claim")}>Claim</button>}
     <button disabled={busy===x.id} onClick={()=>void act(x,"approve")}>Approve</button>
     <button disabled={busy===x.id} onClick={()=>void act(x,"reject")}>Reject</button>
    </div></>}
  </article>)}</div></>}</section></main>
}
