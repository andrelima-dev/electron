# 🎮 Modo Quiosque - Instruções Visuais

## 🌟 O Que Você Conseguiu

Sua aplicação Electron agora é um **QUIOSQUE** profissional que:

### ✨ Características:
- 📱 **Tela Cheia Permanente** - Sem botões, sem menu
- 🔒 **À Prova de Fechamento** - Alt+F4, Ctrl+Q e tudo mais é bloqueado
- 🚀 **Inicia Automaticamente** - Quando o PC liga, ela já está lá
- 🔑 **Controle Seguro** - Só termina se você deletar um arquivo específico
- 👁️ **Sem Acesso a DevTools** - Impossível acessar console ou inspecionar

---

## 🎬 Como Usar - Passo a Passo

### Passo 1️⃣: Instalar

Abra o PowerShell na pasta do projeto e execute:

```powershell
npm install
```

Aguarde. Isso instala a dependência `winreg` necessária.

---

### Passo 2️⃣: Executar

```powershell
npm start
```

Ou simplesmente:

```powershell
npx electron .
```

**O que esperar:**
- ✓ Tela preta por ~2 segundos
- ✓ Abre em FULLSCREEN automático
- ✓ Login page aparece
- ✓ Menu bar sumiu
- ✓ Não pode sair com Alt+F4

---

### Passo 3️⃣: Testar Proteções

Tente os atalhos abaixo - TODOS devem estar bloqueados:

| Atalho | Resultado |
|--------|-----------|
| `Alt + F4` | ❌ Não funciona |
| `Ctrl + Q` | ❌ Não funciona |
| `Ctrl + W` | ❌ Não funciona |
| `F12` | ❌ Não abre DevTools |
| `F11` | ❌ Não alterna tela cheia |
| `Clique direito` | ❌ Sem menu de contexto |

✅ Se nenhum desses funcionar = **FUNCIONANDO PERFEITAMENTE**

---

### Passo 4️⃣: Encerrar o Quiosque

Existem 3 maneiras:

#### **Método 1: Script (Fácil) ⭐**

```powershell
node kiosk-control.js disable
```

**Resultado:** A aplicação fecha automaticamente em 1-2 segundos.

#### **Método 2: Explorador de Arquivos**

1. Pressione: `Windows + R`
2. Digite: `%APPDATA%\appteste`
3. Procure o arquivo: `.quiosque-lock`
4. **Delete-o**
5. App se encerra automaticamente em ~500ms

#### **Método 3: PowerShell (Linux/Mac)**

```powershell
Remove-Item "$env:APPDATA\appteste\.quiosque-lock"
```

A app se encerra imediatamente.

---

## 🔍 Verificar Se Está Funcionando

Execute:

```powershell
node kiosk-control.js status
```

**Saída esperada:**
```
✓ Modo quiosque: ATIVADO
  Arquivo: C:\Users\seu_usuario\AppData\Roaming\appteste\.quiosque-lock
  Criado em: 2025-11-17T10:30:45.123Z
```

---

## 🖥️ Arquivo de Lock - Onde Encontrar

Se quiser encontrar manualmente:

1. Pressione: `Windows + R`
2. Digite: `%APPDATA%`
3. Procure a pasta: `appteste`
4. Dentro dela, procure: `.quiosque-lock`

**Caminho completo:**
```
C:\Users\[SEU_USUARIO]\AppData\Roaming\appteste\.quiosque-lock
```

---

## 📊 Estrutura do Arquivo de Lock

É um arquivo JSON com informações básicas:

```json
{
  "created": "2025-11-17T10:30:45.123Z",
  "app": "appteste"
}
```

**Importante:** Enquanto este arquivo existe, o quiosque está ATIVO.
Quando você o deleta, a app se encerra.

---

## 🚀 Inicialização Automática (Windows)

A aplicação foi configurada para iniciar automaticamente quando você liga o PC.

### Se não funcionar, configure manualmente:

1. Pressione: `Windows + R`
2. Digite: `msconfig`
3. Vá para aba: **Inicialização**
4. Procure por: **AppTeste**
5. Se encontrar, marque a caixa ✓
6. Clique: **OK**
7. Reinicie o PC para aplicar

