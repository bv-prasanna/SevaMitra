"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
import {ArrowUpRight,UsersRound,UserRound,BriefcaseBusiness,ShieldCheck,RefreshCw} from "lucide-react";

type Access={customer:boolean;provider:boolean;agent:boolean;admin:boolean;
 canJoinProvider:boolean;canJoinAgent:boolean;providerStatus:string|null;agentStatus:string|null};
const menu=[
 {key:"customer",name:"Customer",href:"/customer",desc:"Find services, view bookings and manage your service requests",icon:UserRound},
 {key:"provider",name:"Provider",href:"/provider",desc:"Verify your profile, manage availability and serve customers",icon:BriefcaseBusiness},
 {key:"agent",name:"Agent",href:"/agent",desc:"Support local providers and track referral registrations",icon:UsersRound},
 {key:"admin",name:"Admin",href:"/admin",desc:"Review applications and manage permitted operations",icon:ShieldCheck},
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
 return <main>
 <section className="workspace workspaceHub"><div className="workspaceTop"><div><div className="pill">Your SevaMitra account</div><h1>Choose your workspace</h1><p>Everything you need, with one sign-in. Only your authorized roles are shown.</p></div><Link href="/profile" className="outline">My profile <ArrowUpRight size={16}/></Link></div>
 {message&&<p role="status">{message}</p>}
 <div className="workspaceRoleGrid">{access&&menu.filter(x=>access[x.key]).map(x=><Link className="workspaceRoleCard" href={x.href} key={x.href}><div className="workspaceRoleIcon"><x.icon size={24}/></div><h2>{x.name}</h2><p>{x.desc}</p><span>Open workspace <ArrowUpRight size={17}/></span></Link>)}</div>
 {access&&<section style={{marginTop:25}}><h2>Interested in joining?</h2>
 {access.canJoinProvider&&<p><Link href="/provider">Apply as a provider →</Link></p>}
 {access.canJoinAgent&&<p><Link href="/agent">Apply as an agent →</Link></p>}
 </section>}
 <div style={{display:"flex",gap:24,marginTop:30}}>
  <button onClick={()=>void load()}><RefreshCw size={16}/> Refresh permissions</button>
  <button onClick={logout}>Sign out / Switch account</button>
  {!access&&<Link href="/login">Sign in</Link>}
 </div></section></main>;
}
