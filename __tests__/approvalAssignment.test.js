const mockPrisma = {
  approval: {
    findUnique: jest.fn(),
  },
  eesDocument: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../src/db', () => mockPrisma);

jest.mock('../src/socket', () => ({
  notifyUser: jest.fn(),
  notifyAll: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendApprovalRequestEmail: jest.fn(async () => ({ messageId: 'test' })),
  sendApprovalRejectedEmail: jest.fn(async () => ({ messageId: 'test' })),
}));

jest.mock('../src/services/pdfGenerationService', () => ({
  generateEesPdf: jest.fn(async () => Buffer.from('test-pdf')),
  finalizeGarudaPdf: jest.fn(async () => undefined),
}));

jest.mock('fs', () => ({
  openSync: jest.fn(() => 1),
  readSync: jest.fn((_descriptor, buffer) => {
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
    return 8;
  }),
  closeSync: jest.fn(),
  renameSync: jest.fn(),
  existsSync: jest.fn(() => false),
  unlinkSync: jest.fn(),
}));

const {
  submitForApproval,
  resubmitForApproval,
} = require('../src/services/approvalService');
const {
  APPROVAL_DUMMY_USERS,
  seedApprovalUsers,
} = require('../prisma/seedApprovalUsers');
const {
  listApprovalCandidates,
} = require('../src/services/userService');

const PNG_SIGNATURE = Object.freeze({
  path: '/tmp/test-signature.png',
  mimetype: 'image/png',
  originalname: 'signature.png',
  size: 8,
});

const makeEes = (operatorCode, complianceCategory) => ({
  id: 'EES-TEST',
  sourceSb: {
    complianceCategory,
    operator: {
      id: `OP-${operatorCode}`,
      code: operatorCode,
      name: operatorCode === 'GA' ? 'Garuda Indonesia' : 'Citilink',
    },
  },
});

const makeAssignee = ({
  role,
  operatorCode,
  active = true,
}) => ({
  id: 'USR-ASSIGNEE',
  role,
  active,
  operator: {
    id: `OP-${operatorCode}`,
    code: operatorCode,
    name: operatorCode === 'GA' ? 'Garuda Indonesia' : 'Citilink',
  },
});

const arrangeSubmission = ({
  operatorCode,
  complianceCategory,
  role,
  active = true,
}) => {
  mockPrisma.approval.findUnique.mockResolvedValue(null);
  mockPrisma.eesDocument.findUnique.mockResolvedValue(
    makeEes(operatorCode, complianceCategory)
  );
  mockPrisma.user.findUnique.mockResolvedValue(
    makeAssignee({ role, operatorCode, active })
  );

  const tx = {
    approval: {
      create: jest.fn(async ({ data }) => ({ id: 'APP-TEST', ...data })),
    },
    reviewAction: {
      create: jest.fn(async ({ data }) => ({ id: 'REV-TEST', ...data })),
    },
    notification: {
      create: jest.fn(async ({ data }) => ({ id: 'NOTIF-TEST', ...data })),
    },
  };
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
  return tx;
};

const submit = (signatureFile) => submitForApproval({
  eesId: 'EES-TEST',
  assignedToId: 'USR-ASSIGNEE',
  submitterId: 'USR-SUBMITTER',
  submitterRole: 'ENGINEER',
  signatureFile,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('approval assignment business rules', () => {
  test('Garuda category 3 can be submitted to Manager', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 3,
      role: 'MANAGER',
    });

    await expect(submit(PNG_SIGNATURE)).resolves.toMatchObject({
      assignedToId: 'USR-ASSIGNEE',
      status: 'PENDING',
    });
  });

  test('Garuda category 4 can be submitted to another Engineer as EES reviewer', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 4,
      role: 'ENGINEER',
    });

    await expect(submit(PNG_SIGNATURE)).resolves.toMatchObject({
      assignedToId: 'USR-ASSIGNEE',
    });
  });

  test('Garuda category 4 rejects Manager', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 4,
      role: 'MANAGER',
    });

    await expect(submit(PNG_SIGNATURE)).rejects.toThrow(
      'requires role ENGINEER'
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('Citilink can be submitted to Manager', async () => {
    arrangeSubmission({
      operatorCode: 'QG',
      complianceCategory: 5,
      role: 'MANAGER',
    });

    await expect(submit()).resolves.toMatchObject({
      assignedToId: 'USR-ASSIGNEE',
    });
  });

  test('Citilink rejects Engineer', async () => {
    arrangeSubmission({
      operatorCode: 'QG',
      complianceCategory: 5,
      role: 'ENGINEER',
    });

    await expect(submit()).rejects.toThrow('requires role MANAGER');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('inactive assignee is rejected', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 3,
      role: 'MANAGER',
      active: false,
    });

    await expect(submit(PNG_SIGNATURE)).rejects.toThrow('user is inactive');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('Garuda submission without signature is rejected', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 3,
      role: 'MANAGER',
    });

    await expect(submit()).rejects.toThrow(
      'signature is required for Garuda submission'
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  test('Garuda category 4 rejects assigning the creator to themselves', async () => {
    arrangeSubmission({
      operatorCode: 'GA',
      complianceCategory: 4,
      role: 'ENGINEER',
    });

    await expect(submitForApproval({
      eesId: 'EES-TEST',
      assignedToId: 'USR-SUBMITTER',
      submitterId: 'USR-SUBMITTER',
      submitterRole: 'ENGINEER',
      signatureFile: PNG_SIGNATURE,
    })).rejects.toThrow('reviewer must be a different ENGINEER');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('approval candidate listing', () => {
  test('excludes the currently authenticated user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    await listApprovalCandidates({
      operator: 'GARUDA',
      role: 'ENGINEER',
      excludeUserId: 'USR-CREATOR',
    });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          role: 'ENGINEER',
          id: {
            not: 'USR-CREATOR',
          },
        }),
      })
    );
  });
});

