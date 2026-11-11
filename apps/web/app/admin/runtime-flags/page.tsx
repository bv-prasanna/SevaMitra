"use client";
import {useCallback,useEffect,useState} from "react";
import Feedback from "../../components/Feedback";
import ConfirmDialog from "../../components/ConfirmDialog";
import {ApiClient} from "@sevamitra/api-client";

type Flag={key:string;enabled:boolean;reason:string;updatedBy:string;updatedAt:string};
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",
 ()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validControlKey(key:string){
 if(key==="bookings.enabled"||key==="pilot.enabled")return true;
 const segments=key.split(".");
 return segments.length===3&&(segments[0]==="service"||segments[0]==="geography")&&idPattern.test(segments[1]??"")&&segments[2]==="enabled";
}
const EXAMPLES=[
 {key:"bookings.enabled",hint:"false temporarily stops all new bookings"},
 {key:"pilot.enabled",hint:"true restricts bookings to expressly enabled geography UUIDs"},
 {key:"service.<uuid>.enabled",hint:"false disables new bookings for a service UUID"},
 {key:"geography.<uuid>.enabled",hint:"true allows a pilot town/village UUID; false blocks it"},
];
export default function RuntimeFlags(){
 const[flags,setFlags]=useState<Flag[]>([]);
 const[key,setKey]=useState("bookings.enabled");
 const[enabled,setEnabled]=useState(false);
 const[reason,setReason]=useState("");
 const[busy,setBusy]=useState(false);
 const[loading,setLoading]=useState(true);
 const[notice,setNotice]=useState("");
 const[error,setError]=useState("");
 const[confirming,setConfirming]=useState(false);
 const load=useCallback(async():Promise<boolean>=>{
  setLoading(true);setError("");
  try{const rows=await api.get<Flag[]>("/runtime-flags");setFlags(Array.isArray(rows)?rows:[]);return true}
  catch(e){setFlags([]);setError(e instanceof Error?e.message:"Could not load runtime flags. Check permission and retry.");return false}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 function save(){
  const normalized=key.trim().toLowerCase();
  setNotice("");setError("");
  if(!validControlKey(normalized)){setError("Use bookings.enabled, pilot.enabled, service.<valid UUID>.enabled or geography.<valid UUID>.enabled.");return}
  if(reason.trim().length<8){setError("Enter an operational reason of at least eight characters.");return}
  setConfirming(true);
 }
 async function apply(){
  const normalized=key.trim().toLowerCase();
  setConfirming(false);
  if(!validControlKey(normalized)||reason.trim().length<8){setError("Invalid control or audit reason. Nothing was changed.");return}
  setBusy(true);setError("");setNotice("");
  try{
   await api.put(`/runtime-flags/${encodeURIComponent(normalized)}`,{enabled,reason:reason.trim()});
   setReason("");const confirmed=await load();
   if(confirmed)setNotice("Flag updated. Verify new booking eligibility; existing bookings remain unchanged.");
   else setError("Flag update was submitted, but the latest values could not be confirmed. Do not retry blindly.");
  }catch(e){setError(e instanceof Error?e.message:"Could not update the flag.")}
  finally{setBusy(false)}
 }
 return <main>
  
  <section className="workspace">
   <div className="workspaceTop"><div><div className="pill">Restricted operations</div><h1>Pilot and emergency controls</h1>
    <p>Operations-only, audited runtime switches. Only users authorized to manage IAM roles may change these interim controls.</p></div>
    <button disabled={busy||loading} onClick={()=>void load()}>{loading?"Loading…":"Refresh controls"}</button></div>
   <p><strong>Emergency:</strong> disable <code>bookings.enabled</code> to stop new bookings. Existing bookings and financial obligations remain active.</p>
   {error&&<Feedback kind="error">{error}</Feedback>}{notice&&<Feedback kind="success">{notice}</Feedback>}
   <article style={{maxWidth:720}}>
    <label htmlFor="flag-key">Flag key</label>
    <input id="flag-key" value={key} onChange={e=>setKey(e.target.value)} maxLength={128} placeholder="bookings.enabled"/>
    <label htmlFor="flag-enabled">Desired value</label>
    <select id="flag-enabled" value={String(enabled)} onChange={e=>setEnabled(e.target.value==="true")}>
     <option value="false">Disabled (false)</option><option value="true">Enabled (true)</option>
    </select>
    <label htmlFor="flag-reason">Reason (required for audit)</label>
    <input id="flag-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} placeholder="Why is this operational change required?"/>
    <button disabled={busy||reason.trim().length<8||!validControlKey(key.trim().toLowerCase())} className="primary" onClick={save}>Review runtime flag change</button>
   </article>
   <h2>Current overrides</h2>
   {!loading&&!error&&!flags.length&&<div className="uatEmptyState"><h3>No overrides are set</h3><p>Normal eligibility rules apply.</p></div>}
   <div className="adminModules">{flags.map(x=><article key={x.key}>
     <h3>{x.key}</h3><p><span className="uatBadge" data-state={x.enabled?"active":"inactive"}>{x.enabled?"Enabled":"Disabled"}</span></p>
     <p>Reason: {x.reason}</p><p>By: {x.updatedBy}</p><p>Updated: {new Date(x.updatedAt).toLocaleString()}</p>
     <button onClick={()=>{setKey(x.key);setEnabled(!x.enabled);setReason("")}}>Prepare opposite value</button>
    </article>)}</div>
   <h2>Supported control keys</h2>
   <ul>{EXAMPLES.map(x=><li key={x.key}><code>{x.key}</code> — {x.hint}</li>)}</ul>
   <p>Pilot mode denies geographies not explicitly enabled. Switches affect new bookings only; no existing booking is cancelled. Two-person approvals and automatic flag expiry are pending.</p>
   {confirming&&<ConfirmDialog title="Confirm operational change" description={`Set ${key.trim().toLowerCase()} to ${enabled?"ENABLED":"DISABLED"}? New bookings will be affected immediately. Reason: ${reason.trim()}`} confirmLabel="Apply change" danger={!enabled} busy={busy} onCancel={()=>setConfirming(false)} onConfirm={()=>void apply()}/>}
  </section>
 </main>;
}
