/**
 * 批量转换节点文件脚本
 * 将 src/core/nodes 中的节点文件转换为 packages/browser-nodes 包中的文件
 */

# 定义源目录和目标目录
$sourceDir = "src/core/nodes"
$targetDir = "packages/browser-nodes/src/nodes"
$rootDir = Get-Location

# 获取所有节点文件（排除 BaseNode.ts 和 index.ts）
$nodeFiles = Get-ChildItem -Path $sourceDir -Recurse -Filter "*.ts" | 
    Where-Object { $_.Name -ne "BaseNode.ts" -and $_.Name -ne "index.ts" }

foreach ($file in $nodeFiles) {
    # 计算相对路径
    $relativePath = $file.FullName.Replace("$rootDir\$sourceDir\", "")
    $targetPath = Join-Path $targetDir $relativePath
    
    # 确保目标目录存在
    $targetDirPath = Split-Path $targetPath -Parent
    if (-not (Test-Path $targetDirPath)) {
        New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null
    }
    
    # 读取文件内容
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # 替换导入路径
    $content = $content -replace 'from "../BaseNode"', 'from "../BaseNode.js"'
    $content = $content -replace 'from "@/typings/nodeEditor"', 'from "../types.js"'
    $content = $content -replace 'from "@/core/mcp-client"', 'from "../types.js"'
    
    # 处理相对路径导入（根据目录层级调整）
    $depth = ($relativePath.Split('\').Count - 1)
    if ($depth -gt 0) {
        $relativeBase = '../' * $depth + 'BaseNode.js'
        $content = $content -replace 'from "\.\./BaseNode"', "from `"$relativeBase`""
        
        $relativeTypes = '../' * $depth + 'types.js'
        $content = $content -replace 'from "\.\./types"', "from `"$relativeTypes`""
    }
    
    # 写入目标文件
    Set-Content -Path $targetPath -Value $content -Encoding UTF8 -NoNewline
    
    Write-Host "转换: $relativePath -> $targetPath"
}

Write-Host "`n转换完成！"

