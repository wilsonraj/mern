import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startsAt: {
      type: Date,
      required: true
    },
    mode: {
      type: String,
      enum: ['video', 'clinic'],
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'in_person'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'pay_at_visit', 'refunded'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['awaiting_payment', 'pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      required: true
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    expiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, startsAt: 1 }, { unique: true });
appointmentSchema.index({ patient: 1, startsAt: -1 });
appointmentSchema.index({ doctor: 1, startsAt: -1 });
appointmentSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'awaiting_payment' } }
);

export default mongoose.model('Appointment', appointmentSchema);
