import assert from "node:assert/strict";
import test from "node:test";
import { orderTodayTasks, recommendTasks, type RecommendationSettings } from "../lib/recommendation.ts";

const auto = (availableMinutes: number): RecommendationSettings => ({
  mode: "auto",
  availableMinutes,
  customTaskCount: 3,
  preferredName: "",
  strategy: "balanced",
  preferredCategory: "",
});

test("quick strategy puts shorter tasks first", () => {
  const tasks = [{ minutes: 60, category: "공부" }, { minutes: 10, category: "일상" }, { minutes: 30, category: "취업" }];
  assert.equal(recommendTasks(tasks, { ...auto(30), strategy: "quick" })[0], tasks[1]);
});

test("focus strategy prioritizes the preferred category", () => {
  const tasks = [{ minutes: 20, category: "일상" }, { minutes: 20, category: "취업" }];
  assert.equal(recommendTasks(tasks, { ...auto(20), strategy: "focus", preferredCategory: "취업" })[0], tasks[1]);
});

test("recommend again rotates to a different candidate", () => {
  const tasks = [{ minutes: 20 }, { minutes: 20 }, { minutes: 20 }];
  assert.notEqual(recommendTasks(tasks, auto(20), 0)[0], recommendTasks(tasks, auto(20), 1)[0]);
});

test("low energy favors shorter work and high energy favors deeper work", () => {
  const tasks = [{ minutes: 60 }, { minutes: 10 }, { minutes: 30 }];
  assert.equal(recommendTasks(tasks, auto(120), 0, "낮음")[0], tasks[1]);
  assert.equal(recommendTasks(tasks, auto(120), 0, "높음")[0], tasks[0]);
});

test("recommends three 30-minute tasks for a 90-minute window", () => {
  const tasks = [{ minutes: 30 }, { minutes: 30 }, { minutes: 30 }, { minutes: 30 }];
  assert.equal(recommendTasks(tasks, auto(90)).length, 3);
});

test("recommends two 60-minute tasks for a 120-minute window", () => {
  const tasks = [{ minutes: 60 }, { minutes: 60 }, { minutes: 60 }];
  assert.equal(recommendTasks(tasks, auto(120)).length, 2);
});

test("fills remaining time with a smaller later task", () => {
  const tasks = [{ minutes: 40 }, { minutes: 25 }, { minutes: 20 }];
  assert.deepEqual(recommendTasks(tasks, auto(60)), [tasks[0], tasks[2]]);
});

test("honors a user-selected task count", () => {
  const tasks = [{ minutes: 90 }, { minutes: 90 }, { minutes: 90 }];
  assert.equal(recommendTasks(tasks, { ...auto(30), mode: "custom", customTaskCount: 2 }).length, 2);
});

test("completed tasks are excluded from recommendations and moved to the end", () => {
  const tasks = [
    { id: "done", done: true, minutes: 20, category: "공부" },
    { id: "job", done: false, minutes: 40, category: "취업" },
    { id: "study", done: false, minutes: 20, category: "공부" },
  ];
  const plan = orderTodayTasks(tasks, auto(90));
  assert.deepEqual(plan.recommended.map((task) => task.id), ["job", "study"]);
  assert.deepEqual(plan.ordered.map((task) => task.id), ["job", "study", "done"]);
});

test("recommend again only changes pending order and keeps completion last", () => {
  const tasks = [
    { id: "first", done: false, minutes: 20 },
    { id: "done", done: true, minutes: 20 },
    { id: "second", done: false, minutes: 20 },
  ];
  assert.deepEqual(orderTodayTasks(tasks, auto(40), 1).ordered.map((task) => task.id), ["second", "first", "done"]);
});
