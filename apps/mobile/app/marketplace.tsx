import React,{useEffect,useState}from"react";
import{Alert,SafeAreaView,ScrollView,View,Text,TextInput,Pressable,StyleSheet}from"react-native";
import{router}from"expo-router";
import{ApiClient,type ActiveService,type GeoArea,type DiscoveredOffering,type BookingCreate}from"@sevamitra/api-client";
import{API_BASE,requestWithSession}from"../src/session";

type BookingResult={id:string;status:string};
type AreaField="state"|"district"|"taluk"|"town";
export default function Marketplace(){
 const[services,setServices]=useState<ActiveService[]>([]),[serviceId,setServiceId]=useState(""),[search,setSearch]=useState("");
 const[states,setStates]=useState<GeoArea[]>([]),[districts,setDistricts]=useState<GeoArea[]>([]),[taluks,setTaluks]=useState<GeoArea[]>([]),[towns,setTowns]=useState<GeoArea[]>([]);
 const[state,setState]=useState(""),[district,setDistrict]=useState(""),[taluk,setTaluk]=useState(""),[town,setTown]=useState("");
 const[offerings,setOfferings]=useState<DiscoveredOffering[]>([]),[selected,setSelected]=useState(""),[date,setDate]=useState(""),[start,setStart]=useState(""),[end,setEnd]=useState(""),[notes,setNotes]=useState("");
 const[busy,setBusy]=useState(false),[message,setMessage]=useState("Loading services…"),[booking,setBooking]=useState<BookingResult|null>(null);
 const publicApi=new ApiClient(API_BASE);
 useEffect(()=>{
  if(!API_BASE){setMessage("API not configured. Set EXPO_PUBLIC_API_BASE_URL.");return}
  void publicApi.get<ActiveService[]>("/catalogue/services").then(items=>{
   const live=items.filter(x=>x.isActive);setServices(live);setMessage(live.length?"Select a service to find verified local professionals.":"No active services available yet.");
  }).catch(e=>setMessage(err(e)));
 },[]);
 const error=(e:unknown)=>{setMessage(err(e));if((e as {status?:number}).status===401)Alert.alert("Sign in required","Please log in to continue.",[{text:"Later"},{text:"Login",onPress:()=>router.push("/login")}])};
 async function chooseService(id:string){
  setServiceId(id);setOfferings([]);setSelected("");setBooking(null);setStates([]);setDistricts([]);setTaluks([]);setTowns([]);setState("");setDistrict("");setTaluk("");setTown("");
  if(!id)return;
  try{const a=await requestWithSession<GeoArea[]>("GET","/geography/states");setStates(a.filter(x=>x.isActive));setMessage("Choose your state, district, taluk and village.");}catch(e){error(e)}
 }
 async function chooseArea(field:AreaField,id:string){
  setOfferings([]);setSelected("");setBooking(null);
  if(field==="state"){setState(id);setDistrict("");setTaluk("");setTown("");setDistricts([]);setTaluks([]);setTowns([])}
  if(field==="district"){setDistrict(id);setTaluk("");setTown("");setTaluks([]);setTowns([])}
  if(field==="taluk"){setTaluk(id);setTown("");setTowns([])}
  if(field==="town"){setTown(id);return}
  if(!id)return;
  try{
   const url=field==="state"?"/geography/districts?stateId="+encodeURIComponent(id):field==="district"?"/geography/taluks?districtId="+encodeURIComponent(id):"/geography/taluks/"+encodeURIComponent(id)+"/towns";
   const result=await requestWithSession<GeoArea[]>("GET",url);
   const a=result.filter(x=>x.isActive);
   if(field==="state")setDistricts(a);
   else if(field==="district")setTaluks(a);
   else setTowns(a);
  }catch(e){error(e)}
 }
 async function find(){
  if(!town||!serviceId)return;setBusy(true);setMessage("Searching verified providers…");setOfferings([]);setSelected("");setBooking(null);
  try{
   const result=await requestWithSession<DiscoveredOffering[]>("GET",`/discovery/offerings?serviceId=${encodeURIComponent(serviceId)}&townVillageId=${encodeURIComponent(town)}`);
   setOfferings(result);setMessage(result.length?"Choose a provider and request a time slot.":"No active verified provider is currently available in this area.");
  }catch(e){error(e)}finally{setBusy(false)}
 }
 async function submit(){
  if(!selected||!town||!date||!start||!end){setMessage("Complete booking date and time.");return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start>=end){setMessage("Use YYYY-MM-DD and HH:mm times, with end after start.");return}
  setBusy(true);
  try{
   const payload:BookingCreate={offeringId:selected,townVillageId:town,scheduledDate:date,scheduledStartTime:start,scheduledEndTime:end,...(notes.trim()?{notes:notes.trim()}: {})};
   const result=await requestWithSession<BookingResult>("POST","/bookings/me",payload);
   setBooking(result);setMessage("Booking request submitted. The provider must accept it.");
  }catch(e){error(e)}finally{setBusy(false)}
 }
 const shown=services.filter(x=>x.name.toLowerCase().includes(search.trim().toLowerCase()));
 const chosen=services.find(x=>x.id===serviceId);
 const area=(label:string,items:GeoArea[],chosenId:string,field:AreaField)=><View style={s.block}><Text style={s.label}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{items.map(a=><Pressable key={a.id} style={[s.chip,a.id===chosenId&&s.chipOn]} onPress={()=>void chooseArea(field,a.id)}><Text style={a.id===chosenId?s.white:s.text}>{a.name}{a.pincode?" ("+a.pincode+")":""}</Text></Pressable>)}</ScrollView></View>;
 return <SafeAreaView style={s.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
  <View style={s.nav}><Text style={s.logo}>Seva<Text style={s.orange}>Mitra</Text></Text><Pressable onPress={()=>router.push("/customer")}><Text style={s.link}>My bookings →</Text></Pressable></View>
  <Text style={s.title}>Services near you</Text>
  <TextInput style={s.input} placeholder="Search services" value={search} onChangeText={setSearch}/>
  <Text style={s.label}>Choose service</Text>
  <View style={s.services}>{shown.map(x=><Pressable key={x.id} style={[s.chip,x.id===serviceId&&s.chipOn]} onPress={()=>void chooseService(x.id)}><Text style={x.id===serviceId?s.white:s.text}>{x.name}</Text></Pressable>)}</View>
  {!!chosen&&<><Text style={s.head}>Where do you need {chosen.name}?</Text>
   {area("State",states,state,"state")}
   {area("District",districts,district,"district")}
   {area("Taluk",taluks,taluk,"taluk")}
   {area("Town / Village",towns,town,"town")}
   <Pressable style={[s.btn,(!town||busy)&&s.disabled]} disabled={!town||busy} onPress={()=>void find()}><Text style={s.white}>Find verified providers</Text></Pressable>
  </>}
  {!!message&&<Text accessibilityRole="alert" style={s.message}>{message}</Text>}
  {offerings.map(o=><Pressable key={o.id} style={[s.card,o.id===selected&&s.selected]} onPress={()=>{setSelected(o.id);setBooking(null)}}><Text style={s.head}>{o.providerName}</Text><Text>{o.amount===null?"Price on quote":o.currency+" "+o.amount} · {o.pricingModel}</Text>{o.visitFee!==null&&<Text style={s.muted}>Visit fee: {o.currency} {o.visitFee}</Text>}{o.notes&&<Text style={s.muted}>{o.notes}</Text>}<Text style={s.link}>{o.id===selected?"✓ Selected":"Choose provider →"}</Text></Pressable>)}
  {!!selected&&!booking&&<View style={s.card}><Text style={s.head}>Request booking</Text><Text style={s.muted}>Enter local service date (YYYY-MM-DD) and time (HH:mm). Availability is validated on the server.</Text>
   <TextInput style={s.input} value={date} placeholder="2026-10-20" maxLength={10} onChangeText={setDate}/><TextInput style={s.input} value={start} placeholder="Start 09:00" maxLength={5} onChangeText={setStart}/><TextInput style={s.input} value={end} placeholder="End 10:00" maxLength={5} onChangeText={setEnd}/><TextInput style={s.input} value={notes} placeholder="Special instructions (optional)" maxLength={1000} onChangeText={setNotes}/>
   <Pressable disabled={busy||!date||!start||!end} style={[s.btn,busy&&s.disabled]} onPress={()=>Alert.alert("Request booking?","Provider acceptance is required. Any payment will be handled separately.",[{text:"Cancel",style:"cancel"},{text:"Request booking",onPress:()=>void submit()}])}><Text style={s.white}>Submit booking request</Text></Pressable>
  </View>}
  {!!booking&&<View style={s.card}><Text style={s.head}>Booking request submitted ✓</Text><Text selectable>{booking.id}</Text><Text>Status: {booking.status}</Text><Pressable onPress={()=>router.push("/customer")}><Text style={s.link}>Track booking →</Text></Pressable></View>}
 </ScrollView></SafeAreaView>
}
function err(e:unknown){if((e as {status?:number}).status===401)return "Sign in to find providers and book services.";return e instanceof Error?e.message:"Request failed"}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#fff"},page:{padding:18,paddingBottom:42},nav:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},logo:{fontSize:24,fontWeight:"900",color:"#087A4B"},orange:{color:"#F47721"},title:{fontSize:27,fontWeight:"900",color:"#0E3528",marginBottom:12},head:{fontSize:18,fontWeight:"800",color:"#183D30",marginVertical:9},muted:{fontSize:12,color:"#617466",lineHeight:19,marginTop:6},label:{fontWeight:"700",marginVertical:9,color:"#295642"},input:{borderColor:"#CFE2D6",borderWidth:1,padding:12,borderRadius:9,marginVertical:7,fontSize:15},services:{flexDirection:"row",flexWrap:"wrap",gap:8},block:{marginVertical:7},chip:{padding:10,borderRadius:10,backgroundColor:"#F2F8F4",borderWidth:1,borderColor:"#CDE4D3",marginRight:7,marginBottom:7},chipOn:{backgroundColor:"#087A4B"},white:{color:"#fff",fontWeight:"800"},text:{color:"#123E2B",fontWeight:"600"},btn:{backgroundColor:"#087A4B",padding:14,borderRadius:10,alignItems:"center",marginVertical:12},disabled:{opacity:.5},card:{backgroundColor:"#FAFCFA",padding:16,borderRadius:15,marginTop:12,borderWidth:1,borderColor:"#DCE8DE"},selected:{borderColor:"#087A4B",borderWidth:2},link:{color:"#087A4B",fontWeight:"800",marginTop:9},message:{color:"#73512E",paddingVertical:13,fontSize:14}});
