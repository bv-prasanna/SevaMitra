import React,{useCallback,useEffect,useState}from"react";
import{Alert,SafeAreaView,ScrollView,Text,TextInput,Pressable,StyleSheet,View}from"react-native";
import{router}from"expo-router";
import{requestWithSession,signOut}from"../src/session";
type Application={id:string;providerId:string;status:string;channel:string;submittedAt:string;reviewNote?:string|null};
export default function Admin(){
 const[items,setItems]=useState<Application[]>([]),[message,setMessage]=useState("Loading review queue…"),[busy,setBusy]=useState<string|null>(null),[notes,setNotes]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{try{const v=await requestWithSession<Application[]>("GET","/provider-onboarding/applications");setItems(Array.isArray(v)?v:[]);setMessage("")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load applications")}},[]);
 useEffect(()=>{void load()},[load]);
 async function act(id:string,kind:"claim"|"approve"|"reject"){
  if(kind==="reject"&&!notes[id]?.trim()){Alert.alert("Reason required","Enter a reason before rejecting an application.");return}
  setBusy(id);setMessage("");
  try{
   if(kind==="claim")await requestWithSession("PATCH",`/provider-onboarding/applications/${id}/claim`);
   else await requestWithSession("POST",`/provider-onboarding/applications/${id}/review`,{decision:kind==="approve"?"APPROVED":"REJECTED",...(kind==="reject"?{reviewNote:notes[id].trim()}:{})});
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Action failed")}finally{setBusy(null)}
 }
 const confirm=(x:Application,decision:"approve"|"reject")=>Alert.alert(decision==="approve"?"Approve provider?":"Reject provider?",`Application ${x.id}`,[{text:"Cancel",style:"cancel"},{text:decision==="approve"?"Approve":"Reject",style:decision==="reject"?"destructive":"default",onPress:()=>{void act(x.id,decision)}}]);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>Admin · Provider verification</Text><Text style={s.sub}>Review applications. Every decision is checked against your server-side permissions.</Text>
  <View style={s.toolbar}><Pressable onPress={()=>void load()}><Text style={s.link}>↻ Refresh</Text></Pressable><Pressable onPress={()=>router.push("/workspaces")}><Text style={s.link}>Workspaces</Text></Pressable><Pressable onPress={()=>void signOut().then(()=>router.replace("/login"))}><Text style={s.link}>Sign out</Text></Pressable></View>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {items.length===0&&!message&&<Text style={s.sub}>No onboarding applications found.</Text>}
  {items.map(x=><View key={x.id} style={s.card}><Text style={s.bold}>{x.status} · {x.channel}</Text><Text selectable style={s.detail}>Application: {x.id}</Text><Text selectable style={s.detail}>Provider: {x.providerId}</Text><Text style={s.detail}>Submitted: {new Date(x.submittedAt).toLocaleDateString()}</Text>
   {x.reviewNote&&<Text style={s.detail}>Review note: {x.reviewNote}</Text>}
   {(x.status==="SUBMITTED"||x.status==="UNDER_REVIEW")&&<>
    <TextInput style={s.input} placeholder="Rejection reason (required)" value={notes[x.id]||""} maxLength={1000} onChangeText={v=>setNotes(prev=>({...prev,[x.id]:v}))}/>
    <View style={s.toolbar}>
     {x.status==="SUBMITTED"&&<Pressable disabled={busy===x.id} style={s.secondary} onPress={()=>void act(x.id,"claim")}><Text>Claim</Text></Pressable>}
     <Pressable disabled={busy===x.id} style={s.approve} onPress={()=>confirm(x,"approve")}><Text style={s.white}>Approve</Text></Pressable>
     <Pressable disabled={busy===x.id} style={s.reject} onPress={()=>confirm(x,"reject")}><Text style={s.white}>Reject</Text></Pressable>
    </View>
   </>}
  </View>)}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F5F9F6"},page:{padding:18,paddingBottom:50},title:{fontSize:24,fontWeight:"900",color:"#0E4D35"},sub:{color:"#55685D",marginVertical:8},toolbar:{flexDirection:"row",alignItems:"center",gap:13,flexWrap:"wrap",marginVertical:10},link:{color:"#087A4B",fontWeight:"700"},card:{backgroundColor:"#fff",padding:16,borderRadius:14,marginTop:12,borderWidth:1,borderColor:"#DDECE3"},bold:{fontWeight:"800",fontSize:16},detail:{fontSize:12,color:"#40544A",marginTop:7},input:{borderWidth:1,borderColor:"#CBD8CF",padding:10,borderRadius:8,marginTop:12},secondary:{padding:11,backgroundColor:"#E4ECE8",borderRadius:8},approve:{padding:11,backgroundColor:"#087A4B",borderRadius:8},reject:{padding:11,backgroundColor:"#B42318",borderRadius:8},white:{color:"#fff",fontWeight:"700"},notice:{color:"#A23C13",paddingVertical:12}});
