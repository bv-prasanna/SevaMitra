import {CORS_ALLOWED_REQUEST_HEADERS} from './http-headers';

describe('Browser API header allowlist',()=>{
 it('permits all headers needed for consented event location with token requests',()=>{
  for(const required of [
   'Content-Type','Authorization','Idempotency-Key',
   'X-Event-Latitude','X-Event-Longitude',
   'X-Event-Accuracy-Meters','X-Event-Captured-At',
  ])expect(CORS_ALLOWED_REQUEST_HEADERS).toContain(required);
 });
 it('does not use wildcard header authorization',()=>{
  expect(CORS_ALLOWED_REQUEST_HEADERS).not.toContain('*');
 });
});
