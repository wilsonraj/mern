import mongoose from 'mongoose';
import { Appointment, DoctorSlot, User } from '../models/index.js';
import {
  createOrder,
  createRefund,
  verifyPayment,
  verifyWebhookSignature
} from './razorpay.service.js';

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const conflictsWithSlot = (startsAt, occupiedTimes) => occupiedTimes.some((occupiedAt) =>
  Math.abs(startsAt.getTime() - occupiedAt.getTime()) < 30 * 60 * 1000
);

const getDoctors = async () => {
  const doctors = await User.find({ role: 'doctor', 'doctorProfile.fee': { $gte: 1 } })
    .select('name doctorProfile')
    .sort({ name: 1 })
    .lean();
  const now = new Date();
  const until = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const booked = await Appointment.find({
    doctor: { $in: doctors.map(({ _id }) => _id) },
    startsAt: { $gte: now, $lte: until },
    $or: [
      { status: { $in: ['pending', 'accepted'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: now } }
    ]
  }).select('doctor startsAt').lean();
  const bookedByDoctor = new Map();
  for (const { doctor, startsAt } of booked) {
    const doctorId = doctor.toString();
    bookedByDoctor.set(doctorId, [...(bookedByDoctor.get(doctorId) || []), startsAt]);
  }
  const slots = await DoctorSlot.find({
    doctor: { $in: doctors.map(({ _id }) => _id) },
    startsAt: { $gte: now, $lte: until }
  }).sort({ startsAt: 1 }).lean();
  return doctors.map((doctor) => ({
    ...doctor,
    slots: slots
      .filter((slot) => slot.doctor.equals(doctor._id) &&
        !conflictsWithSlot(slot.startsAt, bookedByDoctor.get(doctor._id.toString()) || []))
      .map(({ _id, startsAt }) => ({ _id, startsAt }))
  }));
};

const getDoctorSlots = async (doctor) => {
  const now = new Date();
  const appointments = await Appointment.find({
    doctor: doctor._id,
    startsAt: { $gte: now },
    $or: [
      { status: { $in: ['pending', 'accepted'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: now } }
    ]
  }).select('startsAt').lean();
  const booked = appointments.map(({ startsAt }) => startsAt);
  const slots = await DoctorSlot.find({
    doctor: doctor._id,
    startsAt: { $gte: now }
  }).sort({ startsAt: 1 }).lean();
  return slots.map((slot) => ({
    ...slot,
    isBooked: conflictsWithSlot(slot.startsAt, booked)
  }));
};

const updateDoctorProfile = async (doctor, { specialty, bio = '', fee }) => {
  if (typeof specialty !== 'string' || specialty.trim().length < 2 ||
    specialty.trim().length > 100) {
    throw fail(400, 'Specialty must contain 2 to 100 characters.');
  }
  if (typeof bio !== 'string' || bio.trim().length > 2000) {
    throw fail(400, 'Biography must be 2000 characters or fewer.');
  }
  const price = Number(fee);
  if (!Number.isInteger(price) || price < 1 || price > 1000000) {
    throw fail(400, 'Appointment fee must be between ₹1 and ₹10,00,000.');
  }
  doctor.doctorProfile = { specialty: specialty.trim(), bio: bio.trim(), fee: price };
  await doctor.save();
  return { specialty: doctor.doctorProfile.specialty, bio: doctor.doctorProfile.bio, fee: price };
};

const publishSlots = async (doctor, startsAtList) => {
  if (!Array.isArray(startsAtList) || startsAtList.length < 1 || startsAtList.length > 100) {
    throw fail(400, 'Publish between 1 and 100 appointment slots.');
  }
  const now = Date.now();
  const slots = startsAtList.map((value) => new Date(value));
  if (slots.some((date) => Number.isNaN(date.getTime()) ||
    date.getTime() < now + 15 * 60 * 1000 ||
    date.getTime() > now + 90 * 24 * 60 * 60 * 1000 ||
    date.getTime() % 60000 !== 0)) {
    throw fail(400, 'Slots must be in the next 90 days and start on a minute boundary.');
  }
  if (slots.some((slot, index) => slots.some((other, otherIndex) =>
    index !== otherIndex && Math.abs(slot.getTime() - other.getTime()) < 30 * 60 * 1000
  ))) {
    throw fail(400, 'Doctor appointment times must be at least 30 minutes apart.');
  }
  const [existingSlots, appointments] = await Promise.all([
    DoctorSlot.find({
      doctor: doctor._id,
      startsAt: { $gte: new Date(now - 30 * 60 * 1000) }
    }).select('startsAt').lean(),
    Appointment.find({
      doctor: doctor._id,
      startsAt: { $gte: new Date(now - 30 * 60 * 1000) },
      $or: [
        { status: { $in: ['pending', 'accepted'] } },
        { status: 'awaiting_payment', expiresAt: { $gt: new Date(now) } }
      ]
    }).select('startsAt').lean()
  ]);
  const occupiedTimes = [
    ...existingSlots.map(({ startsAt }) => startsAt),
    ...appointments.map(({ startsAt }) => startsAt)
  ];
  if (slots.some((slot) => conflictsWithSlot(slot, occupiedTimes))) {
    throw fail(409, 'Appointment times must be at least 30 minutes apart from existing times and bookings.');
  }
  try {
    return await DoctorSlot.insertMany(
      slots.map((startsAt) => ({ doctor: doctor._id, startsAt })),
      { ordered: false }
    );
  } catch (error) {
    if (error.code === 11000 || error.writeErrors?.some(({ code }) => code === 11000)) {
      throw fail(409, 'One or more selected appointment slots already exist.');
    }
    throw error;
  }
};

const removeSlot = async (doctor, slotId) => {
  if (!mongoose.isValidObjectId(slotId)) throw fail(404, 'Appointment slot not found.');
  const slot = await DoctorSlot.findOne({ _id: slotId, doctor: doctor._id });
  if (!slot) throw fail(404, 'Appointment slot not found.');
  const booking = await Appointment.findOne({
    doctor: doctor._id,
    startsAt: slot.startsAt,
    $or: [
      { status: { $in: ['pending', 'accepted'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: new Date() } }
    ]
  });
  if (booking) throw fail(409, 'This appointment time is already booked.');
  await slot.deleteOne();
};

const createAppointment = async (patient, { doctorId, slotId, mode, paymentMethod }) => {
  if (!mongoose.isValidObjectId(doctorId) || !mongoose.isValidObjectId(slotId)) {
    throw fail(400, 'Choose a valid doctor and appointment slot.');
  }
  if (!['video', 'clinic'].includes(mode)) throw fail(400, 'Choose a video or clinic visit.');
  if (!['online', 'in_person'].includes(paymentMethod)) {
    throw fail(400, 'Choose online payment or pay at the clinic.');
  }
  if (paymentMethod === 'in_person' && mode !== 'clinic') {
    throw fail(400, 'Pay-at-visit is available for clinic appointments. Choose online payment for video visits.');
  }
  const doctor = await User.findOne({
    _id: doctorId,
    role: 'doctor',
    'doctorProfile.fee': { $gte: 1 }
  }).select('name email doctorProfile');
  if (!doctor) throw fail(404, 'Doctor not found or has not completed their profile.');
  const slot = await DoctorSlot.findOne({
    _id: slotId,
    doctor: doctor._id,
    startsAt: { $gt: new Date() }
  });
  if (!slot) throw fail(404, 'This appointment time is no longer available.');
  await Appointment.deleteMany({
    doctor: doctor._id,
    startsAt: {
      $gte: new Date(slot.startsAt.getTime() - 30 * 60 * 1000),
      $lt: new Date(slot.startsAt.getTime() + 30 * 60 * 1000)
    },
    status: 'awaiting_payment',
    expiresAt: { $lte: new Date() }
  });
  const overlappingAppointment = await Appointment.findOne({
    doctor: doctor._id,
    startsAt: {
      $gte: new Date(slot.startsAt.getTime() - 30 * 60 * 1000),
      $lt: new Date(slot.startsAt.getTime() + 30 * 60 * 1000)
    },
    $or: [
      { status: { $in: ['pending', 'accepted'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: new Date() } }
    ]
  }).select('_id');
  if (overlappingAppointment) throw fail(409, 'This appointment time overlaps with a booking.');
  const fee = doctor.doctorProfile.fee;
  try {
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      startsAt: slot.startsAt,
      mode,
      paymentMethod,
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pay_at_visit',
      amount: fee * 100,
      status: paymentMethod === 'online' ? 'awaiting_payment' : 'pending',
      expiresAt: paymentMethod === 'online'
        ? new Date(Date.now() + 30 * 60 * 1000)
        : null
    });

    if (paymentMethod === 'in_person') {
      return { appointment: await populateAppointment(appointment._id), payment: null };
    }

    try {
      const { order, keyId } = await createOrder({
        amount: appointment.amount,
        receipt: `appt_${appointment._id}`,
        notes: { appointmentId: appointment._id.toString(), doctorId: doctor._id.toString() }
      });
      appointment.razorpayOrderId = order.id;
      await appointment.save();
      return {
        appointment: await populateAppointment(appointment._id),
        payment: {
          keyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          name: doctor.name,
          description: `Doctor appointment with ${doctor.name}`,
          prefill: { name: patient.name, email: patient.email }
        }
      };
    } catch (error) {
      await Appointment.deleteOne({ _id: appointment._id });
      throw error;
    }
  } catch (error) {
    if (error.code === 11000) throw fail(409, 'This appointment time has just been booked.');
    throw error;
  }
};

const populateAppointment = (id) => Appointment.findById(id)
  .populate('patient', 'name email')
  .populate('doctor', 'name email doctorProfile.specialty')
  .lean();

const verifyAppointmentPayment = async (patient, { appointmentId, orderId, paymentId, signature }) => {
  if (![appointmentId, orderId, paymentId, signature].every((value) => typeof value === 'string')) {
    throw fail(400, 'Payment verification details are incomplete.');
  }
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    patient: patient._id,
    razorpayOrderId: orderId,
    $or: [
      {
        paymentStatus: 'pending',
        status: 'awaiting_payment',
        expiresAt: { $gt: new Date() }
      },
      {
        paymentStatus: 'paid',
        status: 'pending',
        razorpayPaymentId: paymentId
      }
    ]
  });
  if (!appointment) throw fail(404, 'Pending appointment payment not found.');
  if (appointment.paymentStatus === 'paid' && appointment.razorpayPaymentId === paymentId) {
    return populateAppointment(appointment._id);
  }
  const isVerified = await verifyPayment({
    orderId,
    paymentId,
    signature,
    amount: appointment.amount
  });
  if (!isVerified) throw fail(400, 'Payment could not be verified.');

  appointment.paymentStatus = 'paid';
  appointment.razorpayPaymentId = paymentId;
  appointment.status = 'pending';
  appointment.expiresAt = null;
  await appointment.save();
  return populateAppointment(appointment._id);
};

