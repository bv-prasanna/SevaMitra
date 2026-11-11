"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";

const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
type Row={id:string;name:string;geoScope:string;geoId:string|null;targetScope:string;targetId:string|null;priority:number;enabled:boolean;
 component?:string;rateBps?:number;adjustment?:string;value?:string;validFrom?:string|null;validTo?:string|null;startTime?:string|null;endTime?:string|null;weekdays?:number[]};
type Option={id:string;name:string;isActive?:boolean};
type Invoice={id:string;bookingId:string;invoiceNumber:string|null;status:string;createdAt:string};
type Issuer={issuerCode:string;providerId?:string|null;legalName:string;address:string;stateCode:string;gstin?:string;verified:boolean;sacCode?:string;authorizedSignatory?:string};
const geoLevels=["ALL","STATE","DISTRICT","TALUK","TOWN"],targetLevels=["ALL","CATEGORY","SERVICE","VARIANT","OFFERING"];
const emptyScope={geoScope:"ALL",geoId:"",targetScope:"ALL",targetId:"",name:"",priority:0,enabled:false,validFrom:"",validTo:""};
function GeoPicker({level,value,onChange}:{level:string;value:string;onChange:(x:string)=>void}){
 const[states,setStates]=useState<Option[]>([]),[districts,setDistricts]=useState<Option[]>([]),[taluks,setTaluks]=useState<Option[]>([]),[towns,setTowns]=useState<Option[]>([]);
 const[state,setState]=useState(""),[district,setDistrict]=useState(""),[taluk,setTaluk]=useState("");
 useEffect(()=>{void api.get<Option[]>("/geography/states").then(setStates).catch(()=>undefined)},[]);
 useEffect(()=>{setDistricts([]);setTaluks([]);setTowns([]);if(state)void api.get<Option[]>("/geography/districts?stateId="+state).then(setDistricts).catch(()=>undefined)},[state]);
 useEffect(()=>{setTaluks([]);setTowns([]);if(district)void api.get<Option[]>("/geography/taluks?districtId="+district).then(setTaluks).catch(()=>undefined)},[district]);
 useEffect(()=>{setTowns([]);if(taluk)void api.get<Option[]>("/geography/taluks/"+taluk+"/towns").then(setTowns).catch(()=>undefined)},[taluk]);
 if(level==="ALL")return <small>All configured locations</small>;
 const selector=(label:string,items:Option[],val:string,change:(v:string)=>void)=><label style={{display:"grid",gap:4}}>{label}<select value={val} onChange={e=>change(e.target.value)}>
  <option value="">Choose {label}</option>{!!val&&!items.some(x=>x.id===val)&&<option value={val}>Current selected ID</option>}
  {items.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>;
 return <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
  {selector("State",states,level==="STATE"?value:state,level==="STATE"?onChange:setState)}
  {["DISTRICT","TALUK","TOWN"].includes(level)&&selector("District",districts,level==="DISTRICT"?value:district,level==="DISTRICT"?onChange:setDistrict)}
  {["TALUK","TOWN"].includes(level)&&selector("Taluk",taluks,level==="TALUK"?value:taluk,level==="TALUK"?onChange:setTaluk)}
  {level==="TOWN"&&selector("Town/village",towns,value,onChange)}
 </div>;
}
function TargetPicker({level,value,onChange}:{level:string;value:string;onChange:(v:string)=>void}){
 const[categories,setCategories]=useState<Option[]>([]),[services,setServices]=useState<Option[]>([]),[variants,setVariants]=useState<Option[]>([]),[offerings,setOfferings]=useState<Option[]>([]),[service,setService]=useState("");
 useEffect(()=>{void Promise.all([api.get<Option[]>("/catalogue/categories"),api.get<Option[]>("/catalogue/services")]).then(([c,s])=>{setCategories(c);setServices(s)}).catch(()=>undefined)},[]);
 useEffect(()=>{if(service){void api.get<Option[]>("/catalogue/services/"+service+"/variants").then(setVariants).catch(()=>undefined);
 void api.get<Option[]>("/provider-offerings?serviceId="+service).then(setOfferings).catch(()=>undefined)}},[service]);
 if(level==="ALL")return <small>All services/items</small>;
 const list=level==="CATEGORY"?categories:level==="SERVICE"?services:level==="VARIANT"?variants:offerings;
 return <div style={{display:"grid",gap:5}}>
  {["VARIANT","OFFERING"].includes(level)&&<select value={service} onChange={e=>setService(e.target.value)}><option value="">Choose service first</option>{services.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>}
  <select value={value} onChange={e=>onChange(e.target.value)}><option value="">Choose {level.toLowerCase()}</option>
   {!!value&&!list.some(x=>x.id===value)&&<option value={value}>Current selected ID</option>}
   {list.map(x=><option value={x.id} key={x.id}>{x.name||x.id}</option>)}</select>
 </div>;
}
export default function FinanceAdmin(){
 const[taxes,setTaxes]=useState<Row[]>([]),[prices,setPrices]=useState<Row[]>([]),[invoices,setInvoices]=useState<Invoice[]>([]),[issuers,setIssuers]=useState<Issuer[]>([]);
 const[type,setType]=useState<"taxes"|"pricing">("taxes"),[editing,setEditing]=useState(""),[scope,setScope]=useState({...emptyScope});
 const[component,setComponent]=useState("CGST"),[bps,setBps]=useState("0"),[adjustment,setAdjustment]=useState("PERCENT_UP"),[value,setValue]=useState("0"),[start,setStart]=useState(""),[end,setEnd]=useState(""),[weekdays,setWeekdays]=useState("");
 const[issuer,setIssuer]=useState<Issuer>({issuerCode:"",legalName:"",address:"",stateCode:"29",verified:false});
 const[pos,setPos]=useState("29"),[verificationNote,setVerificationNote]=useState(""),[message,setMessage]=useState("Loading…"),[busy,setBusy]=useState(false);
 async function load(){
  try{const [t,p,i,u]=await Promise.all([
   api.get<Row[]>("/finance/config/taxes"),api.get<Row[]>("/finance/config/pricing"),
   api.get<Invoice[]>("/billing/admin/invoices"),api.get<Issuer[]>("/billing/admin/issuers")]);
   setTaxes(t);setPrices(p);setInvoices(i);setIssuers(u);setMessage("");
  }catch(e){setMessage(e instanceof Error?e.message:"Finance access required")}
 }
 useEffect(()=>{void load()},[]);
 function selectRow(r:Row,isTax:boolean){
  setType(isTax?"taxes":"pricing");setEditing(r.id);
  setScope({name:r.name,geoScope:r.geoScope,geoId:r.geoId??"",targetScope:r.targetScope,targetId:r.targetId??"",
   priority:r.priority,enabled:r.enabled,validFrom:r.validFrom?.slice(0,16)??"",validTo:r.validTo?.slice(0,16)??""});
  setComponent(r.component??"CGST");setBps(String(r.rateBps??0));setAdjustment(r.adjustment??"PERCENT_UP");setValue(String(r.value??0));
  setStart(r.startTime??"");setEnd(r.endTime??"");setWeekdays((r.weekdays??[]).join(","));
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function clear(){setEditing("");setScope({...emptyScope});setStart("");setEnd("");setWeekdays("");}
 async function save(){
  setBusy(true);setMessage("");
  try{
   const base={...scope,geoId:scope.geoScope==="ALL"?null:scope.geoId,
    targetId:scope.targetScope==="ALL"?null:scope.targetId,
    validFrom:scope.validFrom?new Date(scope.validFrom).toISOString():null,
    validTo:scope.validTo?new Date(scope.validTo).toISOString():null};
   const body=type==="taxes"?{...base,component,rateBps:Number(bps)}:
    {...base,adjustment,value:Number(value),startTime:start||null,endTime:end||null,
     weekdays:weekdays.trim()?weekdays.split(",").map(Number):[]};
   if(!body.name.trim())throw new Error("Enter rule name");
   if((scope.geoScope!=="ALL"&&!scope.geoId)||(scope.targetScope!=="ALL"&&!scope.targetId))
    throw new Error("Select the required geographical area and service/item");
   if(editing)await api.patch("/finance/config/"+type+"/"+editing,body);
   else await api.post("/finance/config/"+type,body);
   clear();await load();setMessage("Rule saved");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to save rule")}finally{setBusy(false)}
 }
 async function retire(r:Row,kind:"taxes"|"pricing"){
  if(!window.confirm("Disable "+r.name+"? Historic booking prices will remain unchanged."))return;
  try{await api.delete("/finance/config/"+kind+"/"+r.id);await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to retire rule")}
 }
 async function saveIssuer(){
  setBusy(true);try{await api.post("/billing/admin/issuers",issuer);await load();setMessage("Supplier configuration saved")}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to save supplier")}finally{setBusy(false)}
 }
 async function issue(x:Invoice){
  if(!window.confirm("Issue immutable tax invoice for "+x.bookingId+"? Finance review must already be approved."))return;
  setBusy(true);try{await api.post("/billing/admin/invoices/"+x.id+"/issue",{placeOfSupplyStateCode:pos,verificationNote});await load();setMessage("Invoice issued")}
  catch(e){setMessage(e instanceof Error?e.message:"Cannot issue without verified GST assessment")}finally{setBusy(false)}
 }
 const ruleRows=(rows:Row[],tax:boolean)=><div className="adminModules">{rows.map(r=><article key={r.id}><h3>{r.name}</h3>
  <p>{r.geoScope}{r.geoId?" · "+r.geoId:""} / {r.targetScope}{r.targetId?" · "+r.targetId:""}</p>
  <p>{tax?r.component+" "+(Number(r.rateBps)/100).toFixed(2)+"%":r.adjustment+" "+r.value}</p>
  <p>{r.enabled?"Active":"Disabled"} · Priority {r.priority}</p>
  <button onClick={()=>selectRow(r,tax)}>Edit</button> <button disabled={!r.enabled} onClick={()=>void retire(r,tax?"taxes":"pricing")}>Disable</button>
 </article>)}</div>;
 return <main><section className="workspace">
  <div className="workspaceTop"><div><div className="pill">Finance administration</div><h1>Tax, dynamic pricing & billing</h1>
   <p>Rules are reviewed by authorized finance staff. No GST rate is preconfigured. Disabled rules do not affect new quotes; issued invoices remain immutable.</p></div>
   <Link href="/admin">Back to admin</Link></div>
  {!!message&&<p role="status">{message}</p>}
  <h2>{editing?"Edit":"Add"} tax or pricing rule</h2>
  <div className="adminModules"><article style={{minWidth:280}}>
   <label>Rule type<select value={type} onChange={e=>{clear();setType(e.target.value as "taxes"|"pricing")}}><option value="taxes">Tax</option><option value="pricing">Dynamic pricing</option></select></label>
   <label>Rule name<input value={scope.name} onChange={e=>setScope({...scope,name:e.target.value})} maxLength={120}/></label>
   <label>Geographic level<select value={scope.geoScope} onChange={e=>setScope({...scope,geoScope:e.target.value,geoId:""})}>{geoLevels.map(x=><option key={x}>{x}</option>)}</select></label>
   <GeoPicker level={scope.geoScope} value={scope.geoId} onChange={geoId=>setScope({...scope,geoId})}/>
   <label>Service/item level<select value={scope.targetScope} onChange={e=>setScope({...scope,targetScope:e.target.value,targetId:""})}>{targetLevels.map(x=><option key={x}>{x}</option>)}</select></label>
   <TargetPicker level={scope.targetScope} value={scope.targetId} onChange={targetId=>setScope({...scope,targetId})}/>
   {type==="taxes"?<><label>Tax component<select value={component} onChange={e=>setComponent(e.target.value)}>{["CGST","SGST","IGST","CESS"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Rate in basis points (900 = 9%)<input type="number" min={0} max={10000} value={bps} onChange={e=>setBps(e.target.value)}/></label></>:
   <><label>Adjustment<select value={adjustment} onChange={e=>setAdjustment(e.target.value)}>{["PERCENT_UP","PERCENT_DOWN","AMOUNT_UP","AMOUNT_DOWN"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label>Value (% or INR)<input type="number" min={0} value={value} onChange={e=>setValue(e.target.value)}/></label>
   <label>Local start time<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label>Local end time<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   <label>Weekdays (0=Sun through 6=Sat, comma separated)<input value={weekdays} onChange={e=>setWeekdays(e.target.value)} placeholder="1,2,3,4,5"/></label></>}
   <label>Priority<input type="number" min={-100} max={100} value={scope.priority} onChange={e=>setScope({...scope,priority:Number(e.target.value)})}/></label>
   <label>Effective from<input type="datetime-local" value={scope.validFrom} onChange={e=>setScope({...scope,validFrom:e.target.value})}/></label>
   <label>Effective until<input type="datetime-local" value={scope.validTo} onChange={e=>setScope({...scope,validTo:e.target.value})}/></label>
   <label><input type="checkbox" checked={scope.enabled} onChange={e=>setScope({...scope,enabled:e.target.checked})}/> Enabled (requires finance verification)</label>
   <p><button disabled={busy} onClick={()=>void save()}>{editing?"Save changes":"Create rule"}</button> {editing&&<button onClick={clear}>Cancel edit</button>}</p>
  </article></div>
  <h2>Tax rules ({taxes.length})</h2>{ruleRows(taxes,true)}
  <h2>Dynamic pricing rules ({prices.length})</h2>{ruleRows(prices,false)}
  <h2>Supplier/issuer configuration</h2>
  <p>Only verified supplier details may be used to issue a numbered tax invoice. Existing invoices are never rewritten.</p>
  <div className="adminModules"><article>
   {(["issuerCode","providerId","legalName","address","stateCode","gstin","sacCode","authorizedSignatory"] as const).map(field=><label key={field}>{field}<input
    value={String(issuer[field]??"")} onChange={e=>setIssuer({...issuer,[field]:e.target.value})}/></label>)}
   <label><input type="checkbox" checked={issuer.verified} onChange={e=>setIssuer({...issuer,verified:e.target.checked})}/> Finance verified</label>
   <button disabled={busy} onClick={()=>void saveIssuer()}>Save supplier</button>
  </article></div>
  <h3>Configured suppliers</h3><div className="adminModules">{issuers.map(x=><article key={x.issuerCode}>
   <b>{x.issuerCode} · {x.legalName}</b><p>{x.providerId||"Platform"}</p><p>{x.verified?"Verified":"Not verified"}</p>
   <button onClick={()=>setIssuer(x)}>Edit</button></article>)}</div>
  <h2>Invoices awaiting finance review</h2>
  <label>Place-of-supply GST state code<input maxLength={2} value={pos} onChange={e=>setPos(e.target.value)}/></label>
  <label>Verification note<input maxLength={100} value={verificationNote} onChange={e=>setVerificationNote(e.target.value)}/></label>
  <div className="adminModules">{invoices.map(x=><article key={x.id}><h3>{x.invoiceNumber||"Pro-forma"}</h3><p>Booking: {x.bookingId}</p><p>Status: {x.status}</p>
   {x.status==="PRO_FORMA"&&<button disabled={busy||!verificationNote.trim()} onClick={()=>void issue(x)}>Issue tax invoice</button>}
  </article>)}</div>
 </section></main>;
}
