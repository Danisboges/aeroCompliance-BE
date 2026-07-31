const prisma = require('../db');

/**
 * GET /api/notifications
 * Mengambil daftar notifikasi untuk user yang sedang login
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    const validPage = isNaN(p) ? 1 : Math.max(1, p);
    const validLimit = isNaN(l) ? 20 : Math.min(100, Math.max(1, l));
    const skip = (validPage - 1) * validLimit;

    const where = { userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      where.isRead = false;
    }

    const data = await prisma.notification.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

    return res.status(200).json({
      data,
      meta: {
        page: validPage,
        limit: validLimit,
        total,
        unreadCount,
        totalPages: Math.ceil(total / validLimit) || 1
      }
    });
  } catch (error) {
    console.error('[NotificationController - getNotifications]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Menandai semua notifikasi milik user sebagai sudah dibaca
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[NotificationController - markAllAsRead]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Menandai satu notifikasi spesifik sebagai sudah dibaca
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.status(200).json({ message: 'Notification marked as read', data: updated });
  } catch (error) {
    console.error('[NotificationController - markAsRead]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getNotifications,
  markAllAsRead,
  markAsRead
};
