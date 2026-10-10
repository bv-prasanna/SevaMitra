"use client";
import{useEffect,useState}from"react";import{ApiClient}from"@sevamitra/api-client";import Link from"next/link";
type Profile={id:string;fullName:string;agentCode:string;status:string;geographyNote?:string|null};
export default function Agent(){
 const[profile,setProfile]=useState<Profile|null>(null),[name,setName]=useState(""),[area,setArea]=useState(""),[msg,setMsg]=useState("Loading…"),[busy,setBusy]=useState(false);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 async function load(){try{const p=await api.get<Profile>("/agents/me");setProfile(p);setMsg("")}catch(e){setProfile(null);setMsg((e as {status?:number}).status===404?"Create your agent profile to begin.":e instanceof Error?e.message:"Unable to load agent profile")}}
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await api.post("/agents/me",{fullName:name.trim(),geographyNote:area.trim()||undefined,preferredLanguage:"kn"});await load()}catch(e){setMsg(e instanceof Error?e.message:"Registration failed")}finally{setBusy(false)}}
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Agent workspace</small></div></Link><Link href="/workspaces">Workspaces</Link></header><section className="workspace"><div className="workspaceTop"><div><div className="pill">Agent</div><h1>{profile?.fullName||"Become a community partner"}</h1><p>Help local providers join the marketplace.</p></div><Link href="/login" className="primary">Sign in</Link></div>
 {!!msg&&<p role="alert">{msg}</p>}{!profile?<article><label>Full name</label><input maxLength={150} value={name} onChange={e=>setName(e.target.value)}/><label>Taluk / service area</label><input maxLength={200} value={area} onChange={e=>setArea(e.target.value)}/><button disabled={busy||name.trim().length<2} onClick={()=>void create()}>Create agent profile</button></article>:<><div className="dashGrid"><article><small>Status</small><b>{profile.status}</b><p>Agent verification is managed by operations.</p></article><article><small>Referral code</small><b>{profile.agentCode}</b><p>Providers enter this code during their own verification application.</p></article></div><p>Agent-assisted submission and incentive payments need dedicated backend workflows before they can be enabled.</p></>}
 </section></main>
}
