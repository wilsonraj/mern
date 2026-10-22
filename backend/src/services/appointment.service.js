import mongoose from 'mongoose';
import { Appointment, DoctorAvailability, DoctorSlot, User } from '../models/index.js';
import { createRefund } from './razorpay.service.js';

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const conflictsWithSlot = (startsAt, occupiedTimes) => occupiedTimes.some((occupiedAt) =>
  Math.abs(startsAt.getTime() - occupiedAt.getTime()) < 30 * 60 * 1000
);

const getLocalParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const localTimeToDate = (year, month, day, minutes, timeZone) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getLocalParts(new Date(timestamp), timeZone);
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const nextTimestamp = target - (localAsUtc - timestamp);
    if (timestamp === nextTimestamp) break;
    timestamp = nextTimestamp;
  }
  const result = new Date(timestamp);
  const resultParts = getLocalParts(result, timeZone);
  if (Number(resultParts.year) !== year || Number(resultParts.month) !== month ||
    Number(resultParts.day) !== day || Number(resultParts.hour) !== hour ||
    Number(resultParts.minute) !== minute) return null;
  return result;
};

const getRecurringSlots = (availability, from = new Date()) => {
  if (!availability?.days?.length) return [];
  const timeZone = availability.timeZone;
  const now = from.getTime();
  const result = [];
  const localToday = getLocalParts(from, timeZone);
  const dayCursor = new Date(Date.UTC(
    Number(localToday.year),
    Number(localToday.month) - 1,
    Number(localToday.day)
  ));
  for (let dayOffset = 0; dayOffset <= 90; dayOffset += 1) {
    const date = new Date(dayCursor.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const weekday = date.getUTCDay();
    const scheduleDay = availability.days.find((day) => day.weekday === weekday);
    if (!scheduleDay) continue;
    for (const window of scheduleDay.windows) {
      const [startHour, startMinute] = window.start.split(':').map(Number);
      const [endHour, endMinute] = window.end.split(':').map(Number);
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      for (let minute = start; minute + 30 <= end; minute += 30) {
        const startsAt = localTimeToDate(
          date.getUTCFullYear(),
          date.getUTCMonth() + 1,
          date.getUTCDate(),
          minute,
          timeZone
        );
        if (startsAt && startsAt.getTime() > now) {
          result.push({ startsAt, isRecurring: true });
        }
      }
    }
  }
  return result;
};

const isWithinAvailability = (availability, startsAt) => {
  if (!availability) return false;
  if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0) return false;
  const parts = getLocalParts(startsAt, availability.timeZone);
  const weekday = new Date(Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  )).getUTCDay();
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  if (minute % 30 !== 0) return false;
  const scheduleDay = availability.days.find((day) => day.weekday === weekday);
  return Boolean(scheduleDay?.windows.some((window) => {
    const [startHour, startMinute] = window.start.split(':').map(Number);
    const [endHour, endMinute] = window.end.split(':').map(Number);
    return minute >= startHour * 60 + startMinute && minute + 30 <= endHour * 60 + endMinute;
  }));
};

const getCombinedSlots = (manualSlots, recurringSlots) => {
  const uniqueSlots = new Map();
  const acceptedSlots = [];
  for (const slot of [...manualSlots, ...recurringSlots]) {
    const startsAt = slot.startsAt;
    const key = startsAt.getTime();
    if (uniqueSlots.has(key) || conflictsWithSlot(startsAt, acceptedSlots)) continue;
    const normalizedSlot = {
      _id: slot.isRecurring ? `weekly-${startsAt.toISOString()}` : slot._id,
      startsAt,
      isRecurring: Boolean(slot.isRecurring)
    };
    uniqueSlots.set(key, normalizedSlot);
    acceptedSlots.push(startsAt);
  }
  return [...uniqueSlots.values()].sort((a, b) => a.startsAt - b.startsAt);
};

const getOpenSlots = (manualSlots, recurringSlots, bookedTimes) =>
  getCombinedSlots(manualSlots, recurringSlots)
    .filter(({ startsAt }) => !conflictsWithSlot(startsAt, bookedTimes));

