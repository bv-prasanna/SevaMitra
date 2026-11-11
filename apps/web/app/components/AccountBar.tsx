"use client";
import {useCallback,useEffect,useId,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ApiClient} from "@sevamitra/api-client";
import {ChevronDown,LayoutDashboard,Menu,ShieldCheck,X} from "lucide-react";

type Access={customer:boolean;provider:boolean;agent:boolean;admin:boolean};
const sections:Record<string,string>={
 "/admin":"Overview","/admin/agents":"Agent approvals","/admin/catalogue":"Service catalogue",
 "/admin/roles":"Roles & permissions","/admin/organizations":"Provider organizations",
 "/admin/operations":"Operations & reports","/admin/runtime-flags":"Emergency controls",
};
export default function AccountBar(){
 const pathname=usePathname();
 const [access,setAccess]=useState<Access|null>(null);
 const [signed,setSigned]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 const navId=useId();
 const check=useCallback(async()=>{
  const token=localStorage.getItem("sevamitra_token");
  if(!token){setSigned(false);setAccess(null);return}
  try{
   const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>token);
   setAccess(await api.get<Access>("/auth/workspaces"));setSigned(true);
  }catch(e){
   const status=(e as {status?:number}).status;
   if(status===401){localStorage.removeItem("sevamitra_token");setSigned(false)}
   else setSigned(true); // A temporary outage must not log out a valid account.
   setAccess(null);
  }
 },[]);
 useEffect(()=>{setMenuOpen(false);void check()},[pathname,check]);
 function logout(){
  localStorage.removeItem("sevamitra_token");setAccess(null);setSigned(false);
  window.location.assign("/login");
 }
 if(pathname==="/"||pathname==="/login")return null;
 const isAdmin=pathname.startsWith("/admin");
 const context=isAdmin?(sections[pathname]||"Administration"):undefined;
 return <header className="accountBar">
  <Link href="/" className="accountBrand" aria-label="SevaMitra home">
   <img src="/sevamitra-logo.png" alt="SevaMitra — One App. Many Services."/>
  </Link>
  {context&&<div className="accountContext"><ShieldCheck size={15}/><span>Administration</span><ChevronDown size={13}/><strong>{context}</strong></div>}
  <button type="button" className="accountMenuToggle" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-controls={navId} aria-label={menuOpen?"Close account menu":"Open account menu"}>
   {menuOpen?<X size={21}/>:<Menu size={21}/>}<span>Menu</span>
  </button>
  <nav id={navId} className={menuOpen?"accountNav isOpen":"accountNav"} aria-label="Account navigation">
   <Link href="/" className="accountNavLink">Home</Link>
   <Link href="/marketplace" className="accountNavLink" aria-current={pathname.startsWith("/marketplace")?"page":undefined}>Find services</Link>
   {signed?<><Link href="/workspaces" className="accountNavLink" aria-current={pathname==="/workspaces"?"page":undefined}><LayoutDashboard size={15}/> Workspaces</Link>
    {access?.admin&&<Link href="/admin" className="accountNavLink" aria-current={isAdmin?"page":undefined}>Admin console</Link>}
    <Link href="/profile" className="accountNavLink" aria-current={pathname==="/profile"?"page":undefined}>My profile</Link>
    <button type="button" onClick={logout} className="accountSignOut">Sign out</button></>:
    <Link href="/login" className="accountSignIn">Sign in / Register</Link>}
  </nav>
 </header>
}