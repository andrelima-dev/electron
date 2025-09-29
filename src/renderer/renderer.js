'use strict';

const versionElement = document.getElementById('version');
const statusSummaryElement = document.getElementById('status-summary');
const feedbackElement = document.getElementById('feedback');
const formElement = document.getElementById('unlock-form');
const submitButton = document.getElementById('unlock-submit');
const resetButton = document.getElementById('unlock-reset');
const cpfInput = document.getElementById('cpf');
const oabInput = document.getElementById('oab');
const birthDateInput = document.getElementById('birthDate');

let appContext = {
  authProvider: 'local',
  authStatus: 'checking',
  authDetails: 'Checando configuração local.',
  apiBaseUrl: null
};

function updateVersions() {
  if (!versionElement) {
    return;
  }

  if (!window.electron || typeof window.electron.versions !== 'function') {
    versionElement.textContent = 'Plataforma em modo offline.';
    return;
  }

  const versions = window.electron.versions();
  versionElement.textContent = `Electron ${versions.electron} • Chrome ${versions.chrome} • Node.js ${versions.node}`;
}

function setFeedback(message, status = 'info') {
  if (!feedbackElement) {
    return;
  }

  feedbackElement.textContent = message || '';
  feedbackElement.dataset.status = status;
  feedbackElement.hidden = !message;
}

function setLoading(isLoading) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;
  submitButton.dataset.loading = isLoading ? 'true' : 'false';
  submitButton.textContent = isLoading ? 'Validando…' : 'Entrar';
}

function formatCpf(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  let formatted = '';

  if (digits.length > 0) {
    formatted = digits.slice(0, 3);
  }

  if (digits.length >= 4) {
    formatted += `.${digits.slice(3, Math.min(6, digits.length))}`;
  }

  if (digits.length >= 7) {
    formatted += `.${digits.slice(6, Math.min(9, digits.length))}`;
  }

  if (digits.length >= 10) {
    formatted += `-${digits.slice(9, 11)}`;
  }

  return formatted;
}

function handleCpfInput(event) {
  event.target.value = formatCpf(event.target.value);
}

function handleOabInput(event) {
  const value = (event.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  event.target.value = value.slice(0, 9);
}

function configureBirthDateInput() {
  if (!birthDateInput) {
    return;
  }

  const today = new Date();
  const isoToday = today.toISOString().split('T')[0];
  birthDateInput.max = isoToday;
  birthDateInput.placeholder = 'AAAA-MM-DD';
}

function resetForm() {
  formElement?.reset();
  setFeedback('Campos limpos.', 'info');
}

function applyContext(context) {
  appContext = {
    authProvider: context?.authProvider || 'local',
    authStatus: context?.authStatus || 'checking',
    authDetails: context?.authDetails || '',
    apiBaseUrl: context?.apiBaseUrl || null
  };

  if (!statusSummaryElement) {
    return;
  }

  const providerLabel = appContext.authProvider === 'remote' ? 'API central' : 'Base local';
  const summary = `Auth: ${providerLabel.toUpperCase()} • Status: ${(appContext.authStatus || 'CHECKING').toUpperCase()}`;
  const details = appContext.authDetails ? ` — ${appContext.authDetails}` : '';
  statusSummaryElement.textContent = `${summary}${details}`;
}

async function loadAppContext() {
  if (!window.electron || typeof window.electron.getAppContext !== 'function') {
    applyContext({
      authProvider: 'local',
      authStatus: 'degraded',
      authDetails: 'Canal de configuração indisponível. Operando com base local.'
    });
    return;
  }

  try {
    const context = await window.electron.getAppContext();
    applyContext(context);
  } catch (error) {
    console.error('[renderer] Falha ao obter contexto da aplicação:', error);
    applyContext({
      authProvider: 'local',
      authStatus: 'offline',
      authDetails: 'Não foi possível carregar o contexto do backend. Utilize a base local.'
    });
  }
}

async function releaseWorkstation(user) {
  // Apenas feedback; a sessão e o widget são gerenciados pelo processo principal
  setFeedback(`Bem-vindo, ${user?.name || 'usuário'}! Máquina liberada para uso.`, 'success');
}

async function handleSubmit(event) {
  event.preventDefault();

  const cpf = cpfInput?.value?.trim();
  const oab = oabInput?.value?.trim();
  const birthDate = birthDateInput?.value?.trim();

  if (!cpf || !oab || !birthDate) {
    setFeedback('Preencha todos os campos antes de continuar.', 'error');
    return;
  }

  if (!window.electron || typeof window.electron.unlock !== 'function') {
    setFeedback('Canal de desbloqueio indisponível. Contate o suporte.', 'error');
    return;
  }

  setLoading(true);
  setFeedback('Validando informações…', 'info');

  try {
    const result = await window.electron.unlock({ cpf, oab, birthDate });

    if (!result) {
      setFeedback('Resposta inválida do processo principal.', 'error');
      return;
    }

    if (result.success) {
      formElement?.reset();
      setFeedback('Acesso autorizado! Iniciando sessão...', 'success');
      await releaseWorkstation(result.user || null);
    } else {
      setFeedback(result.error || 'Acesso negado. Verifique os dados informados.', 'error');
    }
  } catch (error) {
    setFeedback(`Erro inesperado: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateVersions();
  configureBirthDateInput();
  loadAppContext();

  const unsubscribeContext = window.electron?.onContextUpdated?.((context) =>
    applyContext(context)
  );

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeContext === 'function') {
      unsubscribeContext();
    }
  });

  if (cpfInput) {
    cpfInput.addEventListener('input', handleCpfInput);
  }

  if (oabInput) {
    oabInput.addEventListener('input', handleOabInput);
  }

  formElement?.addEventListener('submit', handleSubmit);
  resetButton?.addEventListener('click', resetForm);
  // Hardening: bloquear menu de contexto e atalhos de DevTools
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    const key = e.key?.toLowerCase();
    const isDevTools = key === 'f12' || (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'c'));
    const isViewSource = e.ctrlKey && key === 'u';
    if (isDevTools || isViewSource) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
});
