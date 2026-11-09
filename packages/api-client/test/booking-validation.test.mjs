import test from 'node:test';
import assert from 'node:assert/strict';
import {localIsoDate,validateLocalBookingWindow as valid} from '../src/index.ts';
const now=new Date(2026,10,9,14,30,0);
test('local date is stable regardless of locale formatting',()=>assert.equal(localIsoDate(now),'2026-11-09'));
test('valid future time windows are accepted',()=>{
 assert.equal(valid('2026-11-09','15:00','16:00',now),null);
 assert.equal(valid('2026-11-10','00:00','01:00',now),null);
});
test('rejects past dates and earlier same-day service slots',()=>{
 assert.match(valid('2026-11-08','18:00','19:00',now),/future/);
 assert.match(valid('2026-11-09','14:00','16:00',now),/later/);
 assert.match(valid('2026-11-09','14:30','15:30',now),/later/);
});
test('rejects impossible calendar dates, non-ISO formatting, inverted slots and broken clocks',()=>{
 for(const d of ['2026-02-30','2026-00-10','2026-13-01','2026-2-9','2026-11-31','not-a-date'])
  assert.match(valid(d,'15:00','16:00',now),/valid service date/);
 for(const [s,e] of [['11:00','10:00'],['10:00','10:00']])
  assert.match(valid('2026-11-10',s,e,now),/after start/);
 for(const [s,e] of [['24:00','25:00'],['10:70','11:00'],['10','11']])
  assert.match(valid('2026-11-10',s,e,now),/valid start and end/);
});
