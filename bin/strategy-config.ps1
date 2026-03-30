# 智能策略平台 - 配置工具 (Windows PowerShell)
# 用于配置公司内部 Minimax API Key

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

# 路径定义
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "packages\backend"
$EnvFile = Join-Path $BackendDir ".env"

function Show-Header {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║       智能策略平台 - 公司大模型配置工具                     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Write-Host ""
    Write-Color "请选择操作：" Cyan
    Write-Host ""
    Write-Host "  1) 配置公司 Minimax API Key"
    Write-Host "  2) 查看当前配置"
    Write-Host "  3) 测试 AI 连接"
    Write-Host "  4) 切换 AI 提供商"
    Write-Host "  5) 退出"
    Write-Host ""
}

function Configure-Minimax {
    Write-Host ""
    Write-Color "━━━ 配置公司 Minimax API Key ━━━" Cyan
    Write-Host ""
    
    # 获取网关地址
    Write-Color "步骤 1/3: 配置网关地址" Yellow
    $gateway = Read-Host "请输入网关地址 (默认: http://10.4.16.154:5029/v1)"
    if ([string]::IsNullOrWhiteSpace($gateway)) {
        $gateway = "http://10.4.16.154:5029/v1"
    }
    
    # 获取 API Key
    Write-Host ""
    Write-Color "步骤 2/3: 配置 API Key" Yellow
    Write-Host "请从公司网关获取 API Key"
    Write-Host "网关地址: https://gateway.xrtan.cn:5029"
    Write-Host ""
    $apiKey = Read-Host "请输入 API Key" -AsSecureString
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))
    
    if ([string]::IsNullOrWhiteSpace($plainKey)) {
        Write-Color "错误：API Key 不能为空" Red
        return
    }
    
    # 确认配置
    Write-Host ""
    Write-Color "步骤 3/3: 确认配置" Yellow
    Write-Host ""
    Write-Color "网关地址: $gateway" Green
    Write-Color "API Key:  $($plainKey.Substring(0, [Math]::Min(10, $plainKey.Length)))..." Green
    Write-Color "模型:     MiniMax-M2.5 (星探·源曦)" Green
    Write-Host ""
    $confirm = Read-Host "确认保存配置? (y/n)"
    
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        # 备份旧配置
        if (Test-Path $EnvFile) {
            $backup = "$EnvFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Copy-Item $EnvFile $backup
        }
        
        # 写入配置
        $config = @"
# ============================================
# 智能策略平台 - 后端配置
# ============================================

PORT=3001

# ============================================
# AI模型配置 - 公司内网 Minimax (星探·源曦)
# ============================================
AI_PROVIDER=minimax

# 公司内网模型配置
MINIMAX_API_KEY=$plainKey
MINIMAX_BASE_URL=$gateway
MINIMAX_MODEL=MiniMax-M2.5

# ============================================
# 公司云端数据API配置（可选）
# ============================================
AUDIENCE_API_URL=
AUDIENCE_API_KEY=

# ============================================
# CORS 配置
# ============================================
CORS_ORIGIN=http://localhost:5173
"@
        
        $config | Out-File -FilePath $EnvFile -Encoding UTF8
        
        Write-Host ""
        Write-Color "✓ 配置已保存到 $EnvFile" Green
        Write-Color "请重启后端服务使配置生效:" Yellow
        Write-Host "  cd packages/backend && npm start"
    } else {
        Write-Color "配置已取消" Yellow
    }
}

function Show-Config {
    Write-Host ""
    Write-Color "━━━ 当前配置 ━━━" Cyan
    Write-Host ""
    
    if (-not (Test-Path $EnvFile)) {
        Write-Color "配置文件不存在，请先配置" Yellow
        return
    }
    
    Write-Color "配置文件: $EnvFile" Green
    Write-Host ""
    
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^(AI_PROVIDER|MINIMAX_BASE_URL|MINIMAX_MODEL|MINIMAX_API_KEY)=(.+)$") {
            $key = $Matches[1]
            $value = $Matches[2]
            if ($key -eq "MINIMAX_API_KEY" -and $value) {
                $value = $value.Substring(0, [Math]::Min(15, $value.Length)) + "..."
            }
            Write-Color "$($key.PadRight(20)): $value" Green
        }
    }
}

function Test-Connection {
    Write-Host ""
    Write-Color "━━━ 测试 AI 连接 ━━━" Cyan
    Write-Host ""
    
    if (-not (Test-Path $EnvFile)) {
        Write-Color "错误：配置文件不存在" Red
        return
    }
    
    # 读取配置
    $content = Get-Content $EnvFile -Raw
    $apiKey = [regex]::Match($content, "MINIMAX_API_KEY=(.+)?\r?\n").Groups[1].Value.Trim()
    $baseUrl = [regex]::Match($content, "MINIMAX_BASE_URL=(.+)?\r?\n").Groups[1].Value.Trim()
    $model = [regex]::Match($content, "MINIMAX_MODEL=(.+)?\r?\n").Groups[1].Value.Trim()
    
    if (-not $apiKey -or -not $baseUrl) {
        Write-Color "错误：API Key 或网关地址未配置" Red
        return
    }
    
    Write-Color "正在连接: $baseUrl" Cyan
    Write-Host ""
    
    try {
        $body = @{
            model = $model
            messages = @(@{role = "user"; content = "你好"})
            max_tokens = 20
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/chat/completions" -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer $apiKey"
            } -Body $body -TimeoutSec 10
        
        Write-Color "✓ 连接成功！" Green
        Write-Host ""
        Write-Host "响应预览:"
        $response.choices[0].message.content
    } catch {
        Write-Color "✗ 连接失败" Red
        Write-Host ""
        Write-Color "错误信息: $_" Red
    }
}

# 主循环
Show-Header

while ($true) {
    Show-Menu
    $choice = Read-Host "请输入选项 (1-5)"
    
    switch ($choice) {
        "1" { Configure-Minimax }
        "2" { Show-Config }
        "3" { Test-Connection }
        "4" { Write-Color "功能开发中..." Yellow }
        "5" { 
            Write-Host ""
            Write-Color "再见！" Green
            exit 0
        }
        default { Write-Color "无效选项" Red }
    }
}
