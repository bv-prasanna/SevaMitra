import * as Location from 'expo-location';
/**
 * Foreground-only, opt-in operational evidence.
 * GPS is untrusted client-reported location; the API validates ranges and
 * timestamps. No silent permission requests, no background tracking.
 */
export async function enableEventLocation():Promise<boolean>{
 const response=await Location.requestForegroundPermissionsAsync();
 return response.granted===true;
}
export async function eventLocationHeaders():Promise<Record<string,string>>{
 try{
  const permission=await Location.getForegroundPermissionsAsync();
  if(!permission.granted)return {};
  const found=await Location.getLastKnownPositionAsync({maxAge:60_000,requiredAccuracy:500});
  const p=found??await Promise.race([
   Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),
   new Promise<null>(resolve=>setTimeout(()=>resolve(null),3500)),
  ]);
  if(!p)return{};
  const{latitude,longitude,accuracy}=p.coords;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||
   !Number.isFinite(accuracy)||accuracy===null||accuracy>5000||
   latitude < -90||latitude>90||longitude < -180||longitude>180)return{};
  return{
   'X-Event-Latitude':String(latitude),
   'X-Event-Longitude':String(longitude),
   'X-Event-Accuracy-Meters':String(accuracy),
   'X-Event-Captured-At':new Date(p.timestamp).toISOString(),
  };
 }catch{return{}}
}
