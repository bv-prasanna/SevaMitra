"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid} from "recharts";
import {ApiClient} from "@sevamitra/api-client";
type Summary={agentsPending:number;agentsActive:number;providersPending:number;providersApproved:number;bookingsTotal:number;bookingsRequested:number;bookingsCompleted:number;serviceCategories:number;servicesActive:number;generatedAt:string};
const questions=[
 {terms:["agent","approval"],answer:"Go to Admin → Agent approvals. Pending agents can be approved by authorized reviewers."},
 {terms:["provider","approval"],answer:"Go to Admin → Provider verification. Review documentation before approving a provider."},
 {terms:["category","service"],answer:"Go to Admin → Service catalogue to create categories, then services."},
 {terms:["booking","customer"],answer:"Check the customer or provider workspace to review bookings. For a dispute, record the details using your existing support process; a ticket queue is not yet available."},
 {terms:["offline","internet"],answer:"Check your connection and reopen the application. Do not repeat payment or booking submissions with a new request ID."},
 {terms:["otp","login"],answer:"Use the approved staging login phone. Do not share one-time passwords with anyone."},
];
export default function Operations(){
 const [summary,setSummary]=useState<Summary|null>(null),[message,setMessage]=useState("Loading operational report…"),[question,setQuestion]=useState(""),[answer,setAnswer]=useState("");
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 const load=useCallback(async()=>{try{const x=await api.get<Summary>("/admin/operations/summary");setSummary(x);setMessage("");}catch(e){setMessage(e instanceof Error?e.message:"Admin access required")}},[]);
 useEffect(()=>{void load()},[load]);
 function ask(){
  const q=question.trim().toLowerCase();if(!q)return;
  const match=questions.find(x=>x.terms.some(t=>q.includes(t)));
  setAnswer(match?.answer??"I can answer common onboarding, booking and access questions. For unusual cases, contact your designated administrator. This helper does not create support tickets.");
 }
 const metrics=summary?[["Pending agents",summary.agentsPending],["Active agents",summary.agentsActive],["Pending provider reviews",summary.providersPending],["Approved providers",summary.providersApproved],["All bookings",summary.bookingsTotal],["Requested bookings",summary.bookingsRequested],["Completed bookings",summary.bookingsCompleted],["Active service categories",summary.serviceCategories],["Active services",summary.servicesActive]]:[] as [string,number][];
 function download(){
  if(!summary)return;
  const rows=[["Metric","Count"],...metrics.map(([k,v])=>[k,String(v)])];
  const data=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const href=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=href;a.download="sevamitra-operations-summary.csv";a.click();URL.revokeObjectURL(href);
 }
 return <main><header className="nav"><Link href="/">SevaMitra</Link><Link href="/admin">Admin</Link></header><section className="workspace">
 <div className="workspaceTop"><div><div className="pill">Administration</div><h1>Operations, analytics & help</h1><p>Live counts from the staging database; this is not a financial report.</p></div><button onClick={()=>void load()}>Refresh</button></div>
 {!!message&&<p role="status">{message}</p>}
 {summary&&<><p>Updated: {new Date(summary.generatedAt).toLocaleString()}</p><button onClick={download}>Export summary (CSV)</button><div className="adminModules">{metrics.map(([label,value])=><article key={label}><h3>{value}</h3><p>{label}</p></article>)}</div></>}
 {summary&&<section className="analyticsCharts" aria-label="Operational charts">
 <article className="analyticsPanel"><h2>Booking breakdown</h2><p>Current totals (not a historical trend)</p><div className="chartBody"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:"Requested",count:summary.bookingsRequested},{name:"Completed",count:summary.bookingsCompleted},{name:"Other statuses",count:Math.max(0,summary.bookingsTotal-summary.bookingsRequested-summary.bookingsCompleted)}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" name="Bookings" fill="#087A4B" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></article>
 <article className="analyticsPanel"><h2>Marketplace operations</h2><p>Current operational counts</p><div className="chartBody"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:"Pending agents",count:summary.agentsPending},{name:"Active agents",count:summary.agentsActive},{name:"Provider reviews",count:summary.providersPending},{name:"Services",count:summary.servicesActive}]} margin={{bottom:28}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={68}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#F47721" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></article>
 </section>}
 <h2>Operational shortcuts</h2><div className="adminModules"><article><Link href="/admin/agents">Review agents →</Link></article><article><Link href="/admin">Provider applications →</Link></article><article><Link href="/admin/catalogue">Service catalogue →</Link></article><article><Link href="/admin/roles">Permissions →</Link></article></div>
 <h2>Support assistant (free FAQ)</h2><p>Rule-based help only. No external AI provider, chat storage or ticket submission. Never enter OTPs, private documents or passwords.</p>
 <div style={{maxWidth:700}}><label htmlFor="help-question">Ask about approvals, services or bookings</label><input id="help-question" maxLength={300} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="How do I approve an agent?" onKeyDown={e=>{if(e.key==="Enter")ask()}}/><button disabled={!question.trim()} onClick={ask}>Ask assistant</button>{answer&&<p role="status">{answer}</p>}</div>
 </section></main>
}