describe('approval resubmission', () => {
  const arrangeResubmission = ({ status = 'REJECTED', role = 'ENGINEER', active = true, changedCount = 1 } = {}) => {
    mockPrisma.approval.findUnique.mockResolvedValue({
      id: 'APP-EXISTING',
      eesId: 'EES-TEST',
      status,
      submittedById: 'USR-SUBMITTER',
      eesDocument: {
        eesNumber: 'EES-GA-TEST',
        sourceSb: {
          complianceCategory: 4,
          operator: { id: 'OP-GA', code: 'GA', name: 'Garuda Indonesia' },
        },
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue(
      makeAssignee({ role, operatorCode: 'GA', active })
    );

    const tx = {
      approval: {
        updateMany: jest.fn(async () => ({ count: changedCount })),
        findUnique: jest.fn(async () => ({ id: 'APP-EXISTING', status: 'PENDING' })),
      },
      eesDocument: { update: jest.fn(async ({ data }) => data) },
      reviewAction: { create: jest.fn(async ({ data }) => ({ id: 'REV-RESUBMIT', ...data })) },
      notification: { create: jest.fn(async ({ data }) => ({ id: 'NOTIF-RESUBMIT', ...data })) },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
    return tx;
  };

  test('reuses the existing approval and records a resubmit action', async () => {
    const tx = arrangeResubmission();
    const result = await resubmitForApproval({
      eesId: 'EES-TEST',
      assignedToId: 'USR-ASSIGNEE',
      submitterId: 'USR-SUBMITTER',
      submitterRole: 'ENGINEER',
      signatureFile: PNG_SIGNATURE,
    });

    expect(result.approval).toMatchObject({ id: 'APP-EXISTING', status: 'PENDING' });
    expect(tx.approval.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'APP-EXISTING', submittedById: 'USR-SUBMITTER' }),
    }));
    expect(tx.reviewAction.create).toHaveBeenCalled();
    expect(tx.notification.create).toHaveBeenCalled();
  });

  test('rejects a duplicate concurrent resubmit', async () => {
    arrangeResubmission({ changedCount: 0 });
    await expect(resubmitForApproval({
      eesId: 'EES-TEST',
      assignedToId: 'USR-ASSIGNEE',
      submitterId: 'USR-SUBMITTER',
      submitterRole: 'ENGINEER',
      signatureFile: PNG_SIGNATURE,
    })).rejects.toThrow('already resubmitted or changed');
  });
});

describe('approval candidate seed', () => {
  test('running the seed twice does not create duplicate users', async () => {
    const usersByEmail = new Map();
    const usersByEmployeeNumber = new Map();
    const usersByUsername = new Map();
    const operatorById = new Map([
      ['OP-GA', { id: 'OP-GA', code: 'GA', name: 'Garuda Indonesia' }],
      ['OP-QG', { id: 'OP-QG', code: 'QG', name: 'Citilink' }],
    ]);

    const fakePrisma = {
      user: {
        findFirst: jest.fn(async ({ where }) => {
          for (const condition of where.OR) {
            if (condition.email && usersByEmail.has(condition.email)) {
              return usersByEmail.get(condition.email);
            }
            if (
              condition.employeeNumber &&
              usersByEmployeeNumber.has(condition.employeeNumber)
            ) {
              return usersByEmployeeNumber.get(condition.employeeNumber);
            }
            if (condition.username && usersByUsername.has(condition.username)) {
              return usersByUsername.get(condition.username);
            }
          }
          return null;
        }),
        upsert: jest.fn(async ({ where, update, create }) => {
          const existing = usersByEmail.get(where.email);
          const record = existing
            ? { ...existing, ...update }
            : { ...create };
          record.operator = operatorById.get(record.operatorId);
          usersByEmail.set(record.email, record);
          usersByEmployeeNumber.set(record.employeeNumber, record);
          usersByUsername.set(record.username, record);
          return record;
        }),
      },
    };

    let idCounter = 0;
    const options = {
      operators: {
        GA: operatorById.get('OP-GA'),
        QG: operatorById.get('OP-QG'),
      },
      createId: () => `USR-TEST-${++idCounter}`,
      hashPassword: async () => '$2b$10$test-hash',
      seedPassword: 'test-only-password',
    };

    const firstRun = await seedApprovalUsers(fakePrisma, options);
    const secondRun = await seedApprovalUsers(fakePrisma, options);

    expect(usersByEmail.size).toBe(APPROVAL_DUMMY_USERS.length);
    expect(secondRun.map((user) => user.actualId)).toEqual(
      firstRun.map((user) => user.actualId)
    );
    expect([...usersByEmail.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeNumber: 'GA-ENG-001',
          role: 'ENGINEER',
          password: '$2b$10$test-hash',
        }),
      ])
    );
  });
});
