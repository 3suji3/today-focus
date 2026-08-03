import { performance } from "node:perf_hooks";

const target = new URL(process.env.LOAD_TARGET ?? "http://127.0.0.1:4174");
if (!["127.0.0.1", "localhost"].includes(target.hostname)) {
  throw new Error("안전을 위해 부하 테스트는 localhost에서만 실행할 수 있습니다.");
}
const stages = (process.env.LOAD_STAGES ?? "100,300,500,1000")
  .split(",")
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0 && value <= 5000);
const path = process.env.LOAD_PATH ?? "/api/tasks";

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

async function runStage(concurrency) {
  const startedAt = performance.now();
  const results = await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
    const requestStartedAt = performance.now();
    try {
      const response = await fetch(new URL(path, target), {
        headers: { "oai-authenticated-user-email": `load-user-${index}@example.test` },
      });
      await response.arrayBuffer();
      return { ok: response.ok, milliseconds: performance.now() - requestStartedAt };
    } catch {
      return { ok: false, milliseconds: performance.now() - requestStartedAt };
    }
  }));
  const wallMilliseconds = performance.now() - startedAt;
  const durations = results.map((result) => result.milliseconds);
  return {
    concurrency,
    wallSeconds: Number((wallMilliseconds / 1000).toFixed(3)),
    requestsPerSecond: Number((concurrency / (wallMilliseconds / 1000)).toFixed(1)),
    p50Seconds: Number((percentile(durations, .5) / 1000).toFixed(3)),
    p95Seconds: Number((percentile(durations, .95) / 1000).toFixed(3)),
    p99Seconds: Number((percentile(durations, .99) / 1000).toFixed(3)),
    failures: results.filter((result) => !result.ok).length,
  };
}

console.log(`Target: ${new URL(path, target)}`);
const summary = [];
for (const concurrency of stages) {
  summary.push(await runStage(concurrency));
  console.table(summary.slice(-1));
}
console.log(JSON.stringify(summary, null, 2));
