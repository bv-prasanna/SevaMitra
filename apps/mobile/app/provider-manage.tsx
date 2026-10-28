import React,{useEffect,useState} from "react";
import{Alert,SafeAreaView,ScrollView,View,Text,TextInput,Pressable,StyleSheet}from"react-native";
import{router}from"expo-router";
import{requestWithSession}from"../src/session";

type Service={id:string;name:string;isActive:boolean};
type Offering={id:string;serviceId:string;pricingModel:string;amount:string|null;isActive:boolean};
type Hours={id:string;dayOfWeek:string;startTime:string;endTime:string;isActive:boolean};
type Area={id:string;name:string;isActive:boolean};
const days=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const pricing=["FIXED","STARTING_AT","HOURLY","DAILY","QUOTE_BASED"];
const msg=(e:unknown)=>e instanceof Error?e.message:"Request failed";
export default function ProviderManage(){
 const[services,setServices]=useState<Service[]>([]),[offers,setOffers]=useState<Offering[]>([]),[hours,setHours]=useState<Hours[]>([]),
 [serviceId,setServiceId]=useState(""),[pricingModel,setPricingModel]=useState("FIXED"),[amount,setAmount]=useState(""),
 [day,setDay]=useState("MONDAY"),[start,setStart]=useState("09:00"),[end,setEnd]=useState("18:00"),
 [states,setStates]=useState<Area[]>([]),[districts,setDistricts]=useState<Area[]>([]),[taluks,setTaluks]=useState<Area[]>([]),[towns,setTowns]=useState<Area[]>([]),
 [state,setState]=useState(""),[district,setDistrict]=useState(""),[taluk,setTaluk]=useState(""),[town,setTown]=useState(""),
 [radius,setRadius]=useState("15"),[hasCoverage,setHasCoverage]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function load(){
  const response=await Promise.allSettled([
   requestWithSession<Service[]>("GET","/catalogue/services"),
   requestWithSession<Offering[]>("GET","/provider-offerings/me"),
   requestWithSession<Hours[]>("GET","/availability/working-hours/me"),
   requestWithSession<Area[]>("GET","/geography/states"),
   requestWithSession<{radiusKm:number}>("GET","/serviceability/coverage/me"),
  ]);
  if(response[0].status==="fulfilled")setServices(response[0].value.filter(s=>s.isActive));
  if(response[1].status==="fulfilled")setOffers(response[1].value);
  if(response[2].status==="fulfilled")setHours(response[2].value);
  if(response[3].status==="fulfilled")setStates(response[3].value.filter(s=>s.isActive));
  if(response[4].status==="fulfilled"){setHasCoverage(true);setRadius(String(response[4].value.radiusKm))}
  setMessage(response[1].status==="rejected"?msg(response[1].reason):"");
 }
 useEffect(()=>{void load()},[]);
 async function save(fn:()=>Promise<unknown>,success:string){
  setBusy(true);try{await fn();await load();setMessage(success)}catch(e){setMessage(msg(e))}finally{setBusy(false)}
 }
 async function selectArea(which:"state"|"district"|"taluk",id:string){
  try{
   if(which==="state"){setState(id);setDistrict("");setTaluk("");setTown("");setDistricts([]);setTaluks([]);setTowns([]);
    if(id)setDistricts((await requestWithSession<Area[]>("GET",`/geography/districts?stateId=${id}`)).filter(x=>x.isActive))}
   if(which==="district"){setDistrict(id);setTaluk("");setTown("");setTaluks([]);setTowns([]);
    if(id)setTaluks((await requestWithSession<Area[]>("GET",`/geography/taluks?districtId=${id}`)).filter(x=>x.isActive))}
   if(which==="taluk"){setTaluk(id);setTown("");setTowns([]);
    if(id)setTowns((await requestWithSession<Area[]>("GET",`/geography/taluks/${id}/towns`)).filter(x=>x.isActive))}
  }catch(e){setMessage(msg(e))}
 }
 const choices=(title:string,items:{id:string;name:string}[],chosen:string,onPick:(x:string)=>void)=><View style={styles.block}>
  <Text style={styles.label}>{title}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
  {items.map(item=><Pressable key={item.id} style={[styles.chip,item.id===chosen&&styles.active]} onPress={()=>onPick(item.id)}><Text style={item.id===chosen?styles.white:styles.text}>{item.name}</Text></Pressable>)}</ScrollView></View>;
 async function createOffer(){
  if(!serviceId){setMessage("Select a service");return}
  const price=Number(amount);if(pricingModel!=="QUOTE_BASED"&&(!amount||!Number.isFinite(price)||price<0)){setMessage("Enter a valid amount");return}
  await save(()=>requestWithSession("POST","/provider-offerings/me",{
   serviceId,pricingModel,...(pricingModel!=="QUOTE_BASED"?{amount:price}:{}),currency:"INR",
  }),"Service saved");
 }
 async function addHours(){
  if(start>=end||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)){setMessage("Use 24-hour HH:mm times with start before end");return}
  await save(()=>requestWithSession("POST","/availability/working-hours/me",{dayOfWeek:day,startTime:start,endTime:end}),"Working hours saved");
 }
 async function saveArea(){
  if(!town)return;const r=Number(radius);if(!Number.isFinite(r)||r<0||r>200){setMessage("Radius must be 0–200 km");return}
  await save(()=>requestWithSession(hasCoverage?"PATCH":"POST","/serviceability/coverage/me",{primaryTownVillageId:town,radiusKm:r}),"Coverage saved");
 }
 return <SafeAreaView style={styles.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
 <View style={styles.top}><Pressable onPress={()=>router.back()}><Text style={styles.link}>← Provider workspace</Text></Pressable><Pressable onPress={()=>void load()}><Text style={styles.link}>↻ Refresh</Text></Pressable></View>
 <Text style={styles.heading}>Manage my services</Text><Text style={styles.muted}>Only verified active provider listings are shown to customers.</Text>
 {!!message&&<Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
 <Text style={styles.section}>Current offerings</Text>
 {offers.map(o=><View key={o.id} style={styles.card}><Text style={styles.label}>{services.find(s=>s.id===o.serviceId)?.name||o.serviceId}</Text>
 <Text>{o.pricingModel} · {o.amount===null?"Quote":"INR "+o.amount}</Text><Text style={styles.muted}>{o.isActive?"Listed":"Paused"}</Text>
 <Pressable disabled={busy} style={styles.button} onPress={()=>void save(()=>requestWithSession("PATCH",`/provider-offerings/me/${o.id}`,{isActive:!o.isActive}),"Offering changed")}><Text style={styles.white}>{o.isActive?"Pause":"Activate"}</Text></Pressable></View>)}
 <View style={styles.card}><Text style={styles.section}>Add a service</Text>
 {choices("Service",services,serviceId,setServiceId)}
 {choices("Pricing",pricing.map(p=>({id:p,name:p.replaceAll("_"," ")})),pricingModel,setPricingModel)}
 {pricingModel!=="QUOTE_BASED"&&<TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Service charge in ₹" value={amount} onChangeText={setAmount}/>}
 <Pressable disabled={busy||!serviceId} style={styles.button} onPress={()=>void createOffer()}><Text style={styles.white}>Save service</Text></Pressable></View>
 <Text style={styles.section}>Working hours</Text>
 {hours.map(h=><View key={h.id} style={styles.card}><Text>{h.dayOfWeek} · {h.startTime}–{h.endTime} · {h.isActive?"Active":"Paused"}</Text>
 <Pressable disabled={busy} style={styles.button} onPress={()=>void save(()=>requestWithSession("PATCH",`/availability/working-hours/me/${h.id}`,{isActive:!h.isActive}),"Hours updated")}><Text style={styles.white}>{h.isActive?"Pause":"Activate"}</Text></Pressable></View>)}
 <View style={styles.card}>
 {choices("Day",days.map(p=>({id:p,name:p})),day,setDay)}
 <TextInput style={styles.input} placeholder="Start HH:mm (09:00)" value={start} onChangeText={setStart}/>
 <TextInput style={styles.input} placeholder="End HH:mm (18:00)" value={end} onChangeText={setEnd}/>
 <Pressable disabled={busy} style={styles.button} onPress={()=>void addHours()}><Text style={styles.white}>Add working hours</Text></Pressable></View>
 <Text style={styles.section}>Operating coverage</Text>
 <View style={styles.card}>
 {choices("State",states,state,id=>void selectArea("state",id))}
 {choices("District",districts,district,id=>void selectArea("district",id))}
 {choices("Taluk",taluks,taluk,id=>void selectArea("taluk",id))}
 {choices("Town/Village",towns,town,setTown)}
 <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Radius in km" value={radius} onChangeText={setRadius}/>
 <Pressable disabled={busy||!town} style={styles.button} onPress={()=>void saveArea()}><Text style={styles.white}>Save coverage</Text></Pressable>
 </View>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F6FAF7"},page:{padding:18,paddingBottom:42},heading:{fontSize:24,fontWeight:"900",color:"#093E2A"},
 top:{flexDirection:"row",justifyContent:"space-between",marginBottom:16},link:{color:"#087A4B",fontWeight:"800"},
 section:{fontSize:18,fontWeight:"800",marginVertical:12,color:"#194B34"},
 label:{fontWeight:"700",color:"#153C2B"},muted:{fontSize:12,color:"#67806F",marginTop:4},
 card:{padding:14,backgroundColor:"#fff",borderColor:"#DCECE2",borderWidth:1,borderRadius:12,marginVertical:8,gap:8},
 input:{borderColor:"#CADCD0",borderWidth:1,borderRadius:9,padding:11,marginVertical:6},
 chip:{borderWidth:1,borderColor:"#C7E4D4",borderRadius:9,padding:9,marginRight:7,marginBottom:5,backgroundColor:"#F0F8F3"},
 active:{backgroundColor:"#087A4B"},white:{color:"#fff",fontWeight:"800"},text:{color:"#144C31"},
 button:{backgroundColor:"#087A4B",padding:12,borderRadius:9,alignItems:"center",marginTop:9},
 block:{marginVertical:4},notice:{color:"#A44A1B",marginVertical:8}
});
