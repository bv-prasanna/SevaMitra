import React,{useState}from"react";
import{SafeAreaView,View,Text,TextInput,Pressable,StyleSheet}from"react-native";
import{router}from"expo-router";
import{ApiClient}from"@sevamitra/api-client";
import{API_BASE,saveLoginResponse,myWorkspaces}from"../src/session";
const api=new ApiClient(API_BASE);
export default function Login(){
 const[mobile,setMobile]=useState("");const[otp,setOtp]=useState("");const[sent,setSent]=useState(false);const[msg,setMsg]=useState("");const[busy,setBusy]=useState(false);
 const valid=/^[6-9]\d{9}$/.test(mobile);
 async function go(){
  if(!API_BASE){setMsg("API URL missing: configure EXPO_PUBLIC_API_BASE_URL.");return}
  setBusy(true);setMsg("");
  try{
   const phoneNumber="+91"+mobile;
   if(!sent){await api.requestOtp({phoneNumber,purpose:"LOGIN"});setSent(true);setMsg("OTP sent / OTP ಕಳುಹಿಸಲಾಗಿದೆ");}
   else{
    const response=await api.verifyOtp({phoneNumber,otp,purpose:"LOGIN"});
    await saveLoginResponse(response);
    await myWorkspaces();
    router.replace("/workspaces");
   }
  }catch(e){setMsg(e instanceof Error?e.message:"Login failed. Please retry.")}finally{setBusy(false)}
 }
 return <SafeAreaView style={s.safe}><View style={s.card}>
  <Text style={s.logo}>Seva<Text style={s.orange}>Mitra</Text></Text>
  <Text style={s.title}>Welcome / ಸ್ವಾಗತ</Text><Text style={s.body}>Sign in using your mobile number and one-time password.</Text>
  <TextInput style={s.input} keyboardType="phone-pad" autoComplete="tel" maxLength={10} editable={!sent&&!busy} value={mobile} onChangeText={x=>setMobile(x.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number"/>
  {sent&&<><TextInput style={s.input} keyboardType="number-pad" maxLength={6} value={otp} onChangeText={x=>setOtp(x.replace(/\D/g,"").slice(0,6))} placeholder="6-digit OTP"/>
   <Pressable onPress={()=>{setSent(false);setOtp("");setMsg("")}}><Text style={s.link}>Change number / Resend</Text></Pressable></>}
  <Pressable accessibilityRole="button" disabled={busy||!valid||(sent&&otp.length!==6)} style={[s.btn,(busy||!valid||(sent&&otp.length!==6))&&s.disabled]} onPress={go}><Text style={s.white}>{busy?"Please wait…":sent?"Verify & continue":"Send OTP"}</Text></Pressable>
  {!!msg&&<Text accessibilityRole="alert" style={s.msg}>{msg}</Text>}
  <Pressable onPress={()=>router.back()}><Text style={s.link}>← Back</Text></Pressable>
 </View></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#effaf4",justifyContent:"center",padding:20},card:{backgroundColor:"#fff",padding:24,borderRadius:24},logo:{fontSize:28,fontWeight:"900",color:"#087A4B"},orange:{color:"#FF6B18"},title:{fontSize:28,fontWeight:"900",marginTop:24,color:"#0B2039"},body:{color:"#64748B",marginVertical:8},input:{borderWidth:1,borderColor:"#DCE6E0",borderRadius:12,padding:14,marginTop:12,fontSize:16},btn:{backgroundColor:"#087A4B",padding:15,borderRadius:12,alignItems:"center",marginTop:16},disabled:{opacity:.5},white:{color:"#fff",fontWeight:"800"},msg:{marginTop:12,color:"#475569"},link:{marginTop:20,color:"#087A4B",fontWeight:"700"}});
