"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
type Release={id:string;platform:"ANDROID"|"IOS";version:string;buildNumber:string;downloadUrl:string;sha256:string|null;releaseNotes:string|null;minSupportedVersion:string|null;isPublished:boolean;publishedAt:string|null;createdAt:string};
const blank={platform:"ANDROID" as "ANDROID"|"IOS",version:"1.0.0",buildNumber:"1",downloadUrl:"",sha256:"",releaseNotes:"",minSupportedVersion:"1.0.0",isPublished:false};
export default function AppManagement(){
 const[rows,setRows]=useState<Release[]>([]),[form,setForm]=useState({...blank}),[message,setMessage]=useState("Loading app releases…"),[busy,setBusy]=useState(false);
 async function load(){try{const data=await api.get<Release[]>("/app-releases/admin");setRows(data);setMessage(data.length?"":"No app releases have been configured yet.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to load app releases. Check app.release.manage permission.")}}
 useEffect(()=>{void load()},[]);
 function change<K extends keyof typeof blank>(key:K,value:(typeof blank)[K]){setForm(prev=>({...prev,[key]:value}))}
 async function create(event:FormEvent){event.preventDefault();setBusy(true);setMessage("");
  try{
   await api.post("/app-releases/admin",{...form,sha256:form.sha256||undefined,releaseNotes:form.releaseNotes||undefined,minSupportedVersion:form.minSupportedVersion||undefined});
   setForm({...blank});await load();setMessage("App release saved. The public download page and QR code now use the published Android release.");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save app release")}finally{setBusy(false)}
 }
 async function publish(row:Release){setBusy(true);setMessage("");
  try{await api.patch("/app-releases/admin/"+row.id,{isPublished:!row.isPublished});await load();setMessage(row.isPublished?"Release retired from public downloads.":"Release published. Previous release for this platform was unpublished.");}
  catch(e){setMessage(e instanceof Error?e.message:"Could not update release")}finally{setBusy(false)}
 }
 async function retire(row:Release){if(!window.confirm("Retire this release from public downloads?"))return;setBusy(true);
  try{await api.delete("/app-releases/admin/"+row.id);await load();setMessage("Release retired. Existing downloads already in progress are not affected.");}
  catch(e){setMessage(e instanceof Error?e.message:"Could not retire release")}finally{setBusy(false)}
 }
 return <main><section className="workspace appManagementPage">
  <div className="workspaceTop"><div><div className="pill">Release administration</div><h1>App management</h1><p>Publish versioned Android APK download links until Play Store distribution is ready. Publishing a release updates the navbar link, download page and footer QR code.</p></div><Link href="/admin">Back to administration</Link></div>
  {!!message&&<p role="status" aria-live="polite">{message}</p>}
  <form className="appReleaseForm" onSubmit={create}>
   <h2>Publish a new release</h2>
   <div className="formGrid">
    <label>Platform<select value={form.platform} onChange={e=>change("platform",e.target.value as "ANDROID"|"IOS")}><option value="ANDROID">Android APK</option><option value="IOS" disabled>iOS (on hold)</option></select></label>
    <label>Version<input required pattern="\d+\.\d+\.\d+" placeholder="1.2.0" value={form.version} onChange={e=>change("version",e.target.value)}/></label>
    <label>Build number<input required inputMode="numeric" pattern="\d+" value={form.buildNumber} onChange={e=>change("buildNumber",e.target.value)}/></label>
    <label>Minimum supported version<input pattern="\d+\.\d+\.\d+" value={form.minSupportedVersion} onChange={e=>change("minSupportedVersion",e.target.value)}/></label>
    <label className="formWide">HTTPS APK / IPA download URL<input required type="url" placeholder="https://..." value={form.downloadUrl} onChange={e=>change("downloadUrl",e.target.value)}/></label>
    <label className="formWide">SHA-256 checksum (optional)<input pattern="[a-fA-F0-9]{64}" maxLength={64} value={form.sha256} onChange={e=>change("sha256",e.target.value)}/></label>
    <label className="formWide">Release notes<textarea maxLength={3000} rows={4} value={form.releaseNotes} onChange={e=>change("releaseNotes",e.target.value)}/></label>
   </div>
   <label className="appPublishToggle"><input type="checkbox" checked={form.isPublished} onChange={e=>change("isPublished",e.target.checked)}/> Publish immediately after saving</label>
   <button className="primary" disabled={busy}>{busy?"Saving…":"Save release"}</button>
   <p className="muted">Only HTTPS links are accepted. The QR code points to the published download URL; keep the APK in an approved, durable release location.</p>
  </form>
  <h2>Configured releases ({rows.length})</h2>
  <div className="adminModules">{rows.map(row=><article key={row.id}>
   <h3>{row.platform} · v{row.version} · build {row.buildNumber}</h3>
   <p>{row.isPublished?"Published":"Not published"}{row.publishedAt?" · "+new Date(row.publishedAt).toLocaleString():""}</p>
   <p className="releaseUrl"><a href={row.downloadUrl} target="_blank" rel="noopener noreferrer">Open download link</a></p>
   {row.sha256&&<p>SHA-256: <code>{row.sha256}</code></p>}
   {row.releaseNotes&&<p>{row.releaseNotes}</p>}
   <div className="releaseActions"><button disabled={busy} onClick={()=>void publish(row)}>{row.isPublished?"Unpublish":"Publish"}</button><button disabled={busy} onClick={()=>void retire(row)}>Retire</button></div>
  </article>)}</div>
  <p className="muted">Publishing a different release for the same platform automatically unpublishes the previous one. Retired records remain for audit history.</p>
 </section></main>;
}