const processRazorpayWebhook = async (body, signature) => {
  if (!verifyWebhookSignature(body, signature)) {
    throw fail(400, 'Invalid Razorpay webhook signature.');
  }
  let event;
  try {
    event = JSON.parse(body.toString('utf8'));
  } catch {
    throw fail(400, 'Invalid Razorpay webhook body.');
  }
  if (event.event !== 'payment.captured') return;
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id || !payment.id || !Number.isInteger(payment.amount)) {
    throw fail(400, 'Razorpay captured-payment event is incomplete.');
  }
  const appointment = await Appointment.findOne({
    razorpayOrderId: payment.order_id,
    amount: payment.amount
  });
  if (!appointment) throw fail(404, 'Appointment for captured Razorpay payment was not found.');
  if (appointment.paymentStatus === 'paid' && appointment.razorpayPaymentId === payment.id) return;
  if (appointment.status !== 'awaiting_payment' || appointment.paymentStatus !== 'pending') {
    throw fail(409, 'Appointment is no longer awaiting this payment.');
  }
  appointment.paymentStatus = 'paid';
  appointment.razorpayPaymentId = payment.id;
  appointment.status = 'pending';
  appointment.expiresAt = null;
  await appointment.save();
};

const cancelPendingAppointment = async (patient, appointmentId) => {
  if (!mongoose.isValidObjectId(appointmentId)) throw fail(404, 'Appointment not found.');
  const result = await Appointment.deleteOne({
    _id: appointmentId,
    patient: patient._id,
    status: 'awaiting_payment',
    razorpayPaymentId: null
  });
  if (!result.deletedCount) throw fail(409, 'This appointment payment can no longer be cancelled.');
};

