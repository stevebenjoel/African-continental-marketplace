import { Query } from "node-appwrite";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { hasAdministrativeAccess } from "@/src/modules/authorization/domain/admin-access";
import { assertSameOrigin } from "@/src/modules/auth/server/request-security";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
export async function POST(request:Request){try{assertSameOrigin(request)}catch{return new Response("Forbidden",{status:403})}const user=await getCurrentAppwriteUser();if(!user||!hasAdministrativeAccess(user.labels))return new Response("Forbidden",{status:403});const db=createAppwriteDatabaseClient().databases,databaseId=env().APPWRITE_DATABASE_ID,items=await db.listDocuments({databaseId,collectionId:"admin_notifications",queries:[Query.equal("recipientUserId",user.$id),Query.equal("status","unread"),Query.limit(500)]}),readAt=new Date().toISOString();await Promise.all(items.documents.map(item=>db.updateDocument({databaseId,collectionId:"admin_notifications",documentId:item.$id,data:{status:"read",readAt}})));return Response.json({ok:true})}
