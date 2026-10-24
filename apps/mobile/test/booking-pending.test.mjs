import test from 'node:test';
import assert from 'node:assert/strict';
import {newBookingRequestId,isPendingBookingDraft} from '../src/booking-pending.ts';

test('new booking retry IDs are UUID v4 shaped and differ', () => {
 const a = newBookingRequestId();
 const b = newBookingRequestId();
 assert.match(a,/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
 assert.notEqual(a,b);
});

test('only properly formed booking drafts may be replayed', () => {
 const draft={savedAt:Date.now(),payload:{
  offeringId:'offering-1',townVillageId:'town-1',scheduledDate:'2026-10-20',
  scheduledStartTime:'09:00',scheduledEndTime:'10:00',
  clientRequestId:newBookingRequestId(),
 }};
 assert.equal(isPendingBookingDraft(draft),true);
 assert.equal(isPendingBookingDraft({...draft,payload:{...draft.payload,clientRequestId:'invalid'}}),false);
 assert.equal(isPendingBookingDraft(null),false);
});

test('reject malformed or incomplete pending booking state',()=>{
 const valid={savedAt:Date.now(),payload:{offeringId:'offering-1',townVillageId:'town-1',scheduledDate:'2026-10-20',scheduledStartTime:'09:00',scheduledEndTime:'10:00',clientRequestId:newBookingRequestId()}};
 for(const bad of [undefined,null,false,0,'',{},[],{payload:valid.payload},{...valid,savedAt:'now'},{...valid,payload:null},{...valid,payload:{...valid.payload,offeringId:42}},{...valid,payload:{...valid.payload,townVillageId:null}},{...valid,payload:{...valid.payload,scheduledDate:42}},{...valid,payload:{...valid.payload,scheduledStartTime:null}},{...valid,payload:{...valid.payload,scheduledEndTime:null}},{...valid,payload:{...valid.payload,clientRequestId:'not-a-uuid'}}]){
  assert.equal(isPendingBookingDraft(bad),false,JSON.stringify(bad));
 }
});
