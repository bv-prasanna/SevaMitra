import {createHmac} from 'node:crypto';
import {INCIDENT_CRON_MESSAGE,validIncidentCronSignature} from './incident-cron-signature';
describe('incident SLA cron signature',()=>{
 it('accepts only the exact fresh HMAC-signed internal request',()=>{
  const secret='unit_test_incident_cron_secret_123456789012';
  const timestamp=String(Date.now());
  const signature=createHmac('sha256',secret).update(INCIDENT_CRON_MESSAGE+timestamp).digest('hex');
  expect(validIncidentCronSignature(secret,timestamp,signature)).toBe(true);
  expect(validIncidentCronSignature(secret,timestamp,'0'.repeat(64))).toBe(false);
  expect(validIncidentCronSignature(secret,String(Number(timestamp)-100000),signature)).toBe(false);
 });
});
