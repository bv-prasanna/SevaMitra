import React,{useCallback,useEffect,useState} from 'react';
import {SafeAreaView,ScrollView,Text,Pressable,Alert,StyleSheet,View} from 'react-native';
import {router} from 'expo-router';
import {requestWithSession,signOut} from '../src/session';
type Device={id:string;platform:string;label:string|null;approvedAt:string;lastSeenAt:string;revokedAt:string|null};
export default function Devices(){
 const[items,setItems]=useState<Device[]>([]);
 const[message,setMessage]=useState('Checking approved devices…');
 const[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{setItems(await requestWithSession<Device[]>('GET','/auth/devices'));setMessage('')}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to load devices')}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function revoke(id:string){
  if(busy)return;
  setBusy(true);
  try{
   await requestWithSession('DELETE',`/auth/devices/${id}`);
   await load();
   setMessage('Device access revoked. This device may require OTP next time.');
  }catch(e){setMessage(e instanceof Error?e.message:'Device revoke failed')}
  finally{setBusy(false)}
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.row}><Pressable onPress={()=>router.back()}><Text style={s.link}>← Workspaces</Text></Pressable><Pressable onPress={()=>void load()}><Text style={s.link}>↻ Refresh</Text></Pressable></View>
  <Text style={s.title}>My trusted devices</Text>
  <Text style={s.caption}>Only a secure session stored on the phone can resume sign-in without OTP. The device ID shown here cannot unlock your account.</Text>
  {!!message&&<Text accessibilityRole="alert" style={s.notice}>{message}</Text>}
  {items.map(item=><View key={item.id} style={s.card}>
   <Text style={s.name}>{item.label||item.platform}</Text><Text style={s.small}>{item.platform.toUpperCase()} · {item.id.slice(0,8)}</Text>
   <Text style={s.small}>Enrolled: {new Date(item.approvedAt).toLocaleDateString()}</Text>
   <Text style={s.small}>Last used: {new Date(item.lastSeenAt).toLocaleString()}</Text>
   {item.revokedAt?<Text style={s.revoked}>Access revoked</Text>:
    <Pressable disabled={busy} style={s.danger} onPress={()=>Alert.alert('Revoke trusted device?','This signs out the device when its session expires. It will need OTP or password to sign in again.',[
     {text:'Cancel',style:'cancel'},
     {text:'Revoke',style:'destructive',onPress:()=>void revoke(item.id)},
    ])}><Text style={s.white}>Revoke device</Text></Pressable>}
  </View>)}
  {items.length===0&&!message&&<Text style={s.caption}>No trusted mobile devices registered yet.</Text>}
  <Pressable style={s.signout} onPress={()=>void signOut().then(()=>router.replace('/login'))}><Text style={s.link}>Sign out</Text></Pressable>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#F5FAF7'},page:{padding:20,paddingBottom:55},
 row:{flexDirection:'row',justifyContent:'space-between',marginBottom:24},link:{color:'#087A4B',fontWeight:'800'},
 title:{fontSize:26,fontWeight:'900',color:'#0C5038'},caption:{color:'#556E60',lineHeight:21,marginVertical:12},
 notice:{color:'#A34A1B',marginVertical:12},card:{backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#DCE9E0',padding:18,marginTop:12},
 name:{fontSize:17,fontWeight:'800',color:'#214C36'},small:{fontSize:12,marginTop:6,color:'#63766B'},
 danger:{backgroundColor:'#AF251F',marginTop:13,padding:12,borderRadius:9,alignItems:'center'},
 revoked:{marginTop:12,fontWeight:'700',color:'#6A7280'},white:{fontWeight:'800',color:'#fff'},
 signout:{marginTop:26},
});
