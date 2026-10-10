/** Location reported by clients for a single user-initiated business event.
 * Coordinates are untrusted supporting evidence, not cryptographic geolocation.
 * Never silently substitute IP geolocation or (0,0) for missing GPS.
 */
export type ClientEventLocation={
 latitude:number|null;longitude:number|null;accuracyMeters:number|null;
 locationCapturedAt:Date|null;locationStatus:'NOT_PROVIDED'|'INVALID'|'CLIENT_REPORTED';
};
export function parseEventLocation(headers:Record<string,string|string[]|undefined>, now=Date.now()):ClientEventLocation{
 const absent:ClientEventLocation={latitude:null,longitude:null,accuracyMeters:null,locationCapturedAt:null,locationStatus:'NOT_PROVIDED'};
 const read=(key:string)=>headers[key.toLowerCase()];
 const latRaw=read('x-event-latitude'),lonRaw=read('x-event-longitude');
 if(latRaw===undefined&&lonRaw===undefined)return absent;
 const invalid={...absent,locationStatus:'INVALID' as const};
 if(typeof latRaw!=='string'||typeof lonRaw!=='string'||!latRaw.trim()||!lonRaw.trim())return invalid;
 const lat=Number(latRaw),lon=Number(lonRaw);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return invalid;
 const accurRaw=read('x-event-accuracy-meters'),timeRaw=read('x-event-captured-at');
 if(typeof accurRaw!=='string'||typeof timeRaw!=='string'||!accurRaw.trim()||!timeRaw.trim())return invalid;
 const accuracy=Number(accurRaw), captured=new Date(timeRaw);
 if(!Number.isFinite(accuracy)||accuracy<0||accuracy>5000||!Number.isFinite(captured.getTime())||Math.abs(now-captured.getTime())>300000)return invalid;
 return{latitude:lat,longitude:lon,accuracyMeters:accuracy,locationCapturedAt:captured,locationStatus:'CLIENT_REPORTED'};
}
