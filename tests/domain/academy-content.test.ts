import assert from "node:assert/strict";
import test from "node:test";
import { findAcademyModule } from "../../src/modules/academy/domain/curriculum.ts";
import { findAcademyLessonContent } from "../../src/modules/academy/domain/lesson-content.ts";

test("all 40 Academy lessons have substantial learner content",()=>{
  for(let moduleNumber=1;moduleNumber<=10;moduleNumber+=1){
    const module=findAcademyModule(`m${String(moduleNumber).padStart(2,"0")}`);
    assert.ok(module);
    for(const lesson of module.lessons){
      const content=findAcademyLessonContent(lesson.id);
      assert.ok(content,`${lesson.id} is missing its reading`);
      assert.ok(content.objectives.length>=3);
      assert.ok(content.sections.length>=3);
      assert.ok(content.sections.reduce((total,section)=>total+section.paragraphs.join(" ").length,0)>900,`${lesson.id} is still only a summary`);
      assert.ok(content.keyTakeaways.length>=3);
      assert.ok(content.reflection.length>=2);
    }
  }
});
