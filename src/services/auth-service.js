const { EventEmitter } = require('node:events');

const { loadAppConfig, watchAppConfig, joinUrl } = require('../common/config');
const {
  loadAuthorizedUsers,
  watchAuthorizedUsers,
  findAuthorizedUser,
  normalizeCpf,
  validateCpf,
  normalizeOab,
  validateOab,
  normalizeBirthDate,
  validateBirthDate
} = require('../common/auth');

class AuthService extends EventEmitter {
  constructor() {
    super();
    this.state = {
      config: loadAppConfig(),
      users: [],
      authStatus: 'checking',
      authDetails: 'Inicializando serviço de autenticação…',
      lastError: null,
      watchers: {
        config: () => {},
        users: () => {}
      }
    };

    this.state.authProvider = this.state.config.authProvider;
  }

  async initialize() {
    this.applyConfig(this.state.config);
    this.state.watchers.config = watchAppConfig((error, config) => {
      if (error) {
        this.setStatus('offline', error.message || 'Erro ao ler app-config.json');
        this.state.lastError = error;
        this.emitContextChange();
        return;
      }

      this.applyConfig(config);
      this.emitContextChange();
    });

    this.emitContextChange();
  }

  async shutdown() {
    this.state.watchers.config();
    this.state.watchers.users();
  }

  getContext() {
    return {
      authProvider: this.state.authProvider,
      authStatus: this.state.authStatus,
      authDetails: this.state.authDetails,
      apiBaseUrl: this.state.config?.api?.baseUrl || '',
      session: this.state.config?.session
    };
  }

  async authenticate(credentials) {
    if (!credentials) {
      return {
        success: false,
        error: 'Nenhum dado de acesso foi informado.'
      };
    }

    const normalizedCPF = normalizeCpf(credentials.cpf);
    const normalizedOab = normalizeOab(credentials.oab);
    const normalizedBirthDate = normalizeBirthDate(credentials.birthDate);

    const errors = [];

    if (!validateCpf(normalizedCPF)) {
      errors.push('CPF inválido.');
    }

    if (!validateOab(normalizedOab)) {
      errors.push('OAB inválida.');
    }

    if (!validateBirthDate(normalizedBirthDate)) {
      errors.push('Data de nascimento inválida.');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join(' ')
      };
    }

    const payload = {
      cpf: normalizedCPF,
      oab: normalizedOab,
      birthDate: normalizedBirthDate
    };

    if (this.state.authProvider === 'remote') {
      return this.authenticateRemote(payload);
    }

    return this.authenticateLocal(payload);
  }

  applyConfig(config) {
    this.state.config = config;
    const authProvider = config.authProvider === 'remote' ? 'remote' : 'local';

    if (authProvider !== this.state.authProvider) {
      this.state.authProvider = authProvider;
      this.state.authDetails =
        authProvider === 'remote'
          ? 'Utilizando API central de validação.'
          : 'Utilizando base local de contingência.';

      this.state.watchers.users();
      this.state.watchers.users = () => {};
    }

    if (this.state.authProvider === 'local') {
      this.bootstrapLocalStore();
    } else {
      this.bootstrapRemote().catch((error) => {
        this.setStatus('offline', error.message || 'Falha ao inicializar provedor remoto.');
      });
    }
  }

  bootstrapLocalStore() {
    try {
      this.state.users = loadAuthorizedUsers();
      this.setStatus('online', `Base local carregada com ${this.state.users.length} registro(s).`);
    } catch (error) {
      this.state.users = [];
      this.setStatus('offline', `Erro ao carregar usuários locais: ${error.message}`);
      this.state.lastError = error;
    }

    this.state.watchers.users();
    this.state.watchers.users = watchAuthorizedUsers((error, users) => {
      if (error) {
        this.state.users = [];
        this.setStatus('offline', `Erro ao atualizar usuários locais: ${error.message}`);
        this.state.lastError = error;
      } else {
        this.state.users = users;
        this.setStatus('online', `Base local sincronizada (${users.length} registro(s)).`);
      }

      this.emitContextChange();
    });

    this.emitContextChange();
  }

  async bootstrapRemote() {
    this.state.users = [];
    this.state.watchers.users();
    this.state.watchers.users = () => {};

    if (!this.state.config.api?.baseUrl) {
      this.setStatus('offline', 'API não configurada. Defina api.baseUrl em app-config.json.');
      this.emitContextChange();
      return;
    }

    try {
      await this.checkRemoteHealth();
    } catch (error) {
      this.setStatus('offline', `Falha na verificação de saúde da API: ${error.message}`);
      this.state.lastError = error;
      this.emitContextChange();
      return;
    }

    this.emitContextChange();
  }

  async checkRemoteHealth() {
    const healthUrl = joinUrl(this.state.config.api?.baseUrl, this.state.config.api?.healthPath);

    if (!healthUrl) {
      this.setStatus('degraded', 'Endpoint de saúde não configurado; prosseguindo com cautela.');
      return;
    }

    this.setStatus('checking', 'Verificando disponibilidade da API…');

    try {
      const response = await fetchWithTimeout(
        healthUrl,
        { method: 'GET' },
        this.state.config.api?.timeout
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status} ao consultar saúde.`);
      }

      this.setStatus('online', 'API disponível para autenticação.');
    } catch (error) {
      this.setStatus('offline', `API indisponível: ${error.message}`);
      this.state.lastError = error;
    }
  }

  authenticateLocal(payload) {
    const user = findAuthorizedUser(payload, this.state.users);

    if (!user) {
      return {
        success: false,
        error: 'Credenciais não localizadas na base local.'
      };
    }

    return {
      success: true,
      user: {
        name: user.name,
        cpf: user.cpf,
        oab: user.oab,
        type: user.type === 'estagiario' ? 'estagiario' : 'advogado',
        sessionStartTime: new Date().toISOString()
      }
    };
  }

  async authenticateRemote(payload) {
    const validateUrl = joinUrl(
      this.state.config.api?.baseUrl,
      this.state.config.api?.validatePath
    );

    if (!validateUrl) {
      return {
        success: false,
        error: 'Endpoint de validação da API não configurado.'
      };
    }

    try {
      const response = await fetchWithTimeout(
        validateUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        },
        this.state.config.api?.timeout
      );

      const data = await safeJson(response);

      if (!response.ok) {
        const message = data?.message || `API respondeu com status ${response.status}.`;
        this.setStatus('degraded', message);
        return {
          success: false,
          error: message
        };
      }

      const success = Boolean(data?.success);

      if (!success) {
        const message = data?.message || 'Acesso negado pela API.';
        this.setStatus('online', 'API disponível. Credenciais não autorizadas.');
        return {
          success: false,
          error: message
        };
      }

      this.setStatus('online', 'API disponível. Última validação realizada com sucesso.');

      return {
        success: true,
        user:
          data?.user && typeof data.user === 'object'
            ? { name: data.user.name }
            : { name: undefined }
      };
    } catch (error) {
      this.setStatus('offline', `Falha ao comunicar com API: ${error.message}`);

      return {
        success: false,
        error:
          'Não foi possível validar as credenciais na API. Tente novamente ou contacte o suporte.'
      };
    }
  }

  setStatus(status, details) {
    this.state.authStatus = status;
    this.state.authDetails = details || '';
  }

  emitContextChange() {
    this.emit('context-changed', this.getContext());
  }
}

async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch não está disponível neste ambiente.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Tempo de espera excedido.');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

module.exports = new AuthService();
