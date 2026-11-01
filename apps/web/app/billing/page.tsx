"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";
const api=new ApiClient(base,()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
type Invoice={id:string;bookingId:string;invoiceNumber:string|null;status:string;issuedAt:string|null};
type Booking={id:string;status:string;scheduledDate:string;currency:string;amount:string|null};
type Payment={id:string;amount:string;status:string;method:string;bookingId:string;createdAt:string};
export default function MyBilling(){
 const[invoices,setInvoices]=useState<Invoice[]>([]),[bookings,setBookings]=useState<Booking[]>([]),[payments,setPayments]=useState<Payment[]>([]);
 const[message,setMessage]=useState("Loading billing…"),[busy,setBusy]=useState(false);
 async function load(){
  try{
   const [inv,customer,provider,payCustomer,payProvider]=await Promise.allSettled([
    api.get<Invoice[]>("/billing/me"),api.get<Booking[]>("/bookings/me"),
    api.get<Booking[]>("/bookings/provider/me"),api.get<Payment[]>("/payments/me"),
    api.get<Payment[]>("/payments/provider/me")]);
   if(inv.status!=="fulfilled")throw inv.reason;
   setInvoices(inv.value);
   const bookingsFound=[...(customer.status==="fulfilled"?customer.value:[]),...(provider.status==="fulfilled"?provider.value:[])];
   setBookings([...new Map(bookingsFound.map(x=>[x.id,x])).values()]);
   const paymentsFound=[...(payCustomer.status==="fulfilled"?payCustomer.value:[]),...(payProvider.status==="fulfilled"?payProvider.value:[])];
   setPayments([...new Map(paymentsFound.map(x=>[x.id,x])).values()]);
   setMessage("");
  }catch(e){setMessage(e instanceof Error?e.message:"Sign in to view your billing history")}
 }
 useEffect(()=>{void load()},[]);
 async function createProforma(bookingId:string){
  setBusy(true);setMessage("");
  try{await api.post("/billing/me/bookings/"+bookingId+"/proforma",{});await load()}
  catch(e){setMessage(e instanceof Error?e.message:"Could not prepare pro-forma")}
  finally{setBusy(false)}
 }
 async function download(id:string){
  setBusy(true);setMessage("");
  try{
   const token=localStorage.getItem("sevamitra_token");if(!token)throw Error("Sign in required");
   const response=await fetch(base.replace(/\/$/,"")+"/api/v1/billing/me/"+encodeURIComponent(id)+"/download",
    {headers:{Authorization:"Bearer "+token}});
   if(!response.ok)throw Error("Download unavailable or access denied");
   const blob=await response.blob();const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="sevamitra-invoice.pdf";a.click();
   setTimeout(()=>URL.revokeObjectURL(url),5000);
  }catch(e){setMessage(e instanceof Error?e.message:"Cannot download invoice")}finally{setBusy(false)}
 }
 return <main><section className="workspace"><div className="workspaceTop"><div><div className="pill">My account</div>
  <h1>Billing, invoices and payment history</h1><p>Download your own documents when needed. We do not send automatic invoice emails during the pilot.</p>
  </div><Link href="/workspaces">My workspaces</Link></div>
  {!!message&&<p role="status">{message}</p>}
  <h2>Invoices ({invoices.length})</h2><div className="adminModules">
   {invoices.map(x=><article key={x.id}><h3>{x.invoiceNumber??"Pro-forma"}</h3>
    <p>{x.status} · Booking {x.bookingId}</p><button disabled={busy} onClick={()=>void download(x.id)}>Download PDF</button></article>)}
  </div>{!invoices.length&&<p>No billing documents have been generated yet.</p>}
  <h2>Bookings</h2><div className="adminModules">{bookings.map(x=><article key={x.id}>
   <p>Booking {x.id}</p><p>{x.status} · {String(x.scheduledDate).slice(0,10)}</p>
   {!invoices.some(y=>y.bookingId===x.id)&&<button disabled={busy} onClick={()=>void createProforma(x.id)}>Prepare pro-forma</button>}
  </article>)}</div>
  <h2>Payments ({payments.length})</h2><div className="adminModules">{payments.map(x=><article key={x.id}>
   <h3>{x.method} · {x.status}</h3><p>INR {x.amount} · Booking {x.bookingId}</p>
  </article>)}</div>{!payments.length&&<p>No payments recorded. Payment collection remains disabled in staging.</p>}
 </section></main>;
}
