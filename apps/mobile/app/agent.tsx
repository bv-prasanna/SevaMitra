import React,{useEffect,useState}from"react";
import{SafeAreaView,ScrollView,View,Text,TextInput,Pressable,StyleSheet}from"react-native";
import{router}from"expo-router";
import{requestWithSession,signOut}from"../src/session";
type AgentProfile={id:string;fullName:string;agentCode:string;status:string;geographyNote?:string|null};
export default function Agent(){
 const[profile,setProfile]=useState<AgentProfile|null>(null),[name,setName]=useState(""),[area,setArea]=useState(""),[message,setMessage]=useState("Loading…"),[busy,setBusy]=useState(false);
 async function load(){try{const p=await requestWithSession<AgentProfile>("GET","/agents/me");setProfile(p);setMessage("")}catch(e){setProfile(null);setMessage((e as {status?:number}).status===404?"Create your agent profile to begin.":e instanceof Error?e.message:"Unable to load agent profile")}}
 useEffect(()=>{void load()},[]);
 async function create(){if(name.trim().length<2)return;setBusy(true);try{await requestWithSession("POST","/agents/me",{fullName:name.trim(),geographyNote:area.trim()||undefined,preferredLanguage:"kn"});await load()}catch(e){setMessage(e instanceof Error?e.message:"Registration failed")}finally{setBusy(false)}}
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>Agent workspace</Text><View style={s.nav}><Pressable onPress={()=>router.push("/workspaces")}><Text style={s.link}>Workspaces</Text></Pressable><Pressable onPress={()=>void signOut().then(()=>router.replace("/login"))}><Text style={s.link}>Sign out</Text></Pressable></View>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {!profile?<View style={s.card}><Text style={s.heading}>Become a local community agent</Text><TextInput style={s.input} value={name} placeholder="Full name" maxLength={150} onChangeText={setName}/><TextInput style={s.input} value={area} placeholder="Taluk / service area" maxLength={200} onChangeText={setArea}/><Pressable disabled={busy||name.trim().length<2} style={s.btn} onPress={()=>void create()}><Text style={s.white}>Create agent profile</Text></Pressable></View>:
  <View style={s.card}><Text style={s.heading}>{profile.fullName}</Text><Text>Status: {profile.status}</Text><Text style={s.muted}>Your agent referral code</Text><Text selectable style={s.code}>{profile.agentCode}</Text><Text style={s.muted}>Share this code with providers when they submit their verification application. Attribution is validated by the backend.</Text><Text style={s.muted}>{profile.geographyNote||""}</Text></View>}
  <View style={s.card}><Text style={s.heading}>Agent-assisted onboarding</Text><Text style={s.muted}>Direct third-party onboarding and incentives are not yet supported by the existing API. Providers must create their own profile and submit verification with your referral code.</Text></View>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#FFF9F4"},page:{padding:18,paddingBottom:42},title:{fontSize:25,fontWeight:"900",color:"#704014"},heading:{fontSize:18,fontWeight:"800",marginBottom:8},nav:{flexDirection:"row",gap:20,marginVertical:16},link:{color:"#087A4B",fontWeight:"700"},card:{padding:18,borderRadius:15,backgroundColor:"#fff",marginVertical:8,borderColor:"#F0DDD0",borderWidth:1},input:{borderWidth:1,borderColor:"#E7CFBA",padding:12,borderRadius:8,marginTop:10},btn:{backgroundColor:"#087A4B",padding:12,borderRadius:10,marginTop:12},white:{textAlign:"center",color:"#fff",fontWeight:"800"},notice:{color:"#98551A"},muted:{color:"#657369",lineHeight:20,marginTop:8},code:{fontSize:28,letterSpacing:4,color:"#087A4B",fontWeight:"900",marginVertical:12}});
