import "server-only";
import { ID, Query } from "node-appwrite";
import { createAppwriteAuthClient, createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { adminRoleLabel, isAdminRole, selectAdminRoles, type AdminRole } from "@/src/modules/authorization/domain/admin-roles";

const databaseId = () => env().APPWRITE_DATABASE_ID;

export function listAdminMembers() {
  return createAppwriteDatabaseClient().databases.listDocuments({
    databaseId: databaseId(), collectionId: "admin_members",
    queries: [Query.orderDesc("assignedAt"), Query.limit(200)]
  });
}

export async function listRegisteredUsersForAdminSelection() {
  const users = createAppwriteAuthClient().users, registered: Array<{ id:string;email:string;name:string;status:boolean;verified:boolean;protected:boolean }> = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const page = await users.list({ queries: [Query.limit(500), Query.offset(offset)] });
    registered.push(...page.users.map(user => ({ id:user.$id,email:user.email,name:user.name,status:user.status,verified:user.emailVerification,protected:user.labels.includes("superadmin") })));
    if (registered.length >= page.total || page.users.length < 500) break;
  }
  return registered.filter(user => user.email).sort((left,right) => left.email.localeCompare(right.email));
}

export async function assignAdminRoles(email: string, requestedRoles: readonly AdminRole[], actorUserId: string) {
  const roles = selectAdminRoles(requestedRoles);
  if (!roles.length) throw new Error("Select at least one valid role");
  const normalizedEmail = email.trim().toLowerCase();
  const users = createAppwriteAuthClient().users;
  const result = await users.list({ queries: [Query.equal("email", normalizedEmail), Query.limit(1)] });
  const user = result.users[0];
  if (!user) throw new Error("The user must register first");
  if (user.labels.includes("superadmin")) throw new Error("Super Administrator privileges are managed separately");
  await users.updateLabels({ userId: user.$id, labels: Array.from(new Set([...user.labels, ...roles.map(adminRoleLabel)])) });

  const databases = createAppwriteDatabaseClient().databases;
  const assignedAt = new Date().toISOString();
  for (const role of roles) {
    const existing = await databases.listDocuments({
      databaseId: databaseId(), collectionId: "admin_members",
      queries: [Query.equal("userId", user.$id), Query.equal("role", role), Query.limit(1)]
    });
    const data = { userId: user.$id, email: normalizedEmail, role, status: "active", assignedBy: actorUserId, assignedAt };
    const member = existing.documents[0];
    if (member) await databases.updateDocument({ databaseId: databaseId(), collectionId: "admin_members", documentId: member.$id, data });
    else await databases.createDocument({ databaseId: databaseId(), collectionId: "admin_members", documentId: ID.unique(), permissions: [], data });
  }

  await databases.createDocument({
    databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [],
    data: { actorUserId, action: "admin_role.assign", entityType: "user", entityId: user.$id, metadata: JSON.stringify({ email: normalizedEmail, roles }), occurredAt: assignedAt }
  }).catch(error => console.error("Admin role audit write failed after successful assignment", error));
}

export async function assignAdminRolesToUser(userId:string, requestedRoles:readonly AdminRole[], actorUserId:string) {
  const roles=selectAdminRoles(requestedRoles);if(!roles.length)throw new Error("Select at least one valid role");
  const users=createAppwriteAuthClient().users,user=await users.get({userId});
  if(user.labels.includes("superadmin"))throw new Error("Super Administrator privileges are managed separately");
  if(!user.status)throw new Error("Disabled accounts cannot receive privileges");
  await users.updateLabels({userId:user.$id,labels:Array.from(new Set([...user.labels,...roles.map(adminRoleLabel)]))});
  const databases=createAppwriteDatabaseClient().databases,assignedAt=new Date().toISOString(),normalizedEmail=user.email.trim().toLowerCase();
  for(const role of roles){const existing=await databases.listDocuments({databaseId:databaseId(),collectionId:"admin_members",queries:[Query.equal("userId",user.$id),Query.equal("role",role),Query.limit(1)]}),data={userId:user.$id,email:normalizedEmail,role,status:"active",assignedBy:actorUserId,assignedAt},member=existing.documents[0];if(member)await databases.updateDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:member.$id,data});else await databases.createDocument({databaseId:databaseId(),collectionId:"admin_members",documentId:ID.unique(),permissions:[],data})}
  await databases.createDocument({databaseId:databaseId(),collectionId:"audit_logs",documentId:ID.unique(),permissions:[],data:{actorUserId,action:"admin_role.assign",entityType:"user",entityId:user.$id,metadata:JSON.stringify({email:normalizedEmail,roles,selection:"registered_user_directory"}),occurredAt:assignedAt}}).catch(error=>console.error("Admin role audit write failed after successful assignment",error));
}

export async function revokeAdminRole(memberId: string, actorUserId: string) {
  const databases = createAppwriteDatabaseClient().databases;
  const member = await databases.getDocument({ databaseId: databaseId(), collectionId: "admin_members", documentId: memberId });
  if (member.status !== "active" || !isAdminRole(String(member.role))) throw new Error("Role is not active");
  const users = createAppwriteAuthClient().users;
  const user = await users.get({ userId: String(member.userId) });
  const role = String(member.role) as AdminRole;
  await users.updateLabels({ userId: user.$id, labels: user.labels.filter(label => label !== role && label !== adminRoleLabel(role)) });
  const revokedAt = new Date().toISOString();
  await databases.updateDocument({ databaseId: databaseId(), collectionId: "admin_members", documentId: memberId, data: { status: "revoked", revokedAt } });
  await databases.createDocument({
    databaseId: databaseId(), collectionId: "audit_logs", documentId: ID.unique(), permissions: [],
    data: { actorUserId, action: "admin_role.revoke", entityType: "user", entityId: user.$id, metadata: JSON.stringify({ role: member.role }), occurredAt: revokedAt }
  });
}
