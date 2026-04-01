const mongoose = require('mongoose');
const Course = require('../models/Course');
const Message = require('../models/Message');
const User = require('../models/User');

const { ObjectId } = mongoose.Types;

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
            sharedCourses: [],
          });
        }
        partnerMap.get(sid).sharedCourses.push(course.title);
      }
    }

    // Allow instructors to chat with admins
    const admins = await User.find({ role: 'admin' }).select('name email avatar role');
    for (const admin of admins) {
      const aid = String(admin._id);
      partnerMap.set(aid, {
        _id: aid,
        name: admin.name,
        email: admin.email,
        avatar: admin.avatar || '',
        role: admin.role,
        sharedCourses: ['Admin liên hệ'],
      });
    }
  } else if (user.role === 'student') {
    const courses = await Course.find({ students: userId })
      .select('title instructor')
      .populate('instructor', 'name email avatar role messengerLink facebookUrl');

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
          messengerLink: instructor.messengerLink || '',
          facebookUrl: instructor.facebookUrl || '',
          sharedCourses: [],
        });
      }
      partnerMap.get(iid).sharedCourses.push(course.title);
    }
  } else if (user.role === 'admin') {
    const instructors = await User.find({ role: 'instructor' }).select('name email avatar role messengerLink facebookUrl');
    for (const instructor of instructors) {
      const iid = String(instructor._id);
      if (!partnerMap.has(iid)) {
        partnerMap.set(iid, {
          _id: iid,
          name: instructor.name,
          email: instructor.email,
          avatar: instructor.avatar || '',
          role: instructor.role,
          messengerLink: instructor.messengerLink || '',
          facebookUrl: instructor.facebookUrl || '',
          sharedCourses: ['Admin liên hệ'],
        });
      }
    }
  }

  return partnerMap;
}

async function ensurePartnerAllowed(user, partnerId) {
  if (!ObjectId.isValid(partnerId)) {
    return { ok: false, status: 400, message: 'Invalid partner id' };
  }

  const partnerMap = await buildEligiblePartnerMap(user);
  if (!partnerMap.has(String(partnerId))) {
    return {
      ok: false,
      status: 403,
      message: 'You are not allowed to chat with this user',
    };
  }

  return { ok: true, partner: partnerMap.get(String(partnerId)) };
}

exports.getPartners = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = String(user._id);
    const partnerMap = await buildEligiblePartnerMap(user);

    if (partnerMap.size === 0) {
      return res.json({ success: true, data: [] });
    }

    const userObjectId = new ObjectId(userId);
    const lastByPartner = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId },
          ],
        },
      },
      {
        $project: {
          text: 1,
          createdAt: 1,
          partnerId: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender',
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$text' },
          lastMessageAt: { $first: '$createdAt' },
        },
      },
    ]);

    const messageMap = new Map();
    for (const row of lastByPartner) {
      messageMap.set(String(row._id), {
        lastMessage: row.lastMessage,
        lastMessageAt: row.lastMessageAt,
      });
    }

    const partners = Array.from(partnerMap.values()).map((p) => {
      const last = messageMap.get(p._id);
      return {
        ...p,
        sharedCourses: Array.from(new Set(p.sharedCourses)),
        lastMessage: last?.lastMessage || '',
        lastMessageAt: last?.lastMessageAt || null,
      };
    });

    partners.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: partners });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const partnerId = req.params.partnerId;
    const auth = await ensurePartnerAllowed(req.user, partnerId);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, error: auth.message });
    }

    const userId = String(req.user._id);
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: partnerId },
        { sender: partnerId, recipient: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const partnerId = req.params.partnerId;
    const auth = await ensurePartnerAllowed(req.user, partnerId);
    if (!auth.ok) {
      return res.status(auth.status).json({ success: false, error: auth.message });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: partnerId,
      text,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};
