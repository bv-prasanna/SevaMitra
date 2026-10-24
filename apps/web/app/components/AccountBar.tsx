"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ApiClient} from "@sevamitra/api-client";
type Access={customer:boolean;provider:boolean;agent:boolean;admin:boolean};
export default function AccountBar(){
 const pathname=usePathname();
 const [access,setAccess]=useState<Access|null>(null);
 const [signed,setSigned]=useState(false);
 const check=useCallback(async()=>{
  const token=localStorage.getItem("sevamitra_token");
  if(!token){setSigned(false);setAccess(null);return}
  try{const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>token);setAccess(await api.get<Access>("/auth/workspaces"));setSigned(true)}
  catch(e){const status=(e as {status?:number}).status;if(status===401){localStorage.removeItem("sevamitra_token");setSigned(false)}else setSigned(true);setAccess(null)}
 },[]);
 useEffect(()=>{void check()},[pathname,check]);
 function logout(){localStorage.removeItem("sevamitra_token");setAccess(null);setSigned(false);window.location.assign("/login")}
 return <div className="accountBar"><Link href="/" className="accountBrand"><img src="/sevamitra-logo.png" alt="SevaMitra — One App. Many Services."/></Link><nav aria-label="Account navigation"><Link href="/marketplace">Services</Link>{signed?<><Link href="/workspaces">My workspaces</Link>{access?.admin&&<Link href="/admin">Admin</Link>}<Link href="/workspaces" title="Your workspace and account">Profile</Link><button onClick={logout}>Logout</button></>:<Link href="/login">Login / Register</Link>}</nav></div>
}
