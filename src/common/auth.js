const fs = require('node:fs');
const path = require('node:path');

const USERS_FILE = path.join(__dirname, '..', 'config', 'authorized-users.json');
const CPF_LENGTH = 11;

function normalizeCpf(value) {
  return (value || '').replace(/\D/g, '');
}

function validateCpf(value) {
  const digits = normalizeCpf(value);
  if (digits.length !== CPF_LENGTH) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calcVerifierDigit = (sliceLength) => {
    const numbers = digits.substring(0, sliceLength).split('').map(Number);
    const multiplierStart = sliceLength + 1;
    const total = numbers.reduce((acc, num, index) => acc + num * (multiplierStart - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calcVerifierDigit(9);
  const secondDigit = calcVerifierDigit(10);

  return Number(digits[9]) === firstDigit && Number(digits[10]) === secondDigit;
}

function normalizeOab(value) {
  return (value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function validateOab(value) {
  const normalized = normalizeOab(value);
  return /^[A-Z]{2,3}\d{4,6}$/.test(normalized);
}

function normalizeBirthDate(value) {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const matchSlashed = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (matchSlashed) {
    const [, day, month, year] = matchSlashed;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateBirthDate(value) {
  const iso = normalizeBirthDate(value);
  if (!iso) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    return false;
  }

  if (year < 1900) {
    return false;
  }

  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  return date <= todayUTC;
}

function loadAuthorizedUsers(filePath = USERS_FILE) {
  let payload;
  try {
    payload = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Não foi possível ler o arquivo de usuários autorizados em ${filePath}. Detalhes: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    throw new Error(`O arquivo de usuários autorizados está com JSON inválido. Detalhes: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('O arquivo de usuários autorizados deve conter um array de usuários.');
  }

  return parsed.map((entry, index) => {
    const normalizedCpf = normalizeCpf(entry.cpf);
    const normalizedOab = normalizeOab(entry.oab);
    const normalizedBirthDate = normalizeBirthDate(entry.birthDate);
    const rawType = (entry.type || '').toString().trim().toLowerCase();
    const normalizedType = rawType.includes('estagi') ? 'estagiario' : 'advogado';

    if (!validateCpf(normalizedCpf)) {
      throw new Error(`CPF inválido para o usuário na posição ${index + 1}.`);
    }

    if (!validateOab(normalizedOab)) {
      throw new Error(`OAB inválida para o usuário na posição ${index + 1}.`);
    }

    if (!validateBirthDate(normalizedBirthDate)) {
      throw new Error(`Data de nascimento inválida para o usuário na posição ${index + 1}.`);
    }

    return {
      name: entry.name || `Usuário ${index + 1}`,
      cpf: normalizedCpf,
      oab: normalizedOab,
      birthDate: normalizedBirthDate,
      type: normalizedType
    };
  });
}

function findAuthorizedUser(credentials, users) {
  if (!credentials) {
    return null;
  }

  const normalizedCpf = normalizeCpf(credentials.cpf);
  const normalizedOab = normalizeOab(credentials.oab);
  const normalizedBirthDate = normalizeBirthDate(credentials.birthDate);

  return users.find(
    (user) =>
      user.cpf === normalizedCpf &&
      user.oab === normalizedOab &&
      user.birthDate === normalizedBirthDate
  ) || null;
}

function watchAuthorizedUsers(onChange, filePath = USERS_FILE) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  let watcher;

  try {
    watcher = fs.watch(filePath, { persistent: false }, () => {
      try {
        const users = loadAuthorizedUsers(filePath);
        onChange(null, users);
      } catch (error) {
        onChange(error, []);
      }
    });
  } catch (error) {
    onChange(error, []);
    return () => {};
  }

  return () => watcher.close();
}

module.exports = {
  USERS_FILE,
  normalizeCpf,
  validateCpf,
  normalizeOab,
  validateOab,
  normalizeBirthDate,
  validateBirthDate,
  loadAuthorizedUsers,
  findAuthorizedUser,
  watchAuthorizedUsers
};
