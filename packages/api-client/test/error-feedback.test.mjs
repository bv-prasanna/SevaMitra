import test from "node:test";
import assert from "node:assert/strict";
import {ApiClient} from "../src/index.ts";
const client=new ApiClient("https://example.test");
async function withFetch(response,run){const prev=globalThis.fetch;globalThis.fetch=async()=>response;try{await run()}finally{globalThis.fetch=prev}}
test("500 never exposes server internals to customers",async()=>{
 await withFetch(new Response(JSON.stringify({error:{message:"Prisma P2002 SQL password=secret"}}),{status:500,headers:{"Content-Type":"application/json"}}),async()=>{
  await assert.rejects(client.get("/test"),e=>e.status===500&&!e.message.includes("Prisma")&&!e.message.includes("secret")&&/try again/i.test(e.message));
 });
});
test("401 and 403 receive actionable messages",async()=>{
 for(const [status,phrase] of [[401,"sign in"],[403,"permission"]]){
  await withFetch(new Response(JSON.stringify({error:{message:"Forbidden"}}),{status}),async()=>{
   await assert.rejects(client.get("/test"),e=>e.status===status&&e.message.toLowerCase().includes(phrase));
  });
 }
});
test("400 preserves useful domain validation errors",async()=>{
 await withFetch(new Response(JSON.stringify({error:{message:"End time must be after start time"}}),{status:400}),async()=>{
  await assert.rejects(client.get("/test"),/End time must be after start time/);
 });
});
test("429 and 503 get plain-language retry guidance",async()=>{
 for(const status of [429,503]){
  await withFetch(new Response(JSON.stringify({error:{message:"internal stack trace"}}),{status}),async()=>{
   await assert.rejects(client.get("/test"),e=>e.status===status&&!e.message.includes("stack trace")&&/try again/i.test(e.message));
  });
 }
});
test("network failures are explained without leaking raw fetch errors",async()=>{
 const prev=globalThis.fetch;globalThis.fetch=async()=>{throw new TypeError("Failed to fetch")};
 try{await assert.rejects(client.get("/test"),e=>e.status===0&&/check your connection/i.test(e.message))}
 finally{globalThis.fetch=prev}
});
