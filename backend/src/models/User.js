import mongoose from 'mongoose';
import { ROLES } from '../lib/permissions.js';

const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ROLES },
  active: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  },
});

export default mongoose.model('User', UserSchema);
