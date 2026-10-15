import { useState } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Container,
  FormControl,
  MenuItem,
  Paper,
  TextField,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { selectCurrentUser } from '../auth/authSlice';
import {
  useCreateAdminUserMutation,
  useDeleteUserMutation,
  useGetAdminUsersQuery,
  useUpdateUserRoleMutation
} from './communityApi';

const AdminPage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { data: usersResponse, isLoading, error } = useGetAdminUsersQuery();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [createAdminUser, { isLoading: isCreatingAdmin }] = useCreateAdminUserMutation();
  const [pendingUserId, setPendingUserId] = useState(null);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const users = usersResponse?.data || [];

  const handleRoleChange = async (user, role) => {
    setPendingUserId(user._id);
    try {
      await updateUserRole({ userId: user._id, role }).unwrap();
      dispatch(showNotification({ message: `${user.name}'s role was updated.`, severity: 'success' }));
    } catch (requestError) {
      dispatch(showNotification({
        message: requestError?.data?.message || 'Could not update user role.',
        severity: 'error'
      }));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(
      `Permanently delete ${user.name} and their messages and friend requests? Upcoming paid appointments will be refunded and cancelled.`
    )) return;
    setPendingUserId(user._id);
    try {
      await deleteUser(user._id).unwrap();
      dispatch(showNotification({ message: 'User account deleted.', severity: 'success' }));
    } catch (requestError) {
      dispatch(showNotification({
        message: requestError?.data?.message || 'Could not delete user account.',
        severity: 'error'
      }));
    } finally {
      setPendingUserId(null);
    }
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    try {
      await createAdminUser(newAdmin).unwrap();
      setNewAdmin({ name: '', email: '', password: '' });
      dispatch(showNotification({
        message: 'Administrator account created. They can now sign in with these credentials.',
        severity: 'success'
      }));
    } catch (requestError) {
      dispatch(showNotification({
        message: requestError?.data?.message || 'Could not create administrator account.',
        severity: 'error'
      }));
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h5">Administrator access required</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
        ADMINISTRATION
      </Typography>
      <Typography variant="h4" component="h1">User management</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Manage account roles and remove users. Only administrators can access these controls.
      </Typography>

      <Paper
        component="form"
        variant="outlined"
        onSubmit={handleCreateAdmin}
        sx={{ p: 2.5, mb: 3 }}
      >
        <Typography variant="h6" sx={{ mb: 0.5 }}>Create administrator</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create an account with administrator permissions. Share its credentials securely.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
          <TextField
            label="Full name"
            size="small"
            required
            fullWidth
            value={newAdmin.name}
            onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })}
            inputProps={{ minLength: 2, maxLength: 100 }}
          />
          <TextField
            label="Email address"
            type="email"
            size="small"
            required
            fullWidth
            value={newAdmin.email}
            onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })}
          />
          <TextField
            label="Temporary password"
            type="password"
            size="small"
            required
            fullWidth
            value={newAdmin.password}
            onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })}
            inputProps={{ minLength: 6, maxLength: 128 }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={isCreatingAdmin ? <CircularProgress size={18} color="inherit" /> : <PersonAddAlt1Icon />}
            disabled={isCreatingAdmin || newAdmin.name.trim().length < 2 ||
              !newAdmin.email.trim() || newAdmin.password.length < 6}
            sx={{ whiteSpace: 'nowrap', minHeight: 40 }}
          >
            Create admin
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        {isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', p: 5 }}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 3 }}>Could not load users. Please try again.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const isCurrentUser = user._id === currentUser.id;
                const isBusy = pendingUserId === user._id;
                return (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar sx={{ width: 34, height: 34 }}>{user.name?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
                        <Typography variant="body2" fontWeight={600}>{user.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <FormControl size="small" disabled={isCurrentUser || isBusy}>
                        <Select
                          value={user.role}
                          onChange={(event) => handleRoleChange(user, event.target.value)}
                          inputProps={{ 'aria-label': `Role for ${user.name}` }}
                        >
                          <MenuItem value="patient">Patient</MenuItem>
                          <MenuItem value="doctor">Doctor</MenuItem>
                          <MenuItem value="user">Legacy user</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={isCurrentUser ? 'You cannot delete your own account here' : 'Delete account'}>
                        <span>
                          <IconButton
                            aria-label={`Delete ${user.name}`}
                            color="error"
                            disabled={isCurrentUser || isBusy}
                            onClick={() => handleDelete(user)}
                          >
                            {isBusy ? <CircularProgress size={20} /> : <DeleteOutlineIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">No user accounts found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Container>
  );
};

export default AdminPage;
