import {notFound} from "next/navigation";
export default function ExampleLayout({children}:{children:React.ReactNode}){if(process.env.NEXT_PUBLIC_PRIVATE_WORKSPACE==="1")notFound();return children;}
