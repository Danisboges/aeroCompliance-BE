if (require.main === module) require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/db');
const { generateId } = require('../src/utils/idGenerator');

const APPROVAL_DUMMY_USERS = Object.freeze([
  { preferredId: 101, employeeNumber: 'GA-ENG-001', legacyEmployeeNumbers: ['GA-SE-001'], name: 'Rizky Pratama', email: 'rizky.pratama@gmf.co.id', username: 'rizky_pratama', role: 'ENGINEER', operatorCode: 'GA', unit: 'TEA-2' },
  { preferredId: 102, employeeNumber: 'GA-ENG-002', legacyEmployeeNumbers: ['GA-SE-002'], name: 'Siti Rahmawati', email: 'siti.rahmawati@gmf.co.id', username: 'siti_rahmawati', role: 'ENGINEER', operatorCode: 'GA', unit: 'TEA-2' },
  { preferredId: 201, employeeNumber: 'GA-MGR-001', name: 'Davy Febrynzki', email: 'davy.febrynzki@gmf.co.id', username: 'davy_febrynzki', role: 'MANAGER', operatorCode: 'GA', unit: 'TEA-2' },
  { preferredId: 202, employeeNumber: 'GA-MGR-002', name: 'Maya Puspitasari', email: 'maya.puspitasari@gmf.co.id', username: 'maya_puspitasari', role: 'MANAGER', operatorCode: 'GA', unit: 'TEA' },
  { preferredId: 301, employeeNumber: 'CT-MGR-001', name: 'Rina Kurniawati', email: 'rina.kurniawati@citilink.co.id', username: 'rina_kurniawati', role: 'MANAGER', operatorCode: 'QG', unit: 'Engineering' },
  { preferredId: 302, employeeNumber: 'CT-MGR-002', name: 'Andi Wijaya', email: 'andi.wijaya@citilink.co.id', username: 'andi_wijaya', role: 'MANAGER', operatorCode: 'QG', unit: 'Engineering' },
]);

const OPERATOR_DEFAULTS = Object.freeze({ GA: 'Garuda Indonesia', QG: 'Citilink' });

const resolveOperator = async (client, code, operators, createId) => {
  if (operators?.[code]) return operators[code];
  const existing = await client.operator.findUnique({ where: { code } });
  return existing || client.operator.create({
    data: { id: createId('OP'), code, name: OPERATOR_DEFAULTS[code] },
  });
};

const assertNoIdentityCollision = async (client, userData) => {
  const collision = await client.user.findFirst({
    where: { OR: [
      { email: userData.email },
      { employeeNumber: userData.employeeNumber },
      { username: userData.username },
    ] },
    select: { id: true, email: true, employeeNumber: true, username: true },
  });
  if (!collision) return;

  const employeeMatches = !collision.employeeNumber ||
    collision.employeeNumber === userData.employeeNumber ||
    userData.legacyEmployeeNumbers?.includes(collision.employeeNumber);
  const sameIdentity = collision.email === userData.email &&
    collision.username === userData.username && employeeMatches;

  if (!sameIdentity) {
    throw new Error(`Seed identity collision for ${userData.email}; refusing to modify existing user ${collision.id}`);
  }
};

const seedApprovalUsers = async (client = prisma, {
  operators,
  createId = generateId,
  hashPassword = (value) => bcrypt.hash(value, 10),
  seedPassword = process.env.SEED_DUMMY_USER_PASSWORD,
} = {}) => {
  if (!seedPassword) {
    throw new Error('SEED_DUMMY_USER_PASSWORD must be configured before seeding approval users');
  }

  const resolvedOperators = {
    GA: await resolveOperator(client, 'GA', operators, createId),
    QG: await resolveOperator(client, 'QG', operators, createId),
  };
  const passwordHash = await hashPassword(seedPassword);
  const mappings = [];

  for (const userData of APPROVAL_DUMMY_USERS) {
    await assertNoIdentityCollision(client, userData);
    const common = {
      employeeNumber: userData.employeeNumber,
      name: userData.name,
      username: userData.username,
      password: passwordHash,
      role: userData.role,
      operatorId: resolvedOperators[userData.operatorCode].id,
      unit: userData.unit,
      active: true,
    };
    const user = await client.user.upsert({
      where: { email: userData.email },
      update: common,
      create: { id: createId('USR'), email: userData.email, ...common },
      select: {
        id: true, employeeNumber: true, name: true, email: true, username: true,
        role: true, unit: true, active: true,
        operator: { select: { code: true, name: true } },
      },
    });
    mappings.push({ preferredId: userData.preferredId, actualId: user.id, ...user });
  }

  return mappings;
};

if (require.main === module) {
  seedApprovalUsers()
    .then((mappings) => {
      console.log('Approval candidate users seeded successfully:');
      console.table(mappings.map(({ operator, ...item }) => ({ ...item, operator: operator.code })));
    })
    .catch((error) => {
      console.error('Approval candidate seed failed:', error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { APPROVAL_DUMMY_USERS, seedApprovalUsers };
