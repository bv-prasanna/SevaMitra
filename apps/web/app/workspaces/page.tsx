"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";

type Access={customer:boolean;provider:boolean;agent:boolean;admin:boolean;
 canJoinProvider:boolean;canJoinAgent:boolean;providerStatus:string|null;agentStatus:string|null};
const menu=[
 {key:"customer",name:"Customer",href:"/customer",desc:"Manage your bookings"},
 {key:"provider",name:"Provider",href:"/provider",desc:"Verification, services, availability and jobs"},
 {key:"agent",name:"Agent",href:"/agent",desc:"Local provider referrals"},
 {key:"admin",name:"Admin",href:"/admin",desc:"Review and approve provider applications"},
] as const;
export default function Workspaces(){
 const[access,setAccess]=useState<Access|null>(null);
 const[message,setMessage]=useState("Loading workspaces…");
 const load=useCallback(async()=>{
  const token=localStorage.getItem("sevamitra_token");
  if(!token){setMessage("Sign in to view your permitted workspaces.");setAccess(null);return}
  const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>token);
  try{setAccess(await api.get<Access>("/auth/workspaces"));setMessage("")}
  catch(e){setAccess(null);setMessage(e instanceof Error?e.message:"Cannot read account roles")}
 },[]);
 useEffect(()=>{void load()},[load]);
 function logout(){
  localStorage.removeItem("sevamitra_token");
  window.location.assign("/login");
 }
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Workspaces</small></div></Link></header>
 <section className="workspace"><h1>Choose your workspace</h1><p>The menu is filtered by your account roles. Every protected action is also checked independently by the backend.</p>
 {message&&<p role="status">{message}</p>}
 <div className="adminModules">{access&&menu.filter(x=>access[x.key]).map(x=><article key={x.href}><h2>{x.name}</h2><p>{x.desc}</p><Link href={x.href}>Open →</Link></article>)}</div>
 {access&&<section style={{marginTop:25}}><h2>Interested in joining?</h2>
 {access.canJoinProvider&&<p><Link href="/provider">Apply as a provider →</Link></p>}
 {access.canJoinAgent&&<p><Link href="/agent">Apply as an agent →</Link></p>}
 </section>}
 <div style={{display:"flex",gap:24,marginTop:30}}>
  <button onClick={()=>void load()}>Refresh permissions</button>
  <button onClick={logout}>Sign out / Switch account</button>
  {!access&&<Link href="/login">Sign in</Link>}
 </div></section></main>;
}
