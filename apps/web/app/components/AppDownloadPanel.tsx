"use client";
import {useEffect,useState} from "react";
type Release={id:string;platform:"ANDROID"|"IOS";version:string;buildNumber:string;downloadUrl:string;sha256:string|null;releaseNotes:string|null;minSupportedVersion:string|null;publishedAt:string|null};
const base=(process.env.NEXT_PUBLIC_API_BASE_URL||"").replace(/\/$/,"");
export default function AppDownloadPanel({compact=false}:{compact?:boolean}){
 const[release,setRelease]=useState<Release|null>(null),[message,setMessage]=useState("Checking for the latest Android release…");
 useEffect(()=>{
  if(!base){setMessage("App downloads are not configured yet.");return}
  let alive=true;
  fetch(base+"/api/v1/app-releases/current?platform=ANDROID",{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw new Error("Download information is temporarily unavailable");return response.json() as Promise<Release|null>})
   .then(value=>{if(!alive)return;setRelease(value);setMessage(value?"":"The Android app has not been published yet. Please check back later.")})
   .catch(error=>{if(alive)setMessage(error instanceof Error?error.message:"Unable to load app release")});
  return()=>{alive=false};
 },[]);
 if(!release)return <div className={compact?"appDownloadCompact":"appDownloadPanel"}><p role="status">{message}</p></div>;
 const qr="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data="+encodeURIComponent(release.downloadUrl);
 return <div className={compact?"appDownloadCompact":"appDownloadPanel"}>
  <div className="appDownloadCopy"><span className="appDownloadEyebrow">ANDROID APP · VERSION {release.version}</span>
   <strong>Get SevaMitra on your phone</strong>
   <p>{release.releaseNotes||"Install the latest SevaMitra Android app and sign in with your registered mobile number."}</p>
   <a className="appDownloadButton" href={release.downloadUrl} target="_blank" rel="noopener noreferrer">Download APK</a>
   <small>Build {release.buildNumber}{release.minSupportedVersion?" · Minimum supported "+release.minSupportedVersion:""}</small>
  </div>
  <a className="appDownloadQr" href={release.downloadUrl} target="_blank" rel="noopener noreferrer" aria-label="Open the Android app download">
   <img src={qr} width="140" height="140" loading="lazy" alt="QR code linking to the current SevaMitra Android APK"/>
   <span>Scan to download</span>
  </a>
 </div>;
}
