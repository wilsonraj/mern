import express from 'express';
import {
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
} from '../controllers/community.controller.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/directory', getDirectory);
router.get('/friend-requests', getFriendRequests);
router.post('/friend-requests', createFriendRequest);
router.patch('/friend-requests/:requestId', respondToFriendRequest);
router.delete('/friends/:userId', removeFriend);
router.get('/unread-counts', getUnreadMessageCounts);
router.get('/messages/:userId', getMessages);
router.patch('/messages/:userId/read', markMessagesRead);
router.post('/messages/:userId', sendMessage);

router.get('/admin/users', authorize('admin'), getAdminUsers);
router.post('/admin/users', authorize('admin'), createAdminUser);
router.patch('/admin/users/:userId/role', authorize('admin'), updateUserRole);
router.delete('/admin/users/:userId', authorize('admin'), deleteUser);

export default router;
