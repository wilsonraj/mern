import { unlink } from 'node:fs/promises';
import * as feedService from '../services/feed.service.js';
import logger from '../utils/logger.js';
import ApiResponse from '../utils/apiResponse.js';

const getFeed = async (req, res, next) => {
  try {
    const posts = await feedService.getFeed();
    return ApiResponse.success(res, posts, 'Feed fetched successfully');
  } catch (error) {
    return next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const post = await feedService.createPost(req.user, {
      text: req.body.text,
      imageUrl: req.file ? `/uploads/feed/${req.file.filename}` : ''
    });
    return ApiResponse.success(res, post, 'Post created', 201);
  } catch (error) {
    if (req.file) {
      try {
        await unlink(req.file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          logger.warn(`Could not remove failed feed image upload: ${cleanupError.message}`);
        }
      }
    }
    return next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const post = await feedService.toggleLike(req.params.postId, req.user._id);
    return ApiResponse.success(res, post, 'Post like updated');
  } catch (error) {
    return next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const post = await feedService.addComment(req.params.postId, req.user._id, req.body.text);
    return ApiResponse.success(res, post, 'Comment added', 201);
  } catch (error) {
    return next(error);
  }
};

const sharePost = async (req, res, next) => {
  try {
    const post = await feedService.sharePost(req.params.postId);
    return ApiResponse.success(res, post, 'Post shared');
  } catch (error) {
    return next(error);
  }
};

export { addComment, createPost, getFeed, sharePost, toggleLike };
