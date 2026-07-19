const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Definisikan Role agar bisa dibaca oleh middleware di bawahnya
const Role = {
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  FIRST_ENGINEER: 'FIRST_ENGINEER',
  SECOND_ENGINEER: 'SECOND_ENGINEER'
};

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Access Denied: No Authorization header provided' });
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Access Denied: Invalid Authorization header format' });
  }

  const token = parts[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    const decoded = jwt.verify(token, secret);
    
    // Validasi keberadaan user di DB dan ambil operatorId aktual
    const userExists = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, operatorId: true }
    });
    
    if (!userExists) {
      return res.status(401).json({ message: 'Unauthorized: User does not exist. Please log in again.' });
    }

    // Timpa req.user dengan data otorisasi terpercaya dari database (menghindari parameter injeksi)
    req.user = {
      ...decoded,
      role: userExists.role,
      operatorId: userExists.operatorId
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to authorize roles (RBAC) - Khusus Admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User info not found' });
  }

  if (req.user.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

// --- MIDDLEWARE KHUSUS TECHNICIAN ---
const requireTechnician = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User info not found' });
  }

  if (req.user.role !== Role.TECHNICIAN) {
    return res.status(403).json({ message: 'Forbidden: Technician access required' });
  }

  next();
};

// Middleware role dinamis untuk route yang membutuhkan satu atau lebih role.
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User info not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role permission' });
    }

    next();
  };
};

// Export semua fungsi menggunakan format CommonJS
module.exports = {
  Role,
  verifyToken,
  requireAdmin,
  requireTechnician,
  requireRole
};
