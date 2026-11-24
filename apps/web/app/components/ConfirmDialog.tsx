"use client";
import {useEffect,useRef} from "react";
import {AlertTriangle} from "lucide-react";
type Props={title:string;description:string;confirmLabel:string;danger?:boolean;busy?:boolean;onConfirm:()=>void;onCancel:()=>void};
export default function ConfirmDialog({title,description,confirmLabel,danger=false,busy=false,onConfirm,onCancel}:Props){
 const cancelRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{cancelRef.current?.focus()},[]);
 return <div className="uatConfirmBackdrop" onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.stopPropagation();onCancel()}}}>
  <div role="alertdialog" aria-modal="true" aria-labelledby="uat-dialog-title" aria-describedby="uat-dialog-description" className="uatConfirmDialog">
   <AlertTriangle size={27} color={danger?"#ab3f30":"#c57813"} aria-hidden="true"/>
   <h2 id="uat-dialog-title">{title}</h2>
   <p id="uat-dialog-description">{description}</p>
   <div className="uatConfirmActions">
    <button type="button" className="uatCancel" ref={cancelRef} disabled={busy} onClick={onCancel}>Cancel</button>
    <button type="button" className={danger?"uatDanger":"primary"} disabled={busy} onClick={onConfirm}>{busy?"Please wait…":confirmLabel}</button>
   </div>
  </div>
 </div>;
}
