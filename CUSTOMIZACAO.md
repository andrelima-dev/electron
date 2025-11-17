# 🎨 CUSTOMIZAÇÃO - Modo Quiosque

## 🎯 Quer Modificar o Comportamento?

Este arquivo mostra como customizar o modo quiosque para suas necessidades específicas.

---

## 1️⃣ Mudar o Atalho de Bloqueio

### Atual: Delete arquivo para encerrar

Para mudar para um atalho de teclado, edite `src/main.js`:

```javascript
// Encontre: mainWindow.webContents.on('before-input-event', ...)

// Adicione nova condição:
if (
  // Seu atalho customizado
  (input.control && input.alt && input.key.toLowerCase() === 'q') // Ctrl+Alt+Q
) {
  kioskEnabled = false;
  app.quit();
}
```

### Atalhos sugeridos:
- `Ctrl + Alt + Q` - Encerrar quiosque
- `Ctrl + Alt + X` - Encerrar quiosque
- `Shift + Ctrl + End` - Encerrar quiosque

---

## 2️⃣ Mudar o Local do Arquivo de Lock

Por padrão: `%APPDATA%\appteste\.quiosque-lock`

Para customizar, edite `src/main.js`:

```javascript
// Encontre essa linha (no início do arquivo):
const KIOSK_LOCK_FILE = path.join(app.getPath('appData'), 'appteste', '.quiosque-lock');

// Mude para (exemplos):

// Opção 1: Usar Documents
const KIOSK_LOCK_FILE = path.join(app.getPath('documents'), '.quiosque-lock');

// Opção 2: Usar Desktop
const KIOSK_LOCK_FILE = path.join(app.getPath('desktop'), '.quiosque-lock');

// Opção 3: Usar temp
const KIOSK_LOCK_FILE = path.join(app.getPath('temp'), 'appteste-lock');

// Opção 4: Usar caminho fixo
const KIOSK_LOCK_FILE = 'C:\\quiosque\\lock-file';
```

---

## 3️⃣ Adicionar Senha para Encerrar

Modifique o script `kiosk-control.js`:

```javascript
// Adicione no início
const readline = require('readline');

function askPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Digite a senha para desativar: ', (answer) => {
    const correctPassword = 'sua-senha-aqui';
    
    if (answer === correctPassword) {
      console.log('✓ Senha correta!');
      disable();
    } else {
      console.error('✗ Senha incorreta!');
    }
    rl.close();
  });
}

// Use em disable():
function disable() {
  askPassword();  // Adicione isso
  // ... resto do código
}
```

---

## 4️⃣ Mudar o Tempo de Delay para Encerramento

Por padrão: 500ms

Para customizar, edite `src/main.js`:

```javascript
// Encontre em watchKioskLockFile():
setTimeout(() => {
  app.quit();
}, 500);  // ← Mude este valor

// Exemplos:
// 0 ms    = Encerra imediatamente (pode causar problemas)
// 500 ms  = Padrão (recomendado)
// 1000 ms = 1 segundo de delay (mais seguro)
// 2000 ms = 2 segundos (muito delay)
```

---

## 5️⃣ Ativar DevTools em Produção (Não recomendado!)

Edite `src/main.js` em `createMainWindow()`:

```javascript
webPreferences: {
  // ...
  devTools: false,  // ← Mude para true
  // ...
}
```

⚠️ **AVISO:** Isso quebra a segurança do quiosque!

---

## 6️⃣ Mudar o Comportamento de Fechamento

### Permitir fechar com Alt+F4 (mas registrar)

Edite `src/main.js`:

```javascript
mainWindow.on('close', (event) => {
  if (kioskEnabled) {
    // Registra tentativa de fechar
    log.warn('Tentativa de fechar a aplicação bloqueada');
    // Não previne o encerramento se quiser permitir
    // event.preventDefault(); ← Remova esta linha
  }
});
```

### Pedir confirmação antes de encerrar

```javascript
mainWindow.on('close', (event) => {
  if (kioskEnabled) {
    // Enviar evento para o frontend pedir confirmação
    mainWindow.webContents.send('app:confirm-close');
    event.preventDefault();
  }
});
```

---

## 7️⃣ Adicionar Notificações ao Encerrar

Edite `src/main.js`:

```javascript
// No topo, adicione:
const { Notification } = require('electron');

// Em watchKioskLockFile(), antes de app.quit():
if (filename === path.basename(KIOSK_LOCK_FILE) && !fs.existsSync(KIOSK_LOCK_FILE)) {
  log.warn('Arquivo de lock do quiosque foi deletado - encerrando aplicação');
  kioskEnabled = false;
  
  // ✨ Adicione notificação:
  new Notification({
    title: 'Modo Quiosque',
    body: 'Aplicação será encerrada em 5 segundos...',
    icon: path.join(__dirname, 'assets', 'icon.png') // Customize se quiser
  }).show();
  
  setTimeout(() => {
    app.quit();
  }, 5000); // 5 segundos em vez de 500ms
}
```

---

## 8️⃣ Log Personalizado

### Salvar logs em arquivo customizado

Edite `src/main.js`:

```javascript
// No topo, adicione:
const fs = require('node:fs');
const path = require('node:path');

function logToFile(message, level = 'info') {
  const logDir = path.join(app.getPath('appData'), 'appteste', 'logs');
  const logFile = path.join(logDir, `kiosk-${new Date().toISOString().split('T')[0]}.log`);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
  
  fs.appendFileSync(logFile, logLine);
}

// Use em watchKioskLockFile():
logToFile('Arquivo de lock deletado - encerrando', 'warn');
```

