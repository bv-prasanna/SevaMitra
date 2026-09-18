export type ApiError={code:string;message:string;details?:unknown;correlationId?:string};
export class ApiClient{
 constructor(private baseUrl:string,private getToken?:()=>string|undefined){}
 private async request<T>(path:string,init:RequestInit={}):Promise<T>{const token=this.getToken?.();const res=await fetch(this.baseUrl+"/api/v1"+path,{...init,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{}),...init.headers}});if(!res.ok){const body=await res.json().catch(()=>({message:res.statusText}));throw body as ApiError}return res.status===204?undefined as T:res.json()}
 requestOtp(mobile:string,purpose:"LOGIN"|"REGISTER"="LOGIN"){return this.request<{requestId:string;expiresInSeconds:number}>("/auth/otp/request",{method:"POST",body:JSON.stringify({mobile,purpose})})}
 verifyOtp(requestId:string,otp:string){return this.request<{accessToken:string;refreshToken:string}>("/auth/otp/verify",{method:"POST",body:JSON.stringify({requestId,otp})})}
 me<T=unknown>(){return this.request<T>("/auth/me")}
 categories<T=unknown>(){return this.request<T>("/catalog/categories")}
 services<T=unknown>(query=""){return this.request<T>("/catalog/services"+query)}
 serviceability<T=unknown>(payload:unknown){return this.request<T>("/serviceability/check",{method:"POST",body:JSON.stringify(payload)})}
}
