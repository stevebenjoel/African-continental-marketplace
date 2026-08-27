import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdministrativeAccess } from "@/src/modules/authorization/domain/admin-access";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export async function POST(request:Request,{params}:{params:Promise<{notificationId:string}>}){
  try{assertSameOrigin(request)}catch{return new Response("Forbidden",{status:403})}
  const user=await getCurrentAppwriteUser();if(!user||!hasAdministrativeAccess(user.labels))return new Response("Forbidden",{status:403});
  const {notificationId}=await params,db=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID;
  const item=await db.getDocument({databaseId,collectionId:"admin_notifications",documentId:notificationId});
  if(String(item.recipientUserId)!==user.$id)return new Response("Forbidden",{status:403});
  await db.updateDocument({databaseId,collectionId:"admin_notifications",documentId:notificationId,data:{status:"read",readAt:new Date().toISOString()}});
  return Response.json({ok:true});
}
