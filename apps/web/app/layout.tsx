import "./globals.css";
import type { Metadata } from "next";
export const metadata:Metadata={title:"SevaMitra | Local Services. Stronger Communities.",description:"Find trusted local service professionals near you."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}