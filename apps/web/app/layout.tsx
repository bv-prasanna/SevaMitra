import "./globals.css";
import type { Metadata } from "next";
import AccountBar from "./components/AccountBar";
export const metadata:Metadata={title:"SevaMitra | One App. Many Services.",description:"Find trusted local service professionals near you."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AccountBar/>{children}</body></html>}