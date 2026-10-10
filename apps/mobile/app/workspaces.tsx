import React,{useCallback,useEffect,useState}from"react";
import{SafeAreaView,View,Text,Pressable,ScrollView,StyleSheet}from"react-native";
import{router}from"expo-router";
import{myWorkspaces,signOut,type WorkspaceEntitlements}from"../src/session";
import{enableEventLocation}from"../src/event-location";
import{visibleWorkspaceRoles,canOfferRoleEnrollment}from"../src/workspace-policy";

type Path="/customer"|"/provider"|"/agent"|"/admin";
const roles=[
 {key:"customer",label:"Customer",desc:"Find services and track bookings",path:"/customer"},
 {key:"provider",label:"Provider",desc:"Verification, services, availability and jobs",path:"/provider"},
 {key:"agent",label:"Agent",desc:"Local provider referrals and onboarding",path:"/agent"},
 {key:"admin",label:"Admin",desc:"Authorized provider approval and review",path:"/admin"},
] as const;
export default function Workspaces(){
 const[access,setAccess]=useState<WorkspaceEntitlements|null>(null);
 const[message,setMessage]=useState("Loading authorized workspaces…");
 const load=useCallback(async()=>{
  try{const entitlements=await myWorkspaces();setAccess(entitlements);setMessage("")}
  catch(e){setAccess(null);setMessage(e instanceof Error?e.message:"Unable to check role permissions")}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function logout(){
  await signOut();
  router.replace("/login");
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Text style={s.title}>SevaMitra workspaces</Text>
  <Text style={s.sub}>One app. Your available workspaces are based on your verified account and permissions.</Text>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {access&&roles.filter(item=>visibleWorkspaceRoles(access).includes(item.key)).map(item=>
   <Pressable key={item.key} accessibilityRole="button" style={s.card} onPress={()=>router.push(item.path as Path)}>
    <Text style={s.bold}>{item.label} →</Text><Text style={s.sub}>{item.desc}</Text>
    {item.key==="provider"&&access.providerStatus&&<Text style={s.status}>Provider status: {access.providerStatus}</Text>}
    {item.key==="agent"&&access.agentStatus&&<Text style={s.status}>Agent status: {access.agentStatus}</Text>}
   </Pressable>
  )}
  {access&&<View style={s.enrol}>
   <Text style={s.section}>Interested in joining?</Text>
   {canOfferRoleEnrollment(access,'provider')&&<Pressable onPress={()=>router.push("/provider")} style={s.secondary}><Text style={s.link}>Apply as a provider →</Text></Pressable>}
   {canOfferRoleEnrollment(access,'agent')&&<Pressable onPress={()=>router.push("/agent")} style={s.secondary}><Text style={s.link}>Apply as an agent →</Text></Pressable>}
   {!access.canJoinProvider&&!access.canJoinAgent&&<Text style={s.sub}>Your existing roles are shown above.</Text>}
  </View>}
  {access&&<View style={s.enrol}><Text style={s.section}>Optional event location</Text>
   <Text style={s.sub}>Attach recent GPS location to booking and operational changes, when permitted. No background tracking.</Text>
   <Pressable style={s.secondary} onPress={()=>void enableEventLocation().then(ok=>setMessage(ok?'Location sharing enabled for future operational actions':'Location was not permitted. Actions remain available.'))}>
    <Text style={s.link}>Enable location for service events →</Text>
   </Pressable>
  </View>}
  <View style={s.footer}>
   <Pressable onPress={()=>void load()}><Text style={s.link}>↻ Refresh permissions</Text></Pressable>
   <Pressable onPress={()=>router.push('/devices')}><Text style={s.link}>Trusted devices</Text></Pressable>
   <Pressable onPress={()=>void logout()}><Text style={s.link}>Sign out / Switch account</Text></Pressable>
  </View>
  {!access&&<Pressable onPress={()=>router.replace("/login")}><Text style={s.link}>Go to login</Text></Pressable>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F6FAF8"},
 page:{padding:20,paddingBottom:50},title:{fontSize:26,fontWeight:"900",color:"#075840",marginVertical:16},
 sub:{color:"#65746C",marginTop:4},card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#DCE9E0",padding:19,borderRadius:14,marginTop:12},
 bold:{fontSize:18,fontWeight:"800",color:"#164E39"},link:{color:"#087A4B",fontWeight:"800"},
 notice:{color:"#A14C1D",marginVertical:10},status:{fontSize:12,color:"#5C7263",marginTop:9},
 section:{fontSize:16,fontWeight:"800",color:"#1E5237"},enrol:{marginTop:22},
 secondary:{backgroundColor:"#EAF5ED",marginTop:9,padding:14,borderRadius:12},
 footer:{flexDirection:"row",justifyContent:"space-between",marginTop:28,gap:10},
});
