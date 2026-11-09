"use client";
import{useEffect,useState}from"react";import{ApiClient,extractOtpLoginTokens}from"@sevamitra/api-client";import Link from"next/link";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";const api=new ApiClient(base);
export default function Login(){
 const[mobile,setMobile]=useState(""),[otp,setOtp]=useState(""),[sent,setSent]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;const token=localStorage.getItem("sevamitra_token");if(!token||!base)return;const auth=new ApiClient(base,()=>token);void auth.get("/auth/workspaces").then(()=>{if(active)window.location.replace("/workspaces")}).catch(e=>{if(active&&(e as {status?:number}).status===401)localStorage.removeItem("sevamitra_token")});return()=>{active=false}},[]);
 const valid=/^[6-9]\d{9}$/.test(mobile);
 async function go(){
  if(!base){setMsg("Sign-in is temporarily unavailable. Please contact support.");return}
  setBusy(true);setMsg("");
  try{
   const phoneNumber="+91"+mobile;
   if(!sent){await api.requestOtp({phoneNumber,purpose:"LOGIN"});setSent(true);setMsg("OTP sent successfully.");return}
   const response=await api.verifyOtp({phoneNumber,otp,purpose:"LOGIN"});
   const tokens=extractOtpLoginTokens(response);
   localStorage.setItem("sevamitra_token",tokens.accessToken);
   // The workspace page verifies roles independently; transient role-lookup errors must not strand a successful OTP login.
   window.location.assign("/workspaces");
  }catch(e){setMsg(e instanceof Error?e.message:"OTP verification failed");}finally{setBusy(false)}
 }
 return <main className="authPage"><section className="authCard"><Link href="/" className="back">← SevaMitra</Link><div className="pill">One App. Many Services.</div><h1>Welcome to SevaMitra</h1><p>Trusted local services. Sign in with your phone number. ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಿಂದ ಲಾಗಿನ್ ಮಾಡಿ.</p>
  {!base&&<div role="alert" className="formMsg">Sign-in is temporarily unavailable. Please contact support.</div>}
  <label htmlFor="login-mobile">Mobile number</label><input id="login-mobile" inputMode="numeric" autoComplete="tel" value={mobile} disabled={sent} onChange={e=>setMobile(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number"/>
  {sent&&<><label htmlFor="login-otp">OTP</label><input id="login-otp" autoComplete="one-time-code" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit OTP"/><button type="button" onClick={()=>{setSent(false);setOtp("");setMsg("")}}>Change number / resend</button></>}
  <button className="primary wide" disabled={busy||!valid||(sent&&otp.length!==6)} onClick={()=>void go()}>{busy?"Please wait…":sent?"Verify & continue":"Send OTP"}</button>
  {!!msg&&<div role={msg.startsWith("OTP sent")?"status":"alert"} aria-live="polite" className="formMsg">{msg}</div>}
  <small>Only verified server permissions grant access to administrative functions.</small>
 </section></main>;
}
