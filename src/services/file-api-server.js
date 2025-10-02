const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

class FileApiServer {
  constructor(uploadsPath, port = 3001) {
    this.app = express();
    this.uploadsPath = uploadsPath;
    this.port = port;
    this.server = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Configurar CORS para permitir requisições do renderer
    this.app.use(cors());
    this.app.use(express.json());
    
    // Garantir que o diretório de uploads existe
    this.ensureUploadsDirectory();
  }

  async ensureUploadsDirectory() {
    try {
      await fs.access(this.uploadsPath);
    } catch (error) {
      // Diretório não existe, criar
      await fs.mkdir(this.uploadsPath, { recursive: true });
      console.log(`Diretório de uploads criado: ${this.uploadsPath}`);
    }
  }

  setupRoutes() {
    // Configurar Multer para upload de arquivos
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadsPath);
      },
      filename: (req, file, cb) => {
        // Gerar nome único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        cb(null, `${baseName}-${uniqueSuffix}${extension}`);
      }
    });

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 100 * 1024 * 1024 // Limite de 100MB
      },
      fileFilter: (req, file, cb) => {
        // Filtro básico - pode ser customizado conforme necessário
        console.log(`Recebendo arquivo: ${file.originalname}`);
        cb(null, true);
      }
    });

    // Endpoint para upload de arquivo único
    this.app.post('/upload', upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ 
            success: false, 
            message: 'Nenhum arquivo foi enviado' 
          });
        }

        const fileInfo = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadDate: new Date().toISOString(),
          path: req.file.path
        };

        console.log(`Arquivo salvo: ${fileInfo.filename}`);
        
        res.json({
          success: true,
          message: 'Arquivo enviado com sucesso',
          file: fileInfo
        });
      } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          error: error.message
        });
      }
    });

    // Endpoint para listar arquivos
    this.app.get('/arquivos', async (req, res) => {
      try {
        const files = await fs.readdir(this.uploadsPath);
        const fileList = [];

        for (const filename of files) {
          try {
            const filePath = path.join(this.uploadsPath, filename);
            const stats = await fs.stat(filePath);
            
            fileList.push({
              filename: filename,
              size: stats.size,
              uploadDate: stats.birthtime.toISOString(),
              modifiedDate: stats.mtime.toISOString()
            });
          } catch (statError) {
            console.error(`Erro ao obter informações do arquivo ${filename}:`, statError);
          }
        }

        res.json({
          success: true,
          files: fileList
        });
      } catch (error) {
        console.error('Erro ao listar arquivos:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao listar arquivos',
          error: error.message
        });
      }
    });

    // Endpoint para download de arquivo
    this.app.get('/download/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(this.uploadsPath, filename);

        // Verificar se o arquivo existe
        try {
          await fs.access(filePath);
        } catch (error) {
          return res.status(404).json({
            success: false,
            message: 'Arquivo não encontrado'
          });
        }

        // Enviar o arquivo
        res.download(filePath, (err) => {
          if (err) {
            console.error('Erro no download:', err);
            res.status(500).json({
              success: false,
              message: 'Erro ao baixar arquivo'
            });
          }
        });
      } catch (error) {
        console.error('Erro no download:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          error: error.message
        });
      }
    });

    // Endpoint para deletar arquivo
    this.app.delete('/arquivos/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(this.uploadsPath, filename);

        // Verificar se o arquivo existe
        try {
          await fs.access(filePath);
        } catch (error) {
          return res.status(404).json({
            success: false,
            message: 'Arquivo não encontrado'
          });
        }

        // Deletar o arquivo
        await fs.unlink(filePath);
        
        res.json({
          success: true,
          message: 'Arquivo deletado com sucesso'
        });
      } catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        res.status(500).json({
          success: false,
          message: 'Erro ao deletar arquivo',
          error: error.message
        });
      }
    });

    // Endpoint de status
    this.app.get('/status', (req, res) => {
      res.json({
        success: true,
        message: 'Servidor de arquivos funcionando',
        uploadsPath: this.uploadsPath,
        timestamp: new Date().toISOString()
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, 'localhost', (error) => {
        if (error) {
          console.error(`Erro ao iniciar servidor na porta ${this.port}:`, error);
          reject(error);
        } else {
          console.log(`Servidor de arquivos rodando em http://localhost:${this.port}`);
          console.log(`Diretório de uploads: ${this.uploadsPath}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Servidor de arquivos parado');
          resolve();
        });
      });
    }
  }

  getPort() {
    return this.port;
  }

  getUploadsPath() {
    return this.uploadsPath;
  }
}

module.exports = FileApiServer;