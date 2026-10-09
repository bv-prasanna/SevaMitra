import test from 'node:test';
import assert from 'node:assert/strict';
import {formatEventLocationHeaders,ApiClient} from '../src/index.ts';
const now=Date.parse('2026-10-09T06:00:00Z');
const valid={latitude:12.9716,longitude:77.5946,accuracy:20,timestamp:now};
test('frontend: formats opt-in user GPS evidence with accuracy and timestamp',()=>{
 assert.deepEqual(formatEventLocationHeaders(valid,now),{
  'X-Event-Latitude':'12.9716','X-Event-Longitude':'77.5946',
  'X-Event-Accuracy-Meters':'20','X-Event-Captured-At':'2026-10-09T06:00:00.000Z',
 });
});
test('frontend: handles missing location without substituting (0,0)',()=>{
 assert.deepEqual(formatEventLocationHeaders(null,now),{});
});
test('frontend: rejects stale or impossible coordinates and accuracy',()=>{
 for(const coordinate of [
  {...valid,latitude:91},{...valid,longitude:181},{...valid,accuracy:-2},
  {...valid,accuracy:null},{...valid,timestamp:now-1_000_000},
  {...valid,latitude:Infinity},{...valid,longitude:NaN},
 ]){
  assert.deepEqual(formatEventLocationHeaders(coordinate,now),{});
 }
});
test('frontend: browser requests never trigger location prompts when permission API is absent',async()=>{
 const prev=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const oldFetch=globalThis.fetch;
 let captured;
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
  globalThis.fetch=async(url,init)=>{
   captured=init;
   return{ok:true,status:200,json:async()=>({ok:true})};
  };
  const api=new ApiClient('https://api.example.com',()=>'jwt');
  await api.post('/bookings/me',{offeringId:'one'});
  assert.equal(captured.headers['X-Event-Latitude'],undefined);
  assert.equal(captured.headers.Authorization,'Bearer jwt');
 }finally{
  globalThis.fetch=oldFetch;
  if(prev)Object.defineProperty(globalThis,'navigator',prev);
  else delete globalThis.navigator;
 }
});
test('frontend: browser location stays off when permission is denied',async()=>{
 const prev=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldFetch=globalThis.fetch;
 let captured;let gpsCalls=0;
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{
   permissions:{query:async()=>({state:'denied'})},
   geolocation:{getCurrentPosition:()=>{gpsCalls++}},
  }});
  globalThis.fetch=async(url,init)=>{captured=init;return{ok:true,status:200,json:async()=>({ok:true})}};
  const api=new ApiClient('https://api.example.com',()=>'jwt');
  await api.patch('/bookings/me/one',{status:'ACCEPTED'});
  assert.equal(captured.headers['X-Event-Latitude'],undefined);
  assert.equal(gpsCalls,0);
 }finally{
  globalThis.fetch=oldFetch;
  if(prev)Object.defineProperty(globalThis,'navigator',prev);
  else delete globalThis.navigator;
 }
});
