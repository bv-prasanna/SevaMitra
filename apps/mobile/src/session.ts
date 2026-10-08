import * as SecureStore from "expo-secure-store";
import {ApiClient,extractOtpLoginTokens,type SessionTokenPair} from "@sevamitra/api-client";

export const API_BASE=process.env.EXPO_PUBLIC_API_BASE_URL||"";
const KEY="sevamitra.mobile.session.v1";
type Stored=SessionTokenPair&{expiresAt:number};
let refreshPending:Promise<Stored>|null=null;

export async function saveSession(tokens:SessionTokenPair):Promise<void>{
 const stored:Stored={...tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
 await SecureStore.setItemAsync(KEY,JSON.stringify(stored));
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
  refreshPending=(async()=>{
   try{
    const tokens=extractTokensFromRefresh(await new ApiClient(API_BASE).refresh({refreshToken:session.refreshToken}));
    await saveSession(tokens);
    return {...tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
   }catch(e){await SecureStore.deleteItemAsync(KEY);throw e}
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
 const execute=(token:string)=>{
  const api=new ApiClient(API_BASE,()=>token);
  if(method==="GET")return api.get<T>(path);
  if(method==="POST")return api.post<T>(path,body);
  if(method==="PATCH")return api.patch<T>(path,body);
  if(method==="PUT")return api.put<T>(path,body);
  return api.delete<T>(path);
 };
 try{return await execute(session.accessToken)}
 catch(e){if((e as {status?:number}).status!==401)throw e;const renewed=await refreshSession(session);return execute(renewed.accessToken)}
}
export async function saveLoginResponse(value:unknown){await saveSession(extractOtpLoginTokens(value))}
export async function signOut():Promise<void>{
 const s=await loadSession();
 await SecureStore.deleteItemAsync(KEY);
 if(s&&API_BASE)try{await new ApiClient(API_BASE).logout({refreshToken:s.refreshToken})}catch{/* already signed out locally */}
}
/** UI routing is not authorization. Every action remains guarded by the backend. */
export async function initialWorkspace():Promise<"/admin"|"/provider"|"/agent"|"/customer">{
 for(const [url,target] of [
  ["/provider-onboarding/applications","/admin"],
  ["/providers/me","/provider"],
  ["/agents/me","/agent"],
 ] as const){
  try{await requestWithSession("GET",url);return target}catch(e){if((e as {status?:number}).status===401)throw e}
 }
 return "/customer";
}
