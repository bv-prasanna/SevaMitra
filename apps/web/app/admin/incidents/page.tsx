"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
type Incident={id:string;title:string;category:string;status:string;severity:string;level:number;assignedToId:string|null;acknowledgeDueAt:string|null;resolveDueAt:string|null;createdAt:string};
type Policy={id:string;severity:string;acknowledgeMinutes:number;resolveMinutes:number;escalationMinutes:number;isActive:boolean};
type Access={admin:boolean;adminPermissions?:string[]};
export default function IncidentAdmin(){
 const[items,setItems]=useState<Incident[]>([]),[policies,setPolicies]=useState<Policy[]>([]),[canManage,setCanManage]=useState(false),[canSla,setCanSla]=useState(false);
 const[severity,setSeverity]=useState("P2"),[ack,setAck]=useState("15"),[resolve,setResolve]=useState("240"),[escalate,setEscalate]=useState("30");
 const[notes,setNotes]=useState<Record<string,string>>({}),[message,setMessage]=useState("Loading incident operations…"),[busy,setBusy]=useState(false);
 async function load(){
  try{
   const access=await api.get<Access>("/auth/workspaces");const p=access.adminPermissions??[];
   const manage=p.includes("*")||p.includes("incident.manage"),sla=p.includes("*")||p.includes("incident.sla.manage");
   setCanManage(manage);setCanSla(sla);
   if(!manage&&!sla){setItems([]);setPolicies([]);setMessage("Your account does not have permission to access incident operations.");return}
   const results=await Promise.all([
    manage?api.get<Incident[]>("/incidents/admin"):Promise.resolve([] as Incident[]),
    sla?api.get<Policy[]>("/incidents/admin/sla"):Promise.resolve([] as Policy[]),
   ]);
   setItems(results[0]);setPolicies(results[1]);setMessage(results[0].length?"":"No incidents are currently waiting for operations.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to load incident operations")}
 }
 useEffect(()=>{void load()},[]);
 async function act(id:string,kind:"claim"|"escalate"|"status",status?:string){
  const note=notes[id]?.trim()|| (kind==="claim"?"Claimed by incident reviewer":"");
  if(kind!=="claim"&&!note){setMessage("Enter an audit note before changing or escalating an incident.");return}
  setBusy(true);
  try{
   if(kind==="claim")await api.patch("/incidents/admin/"+id+"/claim",{});
   else if(kind==="escalate")await api.post("/incidents/admin/"+id+"/escalate",{note});
   else await api.patch("/incidents/admin/"+id+"/status",{status,note});
   await load();setMessage("Incident updated successfully.");
  }catch(e){setMessage(e instanceof Error?e.message:"Incident update failed")}finally{setBusy(false)}
 }
 async function savePolicy(event:FormEvent){
  event.preventDefault();setBusy(true);
  try{
   await api.put("/incidents/admin/sla",{severity,acknowledgeMinutes:Number(ack),resolveMinutes:Number(resolve),escalationMinutes:Number(escalate),isActive:true});
   await load();setMessage("SLA policy saved. New incidents will use this policy; existing incidents retain their original policy snapshot.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to save SLA policy")}finally{setBusy(false)}
 }
 async function disablePolicy(value:string){
  if(!window.confirm("Disable the "+value+" SLA policy? Existing cases keep their assigned deadlines."))return;
  setBusy(true);try{await api.delete("/incidents/admin/sla/"+value);await load();setMessage(value+" SLA policy disabled.");}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to disable SLA policy")}finally{setBusy(false)}
 }
 return <main><section className="workspace incidentAdmin">
  <div className="workspaceTop"><div><div className="pill">Operations console</div><h1>Incident management</h1><p>Track customer/provider issues, claim ownership, record decisions and configure severity-based response deadlines.</p></div><Link href="/admin">Back to administration</Link></div>
  <p role="status" aria-live="polite">{message}</p>
  {canSla&&<section className="appReleaseForm"><h2>Severity SLA policies</h2><p>These timings are configurable business settings, not hard-coded defaults. Values are elapsed minutes; approve the targets with operations before enabling them.</p>
   <form onSubmit={savePolicy} className="formGrid">
    <label>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}>{["P0","P1","P2","P3"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Acknowledge within (minutes)<input type="number" min="1" max="10080" required value={ack} onChange={e=>setAck(e.target.value)}/></label>
    <label>Resolve within (minutes)<input type="number" min="1" max="10080" required value={resolve} onChange={e=>setResolve(e.target.value)}/></label>
    <label>Escalation interval (minutes)<input type="number" min="1" max="10080" required value={escalate} onChange={e=>setEscalate(e.target.value)}/></label>
    <div className="formWide"><button disabled={busy}>Save SLA policy</button></div>
   </form>
   <div className="adminModules">{policies.map(x=><article key={x.id}><h3>{x.severity} · {x.isActive?"Active":"Disabled"}</h3><p>Acknowledge: {x.acknowledgeMinutes} min</p><p>Resolve: {x.resolveMinutes} min</p><p>Escalate: {x.escalationMinutes} min</p>{x.isActive&&<button disabled={busy} onClick={()=>void disablePolicy(x.severity)}>Disable policy</button>}</article>)}</div>
  </section>}
  {canManage&&<><h2>Support cases ({items.length})</h2><div className="adminModules">{items.map(item=><article key={item.id}>
   <div className="pill">{item.severity} · L{item.level}</div><h3>{item.title}</h3><p>{item.category} · {item.status}</p><p>Opened {new Date(item.createdAt).toLocaleString()}</p><p>Assigned: {item.assignedToId||"Unclaimed"}</p>
   {item.acknowledgeDueAt&&<p>Acknowledge due: {new Date(item.acknowledgeDueAt).toLocaleString()}</p>}
   {item.resolveDueAt&&<p>Resolve due: {new Date(item.resolveDueAt).toLocaleString()}</p>}
   <label>Audit note<textarea rows={2} maxLength={1000} value={notes[item.id]??""} onChange={e=>setNotes(x=>({...x,[item.id]:e.target.value}))}/></label>
   <div className="releaseActions">
    {item.status==="OPEN"&&!item.assignedToId&&<button disabled={busy} onClick={()=>void act(item.id,"claim")}>Claim</button>}
    {item.status!=="CLOSED"&&item.level<3&&<button disabled={busy} onClick={()=>void act(item.id,"escalate")}>Escalate</button>}
    {item.status==="ACKNOWLEDGED"&&<button disabled={busy} onClick={()=>void act(item.id,"status","IN_PROGRESS")}>Start work</button>}
    {item.status==="IN_PROGRESS"&&<button disabled={busy} onClick={()=>void act(item.id,"status","RESOLVED")}>Resolve</button>}
    {item.status==="RESOLVED"&&<button disabled={busy} onClick={()=>void act(item.id,"status","CLOSED")}>Close</button>}
   </div>
  </article>)}</div></>}
 </section></main>;
}
