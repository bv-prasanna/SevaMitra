import React from "react";
import {Text,View,StyleSheet} from "react-native";
export function WorkspaceHero({category,title,description}:{category:string;title:string;description:string}){
 return <View style={styles.hero}>
  <Text style={styles.eyebrow}>SEVAMITRA  /  {category.toUpperCase()}</Text>
  <Text style={styles.title}>{title}</Text>
  <Text style={styles.description}>{description}</Text>
 </View>;
}
export function MobileFeedback({message,kind="info"}:{message:string;kind?:"info"|"error"|"success"}){
 if(!message)return null;
 return <View style={[styles.feedback,kind==="error"?styles.error:kind==="success"?styles.success:styles.info]}>
  <Text accessibilityRole={kind==="error"?"alert":"text"} style={[styles.feedbackText,kind==="error"?styles.errorText:kind==="success"?styles.successText:styles.infoText]}>{message}</Text>
 </View>;
}
const styles=StyleSheet.create({
 hero:{backgroundColor:"#094E39",borderRadius:23,paddingVertical:25,paddingHorizontal:23,marginBottom:17,shadowColor:"#103E2B",shadowOpacity:0.13,shadowRadius:17,elevation:2},
 eyebrow:{color:"#F9CC85",fontSize:10,fontWeight:"900",letterSpacing:1.8,marginBottom:13},
 title:{color:"#FFFFFF",fontSize:26,fontWeight:"900",lineHeight:34},
 description:{color:"#D7EFE3",fontSize:13,lineHeight:21,marginTop:10},
 feedback:{padding:14,borderWidth:1,borderRadius:13,marginVertical:11},
 feedbackText:{fontSize:13,fontWeight:"600",lineHeight:20},
 info:{backgroundColor:"#EEF6FB",borderColor:"#CFE2EF"},infoText:{color:"#275E77"},
 success:{backgroundColor:"#E8F7EF",borderColor:"#BDE3CB"},successText:{color:"#0D613D"},
 error:{backgroundColor:"#FFF0EB",borderColor:"#EEC9BE"},errorText:{color:"#9C3A29"}
});
