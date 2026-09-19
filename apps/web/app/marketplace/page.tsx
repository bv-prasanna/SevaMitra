"use client";
import {useEffect,useState} from "react";
import {ApiClient} from "@sevamitra/api-client";
import Link from "next/link";
import {MapPin,Languages,Search,ShieldCheck,Star,Users,Sparkles,Zap,Droplets,HeartPulse,Wrench,GraduationCap,MoreHorizontal} from "lucide-react";

const fallback=[
 {id:"cleaning",name:"Home Cleaning",Icon:Sparkles},{id:"electrician",name:"Electrician",Icon:Zap},{id:"plumber",name:"Plumber",Icon:Droplets},{id:"beauty",name:"Beauty & Wellness",Icon:HeartPulse},{id:"elder",name:"Elder Care",Icon:Users},{id:"repair",name:"Appliance Repair",Icon:Wrench},{id:"tutor",name:"Tutors",Icon:GraduationCap},{id:"more",name:"More Services",Icon:MoreHorizontal}
];
export default function Marketplace(){
 const[services,setServices]=useState<any[]>(fallback);const[status,setStatus]=useState("Loading live services…");const[kn,setKn]=useState(false);
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"http://localhost:8080",()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
 useEffect(()=>{api.services({status:"ACTIVE"}).then((r:any)=>{const a=Array.isArray(r)?r:r?.items||r?.content||[];if(a.length)setServices(a);setStatus(a.length?"Live catalogue":"Demo catalogue – backend returned no active services");}).catch(()=>setStatus("Demo catalogue – connect backend for live data"));},[]);
 return <main>
  <header className="siteHeader">
   <Link className="brandLogo" href="/"><img className="officialLogo" src="/sevamitra-logo.png" alt="SevaMitra"/></Link>
   <nav className="mainNav"><Link href="/">Home</Link><Link href="/marketplace">Services</Link><Link href="/#customers">For Customers</Link><Link href="/#providers">For Providers</Link><Link href="/#agents">For Agents</Link><Link href="/#about">About</Link></nav>
   <div className="headerActions"><button className="locationBtn"><MapPin size={16}/>Select location</button><button className="languageBtn" onClick={()=>setKn(!kn)}><Languages size={16}/>{kn?"EN":"ಕನ್ನಡ"}</button><Link className="loginLink" href="/login">Login</Link><Link className="signupBtn" href="/login">Sign Up</Link></div>
  </header>
  <section className="marketHero"><div><div className="eyebrow">Services near you</div><h1>What service do you need today?</h1><p>Search trusted local professionals across your service area.</p></div><div className="marketSearch"><MapPin size={20}/><input placeholder="Enter PIN code or locality"/><Search size={20}/><input placeholder="Search service"/><button className="primary">Search</button></div></section>
  <section className="catalog"><div className="sectionHead"><div><h2>Explore services</h2><p>{status}</p></div></div><div className="catalogGrid">{services.map((x:any,i)=>{const Icon=x.Icon||fallback[i%fallback.length].Icon;return <article key={x.id||i}><div className="catalogIcon"><Icon/></div><h3>{x.name||x.displayName||x.title}</h3><p>{x.description||"Discover local professionals with clear service details."}</p><button onClick={()=>alert("Provider discovery will use your selected location and service.")}>Find providers →</button></article>})}</div></section>
  <section className="trustBand"><h2>Built for local communities</h2><div><span><ShieldCheck/> Verified profiles</span><span><Languages/> Local-language friendly</span><span><Star/> Ratings & reviews</span><span><Users/> Community focused</span></div></section>
  <footer className="premiumFooter"><div className="footerBrand"><Link className="brandLogo inverse" href="/"><img className="officialLogo footerLogo" src="/sevamitra-logo.png" alt="SevaMitra"/></Link><p>Your trusted hyperlocal marketplace for discovering services and skilled professionals nearby.</p></div><div><b>Explore</b><Link href="/marketplace">Services</Link><Link href="/login">Customer Login</Link><Link href="/provider">For Providers</Link></div><div><b>Community</b><Link href="/agent">For Agents</Link><Link href="/#about">About SevaMitra</Link></div><div><b>Support</b><span>Help & support</span><span>Safety & trust</span></div></footer>
 </main>
}