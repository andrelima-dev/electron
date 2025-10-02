class SessionWidget {
  constructor() {
    this.sessionData = null;
    this.timer = null;
    this.timeRemaining = 0;
    this.totalTime = 0;
    this.warningTimes = [];
    this.shownWarnings = new Set();
    this.sessionStarted = false;
    this.contextUnsubscribe = null;
  this.resizeDebounce = null;
  this.windowPadding = { width: 48, height: 48 };
  this.lastResize = { width: 0, height: 0 };

    this.initializeElements();
    this.bindEvents();
    this.loadSessionData();

    if (window.electron?.onContextUpdated) {
      this.contextUnsubscribe = window.electron.onContextUpdated((context) => {
        this.applySessionContext(context);
      });
    }
  }

  initializeElements() {
    // Container elements
    this.containerEl = document.getElementById('widget-container');
  this.expandedEl = document.getElementById('widget-expanded');
  this.timerSectionEl = document.querySelector('.timer-section');
  this.sessionActionsEl = document.querySelector('.session-actions');
  this.userDetailsWrapperEl = document.querySelector('.user-details');

    // Control elements
    this.minimizeBtnEl = document.getElementById('minimize-btn');
    this.closeSessionBtnEl = document.getElementById('close-session-btn');
    this.uploadDocsBtnEl = document.getElementById('upload-docs-btn');
    
    // Upload elements
    this.fileInputEl = document.getElementById('file-input');
    this.uploadProgressEl = document.getElementById('upload-progress');
    this.uploadStatusEl = document.getElementById('upload-status');
    this.uploadPercentageEl = document.getElementById('upload-percentage');
    this.uploadFillEl = document.getElementById('upload-fill');

    // Timer elements
    this.hoursEl = document.getElementById('hours');
    this.minutesEl = document.getElementById('minutes');
    this.secondsEl = document.getElementById('seconds');
    this.progressFillEl = document.getElementById('progress-fill');
    this.timerTypeEl = document.getElementById('timer-type');

    // User info elements
    this.userNameEl = document.getElementById('user-name');
    this.userOabEl = document.getElementById('user-oab');
    this.userTypeEl = document.getElementById('user-type');

    // Modal elements
    this.warningModalEl = document.getElementById('warning-modal');
    this.warningMessageEl = document.getElementById('warning-message');
    this.warningOkBtnEl = document.getElementById('warning-ok');
    this.sessionEndModalEl = document.getElementById('session-end-modal');
    this.sessionEndOkBtnEl = document.getElementById('session-end-ok');
  }

  bindEvents() {
    // Widget controls
    this.minimizeBtnEl.addEventListener('click', () => this.minimize());
    this.closeSessionBtnEl.addEventListener('click', () => this.endSession());
    this.uploadDocsBtnEl.addEventListener('click', () => this.selectFiles());
    
    // Upload controls
    this.fileInputEl.addEventListener('change', (e) => this.handleFileSelection(e));
    this.fileInputEl.style.display = 'none'; // Garante que o input de arquivo esteja sempre oculto

    // Modal controls
    this.warningOkBtnEl.addEventListener('click', () => this.hideWarningModal());
    this.sessionEndOkBtnEl.addEventListener('click', () => this.returnToLogin());

    // Prevent window from being closed accidentally
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });

    window.addEventListener('unload', () => {
      if (typeof this.contextUnsubscribe === 'function') {
        this.contextUnsubscribe();
      }
      if (this.resizeDebounce) {
        clearTimeout(this.resizeDebounce);
        this.resizeDebounce = null;
      }
    });
  }

  async loadSessionData() {
    try {
      const context = await window.electron.getAppContext();
      await this.initializeFileApi();
      this.applySessionContext(context);
    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
    }
  }

  applySessionContext(context) {
    if (!context) {
      return;
    }

    if (context.session) {
      this.appConfig = context.session;
    }

    if (!context.currentUser) {
      return;
    }

    this.sessionData = context.currentUser;
    this.updateUserInfo();

    if (!this.sessionStarted) {
      this.sessionStarted = true;
      this.setupSession();
    }

    this.adjustLayoutForContent();
  }

  updateUserInfo() {
    if (!this.sessionData) {
      return;
    }

    this.userNameEl.textContent = this.sessionData.name || 'Usuário';
    this.userOabEl.textContent = this.sessionData.oab ? `OAB: ${this.sessionData.oab}` : 'OAB: -';
    this.userTypeEl.textContent =
      this.sessionData.type === 'estagiario' ? 'Estagiário' : 'Advogado';
  }

  adjustLayoutForContent() {
    if (!this.expandedEl) {
      return;
    }

    const MIN_WIDTH = 340;
    const MAX_WIDTH = 480;

    const applyLayout = () => {
      let desiredWidth = MIN_WIDTH;

      if (this.userDetailsWrapperEl) {
        desiredWidth = Math.max(
          desiredWidth,
          Math.ceil(this.userDetailsWrapperEl.scrollWidth + 120)
        );
      }

      if (this.sessionActionsEl) {
        desiredWidth = Math.max(
          desiredWidth,
          Math.ceil(this.sessionActionsEl.scrollWidth + 80)
        );
      }

      if (this.timerSectionEl) {
        desiredWidth = Math.max(
          desiredWidth,
          Math.ceil(this.timerSectionEl.scrollWidth + 64)
        );
      }

      desiredWidth = Math.min(MAX_WIDTH, desiredWidth);
      this.expandedEl.style.width = `${desiredWidth}px`;
      this.scheduleResize();
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(applyLayout);
    } else {
      setTimeout(applyLayout, 0);
    }
  }

  scheduleResize(delay = 40) {
    if (this.resizeDebounce) {
      clearTimeout(this.resizeDebounce);
    }

    this.resizeDebounce = setTimeout(() => {
      this.resizeDebounce = null;
      this.resizeToContent();
    }, delay);
  }

  resizeToContent() {
    if (!this.expandedEl) {
      return;
    }

    const performResize = () => {
      const rect = this.expandedEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

  const width = Math.max(360, Math.ceil(rect.width + this.windowPadding.width));
  const height = Math.max(320, Math.ceil(rect.height + this.windowPadding.height));

      if (width === this.lastResize.width && height === this.lastResize.height) {
        return;
      }

      this.lastResize = { width, height };
      this.resizeWindow(width, height);
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(performResize);
    } else {
      performResize();
    }
  }

  async initializeFileApi() {
    try {
      const apiInfo = await window.electronAPI.invoke('files:get-api-info');
      if (apiInfo.success) {
        this.apiBaseUrl = apiInfo.baseUrl;
        console.log('API de arquivos inicializada:', this.apiBaseUrl);
      } else {
        console.error('Erro ao inicializar API:', apiInfo.error);
      }
    } catch (error) {
      console.error('Erro ao conectar com API de arquivos:', error);
    }
  }

  setupSession() {
    if (!this.sessionData) {
      console.error('No session data found');
      return;
    }

    // Set user info
    this.updateUserInfo();

    // Set timer based on user type
    const isAdv = this.sessionData.type === 'advogado';
    const advMin =
      Number(this.appConfig?.advogadoMinutes) > 0 ? Number(this.appConfig.advogadoMinutes) : 180;
    const estMin =
      Number(this.appConfig?.estagiarioMinutes) > 0
        ? Number(this.appConfig.estagiarioMinutes)
        : 120;
    const warnAdv = Array.isArray(this.appConfig?.warningsAdv)
      ? this.appConfig.warningsAdv
      : [150, 120, 90, 30, 10];
    const warnEst = Array.isArray(this.appConfig?.warningsEst)
      ? this.appConfig.warningsEst
      : [90, 60, 30, 10];

    this.totalTime = (isAdv ? advMin : estMin) * 60; // seconds
    this.timerTypeEl.textContent = isAdv ? 'Sessão de Advogado' : 'Sessão de Estagiário';
    this.warningTimes = (isAdv ? warnAdv : warnEst).map((m) => m * 60);

    this.timeRemaining = this.totalTime;
    this.startTimer();
    this.adjustLayoutForContent();
  }

  startTimer() {
    this.updateDisplay();

    this.timer = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        this.timeUp();
        return;
      }

      this.updateDisplay();
      this.checkWarnings();
    }, 1000);
  }

  updateDisplay() {
    const hours = Math.floor(this.timeRemaining / 3600);
    const minutes = Math.floor((this.timeRemaining % 3600) / 60);
    const seconds = this.timeRemaining % 60;

    // Format kept by composing labels directly below

    // Update display
    if (this.hoursEl) {
      this.hoursEl.textContent = hours.toString().padStart(2, '0');
      this.minutesEl.textContent = minutes.toString().padStart(2, '0');
      this.secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    // Update progress bar
    if (this.progressFillEl) {
      const progress = (this.timeRemaining / this.totalTime) * 100;
      this.progressFillEl.style.width = `${progress}%`;
    }

    // Checagens de aviso baseadas no tempo restante
  }

  checkWarnings() {
    for (const warningTime of this.warningTimes) {
      if (this.timeRemaining <= warningTime && !this.shownWarnings.has(warningTime)) {
        this.shownWarnings.add(warningTime);
        this.showWarning(warningTime);
        break;
      }
    }
  }

  showWarning(timeRemaining) {
    const minutes = Math.floor(timeRemaining / 60);
    let message;

    if (minutes <= 10) {
      message = `⚠️ ATENÇÃO: Sua sessão será encerrada automaticamente em ${minutes} minutos!`;
    } else {
      message = `⏰ Aviso: Restam ${minutes} minutos para o encerramento automático da sessão.`;
    }

    this.warningMessageEl.textContent = message;
    this.showWarningModal();
    this.playNotificationSound();

    // Sem auto expand — já estamos no modo único
  }

  minimize() {
    // Sempre minimizar a janela do SO para não atrapalhar
    try {
      if (window.electron && window.electron.minimizeWindow) {
        window.electron.minimizeWindow();
      }
    } catch (e) {
      // noop
    }
  }

  async resizeWindow(width, height) {
    try {
      if (window.electron && window.electron.resizeWindow) {
        await window.electron.resizeWindow(width, height);
      }
    } catch (error) {
      console.error('Erro ao redimensionar janela:', error);
    }
  }

  showWarningModal() {
    this.warningModalEl.classList.add('show');
  }

  hideWarningModal() {
    this.warningModalEl.classList.remove('show');
  }

  showSessionEndModal() {
    this.sessionEndModalEl.classList.add('show');
  }

  playNotificationSound() {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2N2O2oXk8ODVan5e2iUwMISUG3z/OFvhQJBkW7zO2aUBMOD0Kx0/ql7BgdEEL8gqbGIg6b9+a7ejQ3D3fI8NSNeAgZYbzr55hMEg1Spu3xvm4a'
      );
      audio.play().catch(() => {});
    } catch (e) {
      // noop
    }
  }

  timeUp() {
    clearInterval(this.timer);
    this.showSessionEndModal();
  }

  async endSession() {
    try {
      clearInterval(this.timer);
      // Encerramento atômico: pede ao processo principal para encerrar sessão e voltar ao login
      if (window.electron && window.electron.endSession) {
        const result = await window.electron.endSession();
        if (!result?.ok) {
          console.error('Falha ao encerrar sessão:', result?.error);
        }
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      // Try to close anyway
      if (window.close) {
        window.close();
      }
    }
  }

  returnToLogin() {
    // This will close the widget window and return to login
    this.endSession();
  }

  // File upload methods
  selectFiles() {
    if (!this.sessionData) {
      this.showNotification('❌ Erro: Sessão não encontrada!', 'error');
      return;
    }
    
    if (!this.apiBaseUrl) {
      this.showNotification('❌ Erro: Servidor de arquivos não disponível!', 'error');
      return;
    }
    
    // Trigger file selection
    this.fileInputEl.click();
  }

  async handleFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Show upload progress
    this.uploadProgressEl.style.display = 'block';
    this.uploadStatusEl.textContent = `Enviando ${files.length} arquivo(s)...`;
    this.uploadPercentageEl.textContent = '0%';
    this.uploadFillEl.style.width = '0%';

    let uploaded = 0;
    const total = files.length;

    for (const file of files) {
      try {
        await this.uploadFile(file);
        uploaded++;
        
        const progress = Math.round((uploaded / total) * 100);
        this.uploadPercentageEl.textContent = `${progress}%`;
        this.uploadFillEl.style.width = `${progress}%`;
        
        if (uploaded === 1) {
          this.uploadStatusEl.textContent = `Enviado: ${file.name}`;
        } else {
          this.uploadStatusEl.textContent = `Enviados: ${uploaded}/${total} arquivos`;
        }
        
      } catch (error) {
        console.error('Erro no upload:', error);
        this.showNotification(`❌ Erro ao enviar ${file.name}`, 'error');
      }
    }

    // Hide progress after completion
    setTimeout(() => {
      this.uploadProgressEl.style.display = 'none';
      if (uploaded === total) {
        this.showNotification(`✅ ${uploaded} documento(s) enviado(s) com sucesso!`, 'success');
      } else {
        this.showNotification(`⚠️ Enviados ${uploaded} de ${total} documentos`, 'warning');
      }
      this.scheduleResize();
    }, 1500);

    // Clear file input
    this.fileInputEl.value = '';
    this.scheduleResize();
  }

  async uploadFile(file) {
    if (!this.apiBaseUrl) {
      throw new Error('API não inicializada');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.apiBaseUrl}/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Erro no upload');
    }

    return result;
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `upload-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      transform: translateX(350px);
      transition: transform 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    // Set background color based on type
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(350px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize widget when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SessionWidget();
});

// Prevent right-click and dev tools
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    (e.ctrlKey && e.shiftKey && e.key === 'C') ||
    (e.ctrlKey && e.key === 'u')
  ) {
    e.preventDefault();
  }
});
