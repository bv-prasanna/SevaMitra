"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
import {RefreshCw,Search,ShieldCheck,UsersRound} from "lucide-react";
import Feedback from "../../components/Feedback";
import ConfirmDialog from "../../components/ConfirmDialog";

type Agent={id:string;fullName:string;agentCode:string;status:string;createdAt:string;geographyNote?:string|null};
type Intent={agent:Agent;decision:"APPROVE"|"SUSPEND"};
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);
export default function AgentReview(){
 const[agents,setAgents]=useState<Agent[]>([]);
 const[error,setError]=useState("");
 const[notice,setNotice]=useState("");
 const[busy,setBusy]=useState<string|null>(null);
 const[loading,setLoading]=useState(true);
 const[needsLogin,setNeedsLogin]=useState(false);
 const[search,setSearch]=useState("");
 const[filter,setFilter]=useState("all");
 const[intent,setIntent]=useState<Intent|null>(null);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const token=localStorage.getItem("sevamitra_token");
   if(!token){setNeedsLogin(true);setAgents([]);setError("Sign in to review agent applications.");return false}
   const result=await api.get<Agent[]>("/agents/admin");
   setAgents(Array.isArray(result)?result:[]);setNeedsLogin(false);return true;
  }catch(e){
   const status=(e as {status?:number}).status;
   setAgents([]);setNeedsLogin(status===401);
   setError(status===401?"Your session expired. Please sign in again.":status===403?"Your account does not have the agent.review permission. Ask an administrator for the appropriate scope.":e instanceof Error?e.message:"Unable to load agent applications.");return false;
  }finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const visible=useMemo(()=>agents.filter(x=>(filter==="all"||x.status===filter)&&[x.fullName,x.agentCode,x.geographyNote||""].some(v=>v.toLowerCase().includes(search.toLowerCase().trim()))),[agents,filter,search]);
 async function decide(){
  if(!intent||busy)return;
  const x=intent.agent,decision=intent.decision;
  setBusy(x.id);setError("");setNotice("");
  try{
   await api.patch("/agents/admin/"+encodeURIComponent(x.id)+"/status",{decision});
   setIntent(null);const confirmed=await load();
   if(confirmed)setNotice(decision==="APPROVE"?x.fullName+" is now an approved agent.":x.fullName+" has been suspended.");
   else setError("Decision was submitted, but the latest agent status could not be confirmed. Refresh before retrying.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to update agent. Refresh and try again.")}
  finally{setBusy(null)}
 }
 const counts=(s:string)=>agents.filter(x=>x.status===s).length;
 return <main><section className="workspace">
  <div className="workspaceTop"><div><div className="pill"><UsersRound size={15}/> Agent operations</div>
    <h1>Agent approvals</h1><p>Review registrations, approve eligible agents and suspend accounts when necessary. Every action is validated by server-side permissions.</p></div>
   <button type="button" disabled={loading||!!busy} onClick={()=>void load()}><RefreshCw size={15}/> {loading?"Loading…":"Refresh queue"}</button>
  </div>
  {error&&<Feedback kind="error">{error} {needsLogin&&<Link href="/login">Sign in</Link>}</Feedback>}
  {notice&&<Feedback kind="success">{notice}</Feedback>}
  <div className="uatStatStrip" aria-label="Agent review totals">
   <div className="uatStat"><span>Awaiting review</span><strong>{counts("PENDING")}</strong></div>
   <div className="uatStat"><span>Active agents</span><strong>{counts("ACTIVE")}</strong></div>
   <div className="uatStat"><span>Suspended</span><strong>{counts("SUSPENDED")}</strong></div>
  </div>
  <div className="uatPageHeading"><div><h2>Review queue</h2><p>Showing {visible.length} of {agents.length} agent accounts.</p></div><ShieldCheck color="#087a4b" aria-hidden="true"/></div>
  <div className="uatFilters">
   <label htmlFor="agent-search"><Search size={14}/> Search agents
    <input id="agent-search" type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, referral code or area"/>
   </label>
   <label htmlFor="agent-filter">Status
    <select id="agent-filter" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">All statuses</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
    </select>
   </label>
  </div>
  {!loading&&!error&&visible.length===0&&<div className="uatEmptyState"><UsersRound size={28} aria-hidden="true"/><h3>No matching agents</h3><p>Adjust your filters or check back when new applications arrive.</p></div>}
  <div className="adminModules">{visible.map(x=><article key={x.id}>
   <h3>{x.fullName}</h3>
   <span className="uatBadge" data-state={x.status.toLowerCase()}>{x.status.toLowerCase().replace("_"," ")}</span>
   <p><strong>Referral code:</strong> {x.agentCode}</p>
   {x.geographyNote&&<p><strong>Service area:</strong> {x.geographyNote}</p>}
   <p><strong>Registered:</strong> {new Date(x.createdAt).toLocaleDateString("en-IN")}</p>
   {x.status==="PENDING"&&<button disabled={!!busy} onClick={()=>setIntent({agent:x,decision:"APPROVE"})}>Review and approve</button>}
   {x.status==="ACTIVE"&&<button disabled={!!busy} onClick={()=>setIntent({agent:x,decision:"SUSPEND"})}>Suspend access</button>}
  </article>)}</div>
  {intent&&<ConfirmDialog
   title={intent.decision==="APPROVE"?"Approve this agent?":"Suspend this agent?"}
   description={intent.decision==="APPROVE"?`This will approve ${intent.agent.fullName}. Verify their eligibility before continuing.`:`Suspending ${intent.agent.fullName} can stop their agent activities. Existing history is retained.`}
   confirmLabel={intent.decision==="APPROVE"?"Approve agent":"Suspend agent"}
   danger={intent.decision==="SUSPEND"} busy={!!busy} onCancel={()=>setIntent(null)} onConfirm={()=>void decide()}
  />}
 </section></main>;
}
