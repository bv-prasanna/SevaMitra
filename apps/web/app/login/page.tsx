"use client";
import{useState}from"react";import{ApiClient,extractOtpLoginTokens}from"@sevamitra/api-client";import Link from"next/link";
const base=process.env.NEXT_PUBLIC_API_BASE_URL||"";const api=new ApiClient(base);
export default function Login(){
 const[mobile,setMobile]=useState(""),[otp,setOtp]=useState(""),[sent,setSent]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const valid=/^[6-9]\d{9}$/.test(mobile);
 async function go(){
  if(!base){setMsg("API URL missing: configure NEXT_PUBLIC_API_BASE_URL.");return}
  setBusy(true);setMsg("");
  try{
   const phoneNumber="+91"+mobile;
   if(!sent){await api.requestOtp({phoneNumber,purpose:"LOGIN"});setSent(true);setMsg("OTP sent successfully.");return}
   const response=await api.verifyOtp({phoneNumber,otp,purpose:"LOGIN"});
   const tokens=extractOtpLoginTokens(response);
   localStorage.setItem("sevamitra_token",tokens.accessToken);
   // After OTP, the workspace menu is filtered by server-side profile and IAM.
   const authed=new ApiClient(base,()=>tokens.accessToken);
   await authed.get("/auth/workspaces");
   window.location.assign("/workspaces");
  }catch(e){setMsg(e instanceof Error?e.message:"OTP verification failed");}finally{setBusy(false)}
 }
 return <main className="authPage"><section className="authCard"><Link href="/" className="back">← SevaMitra</Link><div className="pill">Trusted local services</div><h1>Welcome to SevaMitra</h1><p>Sign in with your phone number. ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಿಂದ ಲಾಗಿನ್ ಮಾಡಿ.</p>
  {!base&&<div className="formMsg">Configure NEXT_PUBLIC_API_BASE_URL in apps/web/.env.local.</div>}
  <label>Mobile number</label><input autoComplete="tel" value={mobile} disabled={sent} onChange={e=>setMobile(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number"/>
  {sent&&<><label>OTP</label><input autoComplete="one-time-code" inputMode="numeric" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit OTP"/><button type="button" onClick={()=>{setSent(false);setOtp("");setMsg("")}}>Change number / resend</button></>}
  <button className="primary wide" disabled={busy||!valid||(sent&&otp.length!==6)} onClick={()=>void go()}>{busy?"Please wait…":sent?"Verify & continue":"Send OTP"}</button>
  {!!msg&&<div role="alert" className="formMsg">{msg}</div>}
  <small>Only verified server permissions grant access to administrative functions.</small>
 </section></main>;
}
