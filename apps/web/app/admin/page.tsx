"use client";
import{useCallback,useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";
type Application={id:string;providerId:string;status:string;channel:string;submittedAt:string;reviewNote?:string|null};
export default function Admin(){
 const[items,setItems]=useState<Application[]>([]),[msg,setMsg]=useState("Loading onboarding queue…"),[busy,setBusy]=useState<string|null>(null),[notes,setNotes]=useState<Record<string,string>>({});
 const api=new ApiClient(base,()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 const load=useCallback(async()=>{
  try{const a=await api.get<Application[]>("/provider-onboarding/applications");setItems(Array.isArray(a)?a:[]);setMsg("")}
  catch(e){setMsg(e instanceof Error?e.message:"Unable to load applications; check admin permissions and sign-in")}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{void load()},[load]);
 async function act(x:Application,action:"claim"|"approve"|"reject"){
  if(action==="reject"&&!notes[x.id]?.trim()){setMsg("Rejection reason is required.");return}
  if(action!=="claim"&&!window.confirm(`${action==="approve"?"Approve":"Reject"} application ${x.id}?`))return;
  setBusy(x.id);setMsg("");
  try{
   if(action==="claim")await api.patch(`/provider-onboarding/applications/${x.id}/claim`,{});
   else await api.post(`/provider-onboarding/applications/${x.id}/review`,{decision:action==="approve"?"APPROVED":"REJECTED",...(action==="reject"?{reviewNote:notes[x.id].trim()}:{})});
   await load();
  }catch(e){setMsg(e instanceof Error?e.message:"Update failed")}finally{setBusy(null)}
 }
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Operations console</small></div></Link><Link href="/workspaces">Workspaces</Link></header>
  <section className="workspace"><div className="workspaceTop"><div><div className="pill">Onboarding operations</div><h1>Provider verification queue</h1><p>Only accounts with <code>provider.onboarding.review</code> can view or decide cases.</p></div><button className="primary" onClick={()=>void load()}>Refresh</button></div>
  {!!msg&&<p role="alert">{msg}</p>}{!msg&&items.length===0&&<p>No onboarding applications.</p>}
  <div className="adminModules">{items.map(x=><article key={x.id}><h3>{x.status} · {x.channel}</h3><p>Provider: <code>{x.providerId}</code></p><p>Application: <code>{x.id}</code></p><p>Submitted: {new Date(x.submittedAt).toLocaleDateString()}</p>{x.reviewNote&&<p>Note: {x.reviewNote}</p>}
   {(x.status==="SUBMITTED"||x.status==="UNDER_REVIEW")&&<><label htmlFor={`reason-${x.id}`}>Rejection reason</label><input id={`reason-${x.id}`} maxLength={1000} value={notes[x.id]||""} onChange={e=>setNotes(prev=>({...prev,[x.id]:e.target.value}))} placeholder="Required if rejecting"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
     {x.status==="SUBMITTED"&&<button disabled={busy===x.id} onClick={()=>void act(x,"claim")}>Claim</button>}
     <button disabled={busy===x.id} onClick={()=>void act(x,"approve")}>Approve</button>
     <button disabled={busy===x.id} onClick={()=>void act(x,"reject")}>Reject</button>
    </div></>}
  </article>)}</div></section></main>
}
