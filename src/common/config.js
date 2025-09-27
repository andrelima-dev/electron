const fs = require('node:fs');
const path = require('node:path');

const CONFIG_FILE = path.join(__dirname, '..', 'config', 'app-config.json');

const DEFAULT_CONFIG = Object.freeze({
  authProvider: 'local',
  api: {
    baseUrl: '',
    validatePath: '/api/v1/advogados/validar',
    healthPath: '/health',
    timeout: 8000
  }
});

function joinUrl(baseUrl, resourcePath) {
  if (!baseUrl) {
    return '';
  }

  if (!resourcePath) {
    return baseUrl;
  }

  const normalizedBase = String(baseUrl).replace(/\/$/, '');
  const normalizedPath = String(resourcePath).replace(/^\//, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function mergeConfig(baseConfig, overrideConfig) {
  const merged = {
    ...baseConfig,
    ...overrideConfig,
    api: {
      ...baseConfig.api,
      ...(overrideConfig && typeof overrideConfig.api === 'object' ? overrideConfig.api : {})
    }
  };

  return {
    authProvider: merged.authProvider === 'remote' ? 'remote' : 'local',
    api: {
      baseUrl: merged.api.baseUrl || '',
      validatePath: merged.api.validatePath || DEFAULT_CONFIG.api.validatePath,
      healthPath: merged.api.healthPath || DEFAULT_CONFIG.api.healthPath,
      timeout: Number(merged.api.timeout) > 0 ? Number(merged.api.timeout) : DEFAULT_CONFIG.api.timeout
    }
  };
}

function loadAppConfig(filePath = CONFIG_FILE) {
  let raw = '{}';

  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...DEFAULT_CONFIG };
    }

    throw new Error(`Não foi possível ler o arquivo de configuração ${filePath}. Detalhes: ${error.message}`);
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Configuração inválida em ${filePath}. Verifique o JSON. Detalhes: ${error.message}`);
  }

  return mergeConfig(DEFAULT_CONFIG, parsed);
}

function watchAppConfig(onChange, filePath = CONFIG_FILE) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  let watcher;

  try {
    watcher = fs.watch(filePath, { persistent: false }, () => {
      try {
        const config = loadAppConfig(filePath);
        onChange(null, config);
      } catch (error) {
        onChange(error, { ...DEFAULT_CONFIG });
      }
    });
  } catch (error) {
    onChange(error, { ...DEFAULT_CONFIG });
    return () => {};
  }

  return () => watcher.close();
}

module.exports = {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  joinUrl,
  loadAppConfig,
  watchAppConfig
};
