/**
 * 將 197_2_1.csv 轉為 D1 可以直接匯入的純 CSV 格式
 * 輸出：udi_import.csv（欄位順序與 D1 表格對應）
 *
 * D1 import 指令（執行本腳本後再用這個）：
 * wrangler d1 execute udi_db --command="DELETE FROM udi_data" --remote
 * wrangler d1 import udi_db udi_import.csv --remote
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT_FILE  = path.join(__dirname, '..', '197_2_1.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'udi_import.csv');
const DI_LENGTH   = 14;

let lineNo    = 0;
let totalRows = 0;
let skipped   = 0;
let headers   = [];
let colLicense = -1, colIssuer = -1, colDI = -1, colNameCN = -1, colSpecial = -1;

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
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

// CSV 欄位值處理（含逗號或引號要加引號包覆）
function csvField(val) {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

async function main() {
  console.log('▶ 開始轉換:', INPUT_FILE);

  const outStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });

  // 寫 CSV 標頭（D1 import 需要）
  outStream.write('basic_di,product_name_cn,special_material_code,license_no\n');

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_FILE, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    lineNo++;
    const line = rawLine.replace(/\r$/, '');

    if (lineNo === 1) {
      headers    = parseCsvLine(line);
      colLicense = headers.findIndex(h => h.includes('許可證字號'));
      colIssuer  = headers.findIndex(h => h.includes('發碼機構'));
      colDI      = headers.findIndex(h => h.includes('基本DI') || h.includes('基本Di'));
      colNameCN  = headers.findIndex(h => h.includes('產品中文品名') || h.includes('中文品名'));
      colSpecial = headers.findIndex(h => h.includes('特材代碼'));
      console.log('📋 欄位對應確認：DI=%d, 品名=%d, 特材=%d, 許可=%d', colDI, colNameCN, colSpecial, colLicense);
      continue;
    }

    if (!line.trim()) continue;

    const fields = parseCsvLine(line);

    if (colIssuer >= 0 && (fields[colIssuer] || '').toUpperCase() !== 'GS1') {
      skipped++;
      continue;
    }

    const rawDI  = (fields[colDI]      || '').trim();
    const nameCN = (fields[colNameCN]  || '').trim();
    const special= (fields[colSpecial] || '').trim();
    const license= (fields[colLicense] || '').trim();

    if (!rawDI) continue;

    const di = rawDI.padStart(DI_LENGTH, '0');

    outStream.write(
      `${csvField(di)},${csvField(nameCN)},${csvField(special)},${csvField(license)}\n`
    );

    totalRows++;
    if (totalRows % 100000 === 0) console.log(`  ⏳ ${totalRows.toLocaleString()} 筆...`);
  }

  outStream.end();

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ 轉換完成！`);
  console.log(`   總資料：${totalRows.toLocaleString()} 筆`);
  console.log(`   略過非GS1：${skipped.toLocaleString()} 筆`);
  console.log(`   輸出：${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════');
  console.log('\n📌 接下來執行（在 UDI/web 資料夾）：');
  console.log('   wrangler d1 import udi_db ..\\udi_import.csv --remote');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
