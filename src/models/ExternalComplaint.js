import mongoose from 'mongoose';

const { Schema } = mongoose;

/* Complaints pushed by the external complaint-intake system — kept as
   its own collection rather than folded into Customer.openComplaints/
   complaints (see Customer.js), which is a different, narrower
   workflow (raised/closed dates, an NCR reference, and it feeds the
   Trust score) that a webhook payload's richer, differently-shaped
   fields don't map onto cleanly. `customerId`/`unit` are filled in
   when lib/webhookMatch.js finds an owner by contact number; `matched:
   false` rows are everything it couldn't confidently place — reviewed
   and linked by hand from the Leads page's "Unmatched complaints" tab,
   never silently dropped. */
const ExternalComplaintSchema = new Schema({
  customerId: { type: String, default: null, index: true },
  matched: { type: Boolean, default: false },
  name: { type: String, default: null },
  contactNo: { type: String, default: null },
  projectName: { type: String, default: null },
  unit: { type: String, default: null },
  requestType: { type: String, default: null },
  requestAbout: { type: String, default: null },
  requestCategory: { type: String, default: null },
  narration: { type: String, default: null },
  /* a hosted link (e.g. Google Drive) from the source system, not an
     uploaded file — no Cloudinary asset behind this one, same
     'source: link' distinction Customer.documents already draws. */
  imageUrl: { type: String, default: null },
  status: { type: String, default: 'Pending' },
  adminComments: { type: String, default: null },
  /* the source system's own Timestamp, kept separate from createdAt
     (when THIS record was written here) — they usually agree, but a
     retried/delayed webhook call shouldn't misreport when the
     complaint was actually raised. */
  externalTimestamp: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = doc._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

export default mongoose.model('ExternalComplaint', ExternalComplaintSchema);
