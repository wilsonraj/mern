import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useDispatch } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { useChatCalls } from '../../components/common/ChatCallProvider';
import {
  useCancelPatientAppointmentMutation,
  useCreateAppointmentMutation,
  useGetAppointmentDoctorsQuery,
  useGetMyAppointmentsQuery
} from './communityApi';

const formatTime = (startsAt) => new Date(startsAt).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const getDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

const getCalendarDates = (month) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstCell = new Date(firstDay);
  firstCell.setDate(firstDay.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
};

const PatientAppointmentsPage = () => {
  const dispatch = useDispatch();
  const { call, startCall } = useChatCalls();
  const { data: doctorResponse, isLoading, isError } = useGetAppointmentDoctorsQuery(undefined, {
    pollingInterval: 30000
  });
  const { data: appointmentResponse } = useGetMyAppointmentsQuery(undefined, {
    pollingInterval: 30000
  });
  const [createAppointment, { isLoading: isBooking }] = useCreateAppointmentMutation();
  const [cancelAppointment, { isLoading: isCancelling }] = useCancelPatientAppointmentMutation();
  const doctors = doctorResponse?.data || [];
  const appointments = appointmentResponse?.data || [];
  const [doctorId, setDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [mode, setMode] = useState('video');
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState('');
  const [, setClock] = useState(Date.now());
  const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId);
  const availableSlots = selectedDoctor?.slots || [];
  const slotsByDate = useMemo(() => availableSlots.reduce((result, slot) => {
    const key = getDateKey(new Date(slot.startsAt));
    result[key] = [...(result[key] || []), slot];
    return result;
  }, {}), [availableSlots]);
  const dates = useMemo(() => getCalendarDates(calendarMonth), [calendarMonth]);
  const selectedDaySlots = slotsByDate[selectedDate] || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastBookableDay = new Date(today);
  lastBookableDay.setDate(lastBookableDay.getDate() + 90);
  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [appointments]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleBook = async (event) => {
    event.preventDefault();
    try {
      await createAppointment({ doctorId, startsAt: selectedTime, mode }).unwrap();
      dispatch(showNotification({
        message: 'Appointment requested. It is waiting for doctor confirmation.',
        severity: 'success'
      }));
      setSelectedTime('');
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || error.message || 'Could not book this appointment.',
        severity: 'error'
      }));
    }
  };

  const handleCancelAppointment = async (appointment) => {
    const doctorName = appointment.doctor?.name || 'this doctor';
    if (!window.confirm(`Cancel your appointment with Dr. ${doctorName} on ${formatTime(appointment.startsAt)}?`)) {
      return;
    }
    setCancellingAppointmentId(appointment._id);
    try {
      await cancelAppointment(appointment._id).unwrap();
      dispatch(showNotification({
        message: 'Appointment cancelled.',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showNotification({
        message: error?.data?.message || 'Could not cancel this appointment.',
        severity: 'error'
      }));
    } finally {
      setCancellingAppointmentId('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 750, letterSpacing: '0.13em' }}>
        PATIENT CARE
      </Typography>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Book a doctor</Typography>
      <Card variant="outlined" component="form" onSubmit={handleBook} sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {isLoading && <CircularProgress size={24} />}
            {isError && <Alert severity="error">Could not load doctors. Please try again.</Alert>}
            {!isLoading && !isError && doctors.length === 0 && (
              <Alert severity="info">No doctors have published available appointment times yet.</Alert>
            )}
            <FormControl fullWidth>
              <InputLabel id="doctor-select-label">Doctor</InputLabel>
              <Select
                labelId="doctor-select-label"
                label="Doctor"
                value={doctorId}
                onChange={(event) => {
                  setDoctorId(event.target.value);
                  setSelectedDate('');
                  setSelectedTime('');
                }}
                disabled={doctors.length === 0}
                required
              >
                {doctors.map((doctor) => (
                  <MenuItem key={doctor._id} value={doctor._id}>
                    Dr. {doctor.name} · {doctor.doctorProfile.specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedDoctor?.doctorProfile.bio && (
              <Typography variant="body2" color="text.secondary">{selectedDoctor.doctorProfile.bio}</Typography>
            )}
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <IconButton
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  disabled={calendarMonth <= new Date(today.getFullYear(), today.getMonth(), 1)}
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="h6" component="h2">
                  {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Typography>
                <IconButton
                  type="button"
                  aria-label="Next month"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  disabled={calendarMonth >= new Date(lastBookableDay.getFullYear(), lastBookableDay.getMonth(), 1)}
                >
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <Typography key={day} variant="caption" align="center" color="text.secondary" sx={{ py: 0.5 }}>
                    {day}
                  </Typography>
                ))}
                {dates.map((date) => {
                  const dateKey = getDateKey(date);
                  const daySlots = slotsByDate[dateKey] || [];
                  const outOfMonth = date.getMonth() !== calendarMonth.getMonth();
                  const unavailableDate = date < today || date > lastBookableDay || daySlots.length === 0;
                  return (
                    <Button
                      type="button"
                      key={dateKey}
                      variant={selectedDate === dateKey ? 'contained' : 'text'}
                      color={selectedDate === dateKey ? 'primary' : 'inherit'}
                      disabled={unavailableDate}
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setSelectedTime('');
                      }}
                      sx={{
                        minWidth: 0,
                        minHeight: { xs: 48, sm: 58 },
                        p: 0.5,
                        flexDirection: 'column',
                        color: outOfMonth && selectedDate !== dateKey ? 'text.disabled' : undefined
                      }}
                    >
                      <Typography variant="body2">{date.getDate()}</Typography>
                      {daySlots.length > 0 && (
                        <Typography variant="caption">{daySlots.length} times</Typography>
                      )}
                    </Button>
                  );
                })}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {selectedDate
                  ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })
                  : 'Choose a date with available times.'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Times are shown in your local time zone. Appointments are 30 minutes.
              </Typography>
              {selectedDate && selectedDaySlots.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                  {selectedDaySlots.map((slot) => (
                    <Button
                      type="button"
                      key={slot._id}
                      size="small"
                      variant={selectedTime === slot.startsAt ? 'contained' : 'outlined'}
                      onClick={() => setSelectedTime(slot.startsAt)}
                    >
                      {new Date(slot.startsAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Button>
                  ))}
                </Stack>
              )}
            </Box>
            <FormControl fullWidth>
              <InputLabel id="visit-mode-label">Appointment type</InputLabel>
              <Select
                labelId="visit-mode-label"
                label="Appointment type"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <MenuItem value="video">Video consultation</MenuItem>
                <MenuItem value="clinic">Visit the doctor at the clinic</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" disabled={!doctorId || !selectedTime || isBooking}>
              {isBooking ? <CircularProgress size={22} color="inherit" /> : 'Request appointment'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>My appointments</Typography>
      {sortedAppointments.length === 0 ? (
        <Typography color="text.secondary">Your appointment requests will appear here.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {sortedAppointments.map((appointment) => (
            <Card key={appointment._id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>
                  Dr. {appointment.doctor?.name} · {appointment.doctor?.doctorProfile?.specialty}
                </Typography>
                <Typography color="text.secondary">{formatTime(appointment.startsAt)}</Typography>
                <Typography variant="body2">
                  {appointment.mode === 'video' ? 'Video consultation' : 'Clinic visit'} ·
                  {' '}Status: {appointment.status.replaceAll('_', ' ')}
                </Typography>
                {['pending', 'accepted'].includes(appointment.status) &&
                  new Date(appointment.startsAt).getTime() > Date.now() && (
                    <Button
                      sx={{ mt: 1 }}
                      color="error"
                      variant="outlined"
                      disabled={isCancelling}
                      onClick={() => handleCancelAppointment(appointment)}
                    >
                      {isCancelling && cancellingAppointmentId === appointment._id
                        ? <CircularProgress size={18} />
                        : 'Cancel appointment'}
                    </Button>
                  )}
                {appointment.status === 'accepted' && appointment.mode === 'video' &&
                  Date.now() >= new Date(appointment.startsAt).getTime() - 20 * 60 * 1000 &&
                  Date.now() <= new Date(appointment.startsAt).getTime() + 60 * 60 * 1000 && (
                    <Button
                      sx={{ mt: 1 }}
                      variant="outlined"
                      disabled={Boolean(call)}
                      onClick={() => startCall({
                        id: appointment.doctor?._id,
                        name: appointment.doctor?.name
                      }, 'video')}
                    >
                      Join video consultation
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

export default PatientAppointmentsPage;
