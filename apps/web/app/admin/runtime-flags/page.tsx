"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";

type Flag={key:string;enabled:boolean;reason:string;updatedBy:string;updatedAt:string};
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",
 ()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
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
 const[notice,setNotice]=useState("Loading operational controls…");
 const load=useCallback(async()=>{
  try{const rows=await api.get<Flag[]>("/runtime-flags");setFlags(rows);setNotice("")}
  catch(e){setNotice(e instanceof Error?e.message:"Could not load runtime flags; sign in as an authorized admin.")}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function save(){
  const normalized=key.trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._-]{1,127}$/.test(normalized)){
   setNotice("Use a valid feature key such as bookings.enabled, service.<UUID>.enabled, or geography.<UUID>.enabled.");return;
  }
  if(reason.trim().length<8){setNotice("Enter an operational reason of at least eight characters.");return}
  if(!window.confirm(`Set ${normalized} to ${enabled?"ENABLED":"DISABLED"}? This changes live booking eligibility without redeployment.`))return;
  setBusy(true);setNotice("");
  try{
   await api.put(`/runtime-flags/${encodeURIComponent(normalized)}`,{enabled,reason:reason.trim()});
   setReason("");await load();setNotice("Flag updated; server-side booking eligibility now uses the new value.");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not update flag")}
  finally{setBusy(false)}
 }
 return <main>
  <header className="nav"><Link href="/admin" className="brand">← SevaMitra Admin</Link><Link href="/workspaces">Workspaces</Link></header>
  <section className="workspace">
   <div className="workspaceTop"><div><h1>Pilot and emergency controls</h1>
    <p>Operations-only, audited runtime switches. Only users authorized to manage IAM roles may change these interim controls.</p></div>
    <button onClick={()=>void load()}>Refresh</button></div>
   <p><strong>Emergency:</strong> disable <code>bookings.enabled</code> to stop new bookings. Existing bookings and financial obligations remain active.</p>
   {!!notice&&<p role="status">{notice}</p>}
   <div style={{display:"grid",gap:12,maxWidth:620,marginBottom:24}}>
    <label htmlFor="flag-key">Flag key</label>
    <input id="flag-key" value={key} onChange={e=>setKey(e.target.value)} maxLength={128} placeholder="bookings.enabled"/>
    <label htmlFor="flag-enabled">Desired value</label>
    <select id="flag-enabled" value={String(enabled)} onChange={e=>setEnabled(e.target.value==="true")}>
     <option value="false">Disabled (false)</option><option value="true">Enabled (true)</option>
    </select>
    <label htmlFor="flag-reason">Reason (required for audit)</label>
    <input id="flag-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} placeholder="Why is this operational change required?"/>
    <button disabled={busy||reason.trim().length<8} className="primary" onClick={()=>void save()}>Save runtime flag</button>
   </div>
   <h2>Current overrides</h2>
   {!flags.length&&<p>No overrides are set; normal eligibility rules apply.</p>}
   <div className="adminModules">{flags.map(x=><article key={x.key}>
     <h3>{x.key}</h3><p><strong>{x.enabled?"Enabled":"Disabled"}</strong></p>
     <p>Reason: {x.reason}</p><p>By: {x.updatedBy}</p><p>Updated: {new Date(x.updatedAt).toLocaleString()}</p>
     <button onClick={()=>{setKey(x.key);setEnabled(!x.enabled);setReason("")}}>Prepare opposite value</button>
    </article>)}</div>
   <h2>Supported control keys</h2>
   <ul>{EXAMPLES.map(x=><li key={x.key}><code>{x.key}</code> — {x.hint}</li>)}</ul>
   <p>Pilot mode denies geographies not explicitly enabled. Switches affect new bookings only; no existing booking is cancelled. Two-person approvals and automatic flag expiry are pending.</p>
  </section>
 </main>;
}
