"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient,type GeoArea,type ActiveService,type DiscoveredOffering,type BookingCreate} from "@sevamitra/api-client";

const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";
type BookingResponse={id:string;status:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function Discover(){
 const[locating,setLocating]=useState(false),[locationNote,setLocationNote]=useState(""),[serviceId,setServiceId]=useState(""),[name,setName]=useState(""),[states,setStates]=useState<GeoArea[]>([]),[districts,setDistricts]=useState<GeoArea[]>([]),[taluks,setTaluks]=useState<GeoArea[]>([]),[towns,setTowns]=useState<GeoArea[]>([]),[state,setState]=useState(""),[district,setDistrict]=useState(""),[taluk,setTaluk]=useState(""),[town,setTown]=useState("");
 const[strategy,setStrategy]=useState<"RANKED"|"ROUND_ROBIN"|"BROADCAST">("RANKED"),[results,setResults]=useState<DiscoveredOffering[]>([]),[message,setMessage]=useState("Select your service area to find verified providers."),[busy,setBusy]=useState(false),[selected,setSelected]=useState(""),[date,setDate]=useState(""),[start,setStart]=useState(""),[end,setEnd]=useState(""),[notes,setNotes]=useState(""),[confirmed,setConfirmed]=useState<BookingResponse|null>(null);
 const api=new ApiClient(base,()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 const showError=(e:unknown)=>{if((e as {status?:number}).status===401)return "Please sign in before finding local providers.";return e instanceof Error?e.message:"Unable to load data";};
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get("serviceId")||"";
  setServiceId(id);
  if(!uuid.test(id)){setMessage("Please choose a service from the catalogue.");return}
  void Promise.all([api.get<ActiveService>(`/catalogue/services/${id}`),api.get<GeoArea[]>("/geography/states")]).then(([svc,geo])=>{
   if(!svc.isActive){setMessage("This service is not currently available.");return}
   setName(svc.name);setStates(geo.filter(x=>x.isActive));setMessage("Choose your town/village and click Find providers.");
  }).catch(e=>setMessage(showError(e)));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function useMyLocation(promptForPermission:boolean){
  if(!navigator.geolocation){setLocationNote("Location is not available in this browser. Select your area manually.");return}
  setLocating(true);setLocationNote("Detecting your location…");
  try{
   if(!promptForPermission&&navigator.permissions?.query){
    const permission=await navigator.permissions.query({name:"geolocation"});
    if(permission.state!=="granted"){setLocationNote("Select Use my location or choose your area manually.");return}
   }
   const pos=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:8000,maximumAge:120000}));
   // OpenStreetMap Nominatim performs an on-demand reverse lookup. Never send coordinates until location permission is granted.
   const params=new URLSearchParams({format:"jsonv2",lat:String(pos.coords.latitude),lon:String(pos.coords.longitude),zoom:"18",addressdetails:"1"});
   const response=await fetch("https://nominatim.openstreetmap.org/reverse?"+params,{headers:{"Accept":"application/json"}});
   if(!response.ok)throw new Error("Location lookup unavailable");
   const result=await response.json() as {address?:{postcode?:string}};
   const pin=result.address?.postcode?.match(/\b\d{6}\b/)?.[0];
   if(!pin)throw new Error("Could not identify a supported postal area");
   const statesList=states.length?states:await api.get<GeoArea[]>("/geography/states");
   let found=false;
   for(const st of statesList.filter(x=>x.isActive&&x.name.toLowerCase()==="karnataka")){
    const ds=await api.get<GeoArea[]>("/geography/districts",{query:{stateId:st.id}});
    for(const d of ds.filter(x=>x.isActive)){
     const ts=await api.get<GeoArea[]>("/geography/taluks",{query:{districtId:d.id}});
     for(const t of ts.filter(x=>x.isActive)){
      const townsList=await api.get<GeoArea[]>(`/geography/taluks/${t.id}/towns`);
      const matches=townsList.filter(x=>x.isActive&&x.pincode===pin);
      if(matches.length){
       setStates(statesList);setState(st.id);setDistricts(ds);setDistrict(d.id);setTaluks(ts);setTaluk(t.id);setTowns(townsList);setTown(matches[0].id);
       setResults([]);setSelected("");setLocationNote(`Detected PIN ${pin}. You can change the area below.`);
       found=true;break;
      }
     }
     if(found)break;
    }
    if(found)break;
   }
   if(!found)setLocationNote(`Detected PIN ${pin}, but this locality is not configured yet. Please select a service area manually.`);
  }catch(e){setLocationNote(e instanceof Error?e.message+" — select an area manually.":"Select your area manually.")}
  finally{setLocating(false)}
 }
 useEffect(()=>{let active=true;void (async()=>{try{const result=await navigator.permissions?.query({name:"geolocation"});if(active&&result?.state==="granted")await useMyLocation(false)}catch{/* manual fallback */}})();return()=>{active=false}},[states.length]);
 const loadDistricts=async(id:string)=>{setState(id);setDistrict("");setTaluk("");setTown("");setDistricts([]);setTaluks([]);setTowns([]);setResults([]);try{if(id){const a=await api.get<GeoArea[]>("/geography/districts",{query:{stateId:id}});setDistricts(a.filter(x=>x.isActive))}}catch(e){setMessage(showError(e))}};
 const loadTaluks=async(id:string)=>{setDistrict(id);setTaluk("");setTown("");setTaluks([]);setTowns([]);setResults([]);try{if(id){const a=await api.get<GeoArea[]>("/geography/taluks",{query:{districtId:id}});setTaluks(a.filter(x=>x.isActive))}}catch(e){setMessage(showError(e))}};
 const loadTowns=async(id:string)=>{setTaluk(id);setTown("");setTowns([]);setResults([]);try{if(id){const a=await api.get<GeoArea[]>(`/geography/taluks/${id}/towns`);setTowns(a.filter(x=>x.isActive))}}catch(e){setMessage(showError(e))}};
 const find=useCallback(async()=>{
  if(!town||!serviceId)return;
  setBusy(true);setResults([]);setSelected("");setConfirmed(null);setMessage("Searching verified providers…");
  try{
   const data=await api.post<{matches:(DiscoveredOffering&{rank:number})[]}>("/discovery/matches",{serviceId,townVillageId:town,strategy,...(date&&start&&end?{scheduledDate:date,scheduledStartTime:start,scheduledEndTime:end}:{})});
   setResults(data.matches);setMessage(data.matches.length?`${data.matches.length} available offering(s) from verified providers.`:"No active verified provider is currently serving this area.");
  }catch(e){setMessage(showError(e))}finally{setBusy(false)}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[town,serviceId]);
 async function book(){
  if(!selected||!town||!date||!start||!end){setMessage("Choose a provider, date and start/end times.");return}
  if(start>=end){setMessage("End time must be after start time.");return}
  if(date<new Date().toLocaleDateString("en-CA")){setMessage("Choose a future date.");return}
  if(!window.confirm("Request this booking? The provider must accept it before service is confirmed."))return;
  setBusy(true);setMessage("");
  try{
   const payload:BookingCreate={offeringId:selected,townVillageId:town,scheduledDate:date,scheduledStartTime:start,scheduledEndTime:end,...(notes.trim()?{notes:notes.trim()}: {})};
   const booking=await api.post<BookingResponse>("/bookings/me",payload);
   setConfirmed(booking);setMessage("Booking request created. Track it in your customer workspace.");
  }catch(e){setMessage(showError(e))}finally{setBusy(false)}
 }
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Service discovery</small></div></Link><Link href="/marketplace">All services</Link></header>
 <section className="workspace"><h1>{name||"Find local professionals"}</h1><p>Only active, verified providers with approved service coverage are shown. Sign in to view providers and book.</p>
 <p>We use your current location only with your permission. For automatic detection, the approximate coordinates are sent to OpenStreetMap to identify your PIN. You may choose a different area below.</p><button type="button" className="primary" onClick={()=>void useMyLocation(true)} disabled={locating}>{locating?"Detecting location…":"Use my current location"}</button>{locationNote&&<p role="status">{locationNote}</p>}<div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"22px 0"}}>
  {([[states,state,(id:string)=>void loadDistricts(id),"State"],[districts,district,(id:string)=>void loadTaluks(id),"District"],[taluks,taluk,(id:string)=>void loadTowns(id),"Taluk"],[towns,town,(id:string)=>{setTown(id);setResults([]);setSelected("")},"Town/Village"]] as const).map(([options,current,onChange,label])=><label key={label} style={{display:"grid",gap:6,minWidth:180}}>{label}<select value={current} onChange={e=>onChange(e.target.value)}><option value="">Select {label}</option>{options.map(x=><option key={x.id} value={x.id}>{x.name}{x.pincode?` (${x.pincode})`:""}</option>)}</select></label>)}
 </div>
 <label style={{display:"grid",maxWidth:280,gap:6}}>Provider matching
 <select value={strategy} onChange={e=>setStrategy(e.target.value as "RANKED"|"ROUND_ROBIN"|"BROADCAST")}>
  <option value="RANKED">Ranked (coverage and price)</option>
  <option value="ROUND_ROBIN">Fair rotation (round robin)</option>
  <option value="BROADCAST">Show all eligible providers</option>
 </select></label>
 <button className="primary" disabled={busy||!town||!uuid.test(serviceId)} onClick={()=>void find()}>Find verified providers</button>
 {!!message&&<p role="status" style={{marginTop:14}}>{message}</p>}
 {!localStorageSafe()&&<p><Link href="/login">Sign in to continue →</Link></p>}
 {confirmed&&<article style={{padding:18,background:"#EAF7EE",borderRadius:12}}><h2>Request submitted</h2><p>Booking {confirmed.id} · {confirmed.status}</p><Link href="/customer">View my bookings →</Link></article>}
 <div className="adminModules" style={{marginTop:22}}>{results.map(o=><article key={o.id}><h3>{o.providerName}</h3><p>{o.pricingModel} · {o.amount===null?"Price on quote":`${o.currency} ${o.amount}`}</p>{o.visitFee&&<p>Visit fee: {o.currency} {o.visitFee}</p>}{o.notes&&<p>{o.notes}</p>}
 <button disabled={busy} onClick={()=>{setSelected(o.id);setConfirmed(null)}}>{selected===o.id?"Selected ✓":"Choose provider"}</button></article>)}</div>
 {selected&&!confirmed&&<article style={{padding:22,marginTop:20,border:"1px solid #DDE5DE",borderRadius:12}}><h2>Request a booking</h2><p>Date and time are validated against the provider's availability on the server.</p><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
  <label>Service date <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
  <label>Start time <input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
  <label>End time <input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
  <label>Notes (optional) <input maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  <button disabled={busy||!date||!start||!end} className="primary" onClick={()=>void book()}>Request booking</button>
 </article>}
 </section></main>;
}
function localStorageSafe(){return typeof window!=="undefined"&&!!localStorage.getItem("sevamitra_token")}
