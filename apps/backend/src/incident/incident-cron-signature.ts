import {createHmac,timingSafeEqual} from 'node:crypto';
export const INCIDENT_CRON_MESSAGE='SevaMitra.IncidentSlaEscalation.v1\nPOST\n/api/v1/internal/incidents/escalate-due\n';
export function validIncidentCronSignature(secret:string|undefined,timestamp:string|undefined,signature:string|undefined,now=Date.now()){
 if(!secret||secret.length<32||!timestamp||!/^\d{13}$/.test(timestamp)||!signature||!/^[a-fA-F0-9]{64}$/.test(signature))return false;
 const time=Number(timestamp);if(!Number.isSafeInteger(time)||Math.abs(now-time)>90_000)return false;
 const expected=createHmac('sha256',secret).update(INCIDENT_CRON_MESSAGE+timestamp).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
