import mongoose from 'mongoose';

const { Schema } = mongoose;

/* A raw pre-sale inquiry — a website visitor or a buyer someone
   referred — that hasn't (yet, if ever) become an actual booking.
   Deliberately NOT a Customer: every Customer document always carries
   at least one unit (see buildShellCustomer in validateIncomplete.js),
   which is the wrong shape for someone who hasn't bought anything.
   Staff convert a Lead into a real Customer by hand once it actually
   books (see routes/leads.js's /convert), recording the resulting
   Customer id here rather than auto-creating one — a webhook payload
   is too thin (no PAN, no unit financials) to safely mint a real
   owner record on its own. */
const LeadSchema = new Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, default: null },
  email: { type: String, default: null },
  propertyType: { type: String, default: null },
  source: { type: String, enum: ['Website', 'Referral', 'Other'], default: 'Other' },
  /* raw campaign/channel text from the source system (e.g. Lead_Source) —
     kept as-is, not normalized against Settings' own dropdown lists,
     since this is external vocabulary the app doesn't control. */
  sourceDetail: { type: String, default: null },
  /* only populated when source === 'Referral' — who referred this
     buyer. customerId is set only when the referring owner could be
     matched by contact number (see lib/webhookMatch.js); the rest is
     kept even when unmatched, so the referral isn't lost to a failed
     lookup. */
  referredBy: {
    customerId: { type: String, default: null },
    name: { type: String, default: null },
    ownProperty: { type: String, default: null },
    unit: { type: String, default: null },
    contactNo: { type: String, default: null },
  },
  status: { type: String, enum: ['New', 'Contacted', 'Converted', 'Lost'], default: 'New' },
  convertedCustomerId: { type: String, default: null },
  notes: { type: String, default: null },
  /* the untouched original webhook payload — never shown prominently,
     kept only so a mapping question ("what did their system actually
     send?") is answerable without asking them to resend it. */
  raw: { type: Object, default: null },
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

export default mongoose.model('Lead', LeadSchema);
