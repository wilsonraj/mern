import express from 'express';
import {
  cancelPendingAppointment,
  createAppointment,
  getDoctors,
  getDoctorProfile,
  getDoctorSlots,
  getMyAppointments,
  publishSlots,
  removeSlot,
  updateAppointmentStatus,
  updateDoctorProfile,
  verifyAppointmentPayment
} from '../controllers/appointment.controller.js';
import { authorize, protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/doctors', getDoctors);
router.post('/', authorize('patient'), createAppointment);
router.post('/verify-payment', authorize('patient'), verifyAppointmentPayment);
router.get('/mine', authorize('patient', 'doctor'), getMyAppointments);
router.delete('/:appointmentId/payment-pending', authorize('patient'), cancelPendingAppointment);
router.get('/doctor/profile', authorize('doctor'), getDoctorProfile);
router.put('/doctor/profile', authorize('doctor'), updateDoctorProfile);
router.get('/doctor/slots', authorize('doctor'), getDoctorSlots);
router.post('/doctor/slots', authorize('doctor'), publishSlots);
router.delete('/doctor/slots/:slotId', authorize('doctor'), removeSlot);
router.patch('/:appointmentId/status', authorize('doctor'), updateAppointmentStatus);

export default router;
