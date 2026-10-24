"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
export default function HomeAccountActions(){
 const [signed,setSigned]=useState(false),[admin,setAdmin]=useState(false);
 useEffect(()=>{let alive=true;const token=localStorage.getItem("sevamitra_token");if(!token)return;const api=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",()=>token);void api.get<{admin:boolean}>("/auth/workspaces").then(r=>{if(alive){setSigned(true);setAdmin(!!r.admin)}}).catch(()=>{if(alive)setSigned(false)});return()=>{alive=false}},[]);
 function logout(){localStorage.removeItem("sevamitra_token");window.location.assign("/login")}
 return signed?<><Link className="loginLink" href="/workspaces">Profile / Workspaces</Link>{admin&&<Link className="loginLink" href="/admin">Admin</Link>}<button type="button" onClick={logout} className="signupBtn">Logout</button></>:<><Link className="loginLink" href="/login">Login</Link><Link className="signupBtn" href="/login">Register</Link></>;
}
