/**
 * 並行批次匯入 SQL 至 Cloudflare D1
 * 使用方式：node scripts/import_parallel.js
 *
 * 並行度設 3 以避免踩到 D1 API 限制
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── 設定 ──────────────────────────────────────────────
const DATABASE_NAME  = 'udi_db';
const SQL_DIR        = path.join(__dirname, '..', 'sql_batches');
const START_BATCH    = 841;   // 斷點續傳：從第幾批開始
const CONCURRENCY    = 1;     // 並行數（D1 較保守用 1，穩定後可試 2）
// ──────────────────────────────────────────────────────

const WEB_DIR = path.join(__dirname, '..', 'web');

const files = fs
  .readdirSync(SQL_DIR)
  .filter(f => f.startsWith('udi_batch_') && f.endsWith('.sql'))
  .sort();

const total = files.length;
let done    = 0;
let failed  = false;

console.log(`▶ 共 ${total} 個批次，並行度 ${CONCURRENCY}，從第 ${START_BATCH} 批開始\n`);

function runBatch(index) {
  if (failed) return Promise.resolve();
  const batchNo  = index + 1;
  const filePath = path.join(SQL_DIR, files[index]);
  const pct      = ((batchNo / total) * 100).toFixed(1);

  return new Promise(resolve => {
    try {
      execSync(
        `wrangler d1 execute ${DATABASE_NAME} --file="${filePath}" --remote`,
        { cwd: WEB_DIR, stdio: 'pipe', timeout: 180000 }
      );
      done++;
      process.stdout.write(`  ✅ [${batchNo}/${total} | ${pct}%] ${files[index]}\n`);
    } catch (err) {
      failed = true;
      const msg = err.stderr ? err.stderr.toString().split('\n').slice(0, 5).join('\n') : err.message;
      console.error(`\n❌ 批次 ${batchNo} 失敗：\n${msg}`);
      console.error(`\n⚠️  請修改 START_BATCH = ${batchNo} 後重新執行`);
    }
    resolve();
  });
}

async function main() {
  // 篩掉已跳過的批次
  const pending = files
    .map((f, i) => i)
    .filter(i => i + 1 >= START_BATCH);

  // 用 pool 控制並行
  const pool = [];
  for (const index of pending) {
    if (failed) break;

    const task = runBatch(index);
    pool.push(task);

    if (pool.length >= CONCURRENCY) {
      await Promise.all(pool);
      pool.length = 0;
    }
  }

  if (pool.length > 0) await Promise.all(pool);

  if (!failed) {
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ 全部 ${done} 批次匯入完成！`);
    console.log('═══════════════════════════════════════');
  }
}

main().catch(e => { console.error('❌', e); process.exit(1); });
