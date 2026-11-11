"use client";
import HelpChat from "../components/HelpChat";
import{useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";
type Profile={fullName:string};
type Booking={id:string;status:string;scheduledDate:string;scheduledStartTime:string;scheduledEndTime:string;amount?:string|null;currency:string};
export default function Customer(){
 const[profileState,setProfileState]=useState<"loading"|"missing"|"ready"|"error">("loading"),[notice,setNotice]=useState(""),[profile,setProfile]=useState<Profile|null>(null),[items,setItems]=useState<Booking[]>([]),[name,setName]=useState(""),[msg,setMsg]=useState("Loading…"),[busy,setBusy]=useState(false);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 async function load(){
  setMsg("");
  try{
   const p=await api.get<Profile>("/customers/me");setProfile(p);setProfileState("ready");
  }catch(e){const status=(e as {status?:number}).status;setProfile(null);setItems([]);setProfileState(status===404?"missing":"error");setMsg(status===404?"Complete your customer profile.":status===401?"Sign in to access your customer profile.":e instanceof Error?e.message:"Unable to load customer profile");return;}
  try{
   const b=await api.get<Booking[]>("/bookings/me");setItems(Array.isArray(b)?b:[]);
  }catch(e){setItems([]);setMsg(e instanceof Error?e.message:"Unable to load bookings. Refresh and try again.")}
 }
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await api.post("/customers/me",{fullName:name.trim(),preferredLanguage:"kn"});await load();setNotice("Your customer profile is ready.")}catch(e){setMsg(e instanceof Error?e.message:"Unable to create profile")}finally{setBusy(false)}}
 async function cancel(id:string){if(!confirm("Cancel booking? Cancellation or refund terms may apply."))return;setBusy(true);try{await api.post(`/bookings/me/${id}/cancel`,{reason:"Cancelled by customer"});await load();setNotice("Booking cancelled. Any applicable refund is handled separately according to the cancellation policy.")}catch(e){setMsg(e instanceof Error?e.message:"Cancellation failed")}finally{setBusy(false)}}
 return <main><section className="workspace"><div className="workspaceTop"><div><div className="pill">Customer</div><h1>{profile?`Welcome, ${profile.fullName}`:"Complete your profile"}</h1><p>Find, track and manage your service bookings.</p></div><Link href="/marketplace" className="primary">Explore services</Link></div>
 {notice&&<p role="status" aria-live="polite">{notice}</p>}{!!msg&&<p role="alert">{msg}</p>}{profileState==="error"&&<p><Link href="/login">Sign in →</Link> <button type="button" onClick={()=>void load()}>Retry</button></p>}{profileState==="missing"?<article><label htmlFor="customer-name">Full name</label><input id="customer-name" maxLength={150} value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy||name.trim().length<2} onClick={()=>void create()}>Create customer profile</button></article>:profileState==="ready"&&profile?<><h2>My bookings ({items.length})</h2>{items.length===0&&<p>No bookings yet.</p>}<div className="adminModules">{items.map(b=><article key={b.id}><h3>{b.status}</h3><p>{String(b.scheduledDate).slice(0,10)} · {b.scheduledStartTime}–{b.scheduledEndTime}</p><p>{b.currency} {b.amount??"Price on request"}</p><small>{b.id}</small>{(b.status==="REQUESTED"||b.status==="ACCEPTED")&&<button disabled={busy} onClick={()=>void cancel(b.id)}>Cancel booking</button>}</article>)}</div></>:null}
 </section><HelpChat audience="customer"/></main>
}
