import React,{useEffect,useState}from"react";
import{Alert,SafeAreaView,ScrollView,Text,TextInput,Pressable,StyleSheet,View}from"react-native";
import{router}from"expo-router";
import{requestWithSession,signOut}from"../src/session";
type Profile={fullName:string};
type Booking={id:string;status:string;scheduledDate:string;scheduledStartTime:string;scheduledEndTime:string;amount?:string|null;currency:string};
export default function Customer(){
 const[profile,setProfile]=useState<Profile|null>(null),[bookings,setBookings]=useState<Booking[]>([]),[name,setName]=useState(""),[message,setMessage]=useState("Loading…"),[busy,setBusy]=useState(false);
 async function load(){
  try{
   const p=await requestWithSession<Profile>("GET","/customers/me");setProfile(p);
   const b=await requestWithSession<Booking[]>("GET","/bookings/me");setBookings(Array.isArray(b)?b:[]);setMessage("");
  }catch(e){if((e as {status?:number}).status===404){setProfile(null);setMessage("Complete your customer profile to book services.")}else setMessage(e instanceof Error?e.message:"Unable to load bookings")}
 }
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await requestWithSession("POST","/customers/me",{fullName:name.trim(),preferredLanguage:"kn"});await load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to create customer")}finally{setBusy(false)}}
 async function cancel(id:string){setBusy(true);try{await requestWithSession("POST",`/bookings/me/${id}/cancel`,{reason:"Cancelled by customer"});await load()}catch(e){setMessage(e instanceof Error?e.message:"Cancellation failed")}finally{setBusy(false)}}
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}><Text style={s.title}>Customer workspace</Text><View style={s.nav}><Pressable onPress={()=>router.push("/workspaces")}><Text style={s.link}>Workspaces</Text></Pressable><Pressable onPress={()=>void signOut().then(()=>router.replace("/login"))}><Text style={s.link}>Sign out</Text></Pressable></View>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {!profile?<View style={s.card}><Text style={s.heading}>Complete your profile</Text><TextInput style={s.input} value={name} maxLength={150} placeholder="Full name" onChangeText={setName}/><Pressable disabled={busy||name.trim().length<2} style={s.btn} onPress={()=>void create()}><Text style={s.white}>Save profile</Text></Pressable></View>:<><Text style={s.heading}>Welcome, {profile.fullName}</Text>
   <Pressable style={s.btn} onPress={()=>router.push("/marketplace")}><Text style={s.white}>Find services →</Text></Pressable>
   <Text style={s.heading}>My bookings ({bookings.length})</Text>
   {bookings.length===0&&<Text style={s.muted}>No bookings yet.</Text>}
   {bookings.map(b=><View style={s.card} key={b.id}><Text style={s.heading}>{b.status}</Text><Text selectable style={s.muted}>Booking {b.id}</Text><Text>{String(b.scheduledDate).slice(0,10)} · {b.scheduledStartTime}–{b.scheduledEndTime}</Text><Text>{b.currency} {b.amount??"Price on request"}</Text>
    {(b.status==="REQUESTED"||b.status==="ACCEPTED")&&<Pressable disabled={busy} style={s.danger} onPress={()=>Alert.alert("Cancel booking?","This may have a refund impact. Check the cancellation terms.",[{text:"Back",style:"cancel"},{text:"Cancel booking",style:"destructive",onPress:()=>void cancel(b.id)}])}><Text style={s.white}>Cancel booking</Text></Pressable>}
   </View>)}</>}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F6FBF8"},page:{padding:18,paddingBottom:42},title:{fontSize:25,fontWeight:"900",color:"#0A5039"},heading:{fontSize:18,fontWeight:"800",marginVertical:10},nav:{flexDirection:"row",gap:20,marginVertical:14},link:{color:"#087A4B",fontWeight:"700"},card:{padding:17,borderRadius:14,backgroundColor:"#fff",marginVertical:8,borderWidth:1,borderColor:"#DBE9DE"},input:{borderWidth:1,borderColor:"#DCE6DF",padding:12,borderRadius:9},btn:{backgroundColor:"#087A4B",padding:13,borderRadius:10,alignItems:"center",marginVertical:8},danger:{backgroundColor:"#B42318",padding:12,borderRadius:10,alignItems:"center",marginTop:12},white:{color:"#fff",fontWeight:"800"},notice:{color:"#98551A",marginVertical:8},muted:{color:"#61776B",lineHeight:20}});
