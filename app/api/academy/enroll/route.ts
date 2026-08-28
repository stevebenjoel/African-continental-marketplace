import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { assertSameOrigin,publicAppUrl } from "@/src/modules/auth/server/request-security";
import { enrollInAcademy } from "@/src/modules/academy/server/repository";
export async function POST(request:Request){try{assertSameOrigin(request)}catch{return new Response("Forbidden",{status:403})}const user=await getCurrentAppwriteUser();if(!user)return Response.redirect(publicAppUrl("/login?returnTo=/academy"),303);await enrollInAcademy(user.$id);return Response.redirect(publicAppUrl("/academy?enrolled=1"),303)}
