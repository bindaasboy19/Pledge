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
    receiveCertificate: {
      type: Boolean,
      required: true,
      default: false,
    },
    pledgeNumber: {
      type: Number,
      required: true,
      index: true,
    },
    certificateStatus: {
      type: String,
      enum: ['not_requested', 'pending', 'sent', 'failed'],
      default: 'not_requested',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual derived certificate number (NF/CSP/<pledgeNumber>)
pledgeSchema.virtual('certificateNumber').get(function () {
  return this.pledgeNumber ? `NF/CSP/${this.pledgeNumber}` : null;
});

// Backward-compatible virtual aliases
pledgeSchema.virtual('certificateId').get(function () {
  return this.pledgeNumber ? `NF/CSP/${this.pledgeNumber}` : null;
});

pledgeSchema.virtual('certificateReference').get(function () {
  return this.pledgeNumber ? `NF/CSP/${this.pledgeNumber}` : null;
});

pledgeSchema.virtual('name').get(function () {
  return this.officialName;
});

pledgeSchema.virtual('profession').get(function () {
  return this.occupation;
});

pledgeSchema.virtual('organization').get(function () {
  return this.organisation;
});

export const Pledge = mongoose.model('Pledge', pledgeSchema);
export default Pledge;
