import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_PROJECT_SECTIONS,academyProjectMarks } from "../../src/modules/academy/domain/project.ts";

test("capstone rubric totals exactly 100 marks",()=>{assert.equal(ACADEMY_PROJECT_SECTIONS.length,10);assert.equal(academyProjectMarks,100)});
