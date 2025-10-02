# Sistema de Gerenciamento de Arquivos - Electron

## Visão Geral

Este sistema implementa uma funcionalidade completa de gerenciamento de arquivos dentro de uma aplicação Electron, usando uma arquitetura modular com API web local rodando internamente no processo main.

## Arquitetura

### Componentes Principais

1. **FileApiServer** (`src/services/file-api-server.js`)
   - Servidor Express.js que roda internamente no processo main
   - Gerencia endpoints para upload, listagem, download e exclusão de arquivos
   - Utiliza Multer para manipulação de arquivos multipart/form-data
   - Porta padrão: 3001

2. **FileService** (`src/services/file-service.js`)
   - Camada de abstração para operações de arquivo
   - Gerencia metadados em cache e arquivo JSON
   - Preparado para futura integração com banco de dados
   - Oferece funcionalidades avançadas como tags e estatísticas

3. **Frontend** (`src/renderer/pages/files/`)
   - Interface web responsiva para gerenciamento de arquivos
   - Suporte a drag-and-drop
   - Busca e filtragem de arquivos
   - Estatísticas em tempo real

## Recursos Implementados

### Upload de Arquivos
- ✅ Interface drag-and-drop
- ✅ Seleção múltipla de arquivos
- ✅ Barra de progresso
- ✅ Limite de 10MB por arquivo
- ✅ Geração de nomes únicos para evitar conflitos
- ✅ Suporte a todos os tipos de arquivo

### Gerenciamento de Arquivos
- ✅ Listagem com ícones por tipo de arquivo
- ✅ Informações detalhadas (nome, tamanho, data)
- ✅ Download de arquivos
- ✅ Exclusão de arquivos
- ✅ Busca por nome de arquivo

### Estatísticas
- ✅ Total de arquivos
- ✅ Espaço utilizado
- ✅ Data do último upload
- ✅ Distribuição por tipo de arquivo

### Compatibilidade com Empacotamento
- ✅ Uso de `app.getPath('userData')` para diretório dinâmico
- ✅ Funciona após empacotamento com Electron-Builder
- ✅ Não depende de caminhos relativos fixos

## Estrutura de Arquivos

```
src/
├── services/
│   ├── file-api-server.js    # Servidor Express interno
│   └── file-service.js       # Camada de abstração
├── renderer/
│   └── pages/
│       └── files/
│           ├── index.html     # Interface principal
│           └── file-manager.js # Lógica do frontend
└── main.js                   # Integração com processo main
```

## Endpoints da API

### POST /upload
Envia um arquivo para o servidor.
- **Body**: multipart/form-data com campo `file`
- **Response**: Informações do arquivo enviado

### GET /arquivos
Lista todos os arquivos enviados.
- **Response**: Array com informações dos arquivos

### GET /download/:filename
Baixa um arquivo específico.
- **Params**: `filename` - nome do arquivo

### DELETE /arquivos/:filename
Exclui um arquivo específico.
- **Params**: `filename` - nome do arquivo

### GET /status
Retorna status do servidor e configurações.

## Comunicação IPC

### Handlers Disponíveis
- `files:get-api-info` - Obtém informações da API (porta, URL base)
- `files:get-stats` - Obtém estatísticas dos arquivos
- `files:search-by-tags` - Busca arquivos por tags (futuro)
- `files:update-tags` - Atualiza tags de um arquivo (futuro)
- `files:cleanup-old` - Remove arquivos antigos (manutenção)

## Configuração

### Diretório de Armazenamento
O sistema utiliza `app.getPath('userData')` + `/uploads` como diretório base:

- **Windows**: `%APPDATA%/[app-name]/uploads`
- **macOS**: `~/Library/Application Support/[app-name]/uploads`
- **Linux**: `~/.config/[app-name]/uploads`

### Porta do Servidor
- Porta padrão: 3001
- Configurável no construtor do FileApiServer

## Uso

### Inicialização
O sistema é inicializado automaticamente quando a aplicação Electron inicia:

```javascript
// No main.js
await initializeFileServices();
```

### Acesso à Interface
Navegue para a página de arquivos através do link na tela de login ou diretamente:
```
src/renderer/pages/files/index.html
```

## Segurança

### Medidas Implementadas
- ✅ CORS configurado para localhost apenas
- ✅ Limite de tamanho de arquivo (10MB)
- ✅ Validação de arquivos no servidor
- ✅ Nomes únicos para evitar conflitos
- ✅ Sandbox ativo no renderer process

## Futuras Melhorias

### Banco de Dados
O FileService está preparado para integração com banco de dados:
- Metadados já estruturados em formato JSON
- Interface abstrata para operações CRUD
- Sistema de tags preparado

### Funcionalidades Adicionais
- [ ] Tags e categorização
- [ ] Miniaturas para imagens
- [ ] Compressão automática
- [ ] Sincronização com nuvem
- [ ] Controle de versões
- [ ] Auditoria de acesso

### Melhorias de Performance
- [ ] Cache de miniaturas
- [ ] Paginação para grandes volumes
- [ ] Compressão de resposta HTTP
- [ ] Lazy loading de arquivos

## Solução de Problemas

### Problemas Comuns

1. **Servidor não inicia**
   - Verificar se a porta 3001 está disponível
   - Conferir logs no console do main process

2. **Arquivos não aparecem**
   - Verificar permissões no diretório userData
   - Conferir arquivo de metadados `.metadata.json`

3. **Upload falha**
   - Verificar tamanho do arquivo (máximo 10MB)
   - Conferir conexão com a API local

### Logs
Logs importantes são enviados para o console:
```javascript
const log = createLogger('main');
```

## Dependências

### Produção
- `express` - Servidor web
- `multer` - Upload de arquivos
- `cors` - Controle de CORS
- `path` - Manipulação de caminhos

### Desenvolvimento
Utiliza as dependências existentes do projeto Electron.

## Testando

### Desenvolvimento
```bash
npm start
```

### Empacotamento
```bash
npm run build  # (se configurado)
```

## Considerações Finais

Este sistema foi projetado para ser:
- **Modular**: Fácil de estender e modificar
- **Compatível**: Funciona em desenvolvimento e empacotado
- **Seguro**: Seguindo boas práticas de segurança
- **Performático**: Otimizado para uso local
- **Preparado para o futuro**: Arquitetura permite expansão

A implementação atual atende todos os requisitos especificados e está pronta para uso em produção.