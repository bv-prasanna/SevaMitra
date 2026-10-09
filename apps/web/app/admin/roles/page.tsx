"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ApiClient} from "@sevamitra/api-client";
import {matrixRows,togglePermission,validateRoleMatrixSelection,MATRIX_ACTIONS} from "@sevamitra/api-client/src/permission-matrix";

type Permission={key:string;description:string};
type Role={id:string;name:string;description:string|null;isSystem:boolean;permissionKeys:string[]};
const client=new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL||"",
 ()=>typeof window!=="undefined"?localStorage.getItem("sevamitra_token")||undefined:undefined);
const title=(key:string)=>key.replaceAll("."," / ").replaceAll("_"," ");
const label:Record<string,string>={view:"View",add:"Add",edit:"Edit",delete:"Delete",manage:"Manage (bundled)",execute:"Action",other:"Other"};

export default function RolePermissionMatrix(){
 const[permissions,setPermissions]=useState<Permission[]>([]);
 const[roles,setRoles]=useState<Role[]>([]);
 const[selected,setSelected]=useState<string>("new");
 const[name,setName]=useState("");
 const[description,setDescription]=useState("");
 const[granted,setGranted]=useState<string[]>([]);
 const[notice,setNotice]=useState("Loading permission catalog…");
 const[busy,setBusy]=useState(false);
 const current=roles.find(r=>r.id===selected);
 const readOnly=Boolean(current?.isSystem);
 const matrix=useMemo(()=>matrixRows(permissions),[permissions]);

 const load=useCallback(async()=>{
  try{
   const [allPermissions,allRoles]=await Promise.all([
    client.get<Permission[]>("/iam/permissions"),client.get<Role[]>("/iam/roles"),
   ]);
   setPermissions(allPermissions);
   setRoles(allRoles);
   setNotice("");
  }catch(error){
   setNotice(error instanceof Error?error.message:"Permissions unavailable. An authorized admin is required.");
  }
 },[]);
 useEffect(()=>{void load()},[load]);

 function edit(role:Role|null){
  setSelected(role?.id??"new");setName(role?.name??"");
  setDescription(role?.description??"");
  setGranted([...(role?.permissionKeys??[])]);
  setNotice("");
 }
 function change(key:string,checked:boolean){
  if(readOnly)return;
  setGranted(old=>togglePermission(old,key,checked));
 }
 async function save(){
  if(readOnly)return;
  if(name.trim().length<2){setNotice("Enter a role name of at least two characters.");return}
  setBusy(true);setNotice("");
  try{
   const permissionKeys=validateRoleMatrixSelection(granted,permissions);
   const body={name:name.trim(),description:description.trim(),permissionKeys};
   const saved=selected==="new"
    ?await client.post<Role>("/iam/roles",body)
    :await client.patch<Role>(`/iam/roles/${selected}`,body);
   await load();
   edit(saved);
   setNotice("Role and its selected permissions saved.");
  }catch(error){setNotice(error instanceof Error?error.message:"Saving the role failed.")}
  finally{setBusy(false)}
 }
 async function remove(){
  if(!current||current.isSystem||busy)return;
  if(!window.confirm(`Delete role "${current.name}"? Users must be unassigned first.`))return;
  setBusy(true);
  try{await client.delete(`/iam/roles/${current.id}`);await load();edit(null);setNotice("Role deleted.")}
  catch(error){setNotice(error instanceof Error?error.message:"Delete failed")}
  finally{setBusy(false)}
 }
 function toggleRow(feature:string,enable:boolean){
  const keys=matrix.find(r=>r.feature===feature);
  if(!keys)return;
  setGranted(previous=>{
   let result=previous;
   for(const cell of Object.values(keys.cells))for(const p of cell)
    result=togglePermission(result,p.key,enable);
   return result;
  });
 }

 return <main>
  <header className="nav"><Link href="/admin" className="brand">← SevaMitra Admin</Link><Link href="/workspaces">Workspaces</Link></header>
  <section className="workspace">
   <h1>Roles & permissions matrix</h1>
   <p>Grant only the minimum permissions needed. Changes are enforced by the backend on subsequent requests. <strong>Manage (bundled)</strong> grants multiple actions in modules that have not yet split their legacy permission; it is not equivalent to separate Add/Edit/Delete controls.</p>
   {!!notice&&<p role="status">{notice}</p>}
   <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
    <button onClick={()=>edit(null)}>+ Create role</button>
    <button onClick={()=>void load()}>Refresh</button>
   </div>
   <label htmlFor="select-role">Role to configure</label>
   <select id="select-role" value={selected} onChange={e=>edit(roles.find(r=>r.id===e.target.value)??null)}
    style={{display:"block",width:"100%",maxWidth:460,padding:10,marginTop:6,marginBottom:15}}>
    <option value="new">+ New custom role</option>
    {roles.map(r=><option value={r.id} key={r.id}>{r.name}{r.isSystem?" (system locked)":""}</option>)}
   </select>
   <div style={{display:"grid",gap:10,maxWidth:640,marginBottom:20}}>
    <label htmlFor="role-name">Role name</label>
    <input id="role-name" maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={readOnly} placeholder="e.g. Bengaluru Provider Ops"/>
    <label htmlFor="role-description">Description</label>
    <input id="role-description" maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} disabled={readOnly} placeholder="What this role is allowed to do"/>
   </div>
   <div style={{overflowX:"auto",maxWidth:"100%",border:"1px solid #DCE6DF",borderRadius:12}}>
    <table style={{borderCollapse:"collapse",width:"100%",minWidth:920}}>
     <thead><tr style={{background:"#E9F5ED"}}>
       <th style={{padding:12,textAlign:"left",position:"sticky",left:0,background:"#E9F5ED"}}>Feature</th>
       {MATRIX_ACTIONS.map(action=><th key={action} style={{padding:10,textAlign:"center",fontSize:12}}>{label[action]}</th>)}
       <th style={{padding:10}}>All</th>
     </tr></thead>
     <tbody>{matrix.map(row=><tr key={row.feature} style={{borderTop:"1px solid #E0ECE3"}}>
      <th style={{padding:10,textAlign:"left",fontSize:13,position:"sticky",left:0,background:"#fff"}}>{title(row.feature)}</th>
      {MATRIX_ACTIONS.map(action=><td key={action} style={{padding:8,textAlign:"center",verticalAlign:"top"}}>
       {row.cells[action].length===0?"—":row.cells[action].map(p=><label key={p.key} title={p.description+" ("+p.key+")"} style={{display:"flex",justifyContent:"center",gap:5,alignItems:"center",fontSize:11}}>
        <input type="checkbox" aria-label={p.key} checked={granted.includes(p.key)} disabled={readOnly||busy} onChange={e=>change(p.key,e.target.checked)}/>
        {row.cells[action].length>1?p.key.split(".").at(-1):""}
       </label>)}
      </td>)}
      <td style={{textAlign:"center"}}><input aria-label={`Select all permissions for ${row.feature}`} type="checkbox"
       disabled={readOnly||busy} checked={Object.values(row.cells).flat().every(p=>granted.includes(p.key))}
       onChange={e=>toggleRow(row.feature,e.target.checked)}/></td>
     </tr>)}</tbody>
    </table>
   </div>
   <p style={{fontSize:13,color:"#5B6D63"}}>Selected: {granted.length} permission(s). System roles are read-only. Existing role holders may also have additional permissions through other assignments.</p>
   <div style={{display:"flex",gap:12,marginBottom:40,flexWrap:"wrap"}}>
    <button className="primary" disabled={busy||readOnly||permissions.length===0} onClick={()=>void save()}>
     {busy?"Saving…":selected==="new"?"Create role":"Save role & permissions"}
    </button>
    {current&&!current.isSystem&&<button disabled={busy} onClick={()=>void remove()}>Delete role</button>}
   </div>
  </section>
 </main>;
}
