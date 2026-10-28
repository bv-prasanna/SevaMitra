"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
type Service={id:string;name:string;isActive:boolean};
type Offering={id:string;serviceId:string;pricingModel:string;amount:string|null;visitFee:string|null;isActive:boolean};
type Hours={id:string;dayOfWeek:string;startTime:string;endTime:string;isActive:boolean};
type Area={id:string;name:string;isActive:boolean};
const days=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",
 ()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);
const show=(e:unknown)=>e instanceof Error?e.message:"Request failed";
export default function ProviderServiceManagement(){
 const[services,setServices]=useState<Service[]>([]),[offers,setOffers]=useState<Offering[]>([]),
 [hours,setHours]=useState<Hours[]>([]),[serviceId,setServiceId]=useState(""),
 [pricingModel,setPricingModel]=useState<"FIXED"|"STARTING_AT"|"HOURLY"|"DAILY"|"QUOTE_BASED">("FIXED"),
 [price,setPrice]=useState(""),[visitFee,setVisitFee]=useState(""),[notes,setNotes]=useState(""),
 [day,setDay]=useState("MONDAY"),[start,setStart]=useState("09:00"),[end,setEnd]=useState("18:00"),
 [states,setStates]=useState<Area[]>([]),[districts,setDistricts]=useState<Area[]>([]),
 [taluks,setTaluks]=useState<Area[]>([]),[towns,setTowns]=useState<Area[]>([]),
 [state,setState]=useState(""),[district,setDistrict]=useState(""),[taluk,setTaluk]=useState(""),[town,setTown]=useState(""),
 [radius,setRadius]=useState("15"),[coverage,setCoverage]=useState<{radiusKm:number}|null>(null),
 [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function load(){
  try{
   const results=await Promise.allSettled([
    api.get<Service[]>("/catalogue/services"),
    api.get<Offering[]>("/provider-offerings/me"),
    api.get<Hours[]>("/availability/working-hours/me"),
    api.get<Area[]>("/geography/states"),
    api.get<{radiusKm:number}>("/serviceability/coverage/me"),
   ]);
   if(results[0].status==="fulfilled")setServices(results[0].value.filter(s=>s.isActive));
   if(results[1].status==="fulfilled")setOffers(results[1].value);
   if(results[2].status==="fulfilled")setHours(results[2].value);
   if(results[3].status==="fulfilled")setStates(results[3].value.filter(s=>s.isActive));
   if(results[4].status==="fulfilled")setCoverage(results[4].value);
   setMessage(results[1].status==="rejected"?show(results[1].reason):"");
  }catch(e){setMessage(show(e))}
 }
 useEffect(()=>{void load()},[]);
 async function work(fn:()=>Promise<unknown>,success:string){
  setBusy(true);setMessage("");
  try{await fn();setMessage(success);await load()}catch(e){setMessage(show(e))}finally{setBusy(false)}
 }
 async function newOffer(){
  const amount=Number(price),fee=Number(visitFee);
  if(!serviceId){setMessage("Choose a service");return}
  if(pricingModel!=="QUOTE_BASED"&&(!price||!Number.isFinite(amount)||amount<0)){setMessage("Enter a valid service price");return}
  if(visitFee&&(!Number.isFinite(fee)||fee<0)){setMessage("Invalid visit fee");return}
  await work(()=>api.post("/provider-offerings/me",{
   serviceId,pricingModel,...(pricingModel!=="QUOTE_BASED"?{amount}:{}),
   ...(visitFee?{visitFee:fee}:{}),...(notes?{notes}:{}),currency:"INR",
  }),"Offering saved");
 }
 async function newHours(){
  if(!start||!end||start>=end){setMessage("Working-hours start must be earlier than end");return}
  await work(()=>api.post("/availability/working-hours/me",{dayOfWeek:day,startTime:start,endTime:end}),"Working hours saved");
 }
 async function changeArea(which:"state"|"district"|"taluk",id:string){
  try{
   if(which==="state"){setState(id);setDistrict("");setTaluk("");setTown("");setDistricts([]);setTaluks([]);setTowns([]);if(id)setDistricts((await api.get<Area[]>("/geography/districts",{query:{stateId:id}})).filter(x=>x.isActive))}
   if(which==="district"){setDistrict(id);setTaluk("");setTown("");setTaluks([]);setTowns([]);if(id)setTaluks((await api.get<Area[]>("/geography/taluks",{query:{districtId:id}})).filter(x=>x.isActive))}
   if(which==="taluk"){setTaluk(id);setTown("");setTowns([]);if(id)setTowns((await api.get<Area[]>(`/geography/taluks/${id}/towns`)).filter(x=>x.isActive))}
  }catch(e){setMessage(show(e))}
 }
 async function saveArea(){
  if(!town){setMessage("Select a town or village");return}
  const km=Number(radius);if(!Number.isFinite(km)||km<0||km>200){setMessage("Travel radius must be between 0 and 200 km");return}
  await work(()=>coverage?api.patch("/serviceability/coverage/me",{primaryTownVillageId:town,radiusKm:km})
   :api.post("/serviceability/coverage/me",{primaryTownVillageId:town,radiusKm:km}),
   "Coverage profile saved");
 }
 return <main><header className="nav"><Link href="/provider" className="brand">← Provider workspace</Link><Link href="/workspaces">Workspaces</Link></header>
 <section className="workspace"><h1>Services, working hours and coverage</h1><p>Manage the services you provide. Only verified and active providers appear in customer discovery.</p>
 {!!message&&<p role="status">{message}</p>}
 <h2>My services ({offers.length})</h2>
 <div className="adminModules">{offers.map(o=><article key={o.id}>
  <h3>{services.find(s=>s.id===o.serviceId)?.name||o.serviceId}</h3>
  <p>{o.pricingModel} · {o.amount===null?"Quote on request":`INR ${o.amount}`}</p>
  {o.visitFee&&<p>Visit fee: INR {o.visitFee}</p>}
  <p>{o.isActive?"Listed":"Paused"}</p>
  <button disabled={busy} onClick={()=>void work(()=>api.patch(`/provider-offerings/me/${o.id}`,{isActive:!o.isActive}),o.isActive?"Offering paused":"Offering activated")}>
  {o.isActive?"Pause offering":"Activate offering"}</button>
 </article>)}</div>
 <article style={{padding:18,border:"1px solid #D9E7DD",borderRadius:14,marginTop:20}}>
  <h3>Add a service</h3>
  <label>Service <select value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">Select a service</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label>Price type <select value={pricingModel} onChange={e=>setPricingModel(e.target.value as typeof pricingModel)}>{["FIXED","STARTING_AT","HOURLY","DAILY","QUOTE_BASED"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
  {pricingModel!=="QUOTE_BASED"&&<label>Amount (₹) <input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="499.00"/></label>}
  <label>Visit charge (optional) <input inputMode="decimal" value={visitFee} onChange={e=>setVisitFee(e.target.value)} placeholder="100.00"/></label>
  <label>Public notes (optional) <input maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Materials excluded"/></label>
  <button disabled={busy||!serviceId} onClick={()=>void newOffer()}>Save offering</button>
 </article>
 <h2 style={{marginTop:25}}>Weekly working hours</h2>
 <div className="adminModules">{hours.map(h=><article key={h.id}><h3>{h.dayOfWeek}</h3><p>{h.startTime}–{h.endTime} · {h.isActive?"Active":"Paused"}</p>
 <button disabled={busy} onClick={()=>void work(()=>api.patch(`/availability/working-hours/me/${h.id}`,{isActive:!h.isActive}),"Working hours updated")}>{h.isActive?"Pause":"Activate"}</button></article>)}</div>
 <article style={{padding:18,border:"1px solid #D9E7DD",borderRadius:14,marginTop:20}}>
  <label>Day <select value={day} onChange={e=>setDay(e.target.value)}>{days.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>From <input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
  <label>To <input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label>
  <button disabled={busy} onClick={()=>void newHours()}>Add working hours</button>
 </article>
 <h2 style={{marginTop:25}}>Service coverage</h2>
 <p>Current radius: {coverage?`${coverage.radiusKm} km`:"Not configured"}. Select your operating village/town and travel radius.</p>
 <article style={{padding:18,border:"1px solid #D9E7DD",borderRadius:14,marginTop:20}}>
  <label>State <select value={state} onChange={e=>void changeArea("state",e.target.value)}><option value="">Select state</option>{states.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
  <label>District <select value={district} onChange={e=>void changeArea("district",e.target.value)}><option value="">Select district</option>{districts.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
  <label>Taluk <select value={taluk} onChange={e=>void changeArea("taluk",e.target.value)}><option value="">Select taluk</option>{taluks.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
  <label>Town / Village <select value={town} onChange={e=>setTown(e.target.value)}><option value="">Select town</option>{towns.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
  <label>Travel radius (km) <input inputMode="decimal" value={radius} onChange={e=>setRadius(e.target.value)}/></label>
  <button disabled={busy||!town} onClick={()=>void saveArea()}>Save coverage</button>
 </article>
 </section></main>;
}
