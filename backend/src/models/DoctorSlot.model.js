import mongoose from 'mongoose';

const doctorSlotSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startsAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

doctorSlotSchema.index({ doctor: 1, startsAt: 1 }, { unique: true });

export default mongoose.model('DoctorSlot', doctorSlotSchema);
