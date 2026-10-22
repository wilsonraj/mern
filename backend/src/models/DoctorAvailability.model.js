import mongoose from 'mongoose';

const timeRangeSchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  { _id: false }
);

const weekdaySchema = new mongoose.Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    windows: { type: [timeRangeSchema], default: [] }
  },
  { _id: false }
);

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    timeZone: { type: String, required: true },
    days: { type: [weekdaySchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
