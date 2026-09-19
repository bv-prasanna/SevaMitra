"use client";
import { Search, MapPin, ShieldCheck, Star, ArrowRight, Sparkles, Wrench, Zap, Droplets, HeartPulse, GraduationCap, MoreHorizontal, CheckCircle2, Users, Clock3, BadgeCheck, Smartphone, Languages } from "lucide-react";
import { useState } from "react";

const categories=[
  {name:"Home Cleaning",icon:Sparkles,tone:"green"},
  {name:"Electrician",icon:Zap,tone:"orange"},
  {name:"Plumber",icon:Droplets,tone:"blue"},
  {name:"Beauty & Wellness",icon:HeartPulse,tone:"rose"},
  {name:"Appliance Repair",icon:Wrench,tone:"amber"},
  {name:"Tutors",icon:GraduationCap,tone:"violet"},
  {name:"More Services",icon:MoreHorizontal,tone:"green"}
];
export default function Home(){
 const [kn,setKn]=useState(false);
 return <main className="home">
  <header className="siteHeader">
   <a className="brandLogo" href="/"><span className="brandPin"><span>✓</span></span><span><strong>Seva<span>Mitra</span></strong><small>Local Services. Stronger Communities.</small></span></a>
   <nav className="mainNav"><a href="/marketplace">Services</a><a href="#customers">For Customers</a><a href="#providers">For Providers</a><a href="#agents">For Agents</a><a href="#about">About</a></nav>
   <div className="headerActions"><button className="locationBtn"><MapPin size={16}/>Select location</button><button className="languageBtn" onClick={()=>setKn(!kn)}><Languages size={16}/>{kn?"EN":"ಕನ್ನಡ"}</button><a className="loginLink" href="/login">Login</a><a className="signupBtn" href="/login">Sign Up</a></div>
  </header>

  <section className="premiumHero">
   <div className="heroContent">
    <span className="eyebrow"><BadgeCheck size={16}/>Your community service partner</span>
    <h1>Trusted local services,<br/><span>right when you need them.</span></h1>
    <p>Discover skilled professionals in your community, compare service options and book with confidence—all from one trusted local marketplace.</p>
    <div className="heroSearch">
      <button className="heroLocation"><MapPin size={20}/><span><small>Your location</small>Select your area</span></button>
      <div className="searchInput"><Search size={20}/><input placeholder="What service do you need?"/></div>
      <a href="/marketplace">Find Services <ArrowRight size={18}/></a>
    </div>
    <div className="heroTrust"><span><ShieldCheck/>Verified profiles</span><span><Star/>Ratings & reviews</span><span><CheckCircle2/>Transparent service details</span></div>
   </div>
   <div className="heroScene">
    <div className="sceneGlow"></div>
    <div className="proCard proOne"><div className="avatar">AC</div><div><b>AC & Appliance Care</b><span><Star size={13} fill="currentColor"/> Trusted local professional</span></div></div>
    <div className="heroPhoto">
      <div className="worker workerA"><span>SM</span><strong>Home Services</strong><small>Skilled • Local • Reliable</small></div>
      <div className="worker workerB"><Wrench size={46}/><strong>Service Expert</strong></div>
    </div>
    <div className="availabilityCard"><Clock3/><div><b>Services near you</b><span>Choose your area to see availability</span></div></div>
   </div>
  </section>

  <section className="categorySection" id="customers">
   <div className="sectionIntro"><div><span className="sectionKicker">Explore services</span><h2>Help for every need, close to home</h2></div><a href="/marketplace">View all services <ArrowRight size={17}/></a></div>
   <div className="categoryGrid">{categories.map(({name,icon:Icon,tone})=><a href="/marketplace" className="categoryCard" key={name}><span className={"categoryIcon "+tone}><Icon/></span><strong>{name}</strong><small>Explore options</small><ArrowRight className="cardArrow" size={18}/></a>)}</div>
  </section>

  <section className="confidenceBand">
   <div><ShieldCheck/><span><b>Trust-first marketplace</b><small>Profiles and verification information where applicable</small></span></div>
   <div><MapPin/><span><b>Built for local discovery</b><small>Find services available in your own community</small></span></div>
   <div><Star/><span><b>Make informed choices</b><small>Service details, ratings and reviews in one place</small></span></div>
   <div><Users/><span><b>Stronger communities</b><small>Connecting local skills with local demand</small></span></div>
  </section>

  <section className="howPremium">
   <div className="centerIntro"><span className="sectionKicker">Simple from search to service</span><h2>How SevaMitra works</h2><p>A straightforward experience designed around local availability and trust.</p></div>
   <div className="journey">
    <article><span>01</span><div><MapPin/></div><h3>Choose your location</h3><p>Tell us where you need help so we can show relevant local services.</p></article>
    <article><span>02</span><div><Search/></div><h3>Discover & compare</h3><p>Explore service options and provider information for your requirement.</p></article>
    <article><span>03</span><div><Smartphone/></div><h3>Book your service</h3><p>Select the service details and a suitable schedule when available.</p></article>
    <article><span>04</span><div><Star/></div><h3>Complete & review</h3><p>Get the service and share your experience to strengthen local trust.</p></article>
   </div>
  </section>

  <section className="growthPanels">
   <article id="providers" className="providerPanel"><div className="panelBadge">For service professionals</div><h2>Grow your local service business with SevaMitra.</h2><p>Create your profile, define the services and areas you cover, manage availability and build your reputation with customers nearby.</p><a href="/provider">Become a Provider <ArrowRight size={18}/></a><div className="panelArt"><Wrench/><span>Build your local presence</span></div></article>
   <article id="agents" className="agentPanel"><div className="panelBadge">For community partners</div><h2>Help local professionals join the digital marketplace.</h2><p>SevaMitra agents support provider onboarding and help expand trusted service access across local communities.</p><a href="/agent">Explore Agent Opportunities <ArrowRight size={18}/></a><div className="panelArt"><Users/><span>Connect communities</span></div></article>
  </section>

  <section className="communitySection" id="about"><div className="communityCopy"><span className="sectionKicker">Services for a better tomorrow</span><h2>Technology that keeps local communities at the centre.</h2><p>SevaMitra is designed to make local services easier to discover while helping skilled professionals participate in the digital economy.</p><div className="communityPoints"><span><CheckCircle2/>Local & accessible</span><span><CheckCircle2/>Transparent choices</span><span><CheckCircle2/>Community focused</span><span><CheckCircle2/>Designed for trust</span></div></div><div className="communityVisual"><div className="communityMark">SM</div><strong>Local Services.<br/>Stronger Communities.</strong><p>One marketplace connecting customers, providers and community partners.</p></div></section>

  <footer className="premiumFooter"><div className="footerBrand"><a className="brandLogo inverse" href="/"><span className="brandPin"><span>✓</span></span><span><strong>Seva<span>Mitra</span></strong><small>Local Services. Stronger Communities.</small></span></a><p>Your trusted hyperlocal marketplace for discovering services and skilled professionals nearby.</p></div><div><b>Explore</b><a href="/marketplace">Services</a><a href="/login">Customer Login</a><a href="/provider">For Providers</a></div><div><b>Community</b><a href="/agent">For Agents</a><a href="#about">About SevaMitra</a></div><div><b>Support</b><span>Help & support</span><span>Safety & trust</span></div></footer>
 </main>
}