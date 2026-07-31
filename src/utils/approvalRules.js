const OPERATOR_CODE_ALIASES = Object.freeze({
  GA: 'GA',
  GARUDA: 'GA',
  QG: 'QG',
  CITILINK: 'QG',
});

const OPERATOR_API_CODES = Object.freeze({
  GA: 'GARUDA',
  QG: 'CITILINK',
});

const APPROVAL_CANDIDATE_ROLES = Object.freeze(['ENGINEER', 'MANAGER']);

const normalizeOperatorCode = (value) => {
  if (typeof value !== 'string') return null;
  return OPERATOR_CODE_ALIASES[value.trim().toUpperCase()] || null;
};

const toOperatorApiCode = (value) => {
  const code = normalizeOperatorCode(value);
  return code ? OPERATOR_API_CODES[code] : null;
};

const getRequiredApprovalRole = ({ operatorCode, complianceCategory }) => {
  const code = normalizeOperatorCode(operatorCode);
  if (!code) {
    throw new Error('Validation Error: unsupported Service Bulletin operator');
  }

  if (code === 'QG') return 'MANAGER';

  const category = Number(complianceCategory);
  if (!Number.isInteger(category) || category < 1) {
    throw new Error('Validation Error: complianceCategory must be a positive integer');
  }

  return category <= 3 ? 'MANAGER' : 'ENGINEER';
};

module.exports = {
  APPROVAL_CANDIDATE_ROLES,
  getRequiredApprovalRole,
  normalizeOperatorCode,
  toOperatorApiCode,
};
