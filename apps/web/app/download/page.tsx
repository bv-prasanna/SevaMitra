import AppDownloadPanel from "../components/AppDownloadPanel";
import Link from "next/link";
export const metadata={title:"Download SevaMitra | One App. Many Services.",description:"Download the latest official SevaMitra Android app."};
export default function DownloadPage(){return <main className="workspace downloadPage">
 <div className="workspaceTop"><div><div className="pill">Official app</div><h1>Take SevaMitra with you</h1><p>Download the current Android release or scan its QR code. Sign in using your registered mobile number.</p></div><Link href="/">Back to home</Link></div>
 <AppDownloadPanel/>
 <section className="downloadInstructions"><h2>Before installing</h2><ul>
  <li>Download only from the official link shown on this page.</li>
  <li>Android may ask you to allow installation from your browser. Enable it only for this trusted download, then turn it off again.</li>
  <li>Check the release version and build number before installing.</li>
  <li>Never share your OTP or account credentials with anyone.</li>
 </ul><p>iOS distribution is not published yet. We will add it after the Apple developer and distribution setup is completed.</p></section>
 </main>}
