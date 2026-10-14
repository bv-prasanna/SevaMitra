import * as SecureStore from "expo-secure-store";
import {eventLocationHeaders} from "./event-location";
import {ApiClient,extractOtpLoginTokens,type SessionTokenPair} from "@sevamitra/api-client";

export const API_BASE=process.env.EXPO_PUBLIC_API_BASE_URL||"";
const KEY="sevamitra.mobile.session.v1";
type Stored=SessionTokenPair&{expiresAt:number};
let refreshPending:Promise<Stored>|null=null;
let sessionGeneration=0;
let storageQueue:Promise<void>=Promise.resolve();
function queueStorageWrite(write:()=>Promise<void>):Promise<void>{
 const next=storageQueue.then(write,write);
 storageQueue=next.catch(()=>{});
 return next;
}

export async function saveSession(tokens:SessionTokenPair):Promise<void>{
 const stored:Stored={...tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
 await queueStorageWrite(()=>SecureStore.setItemAsync(KEY,JSON.stringify(stored)));
}
async function loadSession():Promise<Stored|null>{
 const raw=await SecureStore.getItemAsync(KEY);
 if(!raw)return null;
 try {
  const x=JSON.parse(raw) as Stored;
  if(typeof x.accessToken!=="string"||!x.accessToken||typeof x.refreshToken!=="string"||!x.refreshToken||typeof x.expiresAt!=="number")throw new Error("corrupt");
  return x;
 }catch{await SecureStore.deleteItemAsync(KEY);return null}
}
async function refreshSession(session:Stored):Promise<Stored>{
 if(!refreshPending){
  const generation=sessionGeneration;
  refreshPending=(async()=>{
   try{
    const tokens=extractTokensFromRefresh(await new ApiClient(API_BASE).refresh({refreshToken:session.refreshToken}));
    await queueStorageWrite(async()=>{
      if(generation!==sessionGeneration)throw new Error("Session changed during refresh");
      await SecureStore.setItemAsync(KEY,JSON.stringify({...tokens,expiresAt:Date.now()+tokens.expiresIn*1000}));
    });
    if(generation!==sessionGeneration)throw new Error("Session changed during refresh");
    return {...tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
   }catch(e){
     if(generation===sessionGeneration)await queueStorageWrite(async()=>{
       if(generation===sessionGeneration)await SecureStore.deleteItemAsync(KEY);
     });
     throw e;
   }
  })().finally(()=>{refreshPending=null});
 }
 return refreshPending;
}
function extractTokensFromRefresh(value:unknown):SessionTokenPair{
 const t=value as Partial<SessionTokenPair>|null;
 if(!t||typeof t.accessToken!=="string"||!t.accessToken||typeof t.refreshToken!=="string"||!t.refreshToken||typeof t.expiresIn!=="number"||t.expiresIn<=0)throw new Error("Invalid refreshed session");
 return {accessToken:t.accessToken,refreshToken:t.refreshToken,expiresIn:t.expiresIn};
}
export async function requestWithSession<T=unknown>(method:"GET"|"POST"|"PATCH"|"PUT"|"DELETE",path:string,body?:unknown):Promise<T>{
 if(!API_BASE)throw new Error("Set EXPO_PUBLIC_API_BASE_URL to a reachable HTTPS API");
 let session=await loadSession();
 if(!session)throw new Error("Please sign in first");
 if(Date.now()>session.expiresAt-30000)session=await refreshSession(session);
 const geo=method==='GET'?{}:await eventLocationHeaders();
 const execute=(token:string)=>{
  const api=new ApiClient(API_BASE,()=>token);
  if(method==="GET")return api.get<T>(path);
  if(method==="POST")return api.post<T>(path,body,{headers:geo});
  if(method==="PATCH")return api.patch<T>(path,body,{headers:geo});
  if(method==="PUT")return api.put<T>(path,body,{headers:geo});
  return api.delete<T>(path,{headers:geo});
 };
 try{return await execute(session.accessToken)}
 catch(e){if((e as {status?:number}).status!==401)throw e;const renewed=await refreshSession(session);return execute(renewed.accessToken)}
}
export async function saveLoginResponse(value:unknown){
 const tokens=extractOtpLoginTokens(value);
 sessionGeneration++;
 await saveSession(tokens);
}
export async function signOut():Promise<void>{
 sessionGeneration++;
 const s=await loadSession();
 await queueStorageWrite(async()=>{
   await SecureStore.deleteItemAsync(KEY);
   // Do not carry an offline booking draft into another user's session.
   await SecureStore.deleteItemAsync("sevamitra.pending-booking.v1");
 });
 if(s&&API_BASE)try{await new ApiClient(API_BASE).logout({refreshToken:s.refreshToken})}catch{/* already signed out locally */}
}
/** Navigation is derived from an authenticated server-side IAM/profile check.
 * This is only a menu hint. Every API endpoint independently enforces access.
 */
export type WorkspaceEntitlements={
 customer:boolean;provider:boolean;agent:boolean;admin:boolean;
 canJoinProvider:boolean;canJoinAgent:boolean;
 providerStatus:string|null;agentStatus:string|null;
};
export async function myWorkspaces():Promise<WorkspaceEntitlements>{
 return requestWithSession<WorkspaceEntitlements>("GET","/auth/workspaces");
}
export async function initialWorkspace():Promise<"/admin"|"/provider"|"/agent"|"/customer">{
 const roles=await myWorkspaces();
 if(roles.admin)return "/admin";
 if(roles.provider)return "/provider";
 if(roles.agent)return "/agent";
 return "/customer";
}
