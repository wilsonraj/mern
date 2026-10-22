import mongoose from 'mongoose';
import FeedPost from '../models/FeedPost.model.js';
import { Appointment, DoctorSlot, FriendRequest, Message, RefreshToken, User } from '../models/index.js';
import { createRefund } from './razorpay.service.js';

const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const forbidden = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const getDirectory = async (actor, search = '') => {
  const filter = { _id: { $ne: actor._id } };
  const normalizedSearch = search.trim().slice(0, 100);
  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  const [users, relations] = await Promise.all([
    User.find(filter).select('name email role').sort({ name: 1 }).limit(100).lean(),
    FriendRequest.find({
      $or: [{ requester: actor._id }, { recipient: actor._id }]
    }).lean()
  ]);

  const relationshipByUser = new Map();
  for (const relation of relations) {
    const otherUserId = relation.requester.equals(actor._id)
      ? relation.recipient.toString()
      : relation.requester.toString();
    relationshipByUser.set(otherUserId, {
      status: relation.status,
      direction: relation.requester.equals(actor._id) ? 'outgoing' : 'incoming',
      requestId: relation._id.toString()
    });
  }

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    friendship: relationshipByUser.get(user._id.toString()) || null
  }));
};

const getFriendRequests = async (actor) => FriendRequest.find({
  status: 'pending',
  $or: [{ requester: actor._id }, { recipient: actor._id }]
})
  .populate('requester', 'name email role')
  .populate('recipient', 'name email role')
  .sort({ createdAt: -1 })
  .lean();

const createFriendRequest = async (actor, recipientId) => {
  if (!mongoose.isValidObjectId(recipientId) || actor._id.equals(recipientId)) {
    throw notFound('User not found');
  }

  const recipient = await User.findById(recipientId).select('_id');
  if (!recipient) throw notFound('User not found');

  const existing = await FriendRequest.findOne({
    $or: [
      { requester: actor._id, recipient: recipient._id },
      { requester: recipient._id, recipient: actor._id }
    ]
  });

  if (existing?.status === 'accepted') throw conflict('You are already friends');
  if (existing?.status === 'pending') {
    throw conflict(existing.requester.equals(actor._id)
      ? 'Friend request already sent'
      : 'This user has already sent you a friend request');
  }

  if (existing) {
    existing.requester = actor._id;
    existing.recipient = recipient._id;
    existing.status = 'pending';
    return existing.save();
  }

  try {
    return await FriendRequest.create({ requester: actor._id, recipient: recipient._id });
  } catch (error) {
    if (error.code === 11000) throw conflict('A friend request already exists');
    throw error;
  }
};

const respondToFriendRequest = async (actor, requestId, status) => {
  if (!['accepted', 'rejected'].includes(status)) {
    const error = new Error('Status must be accepted or rejected');
    error.statusCode = 400;
    throw error;
  }

  const request = await FriendRequest.findOneAndUpdate(
    { _id: requestId, recipient: actor._id, status: 'pending' },
    { $set: { status } },
    { new: true }
  );
  if (!request) throw notFound('Pending friend request not found');
  return request;
};

const removeFriend = async (actor, userId) => {
  const request = await FriendRequest.findOneAndDelete({
    status: 'accepted',
    $or: [
      { requester: actor._id, recipient: userId },
      { requester: userId, recipient: actor._id }
    ]
  });
  if (!request) throw notFound('Friendship not found');
  return request;
};

const canMessage = async (actor, recipient) => {
  if (actor.role === 'admin' || recipient.role === 'admin') return true;
  return Boolean(await FriendRequest.exists({
    status: 'accepted',
    $or: [
      { requester: actor._id, recipient: recipient._id },
      { requester: recipient._id, recipient: actor._id }
    ]
  }));
};

const getMessagePeer = async (actor, recipientId) => {
  if (!mongoose.isValidObjectId(recipientId) || actor._id.equals(recipientId)) {
    throw notFound('User not found');
  }
  const recipient = await User.findById(recipientId).select('_id role name');
  if (!recipient) throw notFound('User not found');
  if (!(await canMessage(actor, recipient))) {
    throw forbidden('Send and accept a friend request before messaging this user');
  }
  return recipient;
};

const getMessages = async (actor, recipientId) => {
  const recipient = await getMessagePeer(actor, recipientId);
  const messages = await Message.find({
    $or: [
      { sender: actor._id, recipient: recipient._id },
      { sender: recipient._id, recipient: actor._id }
    ]
  })
    .populate('sender', 'name role')
    .populate('recipient', 'name role')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return messages.reverse();
};

const getCallPeer = async (actor, recipientId) => {
  try {
    return await getMessagePeer(actor, recipientId);
  } catch (error) {
    if (error.statusCode !== 403) throw error;
  }
  const appointment = await Appointment.findOne({
    status: 'accepted',
    mode: 'video',
    startsAt: {
      $gte: new Date(Date.now() - 60 * 60 * 1000),
      $lte: new Date(Date.now() + 20 * 60 * 1000)
    },
    $or: [
      { doctor: actor._id, patient: recipientId },
      { patient: actor._id, doctor: recipientId }
    ]
  }).select('_id');
  if (!appointment) throw forbidden('Video calls are only available for an accepted video appointment near its scheduled time');
  const peer = await User.findById(recipientId).select('_id role name');
  if (!peer) throw notFound('User not found');
  return peer;
};

