#!/usr/bin/env powershell
# Quick Start - Modo Quiosque
# Execute este script para iniciar rapidamente

Write-Host "`n🚀 Iniciando Aplicação em Modo Quiosque..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Blue

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
}

# Verificar arquivo de lock
$lockFile = "$env:APPDATA\appteste\.quiosque-lock"
if (Test-Path $lockFile) {
    Write-Host "`n✓ Modo quiosque já está ATIVADO" -ForegroundColor Green
    Write-Host "  Arquivo: $lockFile" -ForegroundColor Gray
} else {
    Write-Host "`n→ Modo quiosque será ATIVADO ao iniciar" -ForegroundColor Cyan
}

Write-Host "`n📋 Informações úteis:" -ForegroundColor Blue
Write-Host "  • Para encerrar: node kiosk-control.js disable" -ForegroundColor White
Write-Host "  • Para verificar status: node kiosk-control.js status" -ForegroundColor White
Write-Host "  • Documentação: QUIOSQUE_VISUAL.md" -ForegroundColor White

Write-Host "`n🎮 Iniciando..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Blue

npm start
