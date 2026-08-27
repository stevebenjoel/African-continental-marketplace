import { Query } from "node-appwrite";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdministrativeAccess } from "@/src/modules/authorization/domain/admin-access";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";

export const dynamic="force-dynamic";
export async function GET(){
  const user=await getCurrentAppwriteUser();
  if(!user||!hasAdministrativeAccess(user.labels))return Response.json({error:"forbidden"},{status:403});
  const databaseId=env().APPWRITE_DATABASE_ID,db=createAppwriteDatabaseClient().databases;
  const [items,preferences]=await Promise.all([
    db.listDocuments({databaseId,collectionId:"admin_notifications",queries:[Query.equal("recipientUserId",user.$id),Query.orderDesc("createdAt"),Query.limit(30)]}),
    db.listDocuments({databaseId,collectionId:"admin_notification_preferences",queries:[Query.equal("userId",user.$id),Query.limit(1)]})
  ]);
  return Response.json({unread:items.documents.filter(item=>item.status==="unread").length,soundEnabled:String(preferences.documents[0]?.soundEnabled??"yes")==="yes",items:items.documents.map(item=>({id:item.$id,eventType:item.eventType,priority:item.priority,title:item.title,body:item.body,href:item.href,status:item.status,createdAt:item.createdAt}))},{headers:{"Cache-Control":"no-store"}});
}
