import "server-only";
import { ID,Query } from "node-appwrite";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
import { ACADEMY_COURSE,findAcademyModule } from "@/src/modules/academy/domain/curriculum";
import { getAcademyDashboard,getAcademyEnrollment } from "./repository";

const db=()=>createAppwriteDatabaseClient().databases;
const databaseId=()=>env().APPWRITE_DATABASE_ID;
const assessmentId=(moduleId:string)=>`assessment-${moduleId}`;

export async function getModuleAssessment(userId:string,moduleId:string){
  const module=findAcademyModule(moduleId);if(!module)return null;
  const dashboard=await getAcademyDashboard(userId),enrollment=dashboard.enrollment;
  if(!enrollment)return null;
  const lessonsComplete=module.lessons.every(lesson=>dashboard.completedLessonIds.has(lesson.id));
  const attempts=await db().listDocuments({databaseId:databaseId(),collectionId:"academy_attempts",queries:[Query.equal("userId",userId),Query.equal("assessmentId",assessmentId(moduleId)),Query.orderDesc("attemptNumber"),Query.limit(10)]});
  const latest=attempts.documents[0]??null,best=attempts.documents.filter(item=>item.status==="graded").reduce<number>((score,item)=>Math.max(score,Number(item.scorePercent??0)),0);
  return{module,enrollment,lessonsComplete,attempts:attempts.documents,latest,bestScore:best,passed:best>=ACADEMY_COURSE.passMark,attemptsRemaining:Math.max(0,3-attempts.total)};
}

export async function startModuleAssessment(userId:string,moduleId:string){
  const state=await getModuleAssessment(userId,moduleId);if(!state||!state.lessonsComplete)throw new Error("Lessons incomplete");if(state.passed)throw new Error("Assessment already passed");if(state.attemptsRemaining<1)throw new Error("Attempt limit reached");
  const open=state.attempts.find(item=>item.status==="in_progress");if(open&&new Date(String(open.expiresAt)).getTime()>Date.now())return open;if(open)await db().updateDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:open.$id,data:{status:"expired"}});
  const now=new Date(),expires=new Date(now.getTime()+30*60*1000);
  return db().createDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:ID.unique(),permissions:[],data:{assessmentId:assessmentId(moduleId),enrollmentId:state.enrollment.$id,userId,attemptNumber:state.attempts.length+1,status:"in_progress",startedAt:now.toISOString(),expiresAt:expires.toISOString()}});
}

export async function getSafeAttempt(userId:string,moduleId:string){
  const state=await getModuleAssessment(userId,moduleId),attempt=state?.latest;if(!state||!attempt||attempt.status!=="in_progress")return{state,attempt:null,questions:[]};
  if(new Date(String(attempt.expiresAt)).getTime()<=Date.now()){await db().updateDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:attempt.$id,data:{status:"expired"}});return{state:{...state,latest:{...attempt,status:"expired"}},attempt:null,questions:[]}}
  const questions=await db().listDocuments({databaseId:databaseId(),collectionId:"academy_questions",queries:[Query.equal("assessmentId",assessmentId(moduleId)),Query.equal("status","published"),Query.limit(100)]});
  return{state,attempt,questions:questions.documents.sort((a,b)=>String(a.$id).localeCompare(String(b.$id))).map(item=>({id:item.$id,prompt:String(item.prompt),options:JSON.parse(String(item.options)) as {id:string;text:string}[],marks:Number(item.marks)}))};
}

export async function submitModuleAssessment(userId:string,moduleId:string,attemptId:string,answers:ReadonlyMap<string,string>){
  const enrollment=await getAcademyEnrollment(userId);if(!enrollment)throw new Error("Enrollment required");
  const attempt=await db().getDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:attemptId});if(attempt.userId!==userId||attempt.enrollmentId!==enrollment.$id||attempt.assessmentId!==assessmentId(moduleId)||attempt.status!=="in_progress")throw new Error("Invalid attempt");
  if(new Date(String(attempt.expiresAt)).getTime()<Date.now()){await db().updateDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:attemptId,data:{status:"expired"}});throw new Error("Attempt expired")}
  const rows=await db().listDocuments({databaseId:databaseId(),collectionId:"academy_questions",queries:[Query.equal("assessmentId",assessmentId(moduleId)),Query.equal("status","published"),Query.limit(100)]});if(!rows.total)throw new Error("Question bank empty");
  let earned=0,available=0;for(const question of rows.documents){const response=answers.get(question.$id)?.toUpperCase()??"",marks=Number(question.marks),correct=response===String(question.answerKey).toUpperCase();available+=marks;if(correct)earned+=marks;await db().createDocument({databaseId:databaseId(),collectionId:"academy_responses",documentId:ID.unique(),permissions:[],data:{attemptId,questionId:question.$id,response,status:correct?"correct":"incorrect",awardedMarks:correct?marks:0}})}
  const score=Math.round(earned/available*100),now=new Date().toISOString();await db().updateDocument({databaseId:databaseId(),collectionId:"academy_attempts",documentId:attemptId,data:{status:"graded",scorePercent:score,earnedMarks:earned,availableMarks:available,submittedAt:now,gradedAt:now,gradedBy:"system"}});
  return{score,earned,available,passed:score>=ACADEMY_COURSE.passMark};
}

export async function listAssessmentResults(userId:string){const enrollment=await getAcademyEnrollment(userId);if(!enrollment)return[];const rows=await db().listDocuments({databaseId:databaseId(),collectionId:"academy_attempts",queries:[Query.equal("enrollmentId",enrollment.$id),Query.equal("status","graded"),Query.limit(100)]});return rows.documents}
