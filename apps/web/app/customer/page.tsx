"use client";
import{useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";
type Profile={fullName:string};
type Booking={id:string;status:string;scheduledDate:string;scheduledStartTime:string;scheduledEndTime:string;amount?:string|null;currency:string};
export default function Customer(){
 const[profile,setProfile]=useState<Profile|null>(null),[items,setItems]=useState<Booking[]>([]),[name,setName]=useState(""),[msg,setMsg]=useState("Loading…"),[busy,setBusy]=useState(false);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 async function load(){try{const p=await api.get<Profile>("/customers/me");setProfile(p);const b=await api.get<Booking[]>("/bookings/me");setItems(Array.isArray(b)?b:[]);setMsg("")}catch(e){if((e as {status?:number}).status===404){setProfile(null);setMsg("Complete your customer profile.")}else setMsg(e instanceof Error?e.message:"Unable to load customer workspace")}}
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await api.post("/customers/me",{fullName:name.trim(),preferredLanguage:"kn"});await load()}catch(e){setMsg(e instanceof Error?e.message:"Unable to create profile")}finally{setBusy(false)}}
 async function cancel(id:string){if(!confirm("Cancel booking? Cancellation or refund terms may apply."))return;setBusy(true);try{await api.post(`/bookings/me/${id}/cancel`,{reason:"Cancelled by customer"});await load()}catch(e){setMsg(e instanceof Error?e.message:"Cancellation failed")}finally{setBusy(false)}}
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Customer workspace</small></div></Link><Link href="/workspaces">Workspaces</Link></header><section className="workspace"><div className="workspaceTop"><div><div className="pill">Customer</div><h1>{profile?`Welcome, ${profile.fullName}`:"Complete your profile"}</h1><p>Find, track and manage your service bookings.</p></div><Link href="/marketplace" className="primary">Explore services</Link></div>
 {!!msg&&<p role="alert">{msg}</p>}{!profile?<article><label>Full name</label><input maxLength={150} value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy||name.trim().length<2} onClick={()=>void create()}>Create customer profile</button></article>:<><h2>My bookings ({items.length})</h2>{items.length===0&&<p>No bookings yet.</p>}<div className="adminModules">{items.map(b=><article key={b.id}><h3>{b.status}</h3><p>{String(b.scheduledDate).slice(0,10)} · {b.scheduledStartTime}–{b.scheduledEndTime}</p><p>{b.currency} {b.amount??"Price on request"}</p><small>{b.id}</small>{(b.status==="REQUESTED"||b.status==="ACCEPTED")&&<button disabled={busy} onClick={()=>void cancel(b.id)}>Cancel booking</button>}</article>)}</div></>}
 </section></main>
}
