const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./db');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // Update to match frontend URL in production
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) return next(new Error('Internal Server Error: No JWT secret'));

      const decoded = jwt.verify(token, secret);
      
      const userExists = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, operatorId: true }
      });

      if (!userExists) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        ...decoded,
        role: userExists.role,
        operatorId: userExists.operatorId
      };

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.id} (${socket.user.role})`);
    
    // Join a room specifically for this user
    socket.join(`user_${socket.user.id}`);
    
    // Join a room for their role (e.g. for Second Engineer broadcasts)
    socket.join(`role_${socket.user.role}`);
    
    // Join a room for their operator (if they have one)
    if (socket.user.operatorId) {
      socket.join(`operator_${socket.user.operatorId}`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

// Functions to trigger events from anywhere in the backend
const notifyUser = (userId, event, data) => {
  if (io) io.to(`user_${userId}`).emit(event, data);
};

const notifyRole = (role, event, data) => {
  if (io) io.to(`role_${role}`).emit(event, data);
};

const notifyOperator = (operatorId, event, data) => {
  if (io) io.to(`operator_${operatorId}`).emit(event, data);
};

const notifyAll = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = {
  initSocket,
  notifyUser,
  notifyRole,
  notifyOperator,
  notifyAll
};
