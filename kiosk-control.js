#!/usr/bin/env node

/**
 * Script utilitário para gerenciar o modo quiosque
 * Uso:
 *   node kiosk-control.js enable  - Cria o arquivo de lock (ativa quiosque)
 *   node kiosk-control.js disable - Remove o arquivo de lock (desativa quiosque)
 *   node kiosk-control.js status  - Verifica o status do quiosque
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const KIOSK_DIR = path.join(process.env.APPDATA || process.env.HOME, 'appteste');
const KIOSK_LOCK_FILE = path.join(KIOSK_DIR, '.quiosque-lock');

function createDir() {
  if (!fs.existsSync(KIOSK_DIR)) {
    fs.mkdirSync(KIOSK_DIR, { recursive: true });
  }
}

function enable() {
  try {
    createDir();
    fs.writeFileSync(
      KIOSK_LOCK_FILE,
      JSON.stringify({
        created: new Date().toISOString(),
        app: 'appteste'
      }),
      'utf8'
    );
    console.log('✓ Modo quiosque ATIVADO');
    console.log(`  Arquivo: ${KIOSK_LOCK_FILE}`);
    return true;
  } catch (error) {
    console.error('✗ Erro ao ativar quiosque:', error.message);
    return false;
  }
}

function disable() {
  try {
    if (fs.existsSync(KIOSK_LOCK_FILE)) {
      fs.unlinkSync(KIOSK_LOCK_FILE);
      console.log('✓ Modo quiosque DESATIVADO');
      console.log(`  Arquivo deletado: ${KIOSK_LOCK_FILE}`);
      return true;
    } else {
      console.log('ℹ Arquivo de lock não encontrado (quiosque já está desativado)');
      return true;
    }
  } catch (error) {
    console.error('✗ Erro ao desativar quiosque:', error.message);
    return false;
  }
}

function status() {
  const exists = fs.existsSync(KIOSK_LOCK_FILE);
  if (exists) {
    try {
      const info = JSON.parse(fs.readFileSync(KIOSK_LOCK_FILE, 'utf8'));
      console.log('✓ Modo quiosque: ATIVADO');
      console.log(`  Arquivo: ${KIOSK_LOCK_FILE}`);
      console.log(`  Criado em: ${info.created}`);
    } catch (error) {
      console.log('✓ Modo quiosque: ATIVADO (arquivo encontrado)');
      console.log(`  Arquivo: ${KIOSK_LOCK_FILE}`);
    }
  } else {
    console.log('✗ Modo quiosque: DESATIVADO');
    console.log(`  Arquivo esperado: ${KIOSK_LOCK_FILE}`);
  }
}

function showHelp() {
  console.log(`
Gerenciador de Modo Quiosque
=============================

Uso: node kiosk-control.js [comando]

Comandos:
  enable    Ativa o modo quiosque (cria arquivo de lock)
  disable   Desativa o modo quiosque (remove arquivo de lock)
  status    Verifica o status atual do quiosque
  help      Mostra esta mensagem

Exemplos:
  node kiosk-control.js enable
  node kiosk-control.js disable
  node kiosk-control.js status

Para desativar o quiosque permanentemente, você pode também:
  1. Excluir manualmente o arquivo: ${KIOSK_LOCK_FILE}
  2. Executar este script com o comando 'disable'
  3. Fechar a aplicação quando o arquivo for deletado
  `);
}

const command = process.argv[2] || 'status';

switch (command.toLowerCase()) {
  case 'enable':
    process.exit(enable() ? 0 : 1);
    break;
  case 'disable':
    process.exit(disable() ? 0 : 1);
    break;
  case 'status':
    status();
    process.exit(0);
    break;
  case 'help':
  case '-h':
  case '--help':
    showHelp();
    process.exit(0);
    break;
  default:
    console.error(`Comando desconhecido: ${command}`);
    console.log('Use "node kiosk-control.js help" para ver as opções disponíveis');
    process.exit(1);
}
