import {parseEventLocation} from './event-location';
const fixed=Date.parse('2026-10-09T06:00:00.000Z');
const valid={
 'x-event-latitude':'12.9716','x-event-longitude':'77.5946',
 'x-event-accuracy-meters':'17.8','x-event-captured-at':'2026-10-09T06:00:00Z',
};
describe('Untrusted event GPS evidence validation',()=>{
 it('records unavailable coordinates explicitly without inventing a place',()=>{
  expect(parseEventLocation({},fixed)).toEqual({latitude:null,longitude:null,accuracyMeters:null,locationCapturedAt:null,locationStatus:'NOT_PROVIDED'});
 });
 it('accepts a recent valid coordinate with accuracy and timestamp',()=>{
  expect(parseEventLocation(valid,fixed)).toEqual({
   latitude:12.9716,longitude:77.5946,accuracyMeters:17.8,
   locationCapturedAt:new Date(fixed),locationStatus:'CLIENT_REPORTED',
  });
 });
 it.each([
  {'x-event-latitude':'91'},
  {'x-event-longitude':'181'},
  {'x-event-latitude':'NaN'},
  {'x-event-latitude':'Infinity'},
  {'x-event-latitude':'abc'},
  {'x-event-accuracy-meters':'-1'},
  {'x-event-accuracy-meters':'6000'},
  {'x-event-captured-at':'2024-10-09T06:00:00Z'},
  {'x-event-captured-at':'garbled'},
 ])('rejects invalid or stale geolocation headers %#',values=>{
  const found=parseEventLocation({...valid,...values},fixed);
  expect(found.locationStatus).toBe('INVALID');
  expect(found.latitude).toBeNull();
  expect(found.longitude).toBeNull();
 });
 it('does not accept only one coordinate',()=>{
  expect(parseEventLocation({'x-event-latitude':'12.34'},fixed).locationStatus).toBe('INVALID');
 });
 it('allows a recorded zero latitude/longitude only with valid paired metadata',()=>{
  expect(parseEventLocation({...valid,'x-event-latitude':'0','x-event-longitude':'0'},fixed).latitude).toBe(0);
 });
});
