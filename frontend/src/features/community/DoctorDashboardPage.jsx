import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { selectCurrentUser } from '../auth/authSlice';
import { useChatCalls } from '../../components/common/ChatCallProvider';
import {
  useGetDoctorSlotsQuery,
  useGetDoctorProfileQuery,
  useGetMyAppointmentsQuery,
  usePublishDoctorSlotsMutation,
  useRemoveDoctorSlotMutation,
  useUpdateAppointmentStatusMutation,
  useUpdateDoctorProfileMutation
} from './communityApi';

const toLocalDateTimeInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatTime = (startsAt) => new Date(startsAt).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const canJoinCall = (appointment) => appointment.status === 'accepted' &&
  appointment.paymentStatus === 'paid' &&
  appointment.mode === 'video' &&
  Date.now() >= new Date(appointment.startsAt).getTime() - 20 * 60 * 1000 &&
  Date.now() <= new Date(appointment.startsAt).getTime() + 60 * 60 * 1000;

const DoctorDashboardPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { call, startCall } = useChatCalls();
  const { data: appointmentsResponse } = useGetMyAppointmentsQuery(undefined, {
    pollingInterval: 30000
  });
  const { data: slotsResponse, isLoading: slotsLoading } = useGetDoctorSlotsQuery(undefined, {
    pollingInterval: 30000
  });
  const { data: profileResponse } = useGetDoctorProfileQuery();
  const [saveProfile, { isLoading: isSavingProfile }] = useUpdateDoctorProfileMutation();
  const [publishSlots, { isLoading: isPublishingSlot }] = usePublishDoctorSlotsMutation();
  const [removeSlot] = useRemoveDoctorSlotMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [specialty, setSpecialty] = useState(user?.doctorProfile?.specialty || '');
  const [bio, setBio] = useState(user?.doctorProfile?.bio || '');
  const [fee, setFee] = useState(user?.doctorProfile?.fee || '');
  const [, setClock] = useState(Date.now());
  const [slotDate, setSlotDate] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const appointments = appointmentsResponse?.data || [];
  const slots = slotsResponse?.data || [];

  useEffect(() => {
    const profile = profileResponse?.data;
    if (!profile) return;
    setSpecialty(profile.specialty || '');
    setBio(profile.bio || '');
    setFee(profile.fee || '');
  }, [profileResponse]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    try {
      await saveProfile({ specialty, bio, fee }).unwrap();
      dispatch(showNotification({ message: 'Doctor profile and consultation fee saved.', severity: 'success' }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not save your doctor profile.',
        severity: 'error'
      }));
    }
  };

  const handlePublishSlot = async (event) => {
    event.preventDefault();
    try {
      await publishSlots([new Date(slotDate).toISOString()]).unwrap();
      dispatch(showNotification({ message: 'Appointment time published.', severity: 'success' }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not publish this time.',
        severity: 'error'
      }));
    }
  };

  const handleStatus = async (appointmentId, status) => {
    try {
      await updateStatus({ appointmentId, status }).unwrap();
      dispatch(showNotification({
        message: status === 'rejected' ? 'Appointment declined. Online payments are being refunded.' : 'Appointment accepted.',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not update the appointment.',
        severity: 'error'
      }));
    }
  };

  const handleRemoveSlot = async (slotId) => {
    try {
      await removeSlot(slotId).unwrap();
      dispatch(showNotification({ message: 'Appointment time removed.', severity: 'success' }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not remove this time.',
        severity: 'error'
      }));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
        DOCTOR PORTAL
      </Typography>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Your practice</Typography>

      <Card component="form" variant="outlined" onSubmit={handleSaveProfile} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Doctor profile and consultation fee</Typography>
          <Stack spacing={2}>
            <TextField label="Specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)}
              required inputProps={{ maxLength: 100 }} />
            <TextField label="About your practice" value={bio} onChange={(event) => setBio(event.target.value)}
              multiline minRows={2} inputProps={{ maxLength: 2000 }} />
            <TextField label="Fee per appointment (INR)" type="number" value={fee}
              onChange={(event) => setFee(event.target.value)} required inputProps={{ min: 1, max: 1000000 }} />
            <Button type="submit" variant="contained" disabled={isSavingProfile}>
              {isSavingProfile ? <CircularProgress size={20} color="inherit" /> : 'Save profile'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card component="form" variant="outlined" onSubmit={handlePublishSlot} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Publish appointment availability</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add individual 30-minute appointment start times up to 90 days ahead. Patients can choose video or clinic visits.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Appointment start"
              type="datetime-local"
              value={slotDate}
              onChange={(event) => setSlotDate(event.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: toLocalDateTimeInput(new Date(Date.now() + 15 * 60 * 1000)) }}
            />
            <Button type="submit" variant="contained" disabled={isPublishingSlot} sx={{ minWidth: 150 }}>
              {isPublishingSlot ? <CircularProgress size={20} color="inherit" /> : 'Publish time'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>Availability</Typography>
      {slotsLoading && <CircularProgress size={24} />}
      {!slotsLoading && slots.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>No future times published.</Typography>
      )}
      <Stack spacing={1} sx={{ mb: 3 }}>
        {slots.map((slot) => (
          <Card key={slot._id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ flex: 1 }}>
                {formatTime(slot.startsAt)} {slot.isBooked ? '· Booked' : ''}
              </Typography>
              {!slot.isBooked && (
                <Button color="error" onClick={() => handleRemoveSlot(slot._id)}>Remove</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>Appointment requests</Typography>
      {appointments.length === 0 ? (
        <Alert severity="info">Patient bookings will appear here.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {appointments.map((appointment) => (
            <Card key={appointment._id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>
                  {appointment.patient?.name} · {formatTime(appointment.startsAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {appointment.mode === 'video' ? 'Video consultation' : 'Clinic visit'} ·
                  {' '}₹{appointment.amount / 100} · Payment: {appointment.paymentStatus.replaceAll('_', ' ')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Status: {appointment.status.replaceAll('_', ' ')}
                </Typography>
                {appointment.status === 'pending' && (
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" disabled={isUpdatingStatus}
                      onClick={() => handleStatus(appointment._id, 'accepted')}>Accept</Button>
                    <Button color="error" disabled={isUpdatingStatus}
                      onClick={() => handleStatus(appointment._id, 'rejected')}>Decline</Button>
                  </Stack>
                )}
                {canJoinCall(appointment) && (
                  <Button
                    sx={{ mt: 1 }}
                    variant="outlined"
                    disabled={Boolean(call)}
                    onClick={() => startCall({
                      id: appointment.patient._id,
                      name: appointment.patient.name
                    }, 'video')}
                  >
                    Start video consultation
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default DoctorDashboardPage;
