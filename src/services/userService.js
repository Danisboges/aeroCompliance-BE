const userRepository = require('../repositories/userRepository');
const {
  APPROVAL_CANDIDATE_ROLES,
  normalizeOperatorCode,
  toOperatorApiCode,
} = require('../utils/approvalRules');

const listApprovalCandidates = async ({ operator, role, excludeUserId }) => {
  const operatorCode = normalizeOperatorCode(operator);
  const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : '';

  if (!operatorCode) {
    throw new Error('Validation Error: operator must be GARUDA or CITILINK');
  }
  if (!APPROVAL_CANDIDATE_ROLES.includes(normalizedRole)) {
    throw new Error('Validation Error: role must be ENGINEER or MANAGER');
  }

  const users = await userRepository.findApprovalCandidates({
    operatorCode,
    role: normalizedRole,
    excludeUserId,
  });

  return users.map((user) => ({
    id: user.id,
    employeeNumber: user.employeeNumber,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    operator: {
      code: toOperatorApiCode(user.operator.code),
      name: user.operator.name,
    },
    unit: user.unit,
    active: user.active,
  }));
};

module.exports = { listApprovalCandidates };
