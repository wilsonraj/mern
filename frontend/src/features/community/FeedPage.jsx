import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SendIcon from '@mui/icons-material/Send';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { selectCurrentUser } from '../auth/authSlice';
import {
  useAddFeedCommentMutation,
  useCreateFeedPostMutation,
  useGetFeedQuery,
  useShareFeedPostMutation,
  useToggleFeedLikeMutation
} from './communityApi';

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '');

const formatPostDate = (date) => new Date(date).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const FeedPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { data: feedResponse, isLoading, isError } = useGetFeedQuery();
  const [createPost, { isLoading: isCreatingPost }] = useCreateFeedPostMutation();
  const [postText, setPostText] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const postFormRef = useRef(null);
  const lastScrolledHash = useRef('');

  useEffect(() => {
    setPosts(feedResponse?.data || []);
  }, [feedResponse]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === lastScrolledHash.current) return;
    const postElement = document.getElementById(hash.slice(1));
    if (postElement) {
      postElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      lastScrolledHash.current = hash;
    }
  }, [posts]);

  const handleCreatePost = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('text', postText);
    if (image) formData.append('image', image);
    try {
      await createPost(formData).unwrap();
      setPostText('');
      setImage(null);
      postFormRef.current?.reset();
      dispatch(showNotification({ message: 'Your post was published.', severity: 'success' }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not publish your post.',
        severity: 'error'
      }));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
        COMMUNITY
      </Typography>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        News feed
      </Typography>

      <Card ref={postFormRef} component="form" variant="outlined" onSubmit={handleCreatePost} sx={{ mb: 3 }}>
        <CardHeader
          avatar={<Avatar>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Avatar>}
          title={user?.name || 'Share an update'}
          subheader="Share a photo or a thought with everyone"
        />
        <CardContent sx={{ pt: 0 }}>
          <TextField
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
            placeholder="What's happening?"
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            inputProps={{ maxLength: 2000, 'aria-label': 'Post text' }}
          />
          {image && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Selected image: {image.name}
            </Typography>
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Button type="button" component="label" startIcon={<AddPhotoAlternateOutlinedIcon />}>
            Add image
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
            />
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isCreatingPost || (!postText.trim() && !image)}
          >
            {isCreatingPost ? <CircularProgress size={20} color="inherit" /> : 'Post'}
          </Button>
        </CardActions>
      </Card>

      {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {isError && (
        <Typography color="error" align="center" sx={{ my: 3 }}>
          Could not load the news feed. Please try again.
        </Typography>
      )}
      {!isLoading && !isError && posts.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
          No posts yet. Be the first to share something.
        </Typography>
      )}

      <Stack spacing={2}>
        {posts.map((post) => (
          <FeedPostCard key={post._id} post={post} currentUserId={user?.id || user?._id} />
        ))}
      </Stack>
    </Container>
  );
};

const FeedPostCard = ({ post, currentUserId }) => {
  const dispatch = useDispatch();
  const [commentText, setCommentText] = useState('');
  const [toggleLike, { isLoading: isUpdatingLike }] = useToggleFeedLikeMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddFeedCommentMutation();
  const [sharePost, { isLoading: isSharing }] = useShareFeedPostMutation();
  const author = post.author || {};
  const isLiked = post.likes?.some((like) => String(like) === String(currentUserId));

  const handleLike = async () => {
    try {
      await toggleLike(post._id).unwrap();
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not update your like.',
        severity: 'error'
      }));
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment({ postId: post._id, text: commentText }).unwrap();
      setCommentText('');
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not add your comment.',
        severity: 'error'
      }));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed#post-${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${author.name || 'A user'}'s post`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error('Sharing is not supported by this browser.');
      }
      await sharePost(post._id).unwrap();
      dispatch(showNotification({
        message: navigator.share ? 'Post shared.' : 'Post link copied.',
        severity: 'success'
      }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      dispatch(showNotification({
        message: error?.data?.message || error.message || 'Could not share this post.',
        severity: 'error'
      }));
    }
  };

  return (
    <Card id={`post-${post._id}`} variant="outlined" sx={{ scrollMarginTop: 90 }}>
      <CardHeader
        avatar={<Avatar>{author.name?.charAt(0)?.toUpperCase() || 'U'}</Avatar>}
        title={author.name || 'User'}
        subheader={formatPostDate(post.createdAt)}
      />
      {post.text && (
        <CardContent sx={{ pt: 0, pb: post.imageUrl ? 1 : undefined }}>
          <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.text}</Typography>
        </CardContent>
      )}
      {post.imageUrl && (
        <CardMedia
          component="img"
          image={`${apiOrigin}${post.imageUrl}`}
          alt={`Image shared by ${author.name || 'a user'}`}
          sx={{ maxHeight: 560, objectFit: 'contain', bgcolor: 'action.hover' }}
        />
      )}
      <CardActions sx={{ px: 2 }}>
        <Tooltip title={isLiked ? 'Unlike' : 'Like'}>
          <span>
            <IconButton
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
              color={isLiked ? 'error' : 'default'}
              onClick={handleLike}
              disabled={isUpdatingLike}
            >
              {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="body2" color="text.secondary">
          {post.likes?.length || 0}
        </Typography>
        <ChatBubbleOutlineIcon fontSize="small" color="action" sx={{ ml: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {post.comments?.length || 0}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<ShareOutlinedIcon />}
          onClick={handleShare}
          disabled={isSharing}
        >
          Share · {post.shares || 0}
        </Button>
      </CardActions>

      {post.comments?.length > 0 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1.25}>
            {post.comments.map((comment) => (
              <Stack key={comment._id} direction="row" spacing={1} alignItems="flex-start">
                <Avatar sx={{ width: 30, height: 30, fontSize: 14 }}>
                  {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {comment.user?.name || 'User'}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {comment.text}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <CardContent component="form" onSubmit={handleComment} sx={{ pt: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Write a comment..."
            size="small"
            fullWidth
            inputProps={{ maxLength: 1000, 'aria-label': 'Write a comment' }}
          />
          <IconButton
            type="submit"
            color="primary"
            aria-label="Send comment"
            disabled={isAddingComment || !commentText.trim()}
          >
            {isAddingComment ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FeedPage;
