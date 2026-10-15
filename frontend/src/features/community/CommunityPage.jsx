import { useEffect, useMemo, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Chip from '@mui/material/Chip';
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { useChatCalls } from '../../components/common/ChatCallProvider';
import { selectCurrentUser } from '../auth/authSlice';
import {
  useCreateFriendRequestMutation,
  useGetDirectoryQuery,
  useGetFriendRequestsQuery,
  useGetMessagesQuery,
  useGetUnreadMessageCountsQuery,
  useMarkMessagesReadMutation,
  useRemoveFriendMutation,
  useRespondToFriendRequestMutation,
  useSendMessageMutation
} from './communityApi';

const getId = (user) => user?._id || user?.id;
const personLabel = (person) => person?.name || person?.email || 'User';

const CommunityPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { call, startCall } = useChatCalls();
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [messageText, setMessageText] = useState('');
  const markedReadKey = useRef('');

  const { data: directoryResponse, isLoading: isLoadingDirectory } = useGetDirectoryQuery({
    search: search.trim()
  });
  const { data: requestsResponse } = useGetFriendRequestsQuery();
  const { data: unreadResponse } = useGetUnreadMessageCountsQuery();
  const people = directoryResponse?.data || [];
  const friendRequests = requestsResponse?.data || [];
  const selectedUserId = selectedPerson?.id;
  const unreadCounts = new Map(
    (unreadResponse?.data?.conversations || []).map(({ userId, count }) => [userId, count])
  );
  const selectedUnreadCount = selectedUserId ? unreadCounts.get(selectedUserId) || 0 : 0;
  const canMessage = Boolean(
    selectedPerson &&
    (user?.role === 'admin' ||
      selectedPerson.role === 'admin' ||
      selectedPerson.friendship?.status === 'accepted')
  );
  const {
    currentData: messagesResponse,
    isFetching: isLoadingMessages,
    error: messagesError
  } = useGetMessagesQuery(canMessage ? selectedUserId : skipToken);
  const messages = messagesResponse?.data || [];
  const [createFriendRequest, { isLoading: isSendingRequest }] = useCreateFriendRequestMutation();
  const [respondToFriendRequest] = useRespondToFriendRequestMutation();
  const [removeFriend] = useRemoveFriendMutation();
  const [markMessagesRead] = useMarkMessagesReadMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();

  const incomingRequests = useMemo(
    () => friendRequests.filter((request) => getId(request.recipient) === user?.id),
    [friendRequests, user?.id]
  );

  useEffect(() => {
    if (!selectedPerson) return;
    const refreshedPerson = people.find((person) => person.id === selectedPerson.id);
    if (refreshedPerson) setSelectedPerson(refreshedPerson);
  }, [people, selectedPerson?.id]);

  useEffect(() => {
    if (!canMessage || !selectedUserId || selectedUnreadCount === 0) return;
    const readKey = `${selectedUserId}:${selectedUnreadCount}`;
    if (markedReadKey.current === readKey) return;
    markedReadKey.current = readKey;
    markMessagesRead(selectedUserId).unwrap().catch((error) => {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not update unread message count.',
        severity: 'error'
      }));
      markedReadKey.current = '';
    });
  }, [canMessage, dispatch, markMessagesRead, selectedUnreadCount, selectedUserId]);

  const notifyError = (error, fallback) => {
    dispatch(showNotification({
      message: error?.data?.message || fallback,
      severity: 'error'
    }));
  };

  const handleSendFriendRequest = async (person) => {
    try {
      await createFriendRequest(person.id).unwrap();
      dispatch(showNotification({ message: 'Friend request sent.', severity: 'success' }));
    } catch (error) {
      notifyError(error, 'Could not send friend request.');
    }
  };

  const handleRequestResponse = async (requestId, status) => {
    try {
      await respondToFriendRequest({ requestId, status }).unwrap();
      dispatch(showNotification({
        message: status === 'accepted' ? 'Friend request accepted.' : 'Friend request declined.',
        severity: 'success'
      }));
    } catch (error) {
      notifyError(error, 'Could not update friend request.');
    }
  };

  const handleRemoveFriend = async (person) => {
    try {
      await removeFriend(person.id).unwrap();
      if (selectedPerson?.id === person.id && user?.role !== 'admin' && person.role !== 'admin') {
        setSelectedPerson({ ...person, friendship: null });
      }
      dispatch(showNotification({ message: 'Friend removed.', severity: 'success' }));
    } catch (error) {
      notifyError(error, 'Could not remove friend.');
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !messageText.trim()) return;
    try {
      await sendMessage({ userId: selectedUserId, text: messageText }).unwrap();
      setMessageText('');
    } catch (error) {
      notifyError(error, 'Could not send message.');
    }
  };

  const getFriendshipAction = (person) => {
    const friendship = person.friendship;
    if (!friendship) {
      return (
        <Tooltip title="Add friend">
          <span>
            <IconButton
              size="small"
              aria-label={`Add ${personLabel(person)} as a friend`}
              disabled={isSendingRequest}
              onClick={(event) => {
                event.stopPropagation();
                handleSendFriendRequest(person);
              }}
            >
              <PersonAddAlt1Icon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      );
    }
    if (friendship.status === 'accepted') {
      return (
        <Tooltip title="Remove friend">
          <IconButton
            size="small"
            aria-label={`Remove ${personLabel(person)} as a friend`}
            onClick={(event) => {
              event.stopPropagation();
              handleRemoveFriend(person);
            }}
          >
            <PersonRemoveOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    if (friendship.status === 'pending' && friendship.direction === 'incoming') {
      return (
        <Stack direction="row" spacing={0.25}>
          <IconButton
            size="small"
            aria-label={`Accept ${personLabel(person)}'s friend request`}
            onClick={(event) => {
              event.stopPropagation();
              handleRequestResponse(friendship.requestId, 'accepted');
            }}
          >
            <CheckIcon fontSize="small" color="success" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Decline ${personLabel(person)}'s friend request`}
            onClick={(event) => {
              event.stopPropagation();
              handleRequestResponse(friendship.requestId, 'rejected');
            }}
          >
            <CloseIcon fontSize="small" color="error" />
          </IconButton>
        </Stack>
      );
    }
    return <Chip size="small" label="Request sent" variant="outlined" />;
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
            COMMUNITY
          </Typography>
          <Typography variant="h4" component="h1">People & messages</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Add friends to chat. Administrators can message any account.
          </Typography>
        </Box>
      </Stack>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' },
        gap: 2,
        minHeight: 620
      }}>
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search people"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />

          {incomingRequests.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Friend requests ({incomingRequests.length})
              </Typography>
              <Stack spacing={1}>
                {incomingRequests.map((request) => {
                  const requesterId = getId(request.requester);
                  return (
                    <Paper key={request._id} variant="outlined" sx={{ p: 1.2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" noWrap>{personLabel(request.requester)}</Typography>
                        <Stack direction="row">
                          <IconButton
                            size="small"
                            aria-label="Accept friend request"
                            onClick={() => handleRequestResponse(request._id, 'accepted')}
                          >
                            <CheckIcon fontSize="small" color="success" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Decline friend request"
                            onClick={() => handleRequestResponse(request._id, 'rejected')}
                          >
                            <CloseIcon fontSize="small" color="error" />
                          </IconButton>
                        </Stack>
                      </Stack>
                      <Button
                        size="small"
                        onClick={() => setSelectedPerson({
                          id: requesterId,
                          name: request.requester?.name,
                          email: request.requester?.email,
                          role: request.requester?.role,
                          friendship: { status: 'pending', direction: 'incoming', requestId: request._id }
                        })}
                      >
                        View profile
                      </Button>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>People</Typography>
          <Box sx={{ overflowY: 'auto', maxHeight: 510 }}>
            {isLoadingDirectory && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
            {!isLoadingDirectory && people.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No people found.
              </Typography>
            )}
            <Stack spacing={0.5}>
              {people.map((person) => (
                <Box
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedPerson(person);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: selectedPerson?.id === person.id ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Avatar sx={{ width: 34, height: 34 }}>{person.name?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={650} noWrap>{person.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {person.role === 'admin' ? 'Administrator' : person.email}
                    </Typography>
                  </Box>
                  {unreadCounts.get(person.id) > 0 && (
                    <Chip
                      size="small"
                      color="primary"
                      label={unreadCounts.get(person.id)}
                      aria-label={`${unreadCounts.get(person.id)} unread messages`}
                    />
                  )}
                  {getFriendshipAction(person)}
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minHeight: 480, overflow: 'hidden' }}>
          {selectedPerson ? (
            <>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2 }}>
                <Avatar>{selectedPerson.name?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>{personLabel(selectedPerson)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPerson.role === 'admin' ? 'Administrator' : selectedPerson.email}
                  </Typography>
                </Box>
                {selectedPerson.friendship?.status === 'accepted' && <Chip size="small" label="Friend" color="success" />}
                {canMessage && (
                  <>
                    <Tooltip title="Start audio call">
                      <span>
                        <IconButton
                          aria-label={`Start audio call with ${personLabel(selectedPerson)}`}
                          disabled={Boolean(call)}
                          onClick={() => startCall(selectedPerson, 'audio')}
                        >
                          <CallIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Start video call">
                      <span>
                        <IconButton
                          aria-label={`Start video call with ${personLabel(selectedPerson)}`}
                          disabled={Boolean(call)}
                          onClick={() => startCall(selectedPerson, 'video')}
                        >
                          <VideocamIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                )}
              </Stack>
              <Divider />
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {!canMessage ? (
                  <Box sx={{ textAlign: 'center', maxWidth: 380, mx: 'auto', mt: 8 }}>
                    <PersonAddAlt1Icon color="primary" sx={{ fontSize: 36, mb: 1 }} />
                    <Typography variant="h6">Become friends to chat</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Send a friend request and wait for it to be accepted before messaging.
                    </Typography>
                    {!selectedPerson.friendship && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAddAlt1Icon />}
                        disabled={isSendingRequest}
                        onClick={() => handleSendFriendRequest(selectedPerson)}
                        sx={{ mt: 2 }}
                      >
                        Add friend
                      </Button>
                    )}
                    {selectedPerson.friendship?.status === 'pending' &&
                      selectedPerson.friendship.direction === 'incoming' && (
                        <Button
                          variant="contained"
                          onClick={() => handleRequestResponse(selectedPerson.friendship.requestId, 'accepted')}
                          sx={{ mt: 2 }}
                        >
                          Accept friend request
                        </Button>
                      )}
                  </Box>
                ) : (
                  <>
                    {isLoadingMessages && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
                    {messagesError && (
                      <Typography color="error" variant="body2" align="center">
                        Could not load messages. Please try selecting this person again.
                      </Typography>
                    )}
                    {!isLoadingMessages && messages.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 8 }}>
                        No messages yet. Say hello.
                      </Typography>
                    )}
                    <Stack spacing={1.2}>
                      {messages.map((message) => {
                        const ownMessage = getId(message.sender) === user?.id;
                        return (
                          <Box
                            key={message._id}
                            sx={{
                              display: 'flex',
                              justifyContent: ownMessage ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <Box
                              sx={{
                                maxWidth: 'min(78%, 520px)',
                                px: 1.5,
                                py: 1,
                                borderRadius: 2.5,
                                bgcolor: ownMessage ? 'primary.main' : 'action.hover',
                                color: ownMessage ? 'primary.contrastText' : 'text.primary'
                              }}
                            >
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                {message.text}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: 'block', mt: 0.5, textAlign: 'right', opacity: 0.72 }}
                              >
                                {new Date(message.createdAt).toLocaleString()}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </>
                )}
              </Box>
              {canMessage && (
                <>
                  <Divider />
                  <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1, p: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Write a message…"
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      inputProps={{ maxLength: 4000, 'aria-label': 'Message' }}
                    />
                    <IconButton
                      type="submit"
                      color="primary"
                      aria-label="Send message"
                      disabled={isSendingMessage || !messageText.trim()}
                    >
                      {isSendingMessage ? <CircularProgress size={22} /> : <SendIcon />}
                    </IconButton>
                  </Box>
                </>
              )}
            </>
          ) : (
            <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, p: 3, textAlign: 'center' }}>
              <Box>
                <Typography variant="h6">Choose someone to start</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Select a friend, send a request, or open an administrator conversation.
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default CommunityPage;
