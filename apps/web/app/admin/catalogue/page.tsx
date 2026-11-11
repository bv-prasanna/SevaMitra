"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
import {ArrowRight,BookOpen,Layers3,Plus,RefreshCw,Search,ShieldCheck} from "lucide-react";
import Feedback from "../../components/Feedback";

type Category={id:string;name:string;description?:string|null;isActive?:boolean};
type Service={id:string;name:string;description?:string|null;categoryId:string;isActive?:boolean};
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);

export default function AdminCatalogue(){
 const[categories,setCategories]=useState<Category[]>([]);
 const[services,setServices]=useState<Service[]>([]);
 const[categoryName,setCategoryName]=useState("");
 const[serviceName,setServiceName]=useState("");
 const[categoryId,setCategoryId]=useState("");
 const[description,setDescription]=useState("");
 const[notice,setNotice]=useState("");
 const[error,setError]=useState("");
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[filter,setFilter]=useState("");
 const[scope,setScope]=useState<"all"|"active"|"inactive">("all");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const[c,s]=await Promise.all([api.get<Category[]>("/catalogue/categories"),api.get<Service[]>("/catalogue/services")]);
   setCategories(Array.isArray(c)?c:[]);setServices(Array.isArray(s)?s:[]);return true;
  }catch(e){
   setCategories([]);setServices([]);
   setError(e instanceof Error?e.message:"Unable to load the catalogue. Confirm your permission and try again.");return false;
  }finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const visibleCategories=useMemo(()=>categories.filter(c=>(scope==="all"||((c.isActive!==false)=== (scope==="active")))&&(!filter.trim()||c.name.toLowerCase().includes(filter.trim().toLowerCase()))),[categories,filter,scope]);
 const visibleServices=useMemo(()=>services.filter(s=>{
  const active=s.isActive!==false;
  const categoryName=categories.find(c=>c.id===s.categoryId)?.name||"";
  return (scope==="all"||active===(scope==="active"))&&(!filter.trim()||[s.name,s.description||"",categoryName].some(x=>x.toLowerCase().includes(filter.trim().toLowerCase())));
 }),[services,categories,filter,scope]);
 async function createCategory(){
  const name=categoryName.trim();
  if(name.length<2){setError("Category name must contain at least two characters.");return}
  setBusy(true);setError("");setNotice("");
  try{
   await api.post("/catalogue/categories",{name});setCategoryName("");const confirmed=await load();
   if(confirmed)setNotice("Category created. You can now add services under this category.");
   else setError("Category was submitted, but the catalogue could not be refreshed. Verify before retrying.");
  }catch(e){setError(e instanceof Error?e.message:"Cannot create category. Check your catalogue permissions.")}
  finally{setBusy(false)}
 }
 async function createService(){
  const name=serviceName.trim();
  if(!categoryId||name.length<2){setError("Choose an active category and enter a service name of at least two characters.");return}
  setBusy(true);setError("");setNotice("");
  try{
   await api.post("/catalogue/services",{categoryId,name,description:description.trim()||undefined});
   setServiceName("");setDescription("");const confirmed=await load();
   if(confirmed)setNotice("Service created. Providers can now configure an offering once it is enabled.");
   else setError("Service was submitted, but the catalogue could not be refreshed. Verify before retrying.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to create service. Check the details and permissions.")}
  finally{setBusy(false)}
 }
 return <main>
  <section className="workspace">
   <div className="workspaceTop"><div><div className="pill"><Layers3 size={15}/> Catalogue management</div><h1>Service catalogue</h1><p>A structured, reliable catalogue of local services. Manage categories first, then add specific services for verified providers.</p></div>
    <button onClick={()=>void load()} disabled={busy||loading}><RefreshCw size={15}/> {loading?"Loading…":"Refresh"}</button>
   </div>
   {error&&<Feedback kind="error">{error} <Link href="/workspaces">Check your workspaces</Link></Feedback>}
   {notice&&<Feedback kind="success">{notice}</Feedback>}
   <div className="uatStatStrip" aria-label="Catalogue totals">
    <div className="uatStat"><span>Categories</span><strong>{categories.length}</strong></div>
    <div className="uatStat"><span>Services</span><strong>{services.length}</strong></div>
    <div className="uatStat"><span>Active services</span><strong>{services.filter(s=>s.isActive!==false).length}</strong></div>
   </div>
   <div className="uatPageHeading"><div><h2>Add to catalogue</h2><p>Only approved operations users with catalogue management permission can create items.</p></div><ShieldCheck color="#087a4b" aria-hidden="true"/></div>
   <div className="adminModules">
    <article><h2><Plus size={18} aria-hidden="true"/> New category</h2>
     <form onSubmit={e=>{e.preventDefault();void createCategory()}}>
      <label htmlFor="category-name">Category name</label>
      <input id="category-name" autoComplete="off" maxLength={150} minLength={2} required placeholder="e.g. Electrical services" value={categoryName} onChange={e=>setCategoryName(e.target.value)}/>
      <p className="uatFieldHelp">Keep names clear and customer-friendly; duplicate names are rejected by the server.</p>
      <button type="submit" disabled={busy||categoryName.trim().length<2}><Plus size={15}/> {busy?"Saving…":"Create category"}</button>
     </form>
    </article>
    <article><h2><BookOpen size={18} aria-hidden="true"/> New service</h2>
     <form onSubmit={e=>{e.preventDefault();void createService()}}>
      <label htmlFor="service-category">Service category</label>
      <select id="service-category" value={categoryId} required onChange={e=>setCategoryId(e.target.value)}>
       <option value="">Choose a category</option>{categories.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <label htmlFor="service-name">Service name</label>
      <input id="service-name" maxLength={150} minLength={2} required placeholder="e.g. Ceiling fan repair" value={serviceName} onChange={e=>setServiceName(e.target.value)}/>
      <label htmlFor="service-description">Description (optional)</label>
      <textarea id="service-description" rows={3} maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what the customer can book."/>
      <button type="submit" disabled={busy||!categoryId||serviceName.trim().length<2}><Plus size={15}/> {busy?"Saving…":"Create service"}</button>
     </form>
    </article>
   </div>
   <div className="uatPageHeading"><div><h2>Browse catalogue</h2><p>Search across service names, descriptions and category names.</p></div></div>
   <div className="uatFilters">
    <label htmlFor="catalogue-query"><Search size={14} aria-hidden="true"/> Search
     <input id="catalogue-query" type="search" value={filter} maxLength={100} onChange={e=>setFilter(e.target.value)} placeholder="Search services or categories"/>
    </label>
    <label htmlFor="catalogue-status">Status
     <select id="catalogue-status" value={scope} onChange={e=>setScope(e.target.value as typeof scope)}>
      <option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option>
     </select>
    </label>
   </div>
   <div className="uatPageHeading"><div><h2>Categories ({visibleCategories.length})</h2></div></div>
   {!loading&&!visibleCategories.length&&<div className="uatEmptyState"><Layers3 size={24} aria-hidden="true"/><h3>No matching categories</h3><p>Try a different search or create your first category above.</p></div>}
   <div className="adminModules">{visibleCategories.map(c=><article key={c.id}><h3>{c.name}</h3>
    <span className="uatBadge" data-state={c.isActive===false?"inactive":"active"}>{c.isActive===false?"Inactive":"Active"}</span>
    <p>{c.description||"This category groups related services."}</p>
    <p><strong>{services.filter(s=>s.categoryId===c.id).length}</strong> related services</p>
   </article>)}</div>
   <div className="uatPageHeading"><div><h2>Services ({visibleServices.length})</h2></div><Link href="/admin">Back to admin console <ArrowRight size={15}/></Link></div>
   {!loading&&!visibleServices.length&&<div className="uatEmptyState"><BookOpen size={24} aria-hidden="true"/><h3>No matching services</h3><p>Adjust the search or add a service under an active category.</p></div>}
   <div className="adminModules">{visibleServices.map(s=><article key={s.id}><h3>{s.name}</h3>
    <span className="uatBadge" data-state={s.isActive===false?"inactive":"active"}>{s.isActive===false?"Inactive":"Active"}</span>
    <p>{s.description||"No description yet."}</p>
    <small>{categories.find(c=>c.id===s.categoryId)?.name||"Unknown category"}</small>
   </article>)}</div>
  </section>
 </main>;
}
