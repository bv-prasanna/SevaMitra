import React,{useCallback,useEffect,useState}from"react";
import{Alert,SafeAreaView,ScrollView,Text,TextInput,Pressable,StyleSheet,View}from"react-native";
import{router}from"expo-router";
import{requestWithSession,signOut}from"../src/session";
type Booking={id:string;status:string;scheduledDate:string;scheduledStartTime:string;scheduledEndTime:string;amount?:string|null;currency:string;notes?:string|null};
type Profile={id:string;fullName:string;status:string;verificationStatus:string};
type Onboarding={status:string;reviewNote?:string|null};
export default function Provider(){
 const[profile,setProfile]=useState<Profile|null>(null),[name,setName]=useState(""),[bookings,setBookings]=useState<Booking[]>([]),[onboard,setOnboard]=useState<Onboarding|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("Loading…"),[reason,setReason]=useState("");
 const load=useCallback(async()=>{
  try{
   const p=await requestWithSession<Profile>("GET","/providers/me");setProfile(p);
   const results=await Promise.allSettled([requestWithSession<Booking[]>("GET","/bookings/provider/me"),requestWithSession<Onboarding>("GET","/provider-onboarding/applications/me")]);
   setBookings(results[0].status==="fulfilled"&&Array.isArray(results[0].value)?results[0].value:[]);
   setOnboard(results[1].status==="fulfilled"?results[1].value:null);
   setMessage("");
  }catch(e){setProfile(null);setMessage((e as {status?:number}).status===404?"Create your provider profile to begin onboarding.":e instanceof Error?e.message:"Unable to load workspace")}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await requestWithSession("POST","/providers/me",{fullName:name.trim(),preferredLanguage:"kn"});await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to create profile")}finally{setBusy(false)}}
 async function submit(){setBusy(true);try{await requestWithSession("POST","/provider-onboarding/applications/me",{});await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to submit application")}finally{setBusy(false)}}
 async function action(b:Booking,kind:"accept"|"reject"|"complete"){if(kind==="reject"&&!reason.trim()){Alert.alert("Reason required","Enter a rejection reason.");return}setBusy(true);try{await requestWithSession("POST",`/bookings/provider/me/${b.id}/${kind}`,kind==="reject"?{reason:reason.trim()}:{});setReason("");await load()}catch(e){setMessage(e instanceof Error?e.message:"Booking update failed")}finally{setBusy(false)}}
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}><Text style={s.title}>Provider workspace</Text>
  <View style={s.nav}><Pressable onPress={()=>router.push("/workspaces")}><Text style={s.link}>Workspaces</Text></Pressable><Pressable onPress={()=>void signOut().then(()=>router.replace("/login"))}><Text style={s.link}>Sign out</Text></Pressable><Pressable onPress={()=>void load()}><Text style={s.link}>↻ Refresh</Text></Pressable></View>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {!profile&&<View style={s.card}><Text style={s.heading}>Register as a provider</Text><TextInput style={s.input} value={name} placeholder="Your full name" maxLength={150} onChangeText={setName}/><Pressable disabled={busy||name.trim().length<2} style={s.btn} onPress={()=>void create()}><Text style={s.white}>Create provider profile</Text></Pressable></View>}
  {profile&&<><View style={s.card}><Text style={s.heading}>{profile.fullName}</Text><Text>Status: {profile.status} · Verification: {profile.verificationStatus}</Text><Text style={s.muted}>Application: {onboard?.status||"Not submitted"}</Text>{onboard?.reviewNote&&<Text style={s.notice}>{onboard.reviewNote}</Text>}
   {(!onboard||onboard.status==="REJECTED")&&<Pressable disabled={busy} style={s.btn} onPress={()=>void submit()}><Text style={s.white}>{onboard?"Resubmit":"Submit"} verification application</Text></Pressable>}
  </View>
  <Pressable style={s.btn} onPress={()=>router.push("/provider-manage")}><Text style={s.white}>Manage services, hours and coverage →</Text></Pressable><Text style={s.heading}>My bookings ({bookings.length})</Text>
  {bookings.length===0&&<Text style={s.muted}>No assigned bookings yet.</Text>}
  {bookings.map(b=><View style={s.card} key={b.id}><Text style={s.heading}>{b.status}</Text><Text selectable style={s.muted}>Booking {b.id}</Text><Text>{String(b.scheduledDate).slice(0,10)} · {b.scheduledStartTime}–{b.scheduledEndTime}</Text><Text>{b.currency} {b.amount??"Price on request"}</Text>
   {b.status==="REQUESTED"&&<><TextInput style={s.input} placeholder="Reason if rejecting" value={reason} onChangeText={setReason}/><View style={s.nav}><Pressable disabled={busy} style={s.btn} onPress={()=>void action(b,"accept")}><Text style={s.white}>Accept</Text></Pressable><Pressable disabled={busy} style={s.danger} onPress={()=>void action(b,"reject")}><Text style={s.white}>Reject</Text></Pressable></View></>}
   {b.status==="ACCEPTED"&&<Pressable disabled={busy} style={s.btn} onPress={()=>Alert.alert("Complete booking?","Confirm service delivery.",[{text:"Cancel",style:"cancel"},{text:"Complete",onPress:()=>void action(b,"complete")}])}><Text style={s.white}>Mark completed</Text></Pressable>}
  </View>)}</>}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F6FAF7"},page:{padding:20,paddingBottom:48},title:{fontSize:26,fontWeight:"900",color:"#094B34"},heading:{fontSize:18,fontWeight:"800",marginVertical:8},card:{padding:17,borderRadius:16,backgroundColor:"#fff",marginTop:12,gap:6,borderColor:"#DCEAE0",borderWidth:1},muted:{color:"#65756B",fontSize:13,marginTop:4},nav:{flexDirection:"row",alignItems:"center",gap:14,flexWrap:"wrap",marginVertical:10},link:{color:"#087A4B",fontWeight:"700"},input:{borderColor:"#CADBD0",borderWidth:1,borderRadius:10,padding:12,marginVertical:6},btn:{backgroundColor:"#087A4B",padding:12,borderRadius:10,alignItems:"center"},danger:{backgroundColor:"#B42318",padding:12,borderRadius:10,alignItems:"center"},white:{color:"#fff",fontWeight:"800"},notice:{color:"#A44A1B",marginVertical:8}});