const getDoctors = async () => {
  const doctors = await User.find({
    role: 'doctor',
    'doctorProfile.specialty': { $type: 'string', $ne: '' }
  })
    .select('name doctorProfile.specialty doctorProfile.bio')
    .sort({ name: 1 })
    .lean();
  const now = new Date();
  const until = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const booked = await Appointment.find({
    doctor: { $in: doctors.map(({ _id }) => _id) },
    startsAt: { $gte: now, $lte: until },
    $or: [
      { status: { $in: ['pending', 'accepted', 'cancelling'] } },
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
  const availability = await DoctorAvailability.find({
    doctor: { $in: doctors.map(({ _id }) => _id) }
  }).lean();
  const availabilityByDoctor = new Map(availability.map((schedule) => [
    schedule.doctor.toString(),
    schedule
  ]));
  return doctors.map((doctor) => {
    const doctorId = doctor._id.toString();
    return {
      ...doctor,
      slots: getOpenSlots(
        slots.filter((slot) => slot.doctor.equals(doctor._id)),
        getRecurringSlots(availabilityByDoctor.get(doctorId), now),
        bookedByDoctor.get(doctorId) || []
      )
    };
  });
};

const getDoctorSlots = async (doctor) => {
  const now = new Date();
  const appointments = await Appointment.find({
    doctor: doctor._id,
    startsAt: { $gte: now },
    $or: [
      { status: { $in: ['pending', 'accepted', 'cancelling'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: now } }
    ]
  }).select('startsAt patient').populate('patient', 'name').lean();
  const slots = await DoctorSlot.find({
    doctor: doctor._id,
    startsAt: { $gte: now }
  }).sort({ startsAt: 1 }).lean();
  const availability = await DoctorAvailability.findOne({ doctor: doctor._id }).lean();
  return getCombinedSlots(slots, getRecurringSlots(availability, now)).map((slot) => {
    const appointment = appointments.find(({ startsAt }) =>
      Math.abs(slot.startsAt.getTime() - startsAt.getTime()) < 30 * 60 * 1000
    );
    return {
      ...slot,
      isBooked: Boolean(appointment),
      patientName: appointment?.patient?.name || null
    };
  });
};

const getDoctorAvailability = async (doctor) => {
  const availability = await DoctorAvailability.findOne({ doctor: doctor._id }).lean();
  return {
    timeZone: availability?.timeZone || '',
    days: availability?.days || []
  };
};

const updateDoctorAvailability = async (doctor, { timeZone, days }) => {
  if (typeof timeZone !== 'string' || timeZone.length > 100 ||
    !Array.isArray(days) || days.length > 7) {
    throw fail(400, 'Choose a valid time zone and weekly schedule.');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw fail(400, 'Choose a valid time zone.');
  }
  const weekdays = new Set();
  const normalizedDays = days.map((day) => {
    if (!day || typeof day !== 'object') {
      throw fail(400, 'Each weekly availability day must be an object.');
    }
    const { weekday, windows } = day;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      weekdays.has(weekday) || !Array.isArray(windows) || windows.length > 4) {
      throw fail(400, 'Each weekday can have up to four valid appointment windows.');
    }
    weekdays.add(weekday);
    const normalizedWindows = windows.map((window) => {
      if (!window || typeof window !== 'object') {
        throw fail(400, 'Each appointment window must include a start and end time.');
      }
      const { start, end } = window;
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (typeof start !== 'string' || typeof end !== 'string' ||
        !timePattern.test(start) || !timePattern.test(end)) {
        throw fail(400, 'Availability times must use 24-hour HH:mm format.');
      }
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0 || endMinutes - startMinutes < 30) {
        throw fail(400, 'Availability windows must be at least 30 minutes and align to 30-minute boundaries.');
      }
      return { start, end, startMinutes, endMinutes };
    }).sort((a, b) => a.startMinutes - b.startMinutes);
    if (normalizedWindows.some((window, index) =>
      index > 0 && window.startMinutes < normalizedWindows[index - 1].endMinutes
    )) {
      throw fail(400, 'Availability windows on the same day cannot overlap.');
    }
    return {
      weekday,
      windows: normalizedWindows.map(({ start, end }) => ({ start, end }))
    };
  });
  const schedule = await DoctorAvailability.findOneAndUpdate(
    { doctor: doctor._id },
    { $set: { timeZone, days: normalizedDays } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  return { timeZone: schedule.timeZone, days: schedule.days };
};

const updateDoctorProfile = async (doctor, { specialty, bio = '' }) => {
  if (typeof specialty !== 'string' || specialty.trim().length < 2 ||
    specialty.trim().length > 100) {
    throw fail(400, 'Specialty must contain 2 to 100 characters.');
  }
  if (typeof bio !== 'string' || bio.trim().length > 2000) {
    throw fail(400, 'Biography must be 2000 characters or fewer.');
  }
  doctor.doctorProfile = { specialty: specialty.trim(), bio: bio.trim() };
  await doctor.save();
  return { specialty: doctor.doctorProfile.specialty, bio: doctor.doctorProfile.bio };
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
  const [existingSlots, appointments, availability] = await Promise.all([
    DoctorSlot.find({
      doctor: doctor._id,
      startsAt: { $gte: new Date(now - 30 * 60 * 1000) }
    }).select('startsAt').lean(),
    Appointment.find({
      doctor: doctor._id,
      startsAt: { $gte: new Date(now - 30 * 60 * 1000) },
      $or: [
        { status: { $in: ['pending', 'accepted', 'cancelling'] } },
        { status: 'awaiting_payment', expiresAt: { $gt: new Date(now) } }
      ]
    }).select('startsAt').lean(),
    DoctorAvailability.findOne({ doctor: doctor._id }).lean()
  ]);
  const occupiedTimes = [
    ...existingSlots.map(({ startsAt }) => startsAt),
    ...getRecurringSlots(availability, new Date(now - 30 * 60 * 1000))
      .map(({ startsAt }) => startsAt),
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
      { status: { $in: ['pending', 'accepted', 'cancelling'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: new Date() } }
    ]
  });
  if (booking) throw fail(409, 'This appointment time is already booked.');
  await slot.deleteOne();
};

const createAppointment = async (patient, { doctorId, startsAt: startsAtValue, mode }) => {
  const startsAt = new Date(startsAtValue);
  if (!mongoose.isValidObjectId(doctorId) || Number.isNaN(startsAt.getTime())) {
    throw fail(400, 'Choose a valid doctor and appointment time.');
  }
  if (!['video', 'clinic'].includes(mode)) throw fail(400, 'Choose a video or clinic visit.');
  const doctor = await User.findOne({
    _id: doctorId,
    role: 'doctor',
    'doctorProfile.specialty': { $type: 'string', $ne: '' }
  }).select('doctorProfile.specialty');
  if (!doctor) throw fail(404, 'Doctor not found or has not completed their profile.');
  const now = Date.now();
  if (startsAt.getTime() <= now || startsAt.getTime() > now + 90 * 24 * 60 * 60 * 1000) {
    throw fail(404, 'Choose an appointment time in the next 90 days.');
  }
  const [slot, availability] = await Promise.all([
    DoctorSlot.findOne({ doctor: doctor._id, startsAt }),
    DoctorAvailability.findOne({ doctor: doctor._id }).lean()
  ]);
  if (!slot && !isWithinAvailability(availability, startsAt)) {
    throw fail(404, 'This appointment time is no longer available.');
  }
  const overlappingAppointment = await Appointment.findOne({
    doctor: doctor._id,
    startsAt: {
      $gt: new Date(startsAt.getTime() - 30 * 60 * 1000),
      $lt: new Date(startsAt.getTime() + 30 * 60 * 1000)
    },
    $or: [
      { status: { $in: ['pending', 'accepted', 'cancelling'] } },
      { status: 'awaiting_payment', expiresAt: { $gt: new Date() } }
    ]
  }).select('_id');
  if (overlappingAppointment) throw fail(409, 'This appointment time overlaps with a booking.');
  try {
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      startsAt,
      mode,
      status: 'pending'
    });
    return populateAppointment(appointment._id);
  } catch (error) {
    if (error.code === 11000) throw fail(409, 'This appointment time has just been booked.');
    throw error;
  }
};

const populateAppointment = (id) => Appointment.findById(id)
  .populate('patient', 'name email')
  .populate('doctor', 'name email doctorProfile.specialty')
  .lean();

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

const cancelPatientAppointment = async (patient, appointmentId) => {
  if (!mongoose.isValidObjectId(appointmentId)) throw fail(404, 'Appointment not found.');
  const appointment = await Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      patient: patient._id,
      status: { $in: ['pending', 'accepted'] },
      startsAt: { $gt: new Date() }
    },
    { $set: { status: 'cancelling' } },
    { new: false }
  );
  if (!appointment) {
    throw fail(409, 'Only upcoming pending or accepted appointments can be cancelled.');
  }

  const previousStatus = appointment.status;
  if (appointment.paymentStatus === 'paid') {
    try {
      await createRefund(
        appointment.razorpayPaymentId,
        appointment.amount,
        `appt_${appointment._id}`
      );
    } catch (error) {
      await Appointment.updateOne(
        { _id: appointment._id, status: 'cancelling' },
        { $set: { status: previousStatus } }
      );
      throw error;
    }
  }

  const update = { status: 'cancelled' };
  if (appointment.paymentStatus === 'paid') update.paymentStatus = 'refunded';
  const result = await Appointment.updateOne(
    { _id: appointment._id, status: 'cancelling' },
    { $set: update }
  );
  if (!result.modifiedCount) throw fail(409, 'The appointment could not be cancelled. Refresh and try again.');
  return populateAppointment(appointment._id);
};

export {
  cancelPatientAppointment,
  createAppointment,
  getDoctorAvailability,
  getDoctors,
  getMyAppointments,
  publishSlots,
  getDoctorSlots,
  removeSlot,
  updateAppointmentStatus,
  updateDoctorAvailability,
  updateDoctorProfile
};
