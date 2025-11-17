# 🎯 Modo Quiosque - Guia de Instalação e Uso

## ✨ Resumo das Mudanças

Sua aplicação Electron agora está configurada em **modo quiosque (kiosk mode)**:

### ✅ O que foi implementado:

1. **Tela Cheia Automática** - A aplicação inicia em fullscreen
2. **Bloqueio de Atalhos** - Alt+F4, Ctrl+Q, F12 e outros estão bloqueados
3. **Arquivo de Lock** - Apenas deletando um arquivo específico a app encerra
4. **Inicialização Automática** - No Windows, a app inicia quando o PC liga
5. **Monitoramento Contínuo** - A app detecta quando o arquivo de lock é deletado
6. **Script de Controle** - Ferramentas para gerenciar o quiosque

---

## 🚀 Como Usar

### Passo 1: Instalar Dependências

```bash
npm install
```

Foi adicionada a dependência `winreg` para gerenciar a inicialização automática no Windows.

### Passo 2: Executar a Aplicação

```bash
npm start
```

Ou iniciar com Electron diretamente:

```bash
npx electron .
```

### Passo 3: Encerrar a Aplicação

A aplicação só pode ser encerrada em 3 formas:

#### **Opção 1: Usar o Script (Recomendado)**

```bash
node kiosk-control.js disable
```

#### **Opção 2: Deletar o Arquivo Manualmente**

Localize e delete o arquivo:
```
Windows:  %APPDATA%\appteste\.quiosque-lock
Linux:    ~/.config/appteste/.quiosque-lock  
macOS:    ~/Library/Application Support/appteste/.quiosque-lock
```

#### **Opção 3: PowerShell**

```powershell
Remove-Item "$env:APPDATA\appteste\.quiosque-lock"
```

---

## 📁 Arquivos Modificados

### 1. **src/main.js** - Arquivo Principal
- ✅ Adicionadas variáveis de controle do quiosque
- ✅ Função `createKioskLockFile()` - Cria arquivo de lock
- ✅ Função `watchKioskLockFile()` - Monitora exclusão do arquivo
- ✅ Função `setupWindowsAutoStart()` - Configura inicialização automática
- ✅ Bloqueio de fechamento quando em modo quiosque
- ✅ Handler IPC `kiosk:status` - Status do quiosque

### 2. **src/common/kiosk-manager.js** - NOVO
- Classe `KioskManager` para gerenciar o quiosque
- Métodos para criar, remover e verificar arquivo de lock

### 3. **kiosk-control.js** - NOVO
- Script executável para gerenciar o quiosque
- Comandos: `enable`, `disable`, `status`, `help`

### 4. **docs/KIOSK_MODE.md** - NOVO
- Documentação completa sobre o modo quiosque
- Troubleshooting e FAQs

### 5. **package.json** - MODIFICADO
- Adicionada dependência: `winreg` (para registro do Windows)

---

## 🔧 Como Funciona Internamente

### Fluxo de Funcionamento:

```
App Inicia
   ↓
Cria Arquivo de Lock: %APPDATA%\appteste\.quiosque-lock
   ↓
Monitora Arquivo de Lock
   ↓
Usuário tenta fechar? → Bloqueado (Alt+F4, Ctrl+Q, etc)
   ↓
Arquivo deletado? → Detecta e encerra a app automaticamente
```

### Exemplo de Arquivo de Lock:

```json
{
  "created": "2025-11-17T10:30:00.000Z",
  "app": "appteste",
  "pid": 12345
}
```

---

## 📊 Verificar Status

Para verificar se o quiosque está ativo:

```bash
node kiosk-control.js status
```

Saída esperada:
```
✓ Modo quiosque: ATIVADO
  Arquivo: C:\Users\seu_usuario\AppData\Roaming\appteste\.quiosque-lock
  Criado em: 2025-11-17T10:30:00.000Z
```

---

## 🛡️ Proteções Implementadas

| Atalho | Status |
|--------|--------|
| Alt + F4 | ❌ Bloqueado |
| Ctrl + Q | ❌ Bloqueado |
| Ctrl + W | ❌ Bloqueado |
| F11 (Fullscreen Toggle) | ❌ Bloqueado |
| F12 (DevTools) | ❌ Bloqueado |
| Ctrl + Shift + I (DevTools) | ❌ Bloqueado |
| Ctrl + Shift + C (Inspecionar) | ❌ Bloqueado |

---

## 🚨 Inicialização Automática (Windows)

A aplicação tenta se registrar no Registro do Windows para iniciar automaticamente no boot.

### Se não funcionar automaticamente:

**Opção 1: Usar msconfig**
1. Pressione `Win + R`
2. Digite `msconfig`
3. Vá para "Inicialização"
4. Procure por "AppTeste" e marque
5. Clique OK

**Opção 2: Pasta Startup**
1. Pressione `Win + R`
2. Digite `shell:startup`
3. Crie um atalho para o executável da aplicação lá

---

## 🔍 Logs e Debugging

Os logs são salvos em:
```
%APPDATA%\appteste\logs\
```

Para ver logs em tempo real (desenvolvimento):
```bash
set NODE_ENV=development
npm start
```

---

## ⚙️ Desativar Modo Quiosque (Desenvolvimento)

Se precisar desativar durante desenvolvimento:

1. **Editar main.js**: Comentar `watchKioskLockFile()`
2. **Ou usar variável de ambiente**: `set NODE_ENV=development`
3. **Ou remover arquivo de lock manualmente**

---

## 🐛 Troubleshooting

### Problema: Aplicação não fecha ao deletar arquivo

**Solução:**
- Aguarde alguns segundos (o monitoramento tem um delay)
- Certifique-se de que deletou o arquivo correto
- Reinicie a aplicação e tente novamente

### Problema: Não consigo deletar o arquivo

**Solução:**
- A aplicação pode estar travada - finalize pelo Gerenciador de Tarefas
- Use PowerShell como administrador
- Reinicie o computador e tente novamente

### Problema: Aplicação não inicia automaticamente no boot

**Solução:**
- Execute como administrador: `npm start`
- Verifique se tem permissões no Registro do Windows
- Configure manualmente na pasta `shell:startup`

### Problema: Arquivo de lock não é criado

**Solução:**
- Verifique permissões em `%APPDATA%\appteste\`
- Execute como administrador
- Crie manualmente a pasta `appteste` em AppData

---

## 📚 Arquivos de Referência

```
projeto/
├── src/
│   ├── main.js .......................... Arquivo principal (modificado)
│   ├── common/
│   │   └── kiosk-manager.js ............ Gerenciador de quiosque (novo)
│   └── ...
├── kiosk-control.js .................... Script de controle (novo)
├── docs/
│   └── KIOSK_MODE.md ................... Documentação detalhada (novo)
├── package.json ........................ Dependências (modificado)
└── README.md
```

---

## 🎯 Próximos Passos

1. ✅ Instale as dependências: `npm install`
2. ✅ Teste a aplicação: `npm start`
3. ✅ Teste deletar o arquivo: `node kiosk-control.js disable`
4. ✅ Verifique inicialização automática no próximo boot
5. ✅ Leia `docs/KIOSK_MODE.md` para mais detalhes

---

## 📞 Suporte

Para dúvidas específicas sobre a implementação:
- Veja `docs/KIOSK_MODE.md` (documentação completa)
- Revise `src/main.js` (implementação técnica)
- Execute `node kiosk-control.js help` (ajuda do script)

**Bom uso! 🚀**
