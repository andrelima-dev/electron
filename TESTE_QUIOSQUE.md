# 🧪 TESTE DO MODO QUIOSQUE - Passo a Passo

## 📋 Checklist de Teste Completo

Use este arquivo para testar se o quiosque está funcionando corretamente.

---

## ✅ TESTE 1: Instalação

### Objetivo: Verificar se as dependências foram instaladas corretamente

```powershell
npm install
```

**Resultado esperado:**
- ✓ Pasta `node_modules` criada
- ✓ Arquivo `package-lock.json` atualizado
- ✓ Nenhum erro na instalação
- ✓ Dependência `winreg` está em `node_modules`

**Se falhar:**
- Tente: `npm cache clean --force`
- Depois: `npm install` novamente

---

## ✅ TESTE 2: Inicialização

### Objetivo: Verificar se a aplicação inicia em modo quiosque

```powershell
npm start
```

**Resultado esperado:**
```
✓ Aplicação abre em FULLSCREEN
✓ Menu bar desaparece
✓ Página de login aparece
✓ Sem atalhos visíveis
```

**Checklist visual:**
- [ ] Tela preta por 2-3 segundos (inicialização)
- [ ] App abre em fullscreen (maximizado)
- [ ] Menu bar (arquivo, editar, etc) desapareceu
- [ ] Interface da app é visível normalmente

---

## ✅ TESTE 3: Bloqueios de Segurança

### Objetivo: Verificar se os atalhos perigosos estão bloqueados

Com a app aberta, tente cada atalho abaixo:

| Atalho | Ação | Resultado |
|--------|------|-----------|
| Alt + F4 | Tentar fechar | ❌ NÃO fecha |
| Ctrl + Q | Tentar encerrar | ❌ NÃO funciona |
| Ctrl + W | Tentar fechar aba | ❌ NÃO funciona |
| F11 | Toggle fullscreen | ❌ NÃO funciona |
| F12 | Abrir DevTools | ❌ NÃO abre |
| Ctrl + Shift + I | Abrir DevTools | ❌ NÃO abre |
| Ctrl + Shift + C | Inspecionar | ❌ NÃO funciona |
| Clique direito | Menu contexto | ❌ Sem menu |

**Resultado esperado:**
- ✓ TODOS os atalhos devem estar bloqueados
- ✓ Nenhum abre DevTools
- ✓ App continua respondendo normalmente

**Se algum funcionar:**
- Há um problema na implementação
- Revise `src/main.js` na seção `before-input-event`

---

## ✅ TESTE 4: Arquivo de Lock

### Objetivo: Verificar se o arquivo de lock foi criado

**Abra o Explorador:**

1. Pressione: `Windows + R`
2. Digite: `%APPDATA%\appteste`
3. Procure pelo arquivo: `.quiosque-lock`

**Resultado esperado:**
- ✓ Arquivo `.quiosque-lock` existe
- ✓ Data de criação é recente
- ✓ Tamanho é pequeno (< 200 bytes)

**Conteúdo esperado:**
```json
{
  "created": "2025-11-17T...",
  "app": "appteste"
}
```

---

## ✅ TESTE 5: Script de Status

### Objetivo: Verificar se o script de controle funciona

```powershell
node kiosk-control.js status
```

**Resultado esperado:**
```
✓ Modo quiosque: ATIVADO
  Arquivo: C:\Users\seu_usuario\AppData\Roaming\appteste\.quiosque-lock
  Criado em: 2025-11-17T10:30:00.000Z
```

**Se mostrar "DESATIVADO":**
- Significa que o arquivo de lock foi deletado
- Execute `npm start` novamente para reativar

---

## ✅ TESTE 6: Deletação de Arquivo

### Objetivo: Verificar se a app se encerra quando arquivo é deletado

**Método 1: Usando script (Recomendado)**

Com a app aberta:

```powershell
node kiosk-control.js disable
```

**Resultado esperado:**
- ✓ App se encerra em 1-2 segundos
- ✓ Nenhuma janela fica aberta
- ✓ Processo termina normalmente

**Método 2: Deletar manualmente**

1. Abra Explorador: `Windows + R` → `%APPDATA%\appteste`
2. Delete o arquivo `.quiosque-lock`
3. Aguarde ~500ms

**Resultado esperado:**
- ✓ App desaparece automaticamente
- ✓ Não mostra nenhuma caixa de diálogo

**Se não funcionar:**
- Aguarde 3-5 segundos (watcher pode ter delay)
- Verifique se o arquivo foi mesmo deletado
- Feche a app manualmente (Ctrl+Alt+Delete)

---

## ✅ TESTE 7: Reativação

### Objetivo: Verificar se ao iniciar novamente, quiosque é reativado

Com a app encerrada:

```powershell
npm start
```

