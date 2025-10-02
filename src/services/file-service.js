const fs = require('fs').promises;
const path = require('path');

/**
 * Serviço de Arquivos - Camada de Abstração
 * 
 * Esta classe fornece uma interface abstrata para operações de arquivo,
 * permitindo que no futuro seja facilmente integrada com um banco de dados
 * sem alterar a lógica de negócio da aplicação.
 */
class FileService {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.metadataFile = path.join(storagePath, '.metadata.json');
    this.metadata = new Map(); // Cache em memória dos metadados
    
    this.initializeService();
  }

  async initializeService() {
    try {
      // Garantir que o diretório existe
      await fs.mkdir(this.storagePath, { recursive: true });
      
      // Carregar metadados existentes
      await this.loadMetadata();
      
      console.log(`FileService inicializado em: ${this.storagePath}`);
    } catch (error) {
      console.error('Erro ao inicializar FileService:', error);
    }
  }

  /**
   * Carrega metadados do arquivo de configuração
   */
  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf8');
      const metadataArray = JSON.parse(data);
      
      this.metadata.clear();
      metadataArray.forEach(item => {
        this.metadata.set(item.filename, item);
      });
      
      console.log(`Carregados ${this.metadata.size} arquivos de metadados`);
    } catch (error) {
      // Arquivo não existe ainda, começar com metadados vazios
      console.log('Arquivo de metadados não encontrado, iniciando limpo');
      this.metadata.clear();
    }
  }

  /**
   * Salva metadados no arquivo de configuração
   */
  async saveMetadata() {
    try {
      const metadataArray = Array.from(this.metadata.values());
      await fs.writeFile(this.metadataFile, JSON.stringify(metadataArray, null, 2));
    } catch (error) {
      console.error('Erro ao salvar metadados:', error);
    }
  }

  /**
   * Registra um novo arquivo no sistema
   * @param {Object} fileInfo - Informações do arquivo
   * @returns {Object} - Arquivo registrado com ID único
   */
  async registerFile(fileInfo) {
    try {
      const fileId = this.generateFileId();
      const registeredFile = {
        id: fileId,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype,
        path: fileInfo.path,
        uploadDate: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        tags: [], // Para futuras funcionalidades
        metadata: {} // Para futuras extensões
      };

      this.metadata.set(fileInfo.filename, registeredFile);
      await this.saveMetadata();

      console.log(`Arquivo registrado: ${registeredFile.originalName} (ID: ${fileId})`);
      return registeredFile;
    } catch (error) {
      console.error('Erro ao registrar arquivo:', error);
      throw error;
    }
  }

  /**
   * Busca informações de um arquivo pelo nome
   * @param {string} filename - Nome do arquivo
   * @returns {Object|null} - Informações do arquivo ou null se não encontrado
   */
  async getFileInfo(filename) {
    const fileInfo = this.metadata.get(filename);
    if (fileInfo) {
      // Atualizar último acesso
      fileInfo.lastAccessed = new Date().toISOString();
      await this.saveMetadata();
    }
    return fileInfo || null;
  }

  /**
   * Lista todos os arquivos registrados
   * @param {Object} options - Opções de filtragem e ordenação
   * @returns {Array} - Lista de arquivos
   */
  async listFiles(options = {}) {
    try {
      let files = Array.from(this.metadata.values());

      // Filtrar por tipo MIME se especificado
      if (options.mimetype) {
        files = files.filter(file => file.mimetype.includes(options.mimetype));
      }

      // Filtrar por tags se especificado
      if (options.tags && options.tags.length > 0) {
        files = files.filter(file => 
          options.tags.some(tag => file.tags.includes(tag))
        );
      }

      // Ordenar
      const sortBy = options.sortBy || 'uploadDate';
      const sortOrder = options.sortOrder || 'desc';
      
      files.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'uploadDate' || sortBy === 'lastAccessed') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Aplicar limite se especificado
      if (options.limit) {
        files = files.slice(0, options.limit);
      }

      return files;
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      return [];
    }
  }

  /**
   * Remove um arquivo do sistema
   * @param {string} filename - Nome do arquivo
   * @returns {boolean} - Sucesso da operação
   */
  async removeFile(filename) {
    try {
      const fileInfo = this.metadata.get(filename);
      if (!fileInfo) {
        console.log(`Arquivo não encontrado nos metadados: ${filename}`);
        return false;
      }

      // Remover arquivo físico
      const filePath = path.join(this.storagePath, filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Arquivo físico não encontrado: ${filename}`);
      }

      // Remover dos metadados
      this.metadata.delete(filename);
      await this.saveMetadata();

      console.log(`Arquivo removido: ${filename}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      return false;
    }
  }

  /**
   * Atualiza tags de um arquivo
   * @param {string} filename - Nome do arquivo
   * @param {Array} tags - Array de tags
   * @returns {boolean} - Sucesso da operação
   */
  async updateFileTags(filename, tags) {
    try {
      const fileInfo = this.metadata.get(filename);
      if (!fileInfo) {
        return false;
      }

      fileInfo.tags = tags || [];
      fileInfo.lastModified = new Date().toISOString();
      
      await this.saveMetadata();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      return false;
    }
  }

  /**
   * Busca arquivos por tags
   * @param {Array} tags - Tags para buscar
   * @returns {Array} - Arquivos que contêm pelo menos uma das tags
   */
  async searchByTags(tags) {
    return this.listFiles({ tags });
  }

  /**
   * Obtém estatísticas do sistema de arquivos
   * @returns {Object} - Estatísticas
   */
  async getStats() {
    try {
      const files = Array.from(this.metadata.values());
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      const mimetypes = {};
      files.forEach(file => {
        const type = file.mimetype.split('/')[0];
        mimetypes[type] = (mimetypes[type] || 0) + 1;
      });

      return {
        totalFiles: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        mimetypeDistribution: mimetypes,
        oldestFile: files.length > 0 ? files.reduce((oldest, file) => 
          new Date(file.uploadDate) < new Date(oldest.uploadDate) ? file : oldest
        ) : null,
        newestFile: files.length > 0 ? files.reduce((newest, file) => 
          new Date(file.uploadDate) > new Date(newest.uploadDate) ? file : newest
        ) : null
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        mimetypeDistribution: {},
        oldestFile: null,
        newestFile: null
      };
    }
  }

  /**
   * Gera um ID único para o arquivo
   * @returns {string} - ID único
   */
  generateFileId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Limpa arquivos antigos (para manutenção)
   * @param {number} daysOld - Arquivos mais antigos que X dias
   * @returns {Array} - Arquivos removidos
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const files = Array.from(this.metadata.values());
      const oldFiles = files.filter(file => 
        new Date(file.uploadDate) < cutoffDate
      );

      const removedFiles = [];
      for (const file of oldFiles) {
        const success = await this.removeFile(file.filename);
        if (success) {
          removedFiles.push(file);
        }
      }

      console.log(`Limpeza concluída: ${removedFiles.length} arquivos removidos`);
      return removedFiles;
    } catch (error) {
      console.error('Erro na limpeza de arquivos antigos:', error);
      return [];
    }
  }
}

module.exports = FileService;