import {AlertCircle,CheckCircle2,Info} from "lucide-react";
type Props={kind:"error"|"success"|"info";children:React.ReactNode};
export default function Feedback({kind,children}:Props){
 const Icon=kind==="error"?AlertCircle:kind==="success"?CheckCircle2:Info;
 return <div className="uatFeedback" data-kind={kind} role={kind==="error"?"alert":"status"} aria-live={kind==="error"?"assertive":"polite"}><Icon size={19} aria-hidden="true"/><span>{children}</span></div>;
}
