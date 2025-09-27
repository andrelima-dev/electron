class SessionManager {
  constructor() {
    this.sessionData = null;
    this.timer = null;
    this.timeRemaining = 0;
    this.totalTime = 0;
    this.isMinimized = false;
    this.warningTimes = [];
    this.shownWarnings = new Set();

    this.initializeElements();
    this.bindEvents();
    this.loadSessionData();
  }

  initializeElements() {
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
    
    // Status elements
    this.sessionStatusEl = document.getElementById('session-status');
    
    // Control elements
    this.minimizeBtnEl = document.getElementById('minimize-btn');
    this.closeSessionBtnEl = document.getElementById('close-session-btn');
    
    // Modal elements
    this.warningModalEl = document.getElementById('warning-modal');
    this.warningMessageEl = document.getElementById('warning-message');
    this.warningOkBtnEl = document.getElementById('warning-ok');
    this.sessionEndModalEl = document.getElementById('session-end-modal');
    this.sessionEndOkBtnEl = document.getElementById('session-end-ok');
    
    // Container
    this.containerEl = document.querySelector('.session-container');
  }

  bindEvents() {
    this.minimizeBtnEl.addEventListener('click', () => this.toggleMinimize());
    this.closeSessionBtnEl.addEventListener('click', () => this.endSession());
    this.warningOkBtnEl.addEventListener('click', () => this.hideWarningModal());
    this.sessionEndOkBtnEl.addEventListener('click', () => this.returnToLogin());
    
    // Prevent closing the window accidentally
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }

  async loadSessionData() {
    try {
      // Get user session data from electron
      const context = await window.electron.getAppContext();
      this.sessionData = context.currentUser;
      
      if (!this.sessionData) {
        this.returnToLogin();
        return;
      }

      this.setupSession();
    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
      this.returnToLogin();
    }
  }

  setupSession() {
    // Set user info
    this.userNameEl.textContent = this.sessionData.name;
    this.userOabEl.textContent = `OAB: ${this.sessionData.oab}`;
    this.userTypeEl.textContent = `Tipo: ${this.sessionData.type === 'advogado' ? 'Advogado' : 'Estagiário'}`;
    
    // Set timer based on user type
    if (this.sessionData.type === 'advogado') {
      this.totalTime = 180 * 60; // 180 minutes in seconds
      this.timerTypeEl.textContent = 'Sessão de Advogado (180 min)';
      // Warning times: 30, 90, 120, 150, 170 minutes (remaining time warnings)
      this.warningTimes = [150*60, 90*60, 60*60, 30*60, 10*60]; // seconds remaining
    } else {
      this.totalTime = 120 * 60; // 120 minutes in seconds
      this.timerTypeEl.textContent = 'Sessão de Estagiário (120 min)';
      // Warning times: 30, 60, 90, 110 minutes (remaining time warnings)
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
    
    this.hoursEl.textContent = hours.toString().padStart(2, '0');
    this.minutesEl.textContent = minutes.toString().padStart(2, '0');
    this.secondsEl.textContent = seconds.toString().padStart(2, '0');
    
    // Update progress bar
    const progress = (this.timeRemaining / this.totalTime) * 100;
    this.progressFillEl.style.width = `${progress}%`;
    
    // Update status color based on time remaining
    const minutesRemaining = Math.floor(this.timeRemaining / 60);
    
    this.sessionStatusEl.className = 'session-status';
    
    if (minutesRemaining <= 10) {
      this.sessionStatusEl.classList.add('critical');
      this.sessionStatusEl.innerHTML = '<div class="status-icon">⚠️</div><span>Sessão crítica - Encerrando em breve!</span>';
    } else if (minutesRemaining <= 30) {
      this.sessionStatusEl.classList.add('warning');
      this.sessionStatusEl.innerHTML = '<div class="status-icon">⏰</div><span>Atenção - Tempo limitado!</span>';
    } else {
      this.sessionStatusEl.innerHTML = '<div class="status-icon">✓</div><span>Sessão ativa</span>';
    }
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
    
    // Play notification sound (if available)
    this.playNotificationSound();
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
    // Try to play notification sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMeBC2N2O2oXk8ODVan5e2iUwMISUG3z/OFvhQJBkW7zO2aUBMOD0Kx0/ql7BgdEEL8gqbGIg6b9+a7ejQ3D3fI8NSNeAgZYbzr55hMEg1Spu3xvm4a');
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore errors
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    
    if (this.isMinimized) {
      this.containerEl.classList.add('minimized');
      this.minimizeBtnEl.textContent = '□';
    } else {
      this.containerEl.classList.remove('minimized');
      this.minimizeBtnEl.textContent = '−';
    }
  }

  timeUp() {
    clearInterval(this.timer);
    this.showSessionEndModal();
  }

  async endSession() {
    try {
      clearInterval(this.timer);
      await window.electron.releaseWorkstation({ reason: 'user_requested' });
      this.returnToLogin();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      this.returnToLogin();
    }
  }

  returnToLogin() {
    window.location.href = './index.html';
  }
}

// Initialize session manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SessionManager();
});

// Prevent right-click context menu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Prevent F12, Ctrl+Shift+I, etc.
document.addEventListener('keydown', (e) => {
  if (e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && e.key === 'I') || 
      (e.ctrlKey && e.shiftKey && e.key === 'C') || 
      (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
  }
});