**Resultado esperado:**
- ✓ App volta a iniciar em quiosque
- ✓ Arquivo de lock é recriado
- ✓ Alt+F4 volta a estar bloqueado
- ✓ Tudo funciona novamente

---

## ✅ TESTE 8: Inicialização Automática (Windows)

### Objetivo: Verificar se a app inicia quando PC liga

**Pré-requisito:** Execute `npm start` como ADMINISTRADOR pelo menos uma vez

**Teste:**

1. Encerre a aplicação: `node kiosk-control.js disable`
2. Reinicie o computador
3. Aguarde ~30-60 segundos após boot

**Resultado esperado:**
- ✓ Aplicação abre automaticamente
- ✓ Logo após fazer login no Windows
- ✓ Sem intervenção do usuário

**Se não funcionar:**
- Pode ser necessário permissões de admin
- Configure manualmente:
  1. `Windows + R` → `msconfig`
  2. Aba "Inicialização"
  3. Procure por "AppTeste" e marque

---

## ✅ TESTE 9: Modo Desenvolvimento

### Objetivo: Verificar se pode desativar quiosque temporariamente

```powershell
$env:NODE_ENV="development"
npm start
```

**Resultado esperado:**
- ✓ App abre com DevTools visível
- ✓ Alt+F4 agora funciona
- ✓ Pode fechar normalmente
- ✓ F12 abre DevTools

**Para voltar ao modo quiosque:**
```powershell
$env:NODE_ENV="production"
npm start
```

---

## ✅ TESTE 10: Script Quickstart

### Objetivo: Verificar se o script de início rápido funciona

1. Abra `quickstart.ps1` com duplo-clique

**Resultado esperado:**
- ✓ PowerShell abre com mensagens informativas
- ✓ `npm install` é executado (se necessário)
- ✓ App inicia em quiosque automaticamente

**Se receber erro de permissão:**
- Clique direito → "Executar com PowerShell"

---

## 📊 MATRIZ DE TESTES

Imprima e marque conforme testa:

```
TESTE 1 - Instalação          [ ] ✓ [ ] ✗
TESTE 2 - Inicialização       [ ] ✓ [ ] ✗
TESTE 3 - Bloqueios           [ ] ✓ [ ] ✗
TESTE 4 - Arquivo Lock        [ ] ✓ [ ] ✗
TESTE 5 - Script Status       [ ] ✓ [ ] ✗
TESTE 6 - Deletação           [ ] ✓ [ ] ✗
TESTE 7 - Reativação          [ ] ✓ [ ] ✗
TESTE 8 - Autostart           [ ] ✓ [ ] ✗
TESTE 9 - Modo Dev            [ ] ✓ [ ] ✗
TESTE 10 - Quickstart         [ ] ✓ [ ] ✗

TOTAL: [ ]/10 testes passados
```

---

## 🐛 Troubleshooting Rápido

### ❌ "Alt+F4 não está bloqueado"

**Diagnóstico:**
```powershell
node kiosk-control.js status
```

Se disser "DESATIVADO":
- Execute: `npm start` novamente

Se disser "ATIVADO":
- Verifique `src/main.js` linha ~130

**Solução:**
- Encerre tudo: `Ctrl+Alt+Delete`
- Reabra: `npm start`

---

### ❌ "Arquivo não é detectado ao deletar"

**Causa:** Watcher pode ter delay

**Solução:**
- Aguarde 2-3 segundos após deletar
- Se ainda não funcionar, use o script: `node kiosk-control.js disable`

---

### ❌ "A app não inicia automaticamente"

**Causa:** Pode precisar de admin ou arquivo deletado

**Diagnóstico:**
1. Execute como administrador: `npm start`
2. Reinicie o PC
3. Verifique se iniciou

Se não iniciou:
1. `Windows + R` → `msconfig`
2. Aba "Inicialização"
3. Procure "AppTeste" e marque

---

### ❌ "Script kiosk-control.js não funciona"

**Causa:** Arquivo pode estar no local errado

**Solução:**
```powershell
cd C:\Users\seu_usuario\Desktop\electron
node kiosk-control.js status
```

Certifique-se de estar na pasta raiz do projeto.

---

## ✨ Se Todos os Testes Passarem

Parabéns! 🎉 Seu quiosque está **FUNCIONANDO PERFEITAMENTE**!

Próximas etapas:
1. ✓ Use em produção
2. ✓ Monitore logs em `%APPDATA%\appteste\logs\`
3. ✓ Documente qualquer comportamento inesperado
4. ✓ Revise `docs/KIOSK_MODE.md` se precisar customizar

---

## 📝 Notas de Teste

Use este espaço para anotar resultados e observações:

```
Data: _______________
Teste: _______________
Resultado: _______________
Observações: _______________

---

Data: _______________
Teste: _______________
Resultado: _______________
Observações: _______________
```

---

**Bom teste! 🧪**