### Alternativa (Pasta Startup):

1. Pressione: `Windows + R`
2. Digite: `shell:startup`
3. Cole um atalho do executável lá

---

## 🆘 Solução de Problemas

### ❌ "A aplicação não se encerra ao deletar arquivo"

**Causa:** Watcher pode estar com delay

**Solução:**
- Aguarde 2-3 segundos
- Ou finalize pelo Gerenciador de Tarefas: `Ctrl + Shift + Esc`
- Ou execute: `npm start` novamente

---

### ❌ "A aplicação não inicia automaticamente no boot"

**Causa:** Precisa de permissões de admin ou pasta não existe

**Solução:**
- Execute o PowerShell como **ADMINISTRADOR**
- Execute: `npm start`
- Feche e reinicie o PC

---

### ❌ "Não consigo deletar o arquivo"

**Causa:** Aplicação pode estar travada ou usando o arquivo

**Solução:**
- Feche a aplicação (ou use: `node kiosk-control.js disable`)
- Abra PowerShell como **ADMINISTRADOR**
- Execute:
  ```powershell
  Remove-Item -Force "$env:APPDATA\appteste\.quiosque-lock"
  ```

---

### ❌ "Script kiosk-control.js não funciona"

**Causa:** Node.js pode não estar no PATH ou script deletado

**Solução:**
- Certifique-se que o arquivo `kiosk-control.js` existe na raiz do projeto
- Execute na pasta do projeto:
  ```powershell
  cd C:\Users\seu_usuario\Desktop\electron
  node kiosk-control.js status
  ```

---

## 📚 Arquivos Importantes

```
seu_projeto/
├── src/
│   ├── main.js ..................... Arquivo principal
│   └── common/
│       └── kiosk-manager.js ........ Gerenciador de quiosque
├── kiosk-control.js ................ Script de controle
├── docs/
│   └── KIOSK_MODE.md ............... Documentação técnica
├── KIOSK_SETUP.md .................. Guia de instalação
├── IMPLEMENTATION_SUMMARY.md ....... Resumo das mudanças
└── README.md ....................... Este arquivo
```

---

## 📖 Documentação Adicional

- **Setup e Instalação**: Leia `KIOSK_SETUP.md`
- **Detalhes Técnicos**: Leia `docs/KIOSK_MODE.md`
- **Resumo de Mudanças**: Leia `IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Checklist de Funcionamento

Marque os itens conforme testa:

- [ ] ✓ App inicia em fullscreen
- [ ] ✓ Alt+F4 é bloqueado
- [ ] ✓ Ctrl+Q é bloqueado
- [ ] ✓ F12 é bloqueado
- [ ] ✓ Menu bar desaparece automaticamente
- [ ] ✓ `node kiosk-control.js status` mostra "ATIVADO"
- [ ] ✓ `node kiosk-control.js disable` encerra a app
- [ ] ✓ App reinicia em quiosque após fechar
- [ ] ✓ Arquivo `.quiosque-lock` é criado automaticamente
- [ ] ✓ Deletar arquivo causa encerramento

---

## 💡 Dicas

### 🔹 Para Desenvolvimento (Sem Quiosque)

Se você precisar desativar o modo quiosque temporariamente:

```powershell
$env:NODE_ENV="development"
npm start
```

Agora a app abre com DevTools e permite Alt+F4. Quando terminar:

```powershell
$env:NODE_ENV="production"
npm start
```

### 🔹 Para Limpar Dados

Se quiser resetar tudo:

```powershell
Remove-Item -Recurse "$env:APPDATA\appteste"
npm start
```

### 🔹 Para Ver Logs

Os logs são salvos em (quando existem):

```
%APPDATA%\appteste\logs\
```

---

## ✨ Tudo Pronto!

Sua aplicação agora é um **QUIOSQUE PROFISSIONAL** 🎉

Se surgir alguma dúvida, consulte a documentação completa em:
- `KIOSK_SETUP.md` - Guia completo
- `docs/KIOSK_MODE.md` - Referência técnica
- `IMPLEMENTATION_SUMMARY.md` - Sumário das mudanças

**Bom uso!** 🚀
