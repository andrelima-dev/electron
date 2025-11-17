# Modo Quiosque - Documentação

## 📋 Visão Geral

A aplicação agora está configurada para funcionar em **modo quiosque** (kiosk mode). Isso significa que:

- ✅ A aplicação inicia em tela cheia (fullscreen)
- ✅ Todos os atalhos perigosos são bloqueados (Alt+F4, Ctrl+Q, F12, etc.)
- ✅ A aplicação se inicia automaticamente quando o computador liga (no Windows)
- ✅ O menu de contexto e barra de ferramentas são ocultos
- ✅ A aplicação só pode ser encerrada se um arquivo específico de "lock" for deletado

## 🔧 Como Funciona

### Arquivo de Lock do Quiosque

O funcionamento do quiosque é baseado em um arquivo de lock (``.quiosque-lock``) armazenado em:

```
Windows:  %APPDATA%\appteste\.quiosque-lock
Linux:    ~/.config/appteste/.quiosque-lock
macOS:    ~/Library/Application Support/appteste/.quiosque-lock
```

**Enquanto este arquivo existe:** A aplicação está em modo quiosque ativo e não pode ser encerrada normalmente.

**Quando o arquivo é deletado:** A aplicação detecta a exclusão e se encerra automaticamente.

## 🚀 Como Usar

### 1. Ativar Modo Quiosque

O modo quiosque é ativado automaticamente ao iniciar a aplicação. O arquivo de lock é criado automaticamente.

```bash
npm start
```

### 2. Desativar Modo Quiosque (Encerrar a Aplicação)

Para desativar o modo quiosque e encerrar a aplicação, você tem 3 opções:

#### Opção A: Usar o Script de Controle

```bash
node kiosk-control.js disable
```

Ou verificar o status:

```bash
node kiosk-control.js status
```

#### Opção B: Deletar o Arquivo Manualmente

Abra o Explorador de Arquivos e navegue até:

```
%APPDATA%\appteste\.quiosque-lock
```

Pressione a tecla Windows + R e cole:

```
%APPDATA%\appteste
```

Depois delete o arquivo `.quiosque-lock`

#### Opção C: Pelo PowerShell/Terminal

```powershell
# Windows
Remove-Item "$env:APPDATA\appteste\.quiosque-lock"

# Linux/macOS
rm ~/.config/appteste/.quiosque-lock
```

Após deletar o arquivo, a aplicação será encerrada automaticamente em alguns segundos.

## 🔑 Iniciação Automática no Windows

No Windows, a aplicação foi configurada para iniciar automaticamente quando o computador liga. Isso é feito através do Registro do Windows.

### Verificar se está configurado corretamente:

1. Pressione `Win + R`
2. Digite `msconfig` e pressione Enter
3. Vá para a aba "Inicialização"
4. Procure por "AppTeste" na lista
5. Certifique-se de que está marcado

### Configurar manualmente:

Se a configuração automática não funcionar (pode ser necessário ser administrador), você pode:

1. Pressione `Win + R`
2. Digite `shell:startup` e pressione Enter
3. Crie um atalho para o executável da aplicação nesta pasta

## 🛡️ Proteções de Segurança

Os seguintes atalhos de teclado estão bloqueados em modo quiosque:

| Atalho | Ação Bloqueada |
|--------|----------------|
| `Alt + F4` | Fechar janela |
| `Ctrl + Q` | Encerrar aplicação |
| `Ctrl + W` | Fechar aba |
| `F11` | Alternar tela cheia |
| `F12` | Abrir DevTools |
| `Ctrl + Shift + I` | Abrir DevTools |
| `Ctrl + Shift + C` | Inspecionar elemento |

## 📁 Estrutura de Arquivos

```
c:\Users\[user]\AppData\Roaming\appteste\
├── .quiosque-lock        ← Arquivo que controla o modo quiosque
└── [outros arquivos]
```

## 🔍 Monitoramento e Logs

A aplicação monitora continuamente o arquivo de lock. Você pode ver os logs:

- **Windows**: Verifique o console do Electron (em desenvolvimento)
- **Logs**: Verifique os arquivos de log em `AppData\Roaming\appteste\logs\`

## ⚙️ Desenvolvimento

Para **desativar o modo quiosque durante o desenvolvimento**, você pode:

1. Editar `src/main.js` e mudar `isDev` para true
2. Ou usar variável de ambiente: `set NODE_ENV=development`
3. Ou comentar a chamada `watchKioskLockFile()` no `main.js`

## 🐛 Troubleshooting

### A aplicação não inicia automaticamente no boot

- Verifique se você tem permissões de administrador
- Execute `node kiosk-control.js enable` manualmente
- Verifique o arquivo `.quiosque-lock` existe em `%APPDATA%\appteste\`

### Não consigo deletar o arquivo `.quiosque-lock`

- A aplicação pode estar usando o arquivo
- Certifique-se de que a aplicação foi encerrada completamente
- Tente usar o PowerShell como administrador

### A aplicação não responde ao arquivo ser deletado

- Reinicie a aplicação manualmente
- Verifique se o arquivo foi realmente deletado (pode haver delay)
- Aguarde alguns segundos após deletar o arquivo

## 📞 Suporte

Para mais informações sobre a implementação do quiosque, veja:

- `src/main.js` - Lógica principal do quiosque
- `src/common/kiosk-manager.js` - Gerenciador de quiosque
- `kiosk-control.js` - Script de controle
