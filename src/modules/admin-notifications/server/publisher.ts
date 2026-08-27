import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteAuthClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import type { AdminNotificationEvent } from "@/src/modules/admin-notifications/domain/events";

export async function publishAdminNotification(event:AdminNotificationEvent){
  const databaseId=env().APPWRITE_DATABASE_ID,databases=createAppwriteDatabaseClient().databases;
  const [members,superAdmins]=await Promise.all([
    databases.listDocuments({databaseId,collectionId:"admin_members",queries:[Query.equal("role",[...event.roles]),Query.equal("status","active"),Query.limit(500)]}),
    createAppwriteAuthClient().users.list({queries:[Query.equal("labels","superadmin"),Query.limit(100)]})
  ]);
  const recipients=new Set([...members.documents.map(member=>String(member.userId)),...superAdmins.users.map(user=>user.$id)]);
  const createdAt=new Date().toISOString();
  await Promise.all([...recipients].map(async recipientUserId=>{
    const dedupeKey=`${recipientUserId}:${event.eventType}:${event.entityId}`;
    const existing=await databases.listDocuments({databaseId,collectionId:"admin_notifications",queries:[Query.equal("dedupeKey",dedupeKey),Query.limit(1)]});
    if(existing.documents[0])return;
    await databases.createDocument({databaseId,collectionId:"admin_notifications",documentId:ID.unique(),permissions:[],data:{recipientUserId,eventType:event.eventType,priority:event.priority,title:event.title,body:event.body,entityType:event.entityType,entityId:event.entityId,href:event.href,dedupeKey,status:"unread",createdAt}});
  }));
}

export function publishAdminNotificationSafely(event:AdminNotificationEvent){
  return publishAdminNotification(event).catch(error=>console.error("Administrative notification publishing failed",error));
}
