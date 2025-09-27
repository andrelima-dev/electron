class SessionWidget {
  constructor() {
    this.sessionData = null;
    this.timer = null;
    this.timeRemaining = 0;
    this.totalTime = 0;
    this.warningTimes = [];
    this.shownWarnings = new Set();

    this.initializeElements();
    this.bindEvents();
    this.loadSessionData();
  }

  initializeElements() {
    // Container elements
    this.containerEl = document.getElementById('widget-container');
    this.expandedEl = document.getElementById('widget-expanded');
    
    // Control elements
    this.minimizeBtnEl = document.getElementById('minimize-btn');
    this.closeSessionBtnEl = document.getElementById('close-session-btn');
    
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
    
    // Modal controls
    this.warningOkBtnEl.addEventListener('click', () => this.hideWarningModal());
    this.sessionEndOkBtnEl.addEventListener('click', () => this.returnToLogin());
    
    // Prevent window from being closed accidentally
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }

  async loadSessionData() {
    try {
      const context = await window.electron.getAppContext();
      this.sessionData = context.currentUser;
      
      if (!this.sessionData) {
        console.error('No session data found');
        return;
      }

      this.setupSession();
    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
    }
  }

  setupSession() {
    // Set user info
    this.userNameEl.textContent = this.sessionData.name;
    this.userOabEl.textContent = `OAB: ${this.sessionData.oab}`;
      this.userTypeEl.textContent = this.sessionData.type === 'estagiario' ? 'Estagiário' : 'Advogado';
    
    // Set timer based on user type
    if (this.sessionData.type === 'advogado') {
      this.totalTime = 180 * 60; // 180 minutes in seconds
      this.timerTypeEl.textContent = 'Sessão de Advogado';
      this.warningTimes = [150*60, 90*60, 60*60, 30*60, 10*60]; // seconds remaining
    } else {
      this.totalTime = 120 * 60; // 120 minutes in seconds
      this.timerTypeEl.textContent = 'Sessão de Estagiário';
      this.warningTimes = [90*60, 60*60, 30*60, 10*60]; // seconds remaining
    }
    
    this.timeRemaining = this.totalTime;
    this.startTimer();
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
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
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
    } catch {}
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
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2N2O2oXk8ODVan5e2iUwMISUG3z/OFvhQJBkW7zO2aUBMOD0Kx0/ql7BgdEEL8gqbGIg6b9+a7ejQ3D3fI8NSNeAgZYbzr55hMEg1Spu3xvm4a');
      audio.play().catch(() => {});
    } catch (e) {}
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
}

// Initialize widget when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SessionWidget();
});

// Prevent right-click and dev tools
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && e.key === 'I') || 
      (e.ctrlKey && e.shiftKey && e.key === 'C') || 
      (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
  }
});