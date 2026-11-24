import test from "node:test";
import assert from "node:assert/strict";
import {ApiClient} from "../src/index.ts";

async function check(label,call,expectedMethod,expectedPath){
 test(label,async()=>{
  const existing=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(url,options)=>{
   requests.push({url,method:options?.method});
   return {ok:true,status:200,json:async()=>({ok:true})};
  };
  try{await call(new ApiClient("https://api.example.com"))}
  finally{globalThis.fetch=existing}
  assert.deepEqual(requests,[{url:"https://api.example.com/api/v1"+expectedPath,method:expectedMethod}]);
 });
}
await check("password login uses actual auth controller",api=>api.passwordLogin({identifier:"u",password:"pw"}),"POST","/auth/login");
await check("IAM permission list uses actual API path",api=>api.permissions(),"GET","/iam/permissions");
await check("IAM role assignment uses actual API path",api=>api.assignRole({roleId:"r",userId:"u"}),"POST","/iam/assignments");
await check("IAM assignment revoke uses actual API path",api=>api.removeRoleAssignment("a"),"DELETE","/iam/assignments/a");
await check("catalogue service creation uses real controller",api=>api.createService({name:"Test"}),"POST","/catalogue/services");
await check("catalogue service update uses real controller",api=>api.updateService("s",{name:"Other"}),"PATCH","/catalogue/services/s");
await check("service category creation uses real controller",api=>api.createServiceCategory({name:"Plumber"}),"POST","/catalogue/categories");
await check("service category update uses real controller",api=>api.updateServiceCategory("c",{name:"New"}),"PATCH","/catalogue/categories/c");
