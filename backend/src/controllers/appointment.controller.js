import * as appointmentService from '../services/appointment.service.js';
import ApiResponse from '../utils/apiResponse.js';

const getDoctors = async (req, res, next) => {
  try {
    return ApiResponse.success(res, await appointmentService.getDoctors(), 'Doctors fetched');
  } catch (error) {
    return next(error);
  }
};

const updateDoctorProfile = async (req, res, next) => {
  try {
    const profile = await appointmentService.updateDoctorProfile(req.user, req.body);
    return ApiResponse.success(res, profile, 'Doctor profile updated');
  } catch (error) {
    return next(error);
  }
};

const getDoctorProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, req.user.doctorProfile || {}, 'Doctor profile fetched');
  } catch (error) {
    return next(error);
  }
};

const getDoctorSlots = async (req, res, next) => {
  try {
    const slots = await appointmentService.getDoctorSlots(req.user);
    return ApiResponse.success(res, slots, 'Doctor availability fetched');
  } catch (error) {
    return next(error);
  }
};

const getDoctorAvailability = async (req, res, next) => {
  try {
    const availability = await appointmentService.getDoctorAvailability(req.user);
    return ApiResponse.success(res, availability, 'Doctor weekly availability fetched');
  } catch (error) {
    return next(error);
  }
};

const updateDoctorAvailability = async (req, res, next) => {
  try {
    const availability = await appointmentService.updateDoctorAvailability(req.user, req.body);
    return ApiResponse.success(res, availability, 'Doctor weekly availability updated');
  } catch (error) {
    return next(error);
  }
};

const publishSlots = async (req, res, next) => {
  try {
    const slots = await appointmentService.publishSlots(req.user, req.body.startsAt);
    return ApiResponse.success(res, slots, 'Appointment times published', 201);
  } catch (error) {
    return next(error);
  }
};

const removeSlot = async (req, res, next) => {
  try {
    await appointmentService.removeSlot(req.user, req.params.slotId);
    return ApiResponse.success(res, null, 'Appointment time removed');
  } catch (error) {
    return next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const result = await appointmentService.createAppointment(req.user, req.body);
    return ApiResponse.success(res, result, 'Appointment request created', 201);
  } catch (error) {
    return next(error);
  }
};

const cancelPatientAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelPatientAppointment(
      req.user,
      req.params.appointmentId
    );
    return ApiResponse.success(res, appointment, 'Appointment cancelled');
  } catch (error) {
    return next(error);
  }
};

const getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await appointmentService.getMyAppointments(req.user);
    return ApiResponse.success(res, appointments, 'Appointments fetched');
  } catch (error) {
    return next(error);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.user,
      req.params.appointmentId,
      req.body.status
    );
    return ApiResponse.success(res, appointment, `Appointment ${req.body.status}`);
  } catch (error) {
    return next(error);
  }
};

export {
  cancelPatientAppointment,
  createAppointment,
  getDoctorAvailability,
  getDoctors,
  getDoctorProfile,
  getDoctorSlots,
  getMyAppointments,
  publishSlots,
  removeSlot,
  updateAppointmentStatus,
  updateDoctorAvailability,
  updateDoctorProfile
};