const getUnreadMessageCounts = async (actor) => {
  const conversations = await Message.aggregate([
    { $match: { recipient: actor._id, readAt: null } },
    { $group: { _id: '$sender', count: { $sum: 1 } } }
  ]);
  return {
    total: conversations.reduce((total, conversation) => total + conversation.count, 0),
    conversations: conversations.map(({ _id, count }) => ({
      userId: _id.toString(),
      count
    }))
  };
};

const markMessagesRead = async (actor, senderId) => {
  const sender = await getMessagePeer(actor, senderId);
  const result = await Message.updateMany(
    { sender: sender._id, recipient: actor._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { modifiedCount: result.modifiedCount };
};

const sendMessage = async (actor, recipientId, text) => {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  if (!normalizedText || normalizedText.length > 4000) {
    const error = new Error('Message must contain 1 to 4000 characters');
    error.statusCode = 400;
    throw error;
  }

  const recipient = await getMessagePeer(actor, recipientId);
  return Message.create({
    sender: actor._id,
    recipient: recipient._id,
    text: normalizedText
  });
};

const getAdminUsers = async () => User.find({})
  .select('name email role createdAt')
  .sort({ createdAt: -1 })
  .limit(500)
  .lean();

const createAdminUser = async ({ name, email, password }) => {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    const error = new Error('Name must contain 2 to 100 characters');
    error.statusCode = 400;
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error('Enter a valid email address');
    error.statusCode = 400;
    throw error;
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    const error = new Error('Password must contain 6 to 128 characters');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: 'admin'
    });
  } catch (error) {
    if (error.code === 11000) throw conflict('An account already exists with this email');
    throw error;
  }
};

const updateUserRole = async (actor, userId, role) => {
  if (!['admin', 'doctor', 'patient', 'user'].includes(role)) {
    const error = new Error('Role must be admin, doctor, or patient');
    error.statusCode = 400;
    throw error;
  }
  if (!mongoose.isValidObjectId(userId) || actor._id.equals(userId)) {
    throw forbidden('You cannot change your own role');
  }

  const user = await User.findById(userId).select('_id role');
  if (!user) throw notFound('User not found');
  if (['patient', 'doctor'].includes(user.role) && user.role !== role) {
    const activeAppointmentCount = await Appointment.countDocuments({
      $or: [{ patient: user._id }, { doctor: user._id }],
      startsAt: { $gt: new Date() },
      status: { $in: ['awaiting_payment', 'pending', 'accepted', 'cancelling'] }
    });
    if (activeAppointmentCount) {
      throw conflict("Resolve this account's upcoming appointments before changing its role");
    }
  }
  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw conflict('The last administrator cannot be demoted');
  }
  return User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true, runValidators: true }
  )
    .select('name email role createdAt')
    .lean();
};

const deleteUser = async (actor, userId) => {
  if (!mongoose.isValidObjectId(userId) || actor._id.equals(userId)) {
    throw forbidden('You cannot delete your own account from user management');
  }

  const user = await User.findById(userId).select('_id role');
  if (!user) throw notFound('User not found');
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
    throw conflict('The last administrator cannot be deleted');
  }

  const appointmentsToRefund = await Appointment.find({
    $or: [{ patient: user._id }, { doctor: user._id }],
    startsAt: { $gt: new Date() },
    paymentStatus: 'paid',
    status: { $in: ['pending', 'accepted'] }
  });
  for (const appointment of appointmentsToRefund) {
    await createRefund(
      appointment.razorpayPaymentId,
      appointment.amount,
      `appt_${appointment._id}`
    );
    appointment.paymentStatus = 'refunded';
    appointment.status = 'cancelled';
    await appointment.save();
  }

  await Promise.all([
    FriendRequest.deleteMany({ $or: [{ requester: user._id }, { recipient: user._id }] }),
    Message.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] }),
    FeedPost.deleteMany({ author: user._id }),
    FeedPost.updateMany(
      { $or: [{ likes: user._id }, { 'comments.user': user._id }] },
      { $pull: { likes: user._id, comments: { user: user._id } } }
    ),
    Appointment.deleteMany({ $or: [{ patient: user._id }, { doctor: user._id }] }),
    DoctorSlot.deleteMany({ doctor: user._id }),
    RefreshToken.deleteMany({ userId: user._id })
  ]);
  await user.deleteOne();
};

export {
  createFriendRequest,
  createAdminUser,
  deleteUser,
  getAdminUsers,
  getCallPeer,
  getDirectory,
  getFriendRequests,
  getMessages,
  getUnreadMessageCounts,
  markMessagesRead,
  removeFriend,
  respondToFriendRequest,
  sendMessage,
  updateUserRole
};
