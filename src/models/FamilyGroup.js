import mongoose from 'mongoose';

const { Schema } = mongoose;

/* A named group linking several Customer records that are the same
   real-world family — each member keeps their own separate booking(s),
   own PAN, own contact details; this is purely "these owners are one
   household" bookkeeping on top of that, so the Owner Base / scoring /
   gate logic for each individual owner is completely untouched.
   Membership itself lives on the member, not here (Customer.familyGroupId
   — see that model's own comment) so "which group is this owner in" is
   a single indexed field, not a second lookup; this document is just
   the group's own name/metadata. */
const FamilyGroupSchema = new Schema({
  name: { type: String, required: true, trim: true },
  notes: { type: String, default: null },
  createdBy: { type: String, default: null },
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

export default mongoose.model('FamilyGroup', FamilyGroupSchema);
