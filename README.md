# Modo quiosque com autenticação e sessão flutuante (OAB MA)

Aplicação [Electron](https://www.electronjs.org/) para controle de acesso por **CPF**, **OAB** e **data de nascimento**, com janela de sessão flutuante (card) após o login. Em produção, inicia em modo quiosque (bloqueio). Após autenticação, a máquina fica liberada e um cartão flutuante transparente permanece no topo, exibindo o tempo de uso e permitindo encerrar a sessão.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [npm](https://www.npmjs.com/) (instalado junto com o Node.js)

## Instalação

```powershell
npm install
```

## Configuração de autenticação

A aplicação aceita dois modos de validação:

1. **Local (padrão)** – utiliza o arquivo `src/config/authorized-users.json` como base de contingência.
2. **Remoto** – envia as credenciais para um backend HTTP que retorna a autorização do advogado.

### Usuários autorizados (modo local)

Os dados liberados para acesso ficam no arquivo `src/config/authorized-users.json`. Cada item possui:

```json
{
  "name": "Nome que aparecerá na tela",
  "cpf": "123.456.789-09",
  "oab": "UF123456",
  "birthDate": "1990-01-01",
  "type": "advogado|estagiario"
}
```

- **CPF**: informe com ou sem máscara; o sistema faz a validação completa dos dígitos verificadores.
- **OAB**: utilize o formato `UF123456` (2–3 letras para a seccional + 4–6 dígitos).
- **Data de nascimento**: utilize o padrão ISO `AAAA-MM-DD`.
- **type**: define o perfil e o tempo de sessão. Valores suportados: `advogado` (180 min) e `estagiario` (120 min).

Ao salvar o arquivo, a aplicação recarrega automaticamente a lista (sem necessidade de reiniciar).

### Provedor remoto (`app-config.json`)

O arquivo `src/config/app-config.json` permite alternar para a API externa:

```json
{
  "authProvider": "remote",
  "api": {
    "baseUrl": "https://seu-backend",
    "validatePath": "/api/v1/advogados/validar",
    "healthPath": "/health",
    "timeout": 8000
  }
}
```

- `authProvider`: defina `remote` para usar a API; qualquer outro valor mantém o modo local.
- `api.baseUrl`: URL base do backend. Os caminhos são combinados automaticamente (`baseUrl` + `validatePath` / `healthPath`).
- `api.validatePath`: endpoint que recebe `POST` com `{ cpf, oab, birthDate }` (normalizados).
- `api.healthPath`: endpoint de verificação rápida (opcional, usado para exibir o status no quiosque).
- `api.timeout`: tempo máximo em milissegundos para chamadas HTTP.

Se o backend ficar indisponível, a interface sinaliza o status e mantém o fallback local.

## Execução em desenvolvimento

```powershell
npm start
```

O script `start` abre a janela principal com o formulário de liberação. Em desenvolvimento, o modo quiosque fica desativado para facilitar ajustes; em produção, a janela inicia travada no modo quiosque (tela cheia, sem controles do SO). Após um login autorizado, a aplicação libera o computador para uso e exibe um cartão de sessão flutuante.

### Como sair do modo quiosque

- **Windows**: `Alt + F4` (se permitido), `Ctrl + Alt + Del` para finalizar o processo manualmente ou autentique-se com um usuário autorizado.
- **macOS/Linux**: utilize `Cmd/Ctrl + Q` enquanto estiver em modo desenvolvimento. Em produção recomenda-se manter acesso administrativo externo (SSH, monitoramento, etc.) ou realizar um login autorizado.

## Testes

Foram adicionados testes que cobrem:

- Regras de CPF, OAB e data de nascimento;
- Carregamento e busca de usuários locais;
- Merge e normalização da configuração (`app-config.json`);
- Fluxo de autenticação local via serviço centralizado.

```powershell
npm test
```

## Fluxo de uso (resumo)

1. Tela de login: informe CPF, OAB e data de nascimento.
2. Autenticação: pode ser local (`authorized-users.json`) ou remota (API), conforme `app-config.json`.
3. Sessão flutuante: após autenticar, abre um card transparente e sempre no topo com o tempo da sessão.
   - Arraste o card pelo cabeçalho (área com nome/OAB).
   - Botão “–” minimiza a janela (restaure pela barra de tarefas do SO).
   - Botão “Encerrar Sessão” finaliza a sessão e retorna ao login.

### Duração e avisos por perfil

- Advogado: 180 minutos (03:00:00).
- Estagiário: 120 minutos (02:00:00).

Avisos programados (padrão):

- Advogado: 150, 120, 90, 30 e 10 minutos restantes.
- Estagiário: 90, 60, 30 e 10 minutos restantes.

No limite, a sessão é encerrada automaticamente e o app volta ao login.

## Estrutura de pastas

```
.
├── package.json
├── src
│   ├── main.js          # Processo principal do Electron
│   ├── preload.js       # Bridge segura entre main e renderer
│   ├── common
│   │   ├── auth.js      # Regras de validação e carregamento de usuários
│   │   └── config.js    # Carregamento e normalização do app-config.json
│   ├── config
│   │   ├── app-config.json        # Configuração do provedor (local/remoto)
│   │   └── authorized-users.json  # Lista de credenciais permitidas
│   ├── services
│   │   └── auth-service.js        # Serviço unificado de autenticação
│   └── renderer
│       ├── pages
│       │   ├── login
│       │   │   └── index.html                 # Tela de login
│       │   └── session
│       │       └── session-widget.html        # Cartão de sessão flutuante (timer)
│       ├── renderer.js                  # Lógica da tela de login
│       ├── styles.css                   # Estilos globais
│       ├── session-widget.js            # Lógica do timer/avisos + encerrar/minimizar
│       └── session-widget-styles.css    # Estilos do cartão (transparente, sombra inferior)
├── tests
│   └── auth.test.js     # Testes de validação
└── README.md
```

## Observações e solução de problemas

- Windows pode exibir avisos de “Unable to create cache / Gpu Cache Creation failed: -2” no terminal. São mensagens do Chromium ao tentar criar caches em diretórios sem permissão. Em geral, não afetam o funcionamento em desenvolvimento.
- A janela do cartão é transparente e sem moldura, sempre no topo. Se desejar desativar o comportamento “alwaysOnTop”, ajuste em `createSessionWindow()` no `main.js`.

### Configuração de sessão (ajustes rápidos sem código)

No arquivo `src/config/app-config.json`, você pode ajustar os tempos e avisos de sessão:

```json
{
  "session": {
    "advogadoMinutes": 180,
    "estagiarioMinutes": 120,
    "warningsAdv": [150, 120, 90, 30, 10],
    "warningsEst": [90, 60, 30, 10]
  }
}
```

- Os valores são em minutos; os avisos determinam em que momentos a UI exibe alertas antes do término.
- Esses valores são consumidos pelo processo principal (cálculo do timeout) e pelo widget de sessão (cronômetro e avisos), mantendo consistência.

### Padrões de código e IPC seguro

- Há um helper de IPC `safeHandle(channel, handler)` no `main.js` que centraliza try/catch e logging padronizado.
- O logger simples em `src/common/logger.js` pode ser substituído por `electron-log` sem alterar chamadas existentes.
- O `common/config.js` valida o schema de `app-config.json` e aplica debounce no watcher; mensagens de erro são claras para acelerar o diagnóstico.


## Como empacotar (Windows .exe)

Este projeto pode ser empacotado com electron-builder para gerar instaladores e executáveis portáteis.

1) Instale a dependência de build (dev):

```powershell
npm install --save-dev electron-builder
```

2) Adicione scripts ao package.json:

```json
{
  "scripts": {
    "build": "electron-builder --win",
    "build:portable": "electron-builder --win portable",
    "build:nsis": "electron-builder --win nsis",
    "build:dir": "electron-builder --dir"
  }
}
```

3) Adicione uma configuração mínima do electron-builder no package.json (ou use um arquivo electron-builder.yml):

```json
{
  "build": {
    "appId": "com.exemplo.appteste",
    "productName": "AppTeste",
    "directories": { "output": "dist" },
    "files": ["src/**", "package.json"],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "nsis": {
      "oneClick": true,
      "perMachine": false,
      "allowToChangeInstallationDirectory": false
    }
  }
}
```

4) Gerar o instalador:

```powershell
npm run build
```

Executável portátil (sem instalador):

```powershell
npm run build:portable
```

Observações:

- Garanta que o campo "main" do package.json aponte para "src/main.js" (já está assim).
- Inclua quaisquer arquivos extras necessários em build.files ou build.extraResources.
- Para assinatura de código (produção), configure as opções do Windows em electron-builder ou variáveis de ambiente.
- Teste o instalador em uma VM limpa para validar comportamento de kiosk e antivírus/firewall.
