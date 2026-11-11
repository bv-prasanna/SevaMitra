"use client";
import {useState} from "react";
import Link from "next/link";
const data=[
 {terms:["otp","login","password"],answer:"Sign in using your approved mobile number and OTP. Never share an OTP. If your login has expired, use Login in the header.",href:"/login",label:"Login"},
 {terms:["service","find","electrician","plumber"],answer:"Find available services through the marketplace. Only approved provider offerings in supported locations can be booked.",href:"/marketplace",label:"Find services"},
 {terms:["booking","cancel","request"],answer:"Open your Customer workspace to track requests and cancellation options. If a booking is uncertain, check existing bookings before submitting again.",href:"/customer",label:"My bookings"},
 {terms:["provider","register","onboard"],answer:"Create a Provider profile and submit your verification application. Admin approval is required before providing verified services.",href:"/provider",label:"Provider onboarding"},
 {terms:["agent","referral"],answer:"Agents register through Agent workspace and must be approved. Providers may enter a valid agent referral code while applying.",href:"/agent",label:"Agent registration"},
 {terms:["coverage","area","village","pincode"],answer:"Set up your serviceable areas in provider management. The available geography depends on configured locations.",href:"/provider/manage",label:"Manage coverage"},
 {terms:["support","complaint","dispute"],answer:"If a service issue is unresolved, contact the SevaMitra pilot administrator. An integrated ticket queue is still being developed.",href:"/workspaces",label:"My workspaces"},
];
export default function HelpChat({audience}:{audience:"customer"|"provider"}){
 const [open,setOpen]=useState(false),[input,setInput]=useState(""),[history,setHistory]=useState<{question:string;answer:string;href:string;label:string}[]>([]);
 function send(){const q=input.trim();if(!q)return;const lower=q.toLowerCase();const entry=data.find(x=>x.terms.some(t=>lower.includes(t)));setHistory(h=>[...h.slice(-9),{question:q,answer:entry?.answer??"I can help with login, services, booking, provider onboarding and coverage. For specific account problems, contact pilot support.",href:entry?.href??"/workspaces",label:entry?.label??"Workspaces"}]);setInput("")}
 return <section className="helpChat" aria-label={audience+" help assistant"}><button type="button" className="helpChatToggle" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>💬 {open?"Close help":"Help & support"}</button>{open&&<div className="helpChatPanel"><h2>SevaMitra Help</h2><p>Free guided assistance for {audience}s · ಕನ್ನಡ / English support content coming soon</p><div className="helpChatTranscript" aria-live="polite">{history.length===0?<p>Try asking: How do I book a service? How do I register as a provider?</p>:history.map((h,i)=><article key={i}><strong>You: {h.question}</strong><p>{h.answer}</p><Link href={h.href}>{h.label} →</Link></article>)}</div><form onSubmit={e=>{e.preventDefault();send()}}><label htmlFor={"helpChatInput-"+audience}>Your question</label><input id={"helpChatInput-"+audience} maxLength={240} value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question…"/><button type="submit" disabled={!input.trim()}>Send</button></form><small>No paid AI, no storage. Don't enter OTPs, passwords or private documents.</small></div>}</section>
}
