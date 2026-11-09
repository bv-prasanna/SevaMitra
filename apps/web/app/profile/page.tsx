"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
import {UserRound,ShieldCheck,Globe2,Bell,ArrowRight,RefreshCw} from "lucide-react";
type Identity={id:string;phoneNumber:string|null;email:string|null};
type Customer={fullName:string;preferredLanguage:string;notificationOptIn:boolean;status:string};
type Entitlements={customer:boolean;provider:boolean;agent:boolean;admin:boolean};

export default function AccountProfile(){
 const[account,setAccount]=useState<Identity|null>(null);
 const[customer,setCustomer]=useState<Customer|null>(null);
 const[roles,setRoles]=useState<Entitlements|null>(null);
 const[fullName,setFullName]=useState("");
 const[language,setLanguage]=useState("kn");
 const[notificationOptIn,setNotificationOptIn]=useState(true);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[error,setError]=useState("");
 const[success,setSuccess]=useState("");
 const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>typeof window==="undefined"?undefined:localStorage.getItem("sevamitra_token")||undefined);
 const load=useCallback(async()=>{
  setLoading(true);setError("");setSuccess("");
  const token=localStorage.getItem("sevamitra_token");
  if(!token){setAccount(null);setCustomer(null);setRoles(null);setError("Please sign in to view your profile.");setLoading(false);return}
  try{
   const identity=await api.get<Identity>("/auth/me");
   setAccount(identity);
   const [profile,entitlements]=await Promise.allSettled([api.get<Customer>("/customers/me"),api.get<Entitlements>("/auth/workspaces")]);
   if(profile.status==="fulfilled"){
    setCustomer(profile.value);setFullName(profile.value.fullName);
    setLanguage(profile.value.preferredLanguage==="en"?"en":"kn");
    setNotificationOptIn(profile.value.notificationOptIn);
   }else if((profile.reason as {status?:number})?.status===404){
    setCustomer(null);setFullName("");setLanguage("kn");setNotificationOptIn(true);
   }else{
    setError(profile.reason instanceof Error?profile.reason.message:"Could not load your customer preferences.");
   }
   if(entitlements.status==="fulfilled")setRoles(entitlements.value);
   else{setRoles(null);setError(old=>old||"Unable to load available workspaces. Refresh and retry.");}
  }catch(e){
   setAccount(null);setCustomer(null);setRoles(null);
   setError(e instanceof Error?e.message:"Unable to load your account.");
  }finally{setLoading(false)}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{void load()},[load]);
 async function save(){
  if(!account||saving||fullName.trim().length<2){setError("Enter a name of at least two characters.");return}
  setSaving(true);setError("");setSuccess("");
  const data={fullName:fullName.trim(),preferredLanguage:language,notificationOptIn};
  try{
   const result=customer
    ?await api.patch<Customer>("/customers/me",data)
    :await api.post<Customer>("/customers/me",data);
   setCustomer(result);setFullName(result.fullName);setLanguage(result.preferredLanguage);setNotificationOptIn(result.notificationOptIn);
   setSuccess("Profile preferences saved successfully.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to save your profile.");}
  finally{setSaving(false)}
 }
 return <main>
  <section className="workspace accountProfile">
   <div className="workspaceTop">
    <div><div className="pill"><UserRound size={15}/> Account</div>
     <h1>My profile</h1><p>Manage your name, language and notification preferences. Security and role permissions are enforced by SevaMitra.</p>
    </div><button type="button" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button>
   </div>
   {loading&&<p role="status">Loading your profile…</p>}
   {error&&<p role="alert">{error} {!account&&<Link href="/login">Sign in →</Link>}</p>}
   {success&&<p role="status" aria-live="polite">{success}</p>}
   {account&&!loading&&<div className="accountProfileGrid">
    <section className="accountPanel"><div className="panelHeading"><ShieldCheck size={22}/><div><h2>Account identity</h2><p>Verified login information, read only</p></div></div>
     <div className="profileField"><span>Mobile number</span><strong>{account.phoneNumber??"Not added"}</strong></div>
     <div className="profileField"><span>Email address</span><strong>{account.email??"Not added"}</strong></div>
     <p className="accountHint">For security, login identifiers cannot be changed from this page.</p>
    </section>
    <section className="accountPanel"><div className="panelHeading"><Globe2 size={22}/><div><h2>Customer preferences</h2><p>{customer?"Edit your details":"Complete your customer profile"}</p></div></div>
     <form onSubmit={e=>{e.preventDefault();void save()}}>
      <label htmlFor="profile-full-name">Full name</label>
      <input id="profile-full-name" autoComplete="name" maxLength={150} value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={2}/>
      <label htmlFor="profile-language">Preferred language</label>
      <select id="profile-language" value={language} onChange={e=>setLanguage(e.target.value)}><option value="kn">ಕನ್ನಡ (Kannada)</option><option value="en">English</option></select>
      <label className="profileCheck" htmlFor="profile-notify"><input id="profile-notify" type="checkbox" checked={notificationOptIn} onChange={e=>setNotificationOptIn(e.target.checked)}/><Bell size={18}/> Receive optional service notifications</label>
      <button type="submit" className="primary" disabled={saving||fullName.trim().length<2}>{saving?"Saving…":customer?"Save changes":"Create customer profile"}</button>
     </form>
    </section>
    <section className="accountPanel accountPanelWide"><h2>My workspaces</h2><p>Open an eligible role to manage its dedicated information.</p>
     <div className="accountRoles"><Link href="/workspaces">All workspaces <ArrowRight size={16}/></Link>{roles?.provider&&<Link href="/provider">Provider profile <ArrowRight size={16}/></Link>}{roles?.agent&&<Link href="/agent">Agent profile <ArrowRight size={16}/></Link>}{roles?.admin&&<Link href="/admin">Operations console <ArrowRight size={16}/></Link>}</div>
    </section>
   </div>}
  </section>
 </main>;
}
