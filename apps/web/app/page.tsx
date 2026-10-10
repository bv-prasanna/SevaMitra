"use client";
import { Search, MapPin, ShieldCheck, Star, ArrowRight, Sparkles, Wrench, Zap, Droplets, HeartPulse, GraduationCap, MoreHorizontal, CheckCircle2, Users, BadgeCheck, Smartphone, Languages } from "lucide-react";
import { useState } from "react";
import {messages} from "@sevamitra/i18n";

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
 const [kn,setKn]=useState(false); const t=kn?messages.kn:messages.en;
 return <main className="home">
  <header className="siteHeader">
   <a className="brandLogo" href="/"><img className="officialLogo" src="/sevamitra-logo.png" alt="SevaMitra — Trusted Services Near You."/></a>
   <nav className="mainNav"><a href="/marketplace">{t.nav.services}</a><a href="#customers">{kn?"ಗ್ರಾಹಕರಿಗೆ":"For Customers"}</a><a href="#providers">{t.nav.providers}</a><a href="#agents">{t.nav.agents}</a><a href="#about">{t.nav.about}</a></nav>
   <div className="headerActions"><button className="locationBtn"><MapPin size={16}/>{kn?"ಸ್ಥಳ ಆಯ್ಕೆ":"Select location"}</button><button className="languageBtn" onClick={()=>setKn(!kn)}><Languages size={16}/>{kn?"English":"ಕನ್ನಡ"}</button><a className="loginLink" href="/login">{t.nav.login}</a><a className="signupBtn" href="/login">{t.nav.signup}</a></div>
  </header>

  <section className="premiumHero">
   <div className="heroScene">
    <img className="heroPeopleImage" src="/sevamitra-hero.png" alt="SevaMitra local service professionals"/>
   </div>
   <div className="heroContent">
    <span className="eyebrow"><BadgeCheck size={16}/>{t.hero.badge}</span>
    <h1>{t.hero.title1}<br/><span>{t.hero.title2}</span></h1>
    <p>{t.hero.body}</p>
    <div className="heroSearch">
      <button className="heroLocation"><MapPin size={20}/><span><small>{kn?"ನಿಮ್ಮ ಸ್ಥಳ":"Your location"}</small>{t.hero.location}</span></button>
      <div className="searchInput"><Search size={20}/><input placeholder={t.hero.searchPlaceholder}/></div>
      <a href="/marketplace">{t.hero.search} <ArrowRight size={18}/></a>
    </div>
    <div className="heroTrust"><span><ShieldCheck/>{kn?"ಪರಿಶೀಲಿತ ಪ್ರೊಫೈಲ್‌ಗಳು":"Verified profiles"}</span><span><Star/>{kn?"ರೇಟಿಂಗ್ ಮತ್ತು ವಿಮರ್ಶೆಗಳು":"Ratings & reviews"}</span><span><CheckCircle2/>{kn?"ಪಾರದರ್ಶಕ ಸೇವಾ ವಿವರಗಳು":"Transparent service details"}</span></div>
   </div>
  </section>

  <section className="categorySection" id="customers">
   <div className="sectionIntro"><div><span className="sectionKicker">{kn?"ಸೇವೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ":"Explore services"}</span><h2>{kn?"ಪ್ರತಿ ಅಗತ್ಯಕ್ಕೂ ನಿಮ್ಮ ಹತ್ತಿರದಲ್ಲೇ ಸಹಾಯ":"Help for every need, close to home"}</h2></div><a href="/marketplace">{kn?"ಎಲ್ಲಾ ಸೇವೆಗಳನ್ನು ನೋಡಿ":"View all services"} <ArrowRight size={17}/></a></div>
   <div className="categoryGrid">{categories.map(({name,icon:Icon,tone},i)=><a href="/marketplace" className="categoryCard" key={name}><span className={"categoryIcon "+tone}><Icon/></span><strong>{kn?["ಮನೆ ಸ್ವಚ್ಛತೆ","ಎಲೆಕ್ಟ್ರಿಷಿಯನ್","ಪ್ಲಂಬರ್","ಸೌಂದರ್ಯ ಮತ್ತು ವೆಲ್‌ನೆಸ್","ಉಪಕರಣ ದುರಸ್ತಿ","ಟ್ಯೂಟರ್‌ಗಳು","ಇನ್ನಷ್ಟು ಸೇವೆಗಳು"][i]:name}</strong><small>{kn?"ಆಯ್ಕೆಗಳನ್ನು ನೋಡಿ":"Explore options"}</small><ArrowRight className="cardArrow" size={18}/></a>)}</div>
  </section>

  <section className="confidenceBand">
   <div><ShieldCheck/><span><b>{kn?"ವಿಶ್ವಾಸಕ್ಕೆ ಆದ್ಯತೆ ನೀಡುವ ಮಾರುಕಟ್ಟೆ":"Trust-first marketplace"}</b><small>{kn?"ಅನ್ವಯಿಸುವಲ್ಲಿ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಪರಿಶೀಲನಾ ಮಾಹಿತಿ":"Profiles and verification information where applicable"}</small></span></div>
   <div><MapPin/><span><b>{kn?"ಸ್ಥಳೀಯ ಹುಡುಕಾಟಕ್ಕಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ":"Built for local discovery"}</b><small>{kn?"ನಿಮ್ಮ ಸಮುದಾಯದಲ್ಲೇ ಲಭ್ಯವಿರುವ ಸೇವೆಗಳನ್ನು ಹುಡುಕಿ":"Find services available in your own community"}</small></span></div>
   <div><Star/><span><b>{kn?"ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಆಯ್ಕೆ ಮಾಡಿ":"Make informed choices"}</b><small>{kn?"ಸೇವಾ ವಿವರಗಳು, ರೇಟಿಂಗ್ ಮತ್ತು ವಿಮರ್ಶೆಗಳು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ":"Service details, ratings and reviews in one place"}</small></span></div>
   <div><Users/><span><b>{kn?"ಬಲಿಷ್ಠ ಸಮುದಾಯಗಳು":"Stronger communities"}</b><small>{kn?"ಸ್ಥಳೀಯ ಕೌಶಲ್ಯಗಳನ್ನು ಸ್ಥಳೀಯ ಬೇಡಿಕೆಯೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವುದು":"Connecting local skills with local demand"}</small></span></div>
  </section>

  <section className="howPremium">
   <div className="centerIntro"><span className="sectionKicker">{kn?"ಹುಡುಕಾಟದಿಂದ ಸೇವೆಯವರೆಗೆ ಸರಳ":"Simple from search to service"}</span><h2>{t.how.title}</h2><p>{kn?"ಸ್ಥಳೀಯ ಲಭ್ಯತೆ ಮತ್ತು ವಿಶ್ವಾಸವನ್ನು ಕೇಂದ್ರವಾಗಿಟ್ಟ ಸರಳ ಅನುಭವ.":"A straightforward experience designed around local availability and trust."}</p></div>
   <div className="journey">
    <article><span>01</span><div><MapPin/></div><h3>{kn?"ನಿಮ್ಮ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ":"Choose your location"}</h3><p>{kn?"ನಿಮ್ಮ ಪ್ರದೇಶಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ಸೇವೆಗಳನ್ನು ತೋರಿಸಲು ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ.":"Tell us where you need help so we can show relevant local services."}</p></article>
    <article><span>02</span><div><Search/></div><h3>{kn?"ಹುಡುಕಿ ಮತ್ತು ಹೋಲಿಸಿ":"Discover & compare"}</h3><p>{kn?"ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕ ಸೇವೆಗಳು ಮತ್ತು ಪೂರೈಕೆದಾರರ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.":"Explore service options and provider information for your requirement."}</p></article>
    <article><span>03</span><div><Smartphone/></div><h3>{kn?"ಸೇವೆಯನ್ನು ಬುಕ್ ಮಾಡಿ":"Book your service"}</h3><p>{kn?"ಸೇವೆಯ ವಿವರಗಳು ಮತ್ತು ಲಭ್ಯವಿರುವ ಸೂಕ್ತ ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ.":"Select the service details and a suitable schedule when available."}</p></article>
    <article><span>04</span><div><Star/></div><h3>{kn?"ಪೂರ್ಣಗೊಳಿಸಿ ಮತ್ತು ವಿಮರ್ಶಿಸಿ":"Complete & review"}</h3><p>{kn?"ಸೇವೆ ಪಡೆದ ನಂತರ ನಿಮ್ಮ ಅನುಭವವನ್ನು ಹಂಚಿಕೊಂಡು ಸ್ಥಳೀಯ ವಿಶ್ವಾಸವನ್ನು ಬಲಪಡಿಸಿ.":"Get the service and share your experience to strengthen local trust."}</p></article>
   </div>
  </section>

  <section className="growthPanels">
   <article id="providers" className="providerPanel"><div className="panelBadge">{kn?"ಸೇವಾ ವೃತ್ತಿಪರರಿಗೆ":"For service professionals"}</div><h2>{kn?"SevaMitra ಜೊತೆ ನಿಮ್ಮ ಸ್ಥಳೀಯ ಸೇವಾ ವ್ಯವಹಾರವನ್ನು ಬೆಳೆಸಿ.":"Grow your local service business with SevaMitra."}</h2><p>{kn?"ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ, ಸೇವೆಗಳು ಮತ್ತು ಸೇವಾ ಪ್ರದೇಶಗಳನ್ನು ನಿರ್ಧರಿಸಿ, ಲಭ್ಯತೆಯನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಹತ್ತಿರದ ಗ್ರಾಹಕರಲ್ಲಿ ವಿಶ್ವಾಸ ಬೆಳೆಸಿ.":"Create your profile, define the services and areas you cover, manage availability and build your reputation with customers nearby."}</p><a href="/provider">{kn?"ಪೂರೈಕೆದಾರರಾಗಿ ಸೇರಿ":"Become a Provider"} <ArrowRight size={18}/></a><div className="panelArt"><Wrench/><span>{kn?"ನಿಮ್ಮ ಸ್ಥಳೀಯ ಗುರುತನ್ನು ಬೆಳೆಸಿ":"Build your local presence"}</span></div></article>
   <article id="agents" className="agentPanel"><div className="panelBadge">{kn?"ಸಮುದಾಯ ಪಾಲುದಾರರಿಗೆ":"For community partners"}</div><h2>{kn?"ಸ್ಥಳೀಯ ವೃತ್ತಿಪರರು ಡಿಜಿಟಲ್ ಮಾರುಕಟ್ಟೆಗೆ ಸೇರಲು ಸಹಾಯ ಮಾಡಿ.":"Help local professionals join the digital marketplace."}</h2><p>{kn?"SevaMitra ಏಜೆಂಟ್‌ಗಳು ಸೇವಾ ಪೂರೈಕೆದಾರರ ನೋಂದಣಿಗೆ ಸಹಾಯ ಮಾಡಿ, ಸಮುದಾಯಗಳಲ್ಲಿ ವಿಶ್ವಾಸಾರ್ಹ ಸೇವೆಗಳ ಲಭ್ಯತೆಯನ್ನು ವಿಸ್ತರಿಸುತ್ತಾರೆ.":"SevaMitra agents support provider onboarding and help expand trusted service access across local communities."}</p><a href="/agent">{kn?"ಏಜೆಂಟ್ ಅವಕಾಶಗಳನ್ನು ನೋಡಿ":"Explore Agent Opportunities"} <ArrowRight size={18}/></a><div className="panelArt"><Users/><span>{kn?"ಸಮುದಾಯಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ":"Connect communities"}</span></div></article>
  </section>

  <section className="communitySection" id="about"><div className="communityCopy"><span className="sectionKicker">{kn?"ಉತ್ತಮ ನಾಳೆಗಾಗಿ ಸೇವೆಗಳು":"Services for a better tomorrow"}</span><h2>{kn?"ಸ್ಥಳೀಯ ಸಮುದಾಯಗಳನ್ನು ಕೇಂದ್ರದಲ್ಲಿಡುವ ತಂತ್ರಜ್ಞಾನ.":"Technology that keeps local communities at the centre."}</h2><p>{kn?"ಸ್ಥಳೀಯ ಸೇವೆಗಳನ್ನು ಸುಲಭವಾಗಿ ಹುಡುಕಲು ಮತ್ತು ನಿಪುಣ ವೃತ್ತಿಪರರು ಡಿಜಿಟಲ್ ಆರ್ಥಿಕತೆಯಲ್ಲಿ ಭಾಗವಹಿಸಲು SevaMitra ನೆರವಾಗುತ್ತದೆ.":"SevaMitra is designed to make local services easier to discover while helping skilled professionals participate in the digital economy."}</p><div className="communityPoints"><span><CheckCircle2/>{kn?"ಸ್ಥಳೀಯ ಮತ್ತು ಸುಲಭ ಲಭ್ಯ":"Local & accessible"}</span><span><CheckCircle2/>{kn?"ಪಾರದರ್ಶಕ ಆಯ್ಕೆಗಳು":"Transparent choices"}</span><span><CheckCircle2/>{kn?"ಸಮುದಾಯ ಕೇಂದ್ರಿತ":"Community focused"}</span><span><CheckCircle2/>{kn?"ವಿಶ್ವಾಸಕ್ಕಾಗಿ ವಿನ್ಯಾಸ":"Designed for trust"}</span></div></div><div className="communityVisual"><div className="communityMark"><span>S</span><span>M</span></div><strong>{kn?"ಸ್ಥಳೀಯ ಸೇವೆಗಳು.":"Local Services."}<br/>{kn?"ಬಲಿಷ್ಠ ಸಮುದಾಯಗಳು.":"Stronger Communities."}</strong><p>{kn?"ಗ್ರಾಹಕರು, ಸೇವಾ ಪೂರೈಕೆದಾರರು ಮತ್ತು ಸಮುದಾಯ ಪಾಲುದಾರರನ್ನು ಸಂಪರ್ಕಿಸುವ ಒಂದೇ ಮಾರುಕಟ್ಟೆ.":"One marketplace connecting customers, providers and community partners."}</p></div></section>

  <footer className="premiumFooter"><div className="footerBrand"><a className="brandLogo inverse" href="/"><img className="officialLogo footerLogo" src="/sevamitra-logo.png" alt="SevaMitra"/></a><p>{kn?"ನಿಮ್ಮ ಹತ್ತಿರದ ಸೇವೆಗಳು ಮತ್ತು ನಿಪುಣ ವೃತ್ತಿಪರರನ್ನು ಹುಡುಕಲು ವಿಶ್ವಾಸಾರ್ಹ ಹೈಪರ್‌ಲೋಕಲ್ ಮಾರುಕಟ್ಟೆ.":"Your trusted hyperlocal marketplace for discovering services and skilled professionals nearby."}</p></div><div><b>{kn?"ಅನ್ವೇಷಿಸಿ":"Explore"}</b><a href="/marketplace">{t.nav.services}</a><a href="/login">{kn?"ಗ್ರಾಹಕ ಲಾಗಿನ್":"Customer Login"}</a><a href="/#providers">{t.nav.providers}</a></div><div><b>{kn?"ಸಮುದಾಯ":"Community"}</b><a href="/#agents">{t.nav.agents}</a><a href="/#about">{kn?"SevaMitra ಬಗ್ಗೆ":"About SevaMitra"}</a></div><div><b>{kn?"ಬೆಂಬಲ":"Support"}</b><span>{kn?"ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ":"Help & support"}</span><span>{kn?"ಸುರಕ್ಷತೆ ಮತ್ತು ವಿಶ್ವಾಸ":"Safety & trust"}</span></div></footer>
 </main>
}