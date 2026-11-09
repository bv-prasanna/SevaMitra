"use client";
import {useEffect,useRef,useState} from "react";
import {ApiClient} from "@sevamitra/api-client";
import Link from "next/link";
import {MapPin,Languages,Search,ShieldCheck,Star,Users,Sparkles,Zap,Droplets,HeartPulse,Wrench,GraduationCap,MoreHorizontal} from "lucide-react";
import {messages} from "@sevamitra/i18n";

const fallback=[
 {id:"cleaning",name:"Home Cleaning",Icon:Sparkles},{id:"electrician",name:"Electrician",Icon:Zap},{id:"plumber",name:"Plumber",Icon:Droplets},{id:"beauty",name:"Beauty & Wellness",Icon:HeartPulse},{id:"elder",name:"Elder Care",Icon:Users},{id:"repair",name:"Appliance Repair",Icon:Wrench},{id:"tutor",name:"Tutors",Icon:GraduationCap},{id:"more",name:"More Services",Icon:MoreHorizontal}
];
export default function Marketplace(){
 const[services,setServices]=useState<any[]>([]);const[pin,setPin]=useState("");const[query,setQuery]=useState("");const[searching,setSearching]=useState(false);const[status,setStatus]=useState("Enter a six-digit PIN code to see services available nearby.");const[kn,setKn]=useState(false);const[loggedIn,setLoggedIn]=useState(false);const t=kn?messages.kn:messages.en;const requestNumber=useRef(0);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"http://localhost:8080",()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 useEffect(()=>{setLoggedIn(!!localStorage.getItem("sevamitra_token"));const params=new URLSearchParams(window.location.search);const initialTerm=(params.get("query")||"").slice(0,100);const requestedPin=params.get("pin")||"";const saved=sessionStorage.getItem("sevamitra_search_pin")||"";const initialPin=/^\d{6}$/.test(requestedPin)?requestedPin:saved;setQuery(initialTerm);if(/^\d{6}$/.test(initialPin)){setPin(initialPin);void search(initialPin,initialTerm)}},[]);
 async function search(postcode=pin,term=query){
  const ticket=++requestNumber.current;
  if(!/^\d{6}$/.test(postcode)){setStatus("Enter a valid six-digit PIN code.");setServices([]);return}
  setSearching(true);setServices([]);setStatus("Checking live service coverage for PIN "+postcode+"…");
  try{
   const locations=await api.get<Array<{id:string;name:string;pincode:string}>>("/geography/pincodes/"+encodeURIComponent(postcode)+"/towns");
   if(ticket!==requestNumber.current)return;
   if(!locations.length){setStatus("We do not yet serve this PIN code. Please choose another six-digit PIN.");return}
   const fetched=await Promise.all(locations.map(x=>api.get<Array<{id:string;name:string;description?:string|null;nameKn?:string}>>("/discovery/available-services",{query:{townVillageId:x.id}})));
   if(ticket!==requestNumber.current)return;
   const unique=new Map<string,{id:string;name:string;description?:string|null;nameKn?:string}>();
   fetched.flat().forEach(x=>unique.set(x.id,x));
   const filtered=[...unique.values()].filter(x=>!term.trim()||x.name.toLowerCase().includes(term.trim().toLowerCase())||x.nameKn?.includes(term.trim()));
   setServices(filtered);
   sessionStorage.setItem("sevamitra_search_pin",postcode);
   setStatus(filtered.length?`Found ${filtered.length} live service${filtered.length===1?"":"s"} near PIN ${postcode}.`:`No currently available providers match ${term.trim()||"your search"} in PIN ${postcode}. Try another service or area.`);
  }catch(e){if(ticket===requestNumber.current)setStatus(e instanceof Error?e.message:"Unable to check service availability. Please try again.")}
  finally{if(ticket===requestNumber.current)setSearching(false)}
 }

 return <main>
  <section className="marketHero"><div><div className="eyebrow">{kn?"ನಿಮ್ಮ ಹತ್ತಿರದ ಸೇವೆಗಳು":"Services near you"}</div><h1>{kn?"ಇಂದು ನಿಮಗೆ ಯಾವ ಸೇವೆ ಬೇಕು?":"What service do you need today?"}</h1><p>{kn?"ನಿಮ್ಮ ಪ್ರದೇಶದ ವಿಶ್ವಾಸಾರ್ಹ ಸ್ಥಳೀಯ ಸೇವಾ ಪೂರೈಕೆದಾರರನ್ನು ಹುಡುಕಿ.":"Search trusted local professionals across your service area."}</p></div><div className="marketSearch"><MapPin size={20}/><input aria-label="Service area PIN" inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit PIN"/><Search size={20}/><input aria-label="Search available services" value={query} onChange={e=>setQuery(e.target.value.slice(0,100))} onKeyDown={e=>{if(e.key==="Enter")void search()}} placeholder={t.hero.searchPlaceholder}/><button className="primary" disabled={searching} onClick={()=>void search()}>{searching?"Searching…":t.hero.search}</button></div></section>
  <section className="catalog"><div className="sectionHead"><div><h2>{kn?"ಸೇವೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ":"Explore services"}</h2><p role="status" aria-live="polite">{status}</p></div></div><div className="catalogGrid">{services.map((x:any,i)=>{const Icon=x.Icon||(fallback[i%fallback.length]??fallback[0]!).Icon;return <article key={x.id||i}><div className="catalogIcon"><Icon/></div><h3>{kn&&x.nameKn?x.nameKn:(x.name||x.displayName||x.title)}</h3><p>{kn?"ಸ್ಪಷ್ಟ ಸೇವಾ ವಿವರಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಹತ್ತಿರದ ಸೇವಾ ವೃತ್ತಿಪರರನ್ನು ಹುಡುಕಿ.":(x.description||"Discover local professionals with clear service details.")}</p><button disabled={!x.id} onClick={()=>location.assign(loggedIn?"/marketplace/discover?serviceId="+encodeURIComponent(x.id):"/login")}>{loggedIn?(kn?"ಪೂರೈಕೆದಾರರನ್ನು ಹುಡುಕಿ":"Find providers"):(kn?"ಲಾಗಿನ್ ಮಾಡಿ":"Sign in to view providers")} →</button></article>})}</div></section>
  <section className="trustBand"><h2>{kn?"ಸ್ಥಳೀಯ ಸಮುದಾಯಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ":"Built for local communities"}</h2><div><span><ShieldCheck/> {kn?"ಪರಿಶೀಲಿತ ಪ್ರೊಫೈಲ್‌ಗಳು":"Verified profiles"}</span><span><Languages/> {kn?"ಸ್ಥಳೀಯ ಭಾಷೆಗಳಿಗೆ ಬೆಂಬಲ":"Local-language friendly"}</span><span><Star/> {kn?"ಲಭ್ಯವಿರುವ ಸೇವೆಗಳು":"Live availability"}</span><span><Users/> {kn?"ಸಮುದಾಯ ಕೇಂದ್ರಿತ":"Community focused"}</span></div></section>
  <footer className="premiumFooter"><div className="footerBrand"><Link className="brandLogo inverse" href="/"><img className="officialLogo footerLogo" src="/sevamitra-logo.png" alt="SevaMitra"/></Link><p>{kn?"ನಿಮ್ಮ ಹತ್ತಿರದ ಸೇವೆಗಳು ಮತ್ತು ನಿಪುಣ ವೃತ್ತಿಪರರನ್ನು ಹುಡುಕಲು ವಿಶ್ವಾಸಾರ್ಹ ಹೈಪರ್‌ಲೋಕಲ್ ಮಾರುಕಟ್ಟೆ.":"Your trusted hyperlocal marketplace for discovering services and skilled professionals nearby."}</p></div><div><b>{kn?"ಅನ್ವೇಷಿಸಿ":"Explore"}</b><Link href="/marketplace">{t.nav.services}</Link><Link href="/login">{kn?"ಗ್ರಾಹಕ ಲಾಗಿನ್":"Customer Login"}</Link><Link href="/#providers">{t.nav.providers}</Link></div><div><b>{kn?"ಸಮುದಾಯ":"Community"}</b><Link href="/#agents">{t.nav.agents}</Link><Link href="/#about">{kn?"SevaMitra ಬಗ್ಗೆ":"About SevaMitra"}</Link></div><div><b>{kn?"ಬೆಂಬಲ":"Support"}</b><span>{kn?"ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ":"Help & support"}</span><span>{kn?"ಸುರಕ್ಷತೆ ಮತ್ತು ವಿಶ್ವಾಸ":"Safety & trust"}</span></div></footer>
 </main>
}