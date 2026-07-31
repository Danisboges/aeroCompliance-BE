const prisma = require('../db');

/**
 * GET /api/users
 * Mengambil daftar user (dengan paginasi dan filter role/operator)
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, operatorId, search } = req.query;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;

    const where = {};
    if (role) where.role = role;
    if (operatorId) where.operatorId = operatorId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const data = await prisma.user.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        email: true,
        username: true,
        role: true,
        operatorId: true,
        unit: true,
        active: true,
        createdAt: true,
        operator: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    const total = await prisma.user.count({ where });

    return res.status(200).json({
      data,
      meta: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit) || 1
      }
    });
  } catch (error) {
    console.error('[UserController - getUsers]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/users/me
 * Mendapatkan detail user yang sedang login
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        email: true,
        username: true,
        role: true,
        operatorId: true,
        unit: true,
        active: true,
        createdAt: true,
        operator: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    console.error('[UserController - getMe]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/users/:id
 * Mendapatkan detail user spesifik berdasarkan ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeNumber: true,
        name: true,
        email: true,
        username: true,
        role: true,
        operatorId: true,
        unit: true,
        active: true,
        createdAt: true,
        operator: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    console.error('[UserController - getUserById]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getUsers,
  getMe,
  getUserById
};
