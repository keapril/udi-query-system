/**
 * UDI 資料前置處理腳本
 * 輸入：197_2_1.csv（食藥署 UDI 資料，GS1 版本）
 * 輸出：udi_data_batch_*.sql（每批 5000 筆，可直接匯入 Cloudflare D1）
 *
 * 欄位規則：
 * - 只取：許可證字號、基本DI、產品中文品名、特材代碼
 * - 只保留發碼機構為 GS1 的資料（若 CSV 已過濾則全部保留）
 * - 基本DI 不足 14 碼者，前面補 0
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── 設定 ──────────────────────────────────────────────
const INPUT_FILE  = path.join(__dirname, '..', '197_2_1.csv');
const OUTPUT_DIR  = path.join(__dirname, '..', 'sql_batches');
const BATCH_SIZE  = 500;    // 每個 SQL 檔案的 INSERT 筆數（D1 有長度限制）
const DI_LENGTH   = 14;     // GS1 基本 DI 標準長度
// ──────────────────────────────────────────────────────

// 確保輸出資料夾存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 超簡易 CSV 行解析（支援引號內含逗號）
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        // 跳脫的雙引號 "" → "
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * 將字串值轉為 SQL 安全字串（單引號跳脫）
 */
function sqlStr(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * 主程式
 */
async function main() {
  console.log('▶ 開始讀取:', INPUT_FILE);

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_FILE, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNo     = 0;
  let headers    = [];
  let batchIndex = 0;
  let rows       = [];
  let totalRows  = 0;
  let skipped    = 0;

  // 欄位索引（讀第一行 header 後決定）
  let colLicense  = -1; // 許可證字號（類型）
  let colIssuer   = -1; // UDI發碼機構
  let colDI       = -1; // 基本DI
  let colNameCN   = -1; // 產品中文品名
  let colSpecial  = -1; // 特材代碼

  /**
   * 將目前 rows 批次寫出為 SQL 檔
   */
  function flushBatch() {
    if (rows.length === 0) return;

    batchIndex++;
    const filename = path.join(OUTPUT_DIR, `udi_batch_${String(batchIndex).padStart(4, '0')}.sql`);

    // 建立 INSERT 語句
    const insertLines = rows.map(r =>
      `  (${sqlStr(r.di)}, ${sqlStr(r.nameCN)}, ${sqlStr(r.special)}, ${sqlStr(r.license)})`
    );

    const sql = [
      `-- 批次 ${batchIndex}，共 ${rows.length} 筆`,
      `INSERT OR IGNORE INTO udi_data (basic_di, product_name_cn, special_material_code, license_no) VALUES`,
      insertLines.join(',\n') + ';',
      '',
    ].join('\n');

    fs.writeFileSync(filename, sql, 'utf8');
    console.log(`  ✅ 寫出 ${filename}（${rows.length} 筆）`);
    rows = [];
  }

  for await (const rawLine of rl) {
    lineNo++;
    const line = rawLine.replace(/\r$/, ''); // 移除 Windows 換行

    if (lineNo === 1) {
      // 解析 Header
      headers = parseCsvLine(line);
      colLicense = headers.findIndex(h => h.includes('許可證字號'));
      colIssuer  = headers.findIndex(h => h.includes('UDI發碼機構') || h.includes('發碼機構'));
      colDI      = headers.findIndex(h => h.includes('基本DI') || h.includes('基本Di') || h.includes('基本di'));
      colNameCN  = headers.findIndex(h => h.includes('產品中文品名') || h.includes('中文品名'));
      colSpecial = headers.findIndex(h => h.includes('特材代碼'));

      console.log('📋 欄位對應：');
      console.log('   許可證字號 =', colLicense, '(', headers[colLicense], ')');
      console.log('   發碼機構   =', colIssuer,  '(', headers[colIssuer],  ')');
      console.log('   基本DI     =', colDI,      '(', headers[colDI],      ')');
      console.log('   中文品名   =', colNameCN,  '(', headers[colNameCN],  ')');
      console.log('   特材代碼   =', colSpecial, '(', headers[colSpecial], ')');

      if (colDI === -1 || colLicense === -1) {
        console.error('❌ 找不到關鍵欄位！請確認 CSV 格式。Headers:', headers);
        process.exit(1);
      }
      continue;
    }

    if (!line.trim()) continue; // 略過空行

    const fields = parseCsvLine(line);

    // 篩選：只要 GS1（若欄位存在）
    if (colIssuer >= 0) {
      const issuer = fields[colIssuer] || '';
      if (issuer.toUpperCase() !== 'GS1') {
        skipped++;
        continue;
      }
    }

    // 取出四個欄位
    const rawDI      = (fields[colDI]      || '').trim();
    const nameCN     = (fields[colNameCN]  || '').trim();
    const special    = (fields[colSpecial] || '').trim();
    const license    = (fields[colLicense] || '').trim();

    if (!rawDI) continue; // 無 DI 值略過

    // 基本DI 補前置零至 14 碼
    const di = rawDI.padStart(DI_LENGTH, '0');

    rows.push({ di, nameCN, special, license });
    totalRows++;

    // 達到批次大小就寫出
    if (rows.length >= BATCH_SIZE) {
      flushBatch();
    }

    // 每 50000 筆顯示進度
    if (totalRows % 50000 === 0) {
      console.log(`  ⏳ 已處理 ${totalRows.toLocaleString()} 筆...`);
    }
  }

  // 寫出最後一批
  flushBatch();

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ 完成！`);
  console.log(`   總計匯入：${totalRows.toLocaleString()} 筆`);
  console.log(`   略過非GS1：${skipped.toLocaleString()} 筆`);
  console.log(`   產生 SQL 檔：${batchIndex} 個`);
  console.log(`   輸出資料夾：${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════');

  // ── 同時產生建表 SQL ──────────────────────────────
  const schemaSql = `-- UDI 資料表 Schema（若尚未建立請先執行此檔）
-- 請在 Cloudflare D1 的 Console 執行

CREATE TABLE IF NOT EXISTS udi_data (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  basic_di             TEXT    NOT NULL,          -- 基本DI（已補零至14碼）
  product_name_cn      TEXT,                      -- 產品中文品名
  special_material_code TEXT,                     -- 特材代碼
  license_no           TEXT,                      -- 許可證字號
  created_at           TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 建立查詢索引（加速 basic_di 搜尋）
CREATE INDEX IF NOT EXISTS idx_basic_di     ON udi_data (basic_di);
CREATE INDEX IF NOT EXISTS idx_license_no   ON udi_data (license_no);
CREATE INDEX IF NOT EXISTS idx_product_name ON udi_data (product_name_cn);
`;
  const schemaPath = path.join(OUTPUT_DIR, '0000_schema.sql');
  fs.writeFileSync(schemaPath, schemaSql, 'utf8');
  console.log(`   🗂️  Schema SQL：${schemaPath}`);
}

main().catch(err => {
  console.error('❌ 執行錯誤：', err);
  process.exit(1);
});
