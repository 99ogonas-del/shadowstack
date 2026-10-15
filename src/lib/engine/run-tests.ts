import { runEngineTests } from "./self-test";
const r = runEngineTests();
console.log(`\n=== ${r.passed}/${r.total} tests passés en ${r.durationMs}ms ===`);
for (const t of r.results) {
  console.log(`${t.passed ? "✅" : "❌"} [${t.kind}] ${t.id} -> ${t.rule} :: ${t.detail}`);
}
process.exit(r.failed > 0 ? 1 : 0);
