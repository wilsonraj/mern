import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
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
  useGetDoctorAvailabilityQuery,
  useGetDoctorProfileQuery,
  useGetMyAppointmentsQuery,
  usePublishDoctorSlotsMutation,
  useRemoveDoctorSlotMutation,
  useUpdateAppointmentStatusMutation,
  useUpdateDoctorAvailabilityMutation,
  useUpdateDoctorProfileMutation
} from './communityApi';

const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

const defaultWindows = () => [
  { start: '09:00', end: '17:00' },
  { start: '19:00', end: '21:00' }
];

const defaultWeeklyDays = () => WEEKDAYS.map(({ value }) => ({
  weekday: value,
  enabled: false,
  windows: defaultWindows()
}));

const toLocalDateTimeInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatTime = (startsAt) => new Date(startsAt).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const canJoinCall = (appointment) => appointment.status === 'accepted' &&
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
  const { data: availabilityResponse } = useGetDoctorAvailabilityQuery();
  const { data: profileResponse } = useGetDoctorProfileQuery();
  const [saveProfile, { isLoading: isSavingProfile }] = useUpdateDoctorProfileMutation();
  const [publishSlots, { isLoading: isPublishingSlot }] = usePublishDoctorSlotsMutation();
  const [removeSlot] = useRemoveDoctorSlotMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [saveAvailability, { isLoading: isSavingAvailability }] = useUpdateDoctorAvailabilityMutation();
  const [specialty, setSpecialty] = useState(user?.doctorProfile?.specialty || '');
  const [bio, setBio] = useState(user?.doctorProfile?.bio || '');
  const [weeklyTimeZone, setWeeklyTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [weeklyDays, setWeeklyDays] = useState(defaultWeeklyDays);
  const [selectedWeekday, setSelectedWeekday] = useState(WEEKDAYS[0].value);
  const [, setClock] = useState(Date.now());
  const [slotDate, setSlotDate] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const appointments = appointmentsResponse?.data || [];
  const slots = slotsResponse?.data || [];
  const selectedWeeklyDay = weeklyDays.find(({ weekday }) => weekday === selectedWeekday) || weeklyDays[0];
  const selectedWeekdayLabel = WEEKDAYS.find(({ value }) => value === selectedWeekday)?.label;

  useEffect(() => {
    const profile = profileResponse?.data;
    if (!profile) return;
    setSpecialty(profile.specialty || '');
    setBio(profile.bio || '');
  }, [profileResponse]);

  useEffect(() => {
    const availability = availabilityResponse?.data;
    if (!availability) return;
    setWeeklyTimeZone(
      availability.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    setWeeklyDays(WEEKDAYS.map(({ value }) => {
      const savedDay = availability.days.find((day) => day.weekday === value);
      return {
        weekday: value,
        enabled: Boolean(savedDay),
        windows: savedDay
          ? savedDay.windows.map(({ start, end }) => ({ start, end }))
          : defaultWindows()
      };
    }));
  }, [availabilityResponse]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    try {
      await saveProfile({ specialty, bio }).unwrap();
      dispatch(showNotification({ message: 'Doctor profile saved.', severity: 'success' }));
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

  const handleSaveAvailability = async (event) => {
    event.preventDefault();
    const days = weeklyDays
      .filter(({ enabled }) => enabled)
      .map(({ weekday, windows }) => ({
        weekday,
        windows: windows.filter(({ start, end }) => start || end)
      }));
    try {
      await saveAvailability({ timeZone: weeklyTimeZone, days }).unwrap();
      dispatch(showNotification({
        message: 'Weekly appointment hours saved. Patients can now book available 30-minute times.',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not save weekly appointment hours.',
        severity: 'error'
      }));
    }
  };

  const updateWeeklyDay = (weekday, update) => {
    setWeeklyDays((current) => current.map((day) => (
      day.weekday === weekday ? { ...day, ...update(day) } : day
    )));
  };

  const handleStatus = async (appointmentId, status) => {
    try {
      await updateStatus({ appointmentId, status }).unwrap();
      dispatch(showNotification({
        message: status === 'rejected' ? 'Appointment declined.' : 'Appointment accepted.',
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
          <Typography variant="h6" sx={{ mb: 2 }}>Doctor profile</Typography>
          <Stack spacing={2}>
            <TextField label="Specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)}
              required inputProps={{ maxLength: 100 }} />
            <TextField label="About your practice" value={bio} onChange={(event) => setBio(event.target.value)}
              multiline minRows={2} inputProps={{ maxLength: 2000 }} />
            <Button type="submit" variant="contained" disabled={isSavingProfile}>
              {isSavingProfile ? <CircularProgress size={20} color="inherit" /> : 'Save profile'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card component="form" variant="outlined" onSubmit={handlePublishSlot} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Add a one-time appointment date</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a single 30-minute appointment time that does not repeat each week.
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

      <Card component="form" variant="outlined" onSubmit={handleSaveAvailability} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Weekly recurring appointment hours</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select the days you work and set up to four appointment windows per day. Patients can book 30-minute starts within each window for the next 90 days.
          </Typography>
          <Stack spacing={2}>
            <Box
              role="group"
              aria-label="Choose a weekday"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', sm: 'repeat(7, minmax(0, 1fr))' },
                gap: 1
              }}
            >
              {weeklyDays.map((day) => {
                const label = WEEKDAYS.find(({ value }) => value === day.weekday)?.label || '';
                const isSelected = day.weekday === selectedWeekday;
                return (
                  <Button
                    key={day.weekday}
                    type="button"
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={day.enabled || isSelected ? 'primary' : 'inherit'}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedWeekday(day.weekday)}
                    sx={{ minWidth: 0, py: 1, px: 0.5, display: 'flex', flexDirection: 'column' }}
                  >
                    <Typography variant="body2" fontWeight={700}>{label.slice(0, 3)}</Typography>
                    <Typography
                      variant="caption"
                      sx={{ opacity: isSelected ? 0.8 : 0.7, lineHeight: 1.2 }}
                    >
                      {day.enabled ? 'On' : 'Off'}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: selectedWeeklyDay.enabled ? 1.5 : 0 }}
              >
                <Typography variant="subtitle1" fontWeight={650}>{selectedWeekdayLabel}</Typography>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={selectedWeeklyDay.enabled}
                      onChange={(event) => updateWeeklyDay(selectedWeekday, () => ({
                        enabled: event.target.checked
                      }))}
                    />
                  )}
                  label="Available"
                  sx={{ mr: 0 }}
                />
              </Stack>
              {selectedWeeklyDay.enabled ? (
                <Stack spacing={1}>
                  {selectedWeeklyDay.windows.map((window, index) => (
                    <Stack key={`${selectedWeekday}-${index}`} direction="row" spacing={1} alignItems="center">
                      <TextField
                        label={`Start ${index + 1}`}
                        type="time"
                        value={window.start}
                        onChange={(event) => updateWeeklyDay(selectedWeekday, (current) => ({
                          windows: current.windows.map((range, rangeIndex) => (
                            rangeIndex === index ? { ...range, start: event.target.value } : range
                          ))
                        }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 1800 }}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label={`End ${index + 1}`}
                        type="time"
                        value={window.end}
                        onChange={(event) => updateWeeklyDay(selectedWeekday, (current) => ({
                          windows: current.windows.map((range, rangeIndex) => (
                            rangeIndex === index ? { ...range, end: event.target.value } : range
                          ))
                        }))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 1800 }}
                        size="small"
                        fullWidth
                      />
                      {selectedWeeklyDay.windows.length > 1 && (
                        <Button
                          type="button"
                          color="error"
                          aria-label={`Remove time window ${index + 1} for ${selectedWeekdayLabel}`}
                          onClick={() => updateWeeklyDay(selectedWeekday, (current) => ({
                            windows: current.windows.filter((_, rangeIndex) => rangeIndex !== index)
                          }))}
                        >
                          Remove
                        </Button>
                      )}
                    </Stack>
                  ))}
                  {selectedWeeklyDay.windows.length < 4 && (
                    <Button
                      type="button"
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                      onClick={() => updateWeeklyDay(selectedWeekday, (current) => ({
                        windows: [...current.windows, { start: '', end: '' }]
                      }))}
                    >
                      Add time range
                    </Button>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Turn on availability to add appointment hours for {selectedWeekdayLabel}.
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Times use your device time zone ({weeklyTimeZone}).
            </Typography>
            <Button type="submit" variant="contained" disabled={isSavingAvailability}>
              {isSavingAvailability
                ? <CircularProgress size={20} color="inherit" />
                : 'Save weekly hours'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>Availability</Typography>
      {slotsLoading && <CircularProgress size={24} />}
      {!slotsLoading && slots.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>No future times published.</Typography>
      )}
      {console.log('slots', slots)}
      {/* <Stack spacing={1} sx={{ mb: 3 }}>
        {slots.map((slot) => (
          <Card key={slot._id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ flex: 1 }}>
                {formatTime(slot.startsAt)} {slot.isRecurring ? '· Weekly' : '· One-time'}
                {slot.isBooked ? ' · Booked' : ''}
              </Typography>
              {!slot.isBooked && !slot.isRecurring && (
                <Button color="error" onClick={() => handleRemoveSlot(slot._id)}>Remove</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack> */}
      {slots.filter((slot) => slot.isBooked).length === 0 ? (
        <Typography color="text.secondary">
          No booked slots found.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 3 }}>
          {slots
            .filter((slot) => slot.isBooked)
            .map((slot) => (
              <Card key={slot._id} variant="outlined">
                <CardContent>
                  <Typography>
                    {formatTime(slot.startsAt)} · Booked
                    {slot.patientName ? ` · Patient: ${slot.patientName}` : ''}
                  </Typography>
                </CardContent>
              </Card>
            ))}
        </Stack>
      )}

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
                  {appointment.mode === 'video' ? 'Video consultation' : 'Clinic visit'}
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
