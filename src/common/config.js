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
  },
  session: {
    advogadoMinutes: 180,
    estagiarioMinutes: 120,
    warningsAdv: [150, 120, 90, 30, 10],
    warningsEst: [90, 60, 30, 10]
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

/**
 * Valida o shape semântico do app-config após merge com defaults.
 * Lança erro com mensagens claras em caso de configuração inválida.
 */
function validateAppConfig(config) {
  const errors = [];

  // authProvider
  if (config.authProvider !== 'local' && config.authProvider !== 'remote') {
    errors.push("authProvider deve ser 'local' ou 'remote'.");
  }

  // API block
  if (!config.api || typeof config.api !== 'object') {
    errors.push('Bloco api é obrigatório.');
  } else {
    const { baseUrl, validatePath, healthPath, timeout } = config.api;

    if (typeof baseUrl !== 'string') {
      errors.push('api.baseUrl deve ser string (pode ser vazio para modo local).');
    }

    if (typeof validatePath !== 'string' || !validatePath.startsWith('/')) {
      errors.push("api.validatePath deve ser string começando com '/'.");
    }

    if (typeof healthPath !== 'string' || !healthPath.startsWith('/')) {
      errors.push("api.healthPath deve ser string começando com '/'.");
    }

    if (typeof timeout !== 'number' || !(timeout > 0)) {
      errors.push('api.timeout deve ser um número maior que 0.');
    }
  }

  // Session block
  const s = config.session;
  if (!s || typeof s !== 'object') {
    errors.push('Bloco session é obrigatório.');
  } else {
    const checkPosInt = (v) => typeof v === 'number' && v > 0 && Number.isFinite(v);
    if (!checkPosInt(s.advogadoMinutes))
      errors.push('session.advogadoMinutes deve ser número > 0 (minutos).');
    if (!checkPosInt(s.estagiarioMinutes))
      errors.push('session.estagiarioMinutes deve ser número > 0 (minutos).');
    const isNumberArray = (arr) =>
      Array.isArray(arr) && arr.every((n) => typeof n === 'number' && n > 0);
    if (!isNumberArray(s.warningsAdv))
      errors.push('session.warningsAdv deve ser array de números (minutos).');
    if (!isNumberArray(s.warningsEst))
      errors.push('session.warningsEst deve ser array de números (minutos).');
  }

  if (errors.length) {
    const message = `Configuração inválida: \n- ${errors.join('\n- ')}`;
    const err = new Error(message);
    err.name = 'AppConfigValidationError';
    throw err;
  }
}

function mergeConfig(baseConfig, overrideConfig) {
  const merged = {
    ...baseConfig,
    ...overrideConfig,
    api: {
      ...baseConfig.api,
      ...(overrideConfig && typeof overrideConfig.api === 'object' ? overrideConfig.api : {})
    },
    session: {
      ...baseConfig.session,
      ...(overrideConfig && typeof overrideConfig.session === 'object'
        ? overrideConfig.session
        : {})
    }
  };

  return {
    authProvider: merged.authProvider === 'remote' ? 'remote' : 'local',
    api: {
      baseUrl: merged.api.baseUrl || '',
      validatePath: merged.api.validatePath || DEFAULT_CONFIG.api.validatePath,
      healthPath: merged.api.healthPath || DEFAULT_CONFIG.api.healthPath,
      timeout:
        Number(merged.api.timeout) > 0 ? Number(merged.api.timeout) : DEFAULT_CONFIG.api.timeout
    },
    session: {
      advogadoMinutes:
        Number(merged.session.advogadoMinutes) > 0
          ? Number(merged.session.advogadoMinutes)
          : DEFAULT_CONFIG.session.advogadoMinutes,
      estagiarioMinutes:
        Number(merged.session.estagiarioMinutes) > 0
          ? Number(merged.session.estagiarioMinutes)
          : DEFAULT_CONFIG.session.estagiarioMinutes,
      warningsAdv: Array.isArray(merged.session.warningsAdv)
        ? merged.session.warningsAdv.map(Number).filter((n) => n > 0)
        : DEFAULT_CONFIG.session.warningsAdv,
      warningsEst: Array.isArray(merged.session.warningsEst)
        ? merged.session.warningsEst.map(Number).filter((n) => n > 0)
        : DEFAULT_CONFIG.session.warningsEst
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

    throw new Error(
      `Não foi possível ler o arquivo de configuração ${filePath}. Detalhes: ${error.message}`
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Configuração inválida em ${filePath}. Verifique o JSON. Detalhes: ${error.message}`
    );
  }

  const merged = mergeConfig(DEFAULT_CONFIG, parsed);
  validateAppConfig(merged);
  return merged;
}

function watchAppConfig(onChange, filePath = CONFIG_FILE) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  let watcher;
  let debounceTimer = null;
  const DEBOUNCE_MS = 200;

  try {
    watcher = fs.watch(filePath, { persistent: false }, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          const config = loadAppConfig(filePath);
          onChange(null, config);
        } catch (error) {
          onChange(error, { ...DEFAULT_CONFIG });
        }
      }, DEBOUNCE_MS);
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
  validateAppConfig,
  loadAppConfig,
  watchAppConfig
};
