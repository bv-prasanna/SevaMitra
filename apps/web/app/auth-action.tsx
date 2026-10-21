"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const TOKEN_KEY="sevamitra_token";
/** UI hint only. Protected API endpoints always verify the JWT server-side. */
export default function AuthAction({className="primary",signedInLabel="My workspaces"}:{
 className?:string;signedInLabel?:string
}){
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 useEffect(()=>{
  const refresh=()=>setSignedIn(Boolean(window.localStorage.getItem(TOKEN_KEY)));
  refresh();
  window.addEventListener("storage",refresh);
  window.addEventListener("pageshow",refresh);
  return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener("pageshow",refresh)};
 },[]);
 if(signedIn===null)return <span aria-label="Checking sign-in status" />;
 return <Link href={signedIn?"/workspaces":"/login"} className={className}>{signedIn?signedInLabel:"Sign in"}</Link>;
}
