import mongoose from 'mongoose';

const { Schema } = mongoose;

/* One row per unexpected (5xx-class) error the API's catch-all error
   handler ever sees — written by lib/errorHandler.js, not hand-logged
   per route. Distinct from AuditLog (which records every state-
   changing request, success or failure, as a plain fact): this is
   specifically the "something actually broke" trail, so it can be
   scanned/alerted on without wading through routine 400s. `resolved`
   is a manual flag someone sets after investigating — nothing in the
   app clears it automatically. */
const SystemErrorSchema = new Schema({
  at: { type: Date, default: Date.now },
  correlationId: { type: String, default: null, index: true },
  message: { type: String, required: true },
  stack: { type: String, default: null },
  statusCode: { type: Number, required: true },
  method: { type: String, default: null },
  path: { type: String, default: null },
  actor: {
    id: { type: String, default: null },
    name: { type: String, default: null },
    email: { type: String, default: null },
    role: { type: String, default: null },
  },
  ip: { type: String, default: null },
  resolved: { type: Boolean, default: false },
}, {
  toJSON: {
    transform: (doc, ret) => {
      ret.id = doc._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

SystemErrorSchema.index({ at: -1 });

export default mongoose.model('SystemError', SystemErrorSchema);
