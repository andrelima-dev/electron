# ⚡ REFERÊNCIA RÁPIDA - Modo Quiosque

## 🎯 1 Minuto - Começar Agora

```powershell
# Instalar
npm install

# Executar
npm start

# Encerrar
node kiosk-control.js disable
```

---

## 📚 Documentos Principais

| Documento | Para Quem | Quando Usar |
|-----------|-----------|------------|
| **START_HERE.md** | Todos | 1º contact |
| **QUIOSQUE_VISUAL.md** | Iniciantes | Detalhes visuais |
| **LEIA-ME.txt** | Todos | Overview rápido |
| **TESTE_QUIOSQUE.md** | Testers | Validação |
| **KIOSK_SETUP.md** | Instaladores | Setup detalhado |
| **IMPLEMENTATION_SUMMARY.md** | Devs | Código |
| **docs/KIOSK_MODE.md** | Técnicos | Referência |

---

## 🔧 Comandos Essenciais

```powershell
npm install                    # Instalar deps
npm start                      # Iniciar quiosque
node kiosk-control.js status   # Ver status
node kiosk-control.js disable  # Encerrar
node kiosk-control.js help     # Ajuda
.\quickstart.ps1               # Início rápido
```

---

## 📍 Arquivo de Lock

```
Caminho: %APPDATA%\appteste\.quiosque-lock
Atalho:  Windows + R → %APPDATA%\appteste
Deletar: Remove-Item "$env:APPDATA\appteste\.quiosque-lock"
```

---

## 🛡️ Bloqueios Ativos

```
❌ Alt+F4, Ctrl+Q, Ctrl+W, F11, F12
❌ Ctrl+Shift+I, Ctrl+Shift+C
✅ Fullscreen permanente
✅ Menu bar auto-oculto
```

---

## ✅ Checklist Rápido

```
[ ] npm install
[ ] npm start
[ ] Alt+F4 bloqueado
[ ] node kiosk-control.js status (ATIVADO)
[ ] node kiosk-control.js disable (app fecha)
[ ] npm start novamente (reativa)
[ ] Reiniciar PC (autostart?)
```

---

## 🆘 Problemas

| Problema | Solução |
|----------|---------|
| Alt+F4 não bloqueado | npm start (app pode estar desativada) |
| Arquivo não detectado | Aguarde 2-3s ou use `disable` |
| Não inicia automaticamente | Execute npm start como Admin |
| Script não funciona | Certifique-se de estar na pasta certa |

---

## 📱 Modo Desenvolvimento

```powershell
$env:NODE_ENV="development"
npm start
# Alt+F4 agora funciona, DevTools visível
```

---

**Tudo OK? → Leia QUIOSQUE_VISUAL.md**
