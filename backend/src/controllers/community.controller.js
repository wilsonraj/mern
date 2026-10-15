import * as communityService from '../services/community.service.js';
import ApiResponse from '../utils/apiResponse.js';

const getDirectory = async (req, res, next) => {
  try {
    if (req.query.search !== undefined && typeof req.query.search !== 'string') {
      return ApiResponse.error(res, 'Search must be a single text value', 400);
    }
    const users = await communityService.getDirectory(req.user, req.query.search || '');
    return ApiResponse.success(res, users, 'People fetched successfully');
  } catch (error) {
    return next(error);
  }
};

const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await communityService.getFriendRequests(req.user);
    return ApiResponse.success(res, requests, 'Friend requests fetched successfully');
  } catch (error) {
    return next(error);
  }
};

const createFriendRequest = async (req, res, next) => {
  try {
    const request = await communityService.createFriendRequest(req.user, req.body.recipientId);
    req.app.get('io').to(`user:${request.recipient}`).emit('friend-request:updated');
    return ApiResponse.success(res, request, 'Friend request sent', 201);
  } catch (error) {
    return next(error);
  }
};

const respondToFriendRequest = async (req, res, next) => {
  try {
    const request = await communityService.respondToFriendRequest(
      req.user,
      req.params.requestId,
      req.body.status
    );
    req.app.get('io')
      .to(`user:${request.requester}`)
      .to(`user:${request.recipient}`)
      .emit('friend-request:updated');
    return ApiResponse.success(res, request, 'Friend request updated');
  } catch (error) {
    return next(error);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const request = await communityService.removeFriend(req.user, req.params.userId);
    req.app.get('io')
      .to(`user:${request.requester}`)
      .to(`user:${request.recipient}`)
      .emit('friend-request:updated');
    return ApiResponse.success(res, null, 'Friend removed');
  } catch (error) {
    return next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const messages = await communityService.getMessages(req.user, req.params.userId);
    return ApiResponse.success(res, messages, 'Messages fetched successfully');
  } catch (error) {
    return next(error);
  }
};

const getUnreadMessageCounts = async (req, res, next) => {
  try {
    const unread = await communityService.getUnreadMessageCounts(req.user);
    return ApiResponse.success(res, unread, 'Unread message counts fetched');
  } catch (error) {
    return next(error);
  }
};

const markMessagesRead = async (req, res, next) => {
  try {
    const result = await communityService.markMessagesRead(req.user, req.params.userId);
    return ApiResponse.success(res, result, 'Messages marked as read');
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const message = await communityService.sendMessage(
      req.user,
      req.params.userId,
      req.body.text
    );
    const populatedMessage = await message.populate([
      { path: 'sender', select: 'name role' },
      { path: 'recipient', select: 'name role' }
    ]);
    const io = req.app.get('io');
    io.to(`user:${req.user._id}`).to(`user:${req.params.userId}`).emit(
      'message:new',
      populatedMessage
    );
    return ApiResponse.success(res, populatedMessage, 'Message sent', 201);
  } catch (error) {
    return next(error);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    const users = await communityService.getAdminUsers();
    return ApiResponse.success(res, users, 'Users fetched successfully');
  } catch (error) {
    return next(error);
  }
};

const createAdminUser = async (req, res, next) => {
  try {
    const user = await communityService.createAdminUser(req.body);
    return ApiResponse.success(
      res,
      { id: user._id, name: user.name, email: user.email, role: user.role },
      'Administrator account created',
      201
    );
  } catch (error) {
    return next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await communityService.updateUserRole(
      req.user,
      req.params.userId,
      req.body.role
    );
    req.app.get('io').to(`user:${req.params.userId}`).emit('account:updated');
    return ApiResponse.success(res, user, 'User role updated');
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await communityService.deleteUser(req.user, req.params.userId);
    const userRoom = `user:${req.params.userId}`;
    req.app.get('io').to(userRoom).emit('account:deleted');
    req.app.get('io').in(userRoom).disconnectSockets(true);
    return ApiResponse.success(res, null, 'User and account data deleted');
  } catch (error) {
    return next(error);
  }
};

export {
  createFriendRequest,
  createAdminUser,
  deleteUser,
  getAdminUsers,
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
