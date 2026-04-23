# UDI 資料批次匯入 Cloudflare D1 腳本
# 使用方式：在 PowerShell 執行 .\scripts\import_to_d1.ps1
#
# 前置需求：
# 1. 已在 Cloudflare 登入（wrangler login）
# 2. 已在 D1 Console 執行 0000_schema.sql 建立資料表

# ── 設定（請依照您的環境修改）──────────────────────
$DATABASE_NAME = "udi-db"          # 您的 D1 資料庫名稱
$SQL_DIR       = ".\sql_batches"   # SQL 批次檔資料夾
$START_BATCH   = 1                 # 從第幾批開始（斷點續傳用）
# ────────────────────────────────────────────────────

$files = Get-ChildItem -Path $SQL_DIR -Filter "udi_batch_*.sql" | Sort-Object Name
$total = $files.Count
$i     = 0

Write-Host "▶ 共找到 $total 個批次檔，開始匯入至 D1（$DATABASE_NAME）..." -ForegroundColor Cyan
Write-Host "   （若中途失敗，修改 START_BATCH 從斷點繼續）" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $i++

    # 斷點續傳
    if ($i -lt $START_BATCH) {
        continue
    }

    $pct = [math]::Round(($i / $total) * 100, 1)
    Write-Host "  [$i/$total | $pct%] 匯入 $($file.Name) ..." -NoNewline

    # 執行 wrangler d1 execute
    $result = & wrangler d1 execute $DATABASE_NAME --file="$($file.FullName)" --remote 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host " ❌ 失敗！" -ForegroundColor Red
        Write-Host "   錯誤訊息：$result" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  批次 $i 失敗。請修改 START_BATCH = $i 後重新執行。" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host " ✅" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ 全部 $total 批次匯入完成！" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