---

## 9️⃣ Detectar Quem Deletou o Arquivo

Obter informações do arquivo:

```javascript
// Em watchKioskLockFile():
if (filename === path.basename(KIOSK_LOCK_FILE) && !fs.existsSync(KIOSK_LOCK_FILE)) {
  const now = new Date();
  
  log.warn(`Arquivo deletado às ${now.toLocaleString()}`);
  // Nota: Electron não pode detectar quem foi sem recursos do Windows
  
  kioskEnabled = false;
  setTimeout(() => {
    app.quit();
  }, 500);
}
```

---

## 🔟 Adicionar Interface de Admin

Crie uma tela de admin para gerenciar quiosque:

```javascript
// Em src/renderer/admin-panel.html (novo):
<!DOCTYPE html>
<html>
<head>
  <title>Painel Admin</title>
</head>
<body>
  <h1>Painel de Controle</h1>
  <button onclick="disableKiosk()">Desativar Quiosque</button>
  <button onclick="getStatus()">Ver Status</button>
  <p id="status"></p>
  
  <script>
    function disableKiosk() {
      window.api.send('kiosk:disable');
      alert('Quiosque será desativado...');
    }
    
    function getStatus() {
      window.api.send('kiosk:status', (status) => {
        document.getElementById('status').innerText = 
          `Status: ${status.enabled ? 'ATIVADO' : 'DESATIVADO'}`;
      });
    }
  </script>
</body>
</html>
```

---

## 1️⃣1️⃣ Múltiplos Níveis de Proteção

Combine diferentes métodos:

```javascript
// Opção 1: Arquivo + Atalho
if ((input.control && input.alt && input.key === 'q') || kioskLockFileDeleted) {
  app.quit();
}

// Opção 2: Arquivo + Senha
if (kioskLockFileDeleted && passwordCorrect) {
  app.quit();
}

// Opção 3: Arquivo + Tempo
if (kioskLockFileDeleted || (Math.random() < 0.01)) {
  // Pequena chance aleatória de encerrar (teste de segurança)
  app.quit();
}
```

---

## 1️⃣2️⃣ Modo Quiosque Reversível

Permitir entrar/sair do quiosque dinamicamente:

```javascript
// Função para ativar quiosque
function enableKiosk() {
  kioskEnabled = true;
  createKioskLockFile();
  watchKioskLockFile();
  mainWindow.setKiosk(true);
  mainWindow.setFullScreen(true);
}

// Função para desativar quiosque
function disableKiosk() {
  kioskEnabled = false;
  fs.unlinkSync(KIOSK_LOCK_FILE);
  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
}

// Handler IPC para toggle
safeHandle('kiosk:toggle', () => {
  if (kioskEnabled) {
    disableKiosk();
  } else {
    enableKiosk();
  }
  return { enabled: kioskEnabled };
});
```

---

## 1️⃣3️⃣ Monitorar Múltiplos Arquivos

Em vez de deletar, mude conteúdo:

```javascript
// Observar arquivo de configuração
function watchConfigFile() {
  const configFile = path.join(KIOSK_DIR, 'config.json');
  
  fs.watch(configFile, (eventType, filename) => {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      
      if (!config.kioskEnabled) {
        kioskEnabled = false;
        app.quit();
      }
    } catch (e) {
      log.error('Erro ao ler config:', e.message);
    }
  });
}
```

---

## 1️⃣4️⃣ Iniciar Automático Customizado (Linux/Mac)

Para Linux, crie `.desktop` file:

```ini
# ~/.config/autostart/appteste.desktop
[Desktop Entry]
Type=Application
Name=AppTeste
Exec=/caminho/para/app
AutoStart=true
```

Para Mac, edite `src/main.js`:

```javascript
if (process.platform === 'darwin') {
  app.dock.hide(); // Ocultar ícone do dock
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true
  });
}
```

---

## 1️⃣5️⃣ Temas e Estilos Customizados

Adicione ao `createMainWindow()`:

```javascript
// Fullscreen customizado
mainWindow.setBackgroundColor('#000000'); // Fundo preto
mainWindow.setOpacity(1.0); // Opacidade total

// Ocultar menu bar completamente
mainWindow.setMenuBarVisibility(false);

// Definir cursor customizado
mainWindow.webContents.insertCSS(`
  * { cursor: none; } /* Ocultar mouse */
  body { 
    margin: 0; 
    overflow: hidden;
    background-color: #1a1a1a;
  }
`);
```

---

## 🎯 DICAS GERAIS DE CUSTOMIZAÇÃO

### Antes de customizar:

1. ✓ Faça backup de `src/main.js`
2. ✓ Teste em modo desenvolvimento primeiro
3. ✓ Use git para controle de versão
4. ✓ Documente as mudanças

### Boas práticas:

- Use variáveis configuráveis
- Adicione logs para debug
- Teste em produção antes de usar
- Mantenha documentação atualizada

### Customizações populares:

- 🔒 Adicionar senha para desativar
- 📧 Notificar admin quando encerrar
- 📊 Registrar tentativas de acesso
- 🎨 Personalizar interface
- 🌍 Suporte a múltiplos idiomas

---

**Pronto para customizar? Edite `src/main.js` e teste! 🚀**
