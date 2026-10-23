"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
type Agent={id:string;fullName:string;agentCode:string;status:string;createdAt:string;geographyNote?:string|null};
export default function AgentReview(){
 const [agents,setAgents]=useState<Agent[]>([]);
 const [message,setMessage]=useState("Loading agent applications…");
 const [busy,setBusy]=useState<string|null>(null);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 const load=useCallback(async()=>{
  try{const result=await api.get<Agent[]>("/agents/admin");setAgents(Array.isArray(result)?result:[]);setMessage("");}
  catch(e){setMessage(e instanceof Error?e.message:"You may not have agent.review permission");}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{void load()},[load]);
 async function decide(x:Agent,decision:"APPROVE"|"SUSPEND"){
  if(!window.confirm((decision==="APPROVE"?"Approve ":"Suspend ")+x.fullName+"?"))return;
  setBusy(x.id);try{
   await api.patch("/agents/admin/"+encodeURIComponent(x.id)+"/status",{decision});await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to update agent")}finally{setBusy(null)}
 }
 return <main><header className="nav"><Link href="/">SevaMitra</Link><Link href="/admin">Admin</Link></header><section className="workspace"><div className="workspaceTop"><div><div className="pill">Operations</div><h1>Agent approvals</h1><p>Restricted to reviewers with <code>agent.review</code>.</p></div><button onClick={()=>void load()}>Refresh</button></div>
 {!!message&&<p role="status">{message}</p>}{!message&&agents.length===0&&<p>No agent applications.</p>}
 <div className="adminModules">{agents.map(x=><article key={x.id}><h3>{x.fullName}</h3><p>Status: {x.status}</p><p>Referral code: {x.agentCode}</p>{x.geographyNote&&<p>Area: {x.geographyNote}</p>}<p>Registered: {new Date(x.createdAt).toLocaleDateString()}</p>
 {x.status==="PENDING"&&<button disabled={busy===x.id} onClick={()=>void decide(x,"APPROVE")}>Approve</button>}
 {x.status==="ACTIVE"&&<button disabled={busy===x.id} onClick={()=>void decide(x,"SUSPEND")}>Suspend</button>}</article>)}</div></section></main>
}
