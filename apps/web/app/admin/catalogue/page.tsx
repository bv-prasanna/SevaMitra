"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
type Category={id:string;name:string;description?:string|null;isActive?:boolean};
type Service={id:string;name:string;description?:string|null;categoryId:string;isActive?:boolean};
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>localStorage.getItem("sevamitra_token")||undefined);
export default function AdminCatalogue(){
 const [categories,setCategories]=useState<Category[]>([]);
 const [services,setServices]=useState<Service[]>([]);
 const [categoryName,setCategoryName]=useState("");
 const [serviceName,setServiceName]=useState("");
 const [categoryId,setCategoryId]=useState("");
 const [description,setDescription]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{
   const [c,s]=await Promise.all([api.get<Category[]>("/catalogue/categories"),api.get<Service[]>("/catalogue/services")]);
   setCategories(Array.isArray(c)?c:[]);setServices(Array.isArray(s)?s:[]);
  }catch(e){setMessage(e instanceof Error?e.message:"Cannot load catalogue")}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function createCategory(){
  if(!categoryName.trim())return;setBusy(true);setMessage("");
  try{await api.post("/catalogue/categories",{name:categoryName.trim()});setCategoryName("");await load();setMessage("Category created")}
  catch(e){setMessage(e instanceof Error?e.message:"Cannot create category. Verify admin catalogue permissions.")}
  finally{setBusy(false)}
 }
 async function createService(){
  if(!categoryId||!serviceName.trim())return;setBusy(true);setMessage("");
  try{await api.post("/catalogue/services",{categoryId,name:serviceName.trim(),description:description.trim()||undefined});setServiceName("");setDescription("");await load();setMessage("Service created")}
  catch(e){setMessage(e instanceof Error?e.message:"Cannot create service. Verify admin catalogue permissions.")}
  finally{setBusy(false)}
 }
 return <main><header className="nav"><Link href="/" className="brand"><span className="mark">✦</span><div><b>Seva<span>Mitra</span></b><small>Service catalogue</small></div></Link><Link href="/admin">Admin approvals</Link><Link href="/workspaces">Workspaces</Link></header>
 <section className="workspace"><div className="workspaceTop"><div><div className="pill">Admin · Catalogue</div><h1>Manage categories & services</h1><p>Create the service catalogue for providers and customers. Changes require <code>catalogue.manage</code> permission.</p></div><button onClick={()=>void load()}>Refresh</button></div>
 {!!message&&<p role="status">{message}</p>}
 <div className="adminModules"><article><h2>Add category</h2><label htmlFor="category-name">Category name</label><input id="category-name" maxLength={150} placeholder="Electrical services" value={categoryName} onChange={e=>setCategoryName(e.target.value)}/><button disabled={busy||!categoryName.trim()} onClick={()=>void createCategory()}>Add category</button></article>
 <article><h2>Add service</h2><label htmlFor="service-category">Category</label><select id="service-category" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Select category</option>{categories.filter(c=>c.isActive!==false).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
 <label htmlFor="service-name">Service name</label><input id="service-name" maxLength={150} placeholder="Ceiling fan repair" value={serviceName} onChange={e=>setServiceName(e.target.value)}/><label htmlFor="service-description">Description (optional)</label><textarea id="service-description" maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} /><button disabled={busy||!categoryId||!serviceName.trim()} onClick={()=>void createService()}>Add service</button></article></div>
 <h2>Existing categories ({categories.length})</h2><div className="adminModules">{categories.map(c=><article key={c.id}><h3>{c.name}</h3><p>{c.description}</p><small>{c.isActive===false?"Inactive":"Active"}</small><p>{services.filter(s=>s.categoryId===c.id).length} services</p></article>)}</div>
 <h2>Existing services ({services.length})</h2><div className="adminModules">{services.map(s=><article key={s.id}><h3>{s.name}</h3><p>{s.description}</p><small>{categories.find(c=>c.id===s.categoryId)?.name??s.categoryId} · {s.isActive===false?"Inactive":"Active"}</small></article>)}</div>
 </section></main>
}
