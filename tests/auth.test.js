'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {
  normalizeCpf,
  validateCpf,
  normalizeOab,
  validateOab,
  normalizeBirthDate,
  validateBirthDate,
  loadAuthorizedUsers,
  findAuthorizedUser,
  USERS_FILE
} = require('../src/common/auth');
const { loadAppConfig, joinUrl } = require('../src/common/config');
const authService = require('../src/services/auth-service');

function testCpfValidation() {
  assert.equal(normalizeCpf('123.456.789-09'), '12345678909');
  assert.ok(validateCpf('123.456.789-09'));
  assert.ok(!validateCpf('111.111.111-11'));
  assert.ok(!validateCpf('123'));
}

function testOabValidation() {
  assert.equal(normalizeOab(' sp-123456 '), 'SP123456');
  assert.ok(validateOab('SP123456'));
  assert.ok(validateOab('RJ12345'));
  assert.ok(!validateOab('S123456'));
  assert.ok(!validateOab('SP12'));
}

function testBirthDateValidation() {
  assert.equal(normalizeBirthDate('01/01/1990'), '1990-01-01');
  assert.equal(normalizeBirthDate('1990-01-01'), '1990-01-01');
  assert.ok(validateBirthDate('1990-01-01'));
  assert.ok(!validateBirthDate('2050-01-01'));
  assert.ok(!validateBirthDate('32/13/2000'));
}

function testAuthorizedUsersLoad() {
  const users = loadAuthorizedUsers();
  assert.ok(
    Array.isArray(users) && users.length > 0,
    'Deve carregar ao menos um usuário do arquivo padrão.'
  );

  const user = findAuthorizedUser(
    {
      cpf: '123.456.789-09',
      oab: 'sp123456',
      birthDate: '1990-01-01'
    },
    users
  );

  assert.ok(user, 'Usuário de demonstração deve ser encontrado.');
  assert.equal(user.name, 'Usuário Demo');

  const missingUser = findAuthorizedUser(
    {
      cpf: '123.456.789-10',
      oab: 'SP123456',
      birthDate: '1990-01-01'
    },
    users
  );

  assert.equal(missingUser, null, 'Credenciais incorretas não devem localizar usuário.');
}

function testAppConfigDefaults() {
  const config = loadAppConfig();
  assert.equal(config.authProvider, 'local');
  assert.equal(config.api.validatePath, '/api/v1/advogados/validar');
  assert.equal(config.api.healthPath, '/health');
  assert.equal(config.api.timeout, 8000);

  const combined = joinUrl('http://localhost:3000/', '/auth/validate');
  assert.equal(combined, 'http://localhost:3000/auth/validate');
}

async function testAuthServiceLocalFlow() {
  await authService.shutdown();
  await authService.initialize();

  try {
    const context = authService.getContext();
    assert.equal(context.authProvider, 'local');

    const success = await authService.authenticate({
      cpf: '123.456.789-09',
      oab: 'SP123456',
      birthDate: '1990-01-01'
    });

    assert.ok(success.success, 'Autenticação local deve autorizar usuário cadastrado.');
    assert.ok(success.user?.name, 'Resposta deve conter nome do usuário.');

    const failure = await authService.authenticate({
      cpf: '123.456.789-10',
      oab: 'SP123456',
      birthDate: '1990-01-01'
    });

    assert.ok(!failure.success, 'Autenticação com credenciais incorretas deve falhar.');
  } finally {
    await authService.shutdown();
  }
}

async function run() {
  const tests = [
    testCpfValidation,
    testOabValidation,
    testBirthDateValidation,
    testAuthorizedUsersLoad,
    testAppConfigDefaults,
    testAuthServiceLocalFlow
  ];

  for (const test of tests) {
    // eslint-disable-next-line no-await-in-loop
    await test();
    console.log(`✔ ${test.name}`);
  }

  console.log(`
✓ Todos os testes passaram. Arquivo de usuários: ${path.relative(process.cwd(), USERS_FILE)}`);
}

run().catch((error) => {
  console.error('\n✖ Falha nos testes:', error.message);
  console.error(error.stack);
  process.exitCode = 1;
});
