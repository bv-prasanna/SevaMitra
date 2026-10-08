"use client";
import{useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";
type Profile={id:string;fullName:string;status:string;verificationStatus:string};
type Booking={id:string;status:string;scheduledDate:string;scheduledStartTime:string;scheduledEndTime:string;amount?:string|null;currency:string};
type App={status:string;reviewNote?:string|null};
export default function Provider(){
 const[profile,setProfile]=useState<Profile|null>(null),[onboard,setOnboard]=useState<App|null>(null),[bookings,setBookings]=useState<Booking[]>([]),[name,setName]=useState(""),[reason,setReason]=useState(""),[msg,setMsg]=useState("Loading…"),[busy,setBusy]=useState(false);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 async function load(){
  try{
   const p=await api.get<Profile>("/providers/me");setProfile(p);
   const r=await Promise.allSettled([api.get<Booking[]>("/bookings/provider/me"),api.get<App>("/provider-onboarding/applications/me")]);
   setBookings(r[0].status==="fulfilled"&&Array.isArray(r[0].value)?r[0].value:[]);
   setOnboard(r[1].status==="fulfilled"?r[1].value:null);setMsg("");
  }catch(e){setProfile(null);setMsg((e as {status?:number}).status===404?"Create a provider profile to begin.":e instanceof Error?e.message:"Unable to load provider workspace")}
 }
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await api.post("/providers/me",{fullName:name.trim(),preferredLanguage:"kn"});await load()}catch(e){setMsg(e instanceof Error?e.message:"Profile creation failed")}finally{setBusy(false)}}
 async function submit(){setBusy(true);try{await api.post("/provider-onboarding/applications/me",{});await load()}catch(e){setMsg(e instanceof Error?e.message:"Submission failed")}finally{setBusy(false)}}
 async function action(b:Booking,kind:"accept"|"reject"|"complete"){
  if(kind==="reject"&&!reason.trim()){setMsg("Enter a rejection reason.");return}
  if(kind==="complete"&&!confirm("Confirm service completion?"))return;
  setBusy(true);try{await api.post(`/bookings/provider/me/${b.id}/${kind}`,kind==="reject"?{reason:reason.trim()}:{});setReason("");await load()}catch(e){setMsg(e instanceof Error?e.message:"Booking update failed")}finally{setBusy(false)}
 }
 return <main><header className="nav"><Link className="brand" href="/"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Provider workspace</small></div></Link><Link href="/workspaces">Workspaces</Link></header>
 <section className="workspace"><div className="workspaceTop"><div><div className="pill">Provider</div><h1>{profile?.fullName||"Provider registration"}</h1><p>{profile?`Account: ${profile.status} · Verification: ${profile.verificationStatus}`:msg}</p></div><Link href="/login" className="primary">Sign in</Link></div>
 {!!msg&&<p role="alert">{msg}</p>}
 {!profile&&<article><label>Your full name</label><input maxLength={150} value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy||name.trim().length<2} onClick={()=>void create()}>Create provider profile</button></article>}
 {profile&&<><article><h2>Verification</h2><p>Application: {onboard?.status||"Not submitted"}</p>{onboard?.reviewNote&&<p>{onboard.reviewNote}</p>}{(!onboard||onboard.status==="REJECTED")&&<button disabled={busy} onClick={()=>void submit()}>Submit application for review</button>}</article>
 <h2 style={{marginTop:25}}>Bookings ({bookings.length})</h2>{bookings.length===0&&<p>No bookings assigned yet.</p>}
 <div className="adminModules">{bookings.map(b=><article key={b.id}><h3>{b.status}</h3><p>{String(b.scheduledDate).slice(0,10)} · {b.scheduledStartTime}–{b.scheduledEndTime}</p><p>{b.currency} {b.amount??"Price on request"}</p><small>{b.id}</small>
 {b.status==="REQUESTED"&&<><label>Reason if rejecting</label><input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/><div style={{display:"flex",gap:10}}><button disabled={busy} onClick={()=>void action(b,"accept")}>Accept</button><button disabled={busy} onClick={()=>void action(b,"reject")}>Reject</button></div></>}
 {b.status==="ACCEPTED"&&<button disabled={busy} onClick={()=>void action(b,"complete")}>Mark completed</button>}
 </article>)}</div></>}
 </section></main>
}
