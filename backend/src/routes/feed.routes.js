import express from 'express';
import { addComment, createPost, getFeed, sharePost, toggleLike } from '../controllers/feed.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { imageUpload } from '../config/feedUpload.config.js';

const router = express.Router();

router.use(protect);
router.get('/', getFeed);
router.post('/', imageUpload.single('image'), createPost);
router.post('/:postId/likes', toggleLike);
router.post('/:postId/comments', addComment);
router.post('/:postId/shares', sharePost);

export default router;
