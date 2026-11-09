/** Validate local service date/time without depending on locale-dependent
 * date formatting. The server remains authoritative for provider availability.
 */
export function localIsoDate(now: Date): string {
 const pad=(value:number)=>String(value).padStart(2,'0');
 return [now.getFullYear(),pad(now.getMonth()+1),pad(now.getDate())].join('-');
}
export function validateLocalBookingWindow(date: string,start: string,end: string,now: Date=new Date()): string|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Enter a valid service date (YYYY-MM-DD).';
 const [year,month,day]=date.split('-').map(Number);
 if(year===undefined||month===undefined||day===undefined)return 'Enter a valid service date (YYYY-MM-DD).';
 const actual=new Date(Date.UTC(year,month-1,day));
 if(year<2000||year>2100||actual.getUTCFullYear()!==year||actual.getUTCMonth()!==month-1||actual.getUTCDate()!==day)
   return 'Enter a valid service date (YYYY-MM-DD).';
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end))
   return 'Enter valid start and end times (HH:mm).';
 if(start>=end)return 'End time must be after start time.';
 const today=localIsoDate(now);
 if(date<today)return 'Choose today or a future service date.';
 if(date===today){
  const pad=(value:number)=>String(value).padStart(2,'0');
  const current=pad(now.getHours())+':'+pad(now.getMinutes());
  if(start<=current)return 'Choose a start time later than the current time.';
 }
 return null;
}
