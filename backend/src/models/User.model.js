import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId && !this.microsoftId;
        },
        'Password is required'
      ],
      minlength: 6,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false
    },
    microsoftId: {
      type: String,
      unique: true,
      sparse: true,
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'patient', 'user'],
      default: 'patient'
    },
    doctorProfile: {
      specialty: { type: String, trim: true, maxlength: 100 },
      bio: { type: String, trim: true, maxlength: 2000 },
      fee: { type: Number, min: 1, max: 1000000 }
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
