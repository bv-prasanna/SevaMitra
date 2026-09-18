"use client";
import {Search,MapPin,ShieldCheck,Users,Star,Heart,Languages,ArrowRight} from "lucide-react";
import {useState} from "react";
import {messages,type Locale} from "@sevamitra/i18n";
const services=[["⌂","Home Cleaning"],["⚡","Electrician"],["🔧","Plumber"],["✦","Beauty & Wellness"],["♙","Elder Care"],["⚙","Appliance Repair"],["◉","Tutors"],["•••","More Services"]];
export default function Home(){
 const [locale,setLocale]=useState<Locale>("en"); const t=messages[locale];
 return <main>
  <header className="nav"><div className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Local Services. Stronger Communities.</small></div></div>
   <nav><a href="#home">{t.nav.home}</a><a href="#services">{t.nav.services}</a><a href="#providers">{t.nav.providers}</a><a href="#agents">{t.nav.agents}</a><a href="#about">{t.nav.about}</a></nav>
   <div className="actions"><button className="lang" onClick={()=>setLocale(locale==="en"?"kn":"en")}><Languages size={17}/>{locale==="en"?"ಕನ್ನಡ":"EN"}</button><button className="outline">{t.nav.login}</button><button className="primary">{t.nav.signup}</button></div>
  </header>
  <section id="home" className="hero"><div className="heroCopy"><div className="pill">{t.hero.badge}</div><h1>{t.hero.title1}<br/><em>{t.hero.title2}</em></h1><h2>{t.hero.subtitle}</h2><p>{t.hero.body}</p>
   <div className="search"><div><MapPin size={19}/><span>{t.hero.location}</span></div><input aria-label="service search" placeholder={t.hero.searchPlaceholder}/><button><Search size={19}/>{t.hero.search}</button></div>
   <div id="services" className="services">{services.map(([icon,name])=><button key={name}><i>{icon}</i><span>{name}</span></button>)}</div>
  </div><div className="heroVisual"><div className="halo"/><div className="people"><div className="person secondary">👨🏽‍🔧</div><div className="person main">👩🏽‍💼<strong>SevaMitra</strong></div><div className="person secondary">👷🏽</div></div><div className="note">Local People<br/>Real Support<br/><b>Brighter Communities</b></div></div></section>
  <section className="stats"><div><Users/><b>50,000+</b><span>{t.stats.providers}</span></div><div><Heart/><b>1,00,000+</b><span>{t.stats.customers}</span></div><div><ShieldCheck/><b>4.8/5</b><span>{t.stats.rating}</span></div><div><MapPin/><b>300+</b><span>{t.stats.areas}</span></div></section>
  <section className="how"><h2>{t.how.title}</h2><p>{t.how.subtitle}</p><div className="steps">{t.how.steps.map((s,i)=><article key={s.title}><i>{i+1}</i><div className="stepIcon">{["⌕","▣","♙","★"][i]}</div><h3>{s.title}</h3><p>{s.body}</p></article>)}</div></section>
  <section className="join"><article id="providers"><div><span className="round">♙</span><h2>{t.provider.title}</h2><p>{t.provider.body}</p><button className="primary">{t.provider.cta}<ArrowRight size={17}/></button></div><div className="portrait">👨🏽‍🔧</div></article><article id="agents" className="agent"><div><span className="round">♟</span><h2>{t.agent.title}</h2><p>{t.agent.body}</p><button className="orange">{t.agent.cta}<ArrowRight size={17}/></button></div><div className="portrait">🧑🏽‍💼</div></article></section>
  <footer id="about"><div className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Local Services. Stronger Communities.</small></div></div><p>{t.footer}</p></footer>
 </main>
}