"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ResponsiveContainer,BarChart,Bar,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from "recharts";
import {ApiClient} from "@sevamitra/api-client";
type Summary={agentsPending:number;agentsActive:number;providersPending:number;providersApproved:number;bookingsTotal:number;bookingsRequested:number;bookingsCompleted:number;serviceCategories:number;servicesActive:number;generatedAt:string};
type Reports={days:number;series:{date:string;bookings:number;agents:number;providers:number}[];bookingStatuses:{name:string;value:number}[];agentStatuses:{name:string;value:number}[];providerStatuses:{name:string;value:number}[];limited:boolean;generatedAt:string};
const questions=[
 {terms:["agent","approval"],answer:"Go to Admin → Agent approvals. Pending agents can be approved by authorized reviewers."},
 {terms:["provider","approval"],answer:"Go to Admin → Provider verification. Review documentation before approving a provider."},
 {terms:["category","service"],answer:"Go to Admin → Service catalogue to create categories, then services."},
 {terms:["booking","customer"],answer:"Check the customer or provider workspace to review bookings. For a dispute, record the details using your existing support process; a ticket queue is not yet available."},
 {terms:["offline","internet"],answer:"Check your connection and reopen the application. Do not repeat payment or booking submissions with a new request ID."},
 {terms:["otp","login"],answer:"Use the approved staging login phone. Do not share one-time passwords with anyone."},
];
export default function Operations(){
 const [days,setDays]=useState<"7"|"30"|"90">("30"),[reports,setReports]=useState<Reports|null>(null),[summary,setSummary]=useState<Summary|null>(null),[message,setMessage]=useState("Loading operational report…"),[question,setQuestion]=useState(""),[answer,setAnswer]=useState("");
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
 const load=useCallback(async()=>{try{const [x,r]=await Promise.all([api.get<Summary>("/admin/operations/summary"),api.get<Reports>("/admin/operations/reports?days="+days)]);setSummary(x);setReports(r);setMessage("");}catch(e){setMessage(e instanceof Error?e.message:"Admin access required")}},[days]);
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
{reports&&<section aria-label="Historical operational reports"><h2>Historical trends and status reports</h2><label htmlFor="report-days">Date range</label><select id="report-days" value={days} onChange={e=>setDays(e.target.value as "7"|"30"|"90")} style={{maxWidth:240}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>{reports.limited&&<p role="alert">High data volume: historical counts are capped at 10,000 records per entity. Export is not complete.</p>}
<div className="analyticsCharts"><article className="analyticsPanel"><h2>Bookings, agents and providers over time</h2><div className="chartBody"><ResponsiveContainer width="100%" height="100%"><LineChart data={reports.series}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}} minTickGap={24}/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="bookings" stroke="#087A4B" dot={false}/><Line type="monotone" dataKey="agents" stroke="#F47721" dot={false}/><Line type="monotone" dataKey="providers" stroke="#2563EB" dot={false}/></LineChart></ResponsiveContainer></div></article>
{([["Booking statuses",reports.bookingStatuses],["Agent statuses",reports.agentStatuses],["Provider application statuses",reports.providerStatuses]] as const).map(([label,rows])=><article className="analyticsPanel" key={label}><h2>{label}</h2><div className="chartBody"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#087A4B" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></article>)}</div>
<button onClick={()=>{const rows=[["date","bookings","agents","providers"],...reports.series.map(x=>[x.date,String(x.bookings),String(x.agents),String(x.providers)])];const blob=new Blob([rows.map(r=>r.join(",")).join("\\r\\n")],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sevamitra-historical-report.csv";a.click();URL.revokeObjectURL(url)}}>Download historical report CSV</button></section>}
 <h2>Operational shortcuts</h2><div className="adminModules"><article><Link href="/admin/agents">Review agents →</Link></article><article><Link href="/admin">Provider applications →</Link></article><article><Link href="/admin/catalogue">Service catalogue →</Link></article><article><Link href="/admin/roles">Permissions →</Link></article></div>
 <h2>Support assistant (free FAQ)</h2><p>Rule-based help only. No external AI provider, chat storage or ticket submission. Never enter OTPs, private documents or passwords.</p>
 <div style={{maxWidth:700}}><label htmlFor="help-question">Ask about approvals, services or bookings</label><input id="help-question" maxLength={300} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="How do I approve an agent?" onKeyDown={e=>{if(e.key==="Enter")ask()}}/><button disabled={!question.trim()} onClick={ask}>Ask assistant</button>{answer&&<p role="status">{answer}</p>}</div>
 </section></main>
}
