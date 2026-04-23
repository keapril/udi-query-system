/**
 * 批次匯入 SQL 至 Cloudflare D1
 * 使用方式：node scripts/import_to_d1.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── 設定 ──────────────────────────────────────────────
const DATABASE_NAME = 'udi_db';
const SQL_DIR       = path.join(__dirname, '..', 'sql_batches');
const START_BATCH   = 1;   // 斷點續傳：從第幾個批次開始
// ──────────────────────────────────────────────────────

const files = fs
  .readdirSync(SQL_DIR)
  .filter(f => f.startsWith('udi_batch_') && f.endsWith('.sql'))
  .sort();

const total = files.length;
console.log(`▶ 共找到 ${total} 個批次檔，開始匯入至 D1 (${DATABASE_NAME})...`);
console.log('  （若中途失敗，修改 START_BATCH 再重新執行）\n');

for (let i = 0; i < files.length; i++) {
  const batchNo = i + 1;

  // 斷點續傳
  if (batchNo < START_BATCH) continue;

  const filePath = path.join(SQL_DIR, files[i]);
  const pct = ((batchNo / total) * 100).toFixed(1);

  process.stdout.write(`  [${batchNo}/${total} | ${pct}%] ${files[i]} ... `);

  try {
    execSync(
      `wrangler d1 execute ${DATABASE_NAME} --file="${filePath}" --remote`,
      {
        cwd: path.join(__dirname, '..', 'web'),
        stdio: 'pipe',
        timeout: 120000, // 2 分鐘 timeout
      }
    );
    process.stdout.write('✅\n');
  } catch (err) {
    process.stdout.write('❌\n');
    console.error(`\n錯誤訊息：${err.stderr ? err.stderr.toString() : err.message}`);
    console.error(`\n⚠️  批次 ${batchNo} 失敗，請修改 START_BATCH = ${batchNo} 後重新執行。`);
    process.exit(1);
  }
}

console.log('\n═══════════════════════════════════════');
console.log(`✅ 全部 ${total} 批次匯入完成！`);
console.log('═══════════════════════════════════════');
