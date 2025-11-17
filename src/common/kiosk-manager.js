const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { createLogger } = require('./logger');

const log = createLogger('kiosk-manager');

/**
 * Gerenciador de modo quiosque
 * Fornece utilitários para controlar o modo quiosque da aplicação
 */
class KioskManager {
  constructor() {
    this.kioskLockFile = path.join(app.getPath('appData'), 'appteste', '.quiosque-lock');
    this.kioskDir = path.dirname(this.kioskLockFile);
  }

  /**
   * Cria o arquivo de lock que mantém o quiosque ativo
   */
  createLockFile() {
    try {
      if (!fs.existsSync(this.kioskDir)) {
        fs.mkdirSync(this.kioskDir, { recursive: true });
      }
      fs.writeFileSync(
        this.kioskLockFile,
        JSON.stringify({
          created: new Date().toISOString(),
          app: 'appteste',
          pid: process.pid
        }),
        'utf8'
      );
      log.info('Arquivo de lock do quiosque criado');
      return true;
    } catch (error) {
      log.error('Erro ao criar arquivo de lock:', error.message);
      return false;
    }
  }

  /**
   * Verifica se o arquivo de lock existe
   */
  lockFileExists() {
    return fs.existsSync(this.kioskLockFile);
  }

  /**
   * Remove o arquivo de lock (permite encerrar o quiosque)
   */
  removeLockFile() {
    try {
      if (fs.existsSync(this.kioskLockFile)) {
        fs.unlinkSync(this.kioskLockFile);
        log.info('Arquivo de lock do quiosque removido');
        return true;
      }
      return false;
    } catch (error) {
      log.error('Erro ao remover arquivo de lock:', error.message);
      return false;
    }
  }

  /**
   * Obtém informações do lock file
   */
  getLockFileInfo() {
    try {
      if (!fs.existsSync(this.kioskLockFile)) {
        return null;
      }
      const content = fs.readFileSync(this.kioskLockFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      log.error('Erro ao ler arquivo de lock:', error.message);
      return null;
    }
  }

  /**
   * Obtém o caminho do arquivo de lock
   */
  getLockFilePath() {
    return this.kioskLockFile;
  }

  /**
   * Obtém o caminho do diretório de quiosque
   */
  getKioskDir() {
    return this.kioskDir;
  }
}

module.exports = new KioskManager();
