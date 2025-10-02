// File Manager JavaScript
class FileManager {
  constructor() {
    this.apiBaseUrl = null;
    this.files = [];
    this.filteredFiles = [];
    
    this.init();
  }

  async init() {
    await this.initializeApi();
    this.setupEventListeners();
    await this.loadStats();
    await this.loadFiles();
  }

  async initializeApi() {
    try {
      const apiInfo = await window.electronAPI.invoke('files:get-api-info');
      if (apiInfo.success) {
        this.apiBaseUrl = apiInfo.baseUrl;
        console.log('API inicializada:', this.apiBaseUrl);
      } else {
        throw new Error(apiInfo.error);
      }
    } catch (error) {
      console.error('Erro ao inicializar API:', error);
      this.showNotification('Erro ao conectar com o servidor de arquivos', 'error');
    }
  }

  setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const searchBox = document.getElementById('searchBox');

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    });

    // File input
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.handleFiles(files);
    });

    // Upload area click
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // Search
    searchBox.addEventListener('input', (e) => {
      this.filterFiles(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.refreshFiles();
      }
    });
  }

  async handleFiles(files) {
    if (!files.length) return;

    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    progressBar.style.display = 'block';
    
    let completed = 0;
    const total = files.length;

    for (const file of files) {
      try {
        await this.uploadFile(file);
        completed++;
        
        const progress = (completed / total) * 100;
        progressFill.style.width = `${progress}%`;
        
        this.showNotification(`Arquivo "${file.name}" enviado com sucesso!`, 'success');
      } catch (error) {
        console.error('Erro no upload:', error);
        this.showNotification(`Erro ao enviar "${file.name}": ${error.message}`, 'error');
      }
    }

    // Hide progress bar after completion
    setTimeout(() => {
      progressBar.style.display = 'none';
      progressFill.style.width = '0%';
    }, 1000);

    // Refresh files list and stats
    await this.loadFiles();
    await this.loadStats();
    
    // Clear file input
    document.getElementById('fileInput').value = '';
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

  async loadFiles() {
    try {
      if (!this.apiBaseUrl) {
        throw new Error('API não inicializada');
      }

      const response = await fetch(`${this.apiBaseUrl}/arquivos`);
      const result = await response.json();

      if (result.success) {
        this.files = result.files || [];
        this.filteredFiles = [...this.files];
        this.renderFiles();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
      this.showNotification('Erro ao carregar arquivos', 'error');
      document.getElementById('filesList').innerHTML = `
        <div class="empty-state">
          <p>Erro ao carregar arquivos</p>
          <button class="upload-btn" onclick="fileManager.loadFiles()">Tentar novamente</button>
        </div>
      `;
    }
  }

  async loadStats() {
    try {
      const statsResult = await window.electronAPI.invoke('files:get-stats');
      if (statsResult.success) {
        const stats = statsResult.stats;
        
        document.getElementById('totalFiles').textContent = stats.totalFiles;
        document.getElementById('totalSize').textContent = `${stats.totalSizeMB} MB`;
        
        if (stats.newestFile) {
          const date = new Date(stats.newestFile.uploadDate);
          document.getElementById('lastUpload').textContent = date.toLocaleDateString('pt-BR');
        } else {
          document.getElementById('lastUpload').textContent = 'Nunca';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  renderFiles() {
    const filesList = document.getElementById('filesList');
    
    if (this.filteredFiles.length === 0) {
      if (this.files.length === 0) {
        filesList.innerHTML = `
          <div class="empty-state">
            <p>📂 Nenhum arquivo enviado ainda</p>
            <p>Comece fazendo upload de alguns arquivos!</p>
          </div>
        `;
      } else {
        filesList.innerHTML = `
          <div class="empty-state">
            <p>🔍 Nenhum arquivo encontrado com os critérios de busca</p>
          </div>
        `;
      }
      return;
    }

    const filesHtml = this.filteredFiles.map(file => {
      const fileType = this.getFileType(file.filename);
      const fileIcon = this.getFileIcon(fileType);
      const formattedSize = this.formatFileSize(file.size);
      const formattedDate = new Date(file.uploadDate).toLocaleString('pt-BR');

      return `
        <div class="file-row">
          <div class="file-icon ${fileType}">${fileIcon}</div>
          <div class="file-name" title="${file.filename}">${file.filename}</div>
          <div class="file-size">${formattedSize}</div>
          <div class="file-date">${formattedDate}</div>
          <div class="file-actions">
            <button class="action-btn btn-download" onclick="fileManager.downloadFile('${file.filename}')">
              📥 Baixar
            </button>
          </div>
          <div class="file-actions">
            <button class="action-btn btn-delete" onclick="fileManager.deleteFile('${file.filename}')">
              🗑️ Excluir
            </button>
          </div>
        </div>
      `;
    }).join('');

    filesList.innerHTML = filesHtml;
  }

  getFileType(filename) {
    const extension = filename.toLowerCase().split('.').pop();
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    const videoTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];

    if (imageTypes.includes(extension)) return 'image';
    if (documentTypes.includes(extension)) return 'document';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    if (archiveTypes.includes(extension)) return 'archive';
    
    return 'other';
  }

  getFileIcon(type) {
    const icons = {
      image: '🖼️',
      document: '📄',
      video: '🎬',
      audio: '🎵',
      archive: '📦',
      other: '📎'
    };
    return icons[type] || icons.other;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  filterFiles(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredFiles = [...this.files];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredFiles = this.files.filter(file => 
        file.filename.toLowerCase().includes(term)
      );
    }
    this.renderFiles();
  }

  async downloadFile(filename) {
    try {
      if (!this.apiBaseUrl) {
        throw new Error('API não inicializada');
      }

      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = `${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showNotification(`Download de "${filename}" iniciado`, 'success');
    } catch (error) {
      console.error('Erro no download:', error);
      this.showNotification(`Erro ao baixar "${filename}"`, 'error');
    }
  }

  async deleteFile(filename) {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${filename}"?`)) {
      return;
    }

    try {
      if (!this.apiBaseUrl) {
        throw new Error('API não inicializada');
      }

      const response = await fetch(`${this.apiBaseUrl}/arquivos/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        this.showNotification(`Arquivo "${filename}" excluído com sucesso`, 'success');
        await this.loadFiles();
        await this.loadStats();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      this.showNotification(`Erro ao excluir "${filename}": ${error.message}`, 'error');
    }
  }

  async refreshFiles() {
    this.showNotification('Atualizando lista de arquivos...', 'info');
    await this.loadFiles();
    await this.loadStats();
    this.showNotification('Lista atualizada!', 'success');
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Global functions for button clicks
window.refreshFiles = () => fileManager.refreshFiles();

// Initialize file manager when page loads
let fileManager;
document.addEventListener('DOMContentLoaded', () => {
  fileManager = new FileManager();
});

// Expose fileManager globally for debugging
window.fileManager = fileManager;