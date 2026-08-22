import mongoose from 'mongoose';
import { ROLES } from '../lib/permissions.js';

const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ROLES },
  active: { type: Boolean, default: true },
  /* per-user exceptions to the role's PERMS row — keyed by the exact
     capability label, value one of 'F'/'S'/'O'/'N'. Only capabilities
     present here override the role default; everything else still
     comes from the role matrix (see hasPermission in permissions.js).
     Plain Object rather than a Mongoose Map — simpler JSON round-trip,
     and this is always replaced wholesale, never deep-mutated. */
  permissionOverrides: { type: Object, default: {} },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = doc._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  },
});

export default mongoose.model('User', UserSchema);
