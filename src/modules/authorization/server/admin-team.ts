import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteAuthClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { isAdminRole, selectAdminRoles, type AdminRole } from "@/src/modules/authorization/domain/admin-roles";

const databaseId=()=>env().APPWRITE_DATABASE_ID;export const listAdminMembers=()=>createAppwriteDatabaseClient().databases.listDocuments({databaseId:databaseId(),collectionId:"admin_members",queries:[Query.orderDesc("assignedAt"),Query.limit(200)]});
export async function assignAdminRoles(email:string,requestedRoles:readonly AdminRole[],actorUserId:string){
  const roles=selectAdminRoles(requestedRoles);
  if(!roles.length)throw new Error("Select at least one valid role");
  const normalized=email.trim().toLowerCase(),users=createAppwriteAuthClient().users;
  const result=await users.list({queries:[Query.equal("email",normalized),Query.limit(1)]}),user=result.users[0];
  if(!user)throw new Error("The user must register first");
  if(user.labels.includes("superadmin"))throw new Error("Super Administrator privileges are managed separately");
  await users.updateLabels({userId:user.$id,labels:Array.from(new Set([...user.labels,...roles]))});
  const db=createAppwriteDatabaseClient().databases,assignedAt=new Date().toISOString();
  for(const role of roles){
    const existing=await db.listDocuments({databaseId:databaseId(),collectionId:"admin_members",queries:[Query.equal("userId",user.$id),Query.equal("role",role),Query.limit(1)]});
    const data={userId:user.$id,email:normalized,role,status:"active",assignedBy:actorUserId,assignedAt,revokedAt:null};
    if(existing.documents[0])await db.updateDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:existing.documents[0].$id,data});
    else await db.createDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:ID.unique(),permissions:[],data});
  }
  await db.createDocument({databaseId:databaseId(),collectionId:"audit_logs",documentId:ID.unique(),permissions:[],data:{actorUserId,action:"admin_roles.assign",entityType:"user",entityId:user.$id,metadata:JSON.stringify({email:normalized,roles}),occurredAt:assignedAt}});
}
export async function assignAdminRole(email:string,role:AdminRole,actorUserId:string){return assignAdminRoles(email,[role],actorUserId)}
export async function revokeAdminRole(memberId:string,actorUserId:string){const db=createAppwriteDatabaseClient().databases,member=await db.getDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:memberId});if(member.status!=="active"||!isAdminRole(String(member.role)))throw new Error("Role is not active");const users=createAppwriteAuthClient().users,user=await users.get({userId:String(member.userId)}),labels=user.labels.filter(label=>label!==member.role);await users.updateLabels({userId:user.$id,labels});await db.updateDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:memberId,data:{status:"revoked",revokedAt:new Date().toISOString()}});await db.createDocument({databaseId:databaseId(),collectionId:"audit_logs",documentId:ID.unique(),permissions:[],data:{actorUserId,action:"admin_role.revoke",entityType:"user",entityId:user.$id,metadata:JSON.stringify({role:member.role}),occurredAt:new Date().toISOString()}})}
