const jwt = require('jsonwebtoken');
const Course = require('../models/Course');
const User = require('../models/User');
const Message = require('../models/Message');

async function buildEligiblePartnerMap(user) {
  const partnerMap = new Map();
  const userId = String(user._id);

  if (user.role === 'instructor') {
    const courses = await Course.find({ instructor: userId })
      .select('title students')
      .populate('students', 'name email avatar role');

    for (const course of courses) {
      for (const student of course.students || []) {
        if (!student || student.role !== 'student') continue;
        const sid = String(student._id);
        if (!partnerMap.has(sid)) {
          partnerMap.set(sid, {
            _id: sid,
            name: student.name,
            email: student.email,
            avatar: student.avatar || '',
            role: student.role,
          });
        }
      }
    }

    // allow instructors to chat with admins
    const admins = await User.find({ role: 'admin' }).select('name email avatar role');
    for (const admin of admins) {
      const aid = String(admin._id);
      if (!partnerMap.has(aid)) {
        partnerMap.set(aid, {
          _id: aid,
          name: admin.name,
          email: admin.email,
          avatar: admin.avatar || '',
          role: admin.role,
        });
      }
    }
  } else if (user.role === 'student') {
    const courses = await Course.find({ students: userId })
      .select('title instructor')
      .populate('instructor', 'name email avatar role');

    for (const course of courses) {
      const instructor = course.instructor;
      if (!instructor || instructor.role !== 'instructor') continue;
      const iid = String(instructor._id);
      if (!partnerMap.has(iid)) {
        partnerMap.set(iid, {
          _id: iid,
          name: instructor.name,
          email: instructor.email,
          avatar: instructor.avatar || '',
          role: instructor.role,
        });
      }
    }
  } else if (user.role === 'admin') {
    // admin can chat with all instructors
    const instructors = await User.find({ role: 'instructor' }).select('name email avatar role');
    for (const instructor of instructors) {
      const iid = String(instructor._id);
      if (!partnerMap.has(iid)) {
        partnerMap.set(iid, {
          _id: iid,
          name: instructor.name,
          email: instructor.email,
          avatar: instructor.avatar || '',
          role: instructor.role,
        });
      }
    }
  }

  return partnerMap;
}

async function canChat(user, partnerId) {
  const partnerMap = await buildEligiblePartnerMap(user);
  return partnerMap.has(String(partnerId));
}

function initChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.auth?.token || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email role avatar');
      if (!user) return next(new Error('Unauthorized'));
      if (!['instructor', 'student', 'admin'].includes(user.role)) {
        return next(new Error('Forbidden'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    socket.on('chat:send', async (payload, ack) => {
      try {
        const to = String(payload?.to || '');
        const text = typeof payload?.text === 'string' ? payload.text.trim() : '';

        if (!to) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Missing recipient' });
          return;
        }
        if (!text) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Message text is required' });
          return;
        }

        const allowed = await canChat(socket.user, to);
        if (!allowed) {
          if (typeof ack === 'function') ack({ ok: false, error: 'You are not allowed to chat with this user' });
          return;
        }

        const message = await Message.create({
          sender: socket.user._id,
          recipient: to,
          text,
        });

        const safeMsg = {
          _id: String(message._id),
          sender: String(message.sender),
          recipient: String(message.recipient),
          text: message.text,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        };

        io.to(`user:${userId}`).emit('chat:new', safeMsg);
        io.to(`user:${to}`).emit('chat:new', safeMsg);

        if (typeof ack === 'function') ack({ ok: true, data: safeMsg });
      } catch (error) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Failed to send message' });
      }
    });
  });
}

module.exports = initChatSocket;
