import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { useDispatch, useSelector } from 'react-redux';

import { showNotification } from '../../app/notificationSlice';
import { useChatCalls } from '../../components/common/ChatCallProvider';
import { selectCurrentUser } from '../auth/authSlice';
import {
  useCancelPendingAppointmentMutation,
  useCreateAppointmentMutation,
  useGetAppointmentDoctorsQuery,
  useGetMyAppointmentsQuery,
  useVerifyAppointmentPaymentMutation
} from './communityApi';

let checkoutScriptPromise;
const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => {
        checkoutScriptPromise = null;
        reject(new Error('Could not load Razorpay Checkout.'));
      };
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
};

const formatTime = (startsAt) => new Date(startsAt).toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const PatientAppointmentsPage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { call, startCall } = useChatCalls();
  const { data: doctorResponse, isLoading, isError } = useGetAppointmentDoctorsQuery(undefined, {
    pollingInterval: 30000
  });
  const { data: appointmentResponse } = useGetMyAppointmentsQuery(undefined, {
    pollingInterval: 30000
  });
  const [createAppointment, { isLoading: isBooking }] = useCreateAppointmentMutation();
  const [verifyPayment] = useVerifyAppointmentPaymentMutation();
  const [cancelPending] = useCancelPendingAppointmentMutation();
  const doctors = doctorResponse?.data || [];
  const appointments = appointmentResponse?.data || [];
  const [doctorId, setDoctorId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [mode, setMode] = useState('video');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [, setClock] = useState(Date.now());
  const selectedDoctor = doctors.find((doctor) => doctor._id === doctorId);
  const availableSlots = selectedDoctor?.slots || [];
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
    let appointmentId;
    try {
      const result = await createAppointment({ doctorId, slotId, mode, paymentMethod }).unwrap();
      const { appointment, payment } = result.data;
      appointmentId = appointment._id;
      if (!payment) {
        dispatch(showNotification({
          message: 'Appointment requested. Pay the doctor at the clinic after confirmation.',
          severity: 'success'
        }));
        setSlotId('');
        return;
      }

      await loadCheckout();
      let paymentFlowFinished = false;
      const checkout = new window.Razorpay({
        key: payment.keyId,
        order_id: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.name,
        description: payment.description,
        prefill: payment.prefill,
        theme: { color: '#1976d2' },
        handler: async (response) => {
          paymentFlowFinished = true;
          try {
            await verifyPayment({
              appointmentId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            }).unwrap();
            dispatch(showNotification({
              message: 'Payment received. Your appointment is waiting for doctor confirmation.',
              severity: 'success'
            }));
            setSlotId('');
          } catch (error) {
            dispatch(showNotification({
              message: error?.data?.message || 'Payment completed but could not be verified. Contact support with your payment ID.',
              severity: 'error'
            }));
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentFlowFinished) return;
            try {
              await cancelPending(appointmentId).unwrap();
            } catch (error) {
              dispatch(showNotification({
                message: error?.data?.message || 'Could not release the unpaid appointment slot.',
                severity: 'error'
              }));
            }
          }
        }
      });
      checkout.on('payment.failed', async ({ error }) => {
        paymentFlowFinished = true;
        dispatch(showNotification({
          message: error.description || 'Payment failed. Please try again.',
          severity: 'error'
        }));
        try {
          await cancelPending(appointmentId).unwrap();
        } catch (cancelError) {
          dispatch(showNotification({
            message: cancelError?.data?.message || 'Could not release the unpaid appointment slot.',
            severity: 'error'
          }));
        }
      });
      checkout.open();
    } catch (error) {
      if (appointmentId) {
        try {
          await cancelPending(appointmentId).unwrap();
        } catch (cancelError) {
          dispatch(showNotification({
            message: cancelError?.data?.message || 'Could not release the unpaid appointment slot.',
            severity: 'error'
          }));
        }
      }
      dispatch(showNotification({
        message: error?.data?.message || error.message || 'Could not book this appointment.',
        severity: 'error'
      }));
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
              <Alert severity="info">No doctors have published their consultation fees and available times yet.</Alert>
            )}
            <FormControl fullWidth>
              <InputLabel id="doctor-select-label">Doctor</InputLabel>
              <Select
                labelId="doctor-select-label"
                label="Doctor"
                value={doctorId}
                onChange={(event) => {
                  setDoctorId(event.target.value);
                  setSlotId('');
                }}
                disabled={doctors.length === 0}
                required
              >
                {doctors.map((doctor) => (
                  <MenuItem key={doctor._id} value={doctor._id}>
                    Dr. {doctor.name} · {doctor.doctorProfile.specialty} · ₹{doctor.doctorProfile.fee}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedDoctor?.doctorProfile.bio && (
              <Typography variant="body2" color="text.secondary">{selectedDoctor.doctorProfile.bio}</Typography>
            )}
            <FormControl fullWidth>
              <InputLabel id="slot-select-label">Available time</InputLabel>
              <Select
                labelId="slot-select-label"
                label="Available time"
                value={slotId}
                onChange={(event) => setSlotId(event.target.value)}
                disabled={!availableSlots.length}
                required
              >
                {availableSlots.map((slot) => (
                  <MenuItem key={slot._id} value={slot._id}>{formatTime(slot.startsAt)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="visit-mode-label">Appointment type</InputLabel>
              <Select
                labelId="visit-mode-label"
                label="Appointment type"
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value;
                  setMode(nextMode);
                  if (nextMode === 'video') setPaymentMethod('online');
                }}
              >
                <MenuItem value="video">Video consultation</MenuItem>
                <MenuItem value="clinic">Visit the doctor at the clinic</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="payment-method-label">Payment method</InputLabel>
              <Select
                labelId="payment-method-label"
                label="Payment method"
                value={mode === 'video' ? 'online' : paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <MenuItem value="online">Pay online with Razorpay</MenuItem>
                {mode === 'clinic' && <MenuItem value="in_person">Pay the doctor at the clinic</MenuItem>}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" disabled={!doctorId || !slotId || isBooking}>
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
                  {appointment.mode === 'video' ? 'Video consultation' : 'Clinic visit'} · ₹{appointment.amount / 100}
                </Typography>
                <Typography variant="body2">
                  Status: {appointment.status.replaceAll('_', ' ')} · Payment: {appointment.paymentStatus.replaceAll('_', ' ')}
                </Typography>
                {appointment.status === 'accepted' && appointment.mode === 'video' &&
                  appointment.paymentStatus === 'paid' &&
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
