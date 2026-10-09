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
