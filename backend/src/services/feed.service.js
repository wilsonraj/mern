import FeedPost from '../models/FeedPost.model.js';

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const notFound = (message = 'Post not found') => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const populatePost = (query) => query
  .populate('author', 'name role')
  .populate('comments.user', 'name role');

const getFeed = async () => populatePost(
  FeedPost.find({}).sort({ createdAt: -1 }).limit(100)
).lean();

const createPost = async (author, { text, imageUrl }) => {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  if (normalizedText.length > 2000) {
    throw badRequest('Post text must be 2000 characters or fewer.');
  }
  if (!normalizedText && !imageUrl) {
    throw badRequest('Add text or an image to create a post.');
  }

  const post = await FeedPost.create({
    author: author._id,
    text: normalizedText,
    imageUrl: imageUrl || ''
  });
  return populatePost(FeedPost.findById(post._id)).lean();
};

const toggleLike = async (postId, userId) => {
  const removed = await FeedPost.findOneAndUpdate(
    { _id: postId, likes: userId },
    { $pull: { likes: userId } },
    { new: true }
  );
  if (removed) return populatePost(FeedPost.findById(postId)).lean();

  const added = await FeedPost.findByIdAndUpdate(
    postId,
    { $addToSet: { likes: userId } },
    { new: true }
  );
  if (!added) throw notFound();
  return populatePost(FeedPost.findById(postId)).lean();
};

const addComment = async (postId, userId, text) => {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  if (!normalizedText || normalizedText.length > 1000) {
    throw badRequest('Comment must contain 1 to 1000 characters.');
  }

  const post = await FeedPost.findByIdAndUpdate(
    postId,
    { $push: { comments: { user: userId, text: normalizedText } } },
    { new: true, runValidators: true }
  );
  if (!post) throw notFound();
  return populatePost(FeedPost.findById(postId)).lean();
};

const sharePost = async (postId) => {
  const post = await FeedPost.findByIdAndUpdate(
    postId,
    { $inc: { shares: 1 } },
    { new: true }
  );
  if (!post) throw notFound();
  return populatePost(FeedPost.findById(postId)).lean();
};

export { addComment, createPost, getFeed, sharePost, toggleLike };
