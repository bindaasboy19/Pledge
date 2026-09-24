import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    required: true,
    default: 26000000,
  },
});

export const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
