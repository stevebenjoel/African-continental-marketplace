import { ID, Query } from "node-appwrite";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdministrativeAccess } from "@/src/modules/authorization/domain/admin-access";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export async function POST(request:Request){
  try{assertSameOrigin(request)}catch{return new Response("Forbidden",{status:403})}
  const user=await getCurrentAppwriteUser();if(!user||!hasAdministrativeAccess(user.labels))return new Response("Forbidden",{status:403});
  const input=await request.json().catch(()=>({})) as {soundEnabled?:boolean},db=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID;
  const existing=await db.listDocuments({databaseId,collectionId:"admin_notification_preferences",queries:[Query.equal("userId",user.$id),Query.limit(1)]});
  const data={userId:user.$id,soundEnabled:input.soundEnabled?"yes":"no",updatedAt:new Date().toISOString()};
  if(existing.documents[0])await db.updateDocument({databaseId,collectionId:"admin_notification_preferences",documentId:existing.documents[0].$id,data});
  else await db.createDocument({databaseId,collectionId:"admin_notification_preferences",documentId:ID.unique(),permissions:[],data});
  return Response.json({ok:true});
}
