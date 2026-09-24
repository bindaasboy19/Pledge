import mongoose from 'mongoose';

const pledgeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      enum: ['Mr.', 'Ms.', 'Mrs.', 'Adv.', 'Dr.', 'Other'],
      default: 'Mr.',
      trim: true,
    },
    officialName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 15,
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    organisation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    language: {
      type: String,
      required: true,
      enum: ['en', 'hi'],
      default: 'en',
    },
    pledgeAccepted: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    receiveCertificate: {
      type: Boolean,
      required: true,
      default: false,
    },
    pledgeNumber: {
      type: Number,
      index: true,
    },
    certificateId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    certificateRequestedAt: {
      type: Date,
      default: null,
    },
    certificateGeneratedAt: {
      type: Date,
      default: null,
    },
    certificateSentAt: {
      type: Date,
      default: null,
    },
    certificateError: {
      type: String,
      default: null,
    },
    pledgeVersion: {
      type: String,
      default: '2026-v1',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for frontend and legacy field compatibility
pledgeSchema.virtual('name').get(function () {
  return this.officialName;
});
pledgeSchema.virtual('profession').get(function () {
  return this.occupation;
});
pledgeSchema.virtual('organization').get(function () {
  return this.organisation;
});
pledgeSchema.virtual('certificateReference').get(function () {
  return this.certificateId;
});

export const Pledge = mongoose.model('Pledge', pledgeSchema);
export default Pledge;