const getMyAppointments = async (user) => {
  const filter = user.role === 'doctor'
    ? { doctor: user._id }
    : { patient: user._id };
  return Appointment.find(filter)
    .populate('patient', 'name email')
    .populate('doctor', 'name email doctorProfile.specialty')
    .sort({ startsAt: -1 })
    .limit(500)
    .lean();
};

const updateAppointmentStatus = async (doctor, appointmentId, status) => {
  if (!['accepted', 'rejected'].includes(status)) {
    throw fail(400, 'Choose accepted or rejected.');
  }
  if (!mongoose.isValidObjectId(appointmentId)) throw fail(404, 'Appointment not found.');
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctor._id,
    status: 'pending',
    startsAt: { $gt: new Date() }
  });
  if (!appointment) throw fail(404, 'Pending appointment not found.');

  if (status === 'rejected' && appointment.paymentStatus === 'paid') {
    await createRefund(
      appointment.razorpayPaymentId,
      appointment.amount,
      `appt_${appointment._id}`
    );
    appointment.paymentStatus = 'refunded';
  }
  appointment.status = status;
  appointment.expiresAt = null;
  await appointment.save();
  return populateAppointment(appointment._id);
};

export {
  createAppointment,
  cancelPendingAppointment,
  getDoctors,
  getMyAppointments,
  publishSlots,
  getDoctorSlots,
  processRazorpayWebhook,
  removeSlot,
  updateAppointmentStatus,
  updateDoctorProfile,
  verifyAppointmentPayment
};
