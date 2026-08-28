"use client";
import { useEffect,useState } from "react";

type Question={id:string;prompt:string;options:{id:string;text:string}[];marks:number};
export function AssessmentForm({moduleId,attemptId,expiresAt,questions}:{moduleId:string;attemptId:string;expiresAt:string;questions:Question[]}){
  const [seconds,setSeconds]=useState(()=>Math.max(0,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000)));
  useEffect(()=>{const timer=setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);return()=>clearInterval(timer)},[]);
  const minutes=Math.floor(seconds/60),remainder=seconds%60;
  return <form className="academy-exam" action="/api/academy/assessments/submit" method="post"><input type="hidden" name="moduleId" value={moduleId}/><input type="hidden" name="attemptId" value={attemptId}/><header><div><span>TIME REMAINING</span><strong>{minutes}:{String(remainder).padStart(2,"0")}</strong></div><p>Choose one answer for every question. Your answers are marked only on the server after submission.</p></header>{questions.map((question,index)=><fieldset key={question.id}><legend><span>{index+1}</span>{question.prompt}</legend>{question.options.map(option=><label key={option.id}><input required type="radio" name={`answer:${question.id}`} value={option.id}/><b>{option.id}</b><span>{option.text}</span></label>)}</fieldset>)}<button disabled={seconds===0}>{seconds===0?"Time expired":"Submit assessment for marking"}</button></form>
}
