import mongoose from 'mongoose';

const { Schema } = mongoose;

/* Mirrors the raw Customer shape from src/lib/generator.js exactly —
   see the plan doc for the full field trace. Subdocuments use
   { _id: false } so the JSON shape stays identical to the original
   in-memory objects the frontend already knows how to render. */

const LoanSchema = new Schema({
  bank: { type: String, default: null },
  tenure: { type: Number, default: 0 },
  start: { type: Date, default: null },
  closure: { type: Date, default: null },
  closed: { type: Boolean, default: false },
  closedOn: { type: Date },
  prepaid: { type: Boolean, default: false },
  selfFunded: { type: Boolean, default: false },
}, { _id: false });

const ValSchema = new Schema({
  ask: Number,
  resale: Number,
  circle: Number,
  notedOn: String,
  basis: String,
  by: String,
}, { _id: false });

const UnitSchema = new Schema({
  unit: { type: String, required: true },
  project: { type: String, required: true },
  entity: String,
  type: String,
  carpet: Number,
  saleable: Number,
  loading: Number,
  bookDate: Date,
  agrDate: { type: Date, default: null },
  regDate: { type: Date, default: null },
  possDate: { type: Date, default: null },
  rate: Number,
  discount: { type: Number, default: 0 },
  consideration: Number,
  paid: Number,
  receipts: { type: Number, default: 0 },
  bounced: { type: Number, default: 0 },
  lastReceipt: Date,
  loan: LoanSchema,
  val: ValSchema,
  exited: { type: Boolean, default: false },
  exitDate: { type: Date },
  exitRate: { type: Number },
}, { _id: false });

const ComplaintSchema = new Schema({
  t: String,
  raised: Date,
  closed: Date,
  days: Number,
}, { _id: false });

const OpenComplaintSchema = new Schema({
  t: String,
  raised: Date,
  days: Number,
  owner: String,
  ncr: String,
}, { _id: false });

const ReferralSchema = new Schema({
  n: String,
  date: Date,
  status: String,
}, { _id: false });

const EventSchema = new Schema({
  n: String,
  d: Date,
}, { _id: false });

const StatementSchema = new Schema({
  d: Date,
  v: String,
  ch: String,
  opened: Boolean,
  profileDone: Boolean,
  disputed: Boolean,
  askedToSell: Boolean,
  askedNewProject: Boolean,
}, { _id: false });

const ChildSchema = new Schema({
  n: String,
  dob: Date,
}, { _id: false });

const ConsentSchema = new Schema({
  whatsapp: { type: Boolean, default: false },
  sms: { type: Boolean, default: false },
  email: { type: Boolean, default: false },
  marketing: { type: Boolean, default: false },
  date: { type: Date, default: null },
  purpose: { type: String, default: null },
  children: { type: Boolean, default: false },
}, { _id: false });

const CapturedSchema = new Schema({
  dob: { type: Boolean, default: false },
  anniv: { type: Boolean, default: false },
  kid: { type: Boolean, default: false },
  occ: { type: Boolean, default: false },
  addr: { type: Boolean, default: false },
}, { _id: false });

const ReferredBySchema = new Schema({
  n: String,
  id: String,
}, { _id: false });

const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'EXITED', 'TRANSFER_IN_PROGRESS', 'DECEASED'], default: 'ACTIVE' },
  statusSince: { type: Date, default: null },
  statusNote: { type: String, default: null },
  salutation: String,
  name: { type: String, required: true },
  coApplicant: { type: String, default: null },
  coRelation: { type: String, default: 'Spouse' },
  coOnAgreement: { type: Boolean, default: false },
  dob: { type: Date, default: null },
  spouseDob: { type: Date, default: null },
  children: { type: [ChildSchema], default: [] },
  pan: { type: String, required: true },
  aadhaarHeld: { type: Boolean, default: false },
  kycDate: { type: Date, default: null },
  mobile: { type: String, required: true },
  email: { type: String, default: null },
  corrAddr: String,
  city: String,
  occupation: String,
  occBand: Number,
  incomeBand: { type: String, default: null },
  community: String,
  captured: CapturedSchema,
  consent: ConsentSchema,
  source: String,
  referredBy: { type: ReferredBySchema, default: null },
  units: { type: [UnitSchema], default: [] },
  complaints: { type: [ComplaintSchema], default: [] },
  openComplaints: { type: [OpenComplaintSchema], default: [] },
  nps: { type: Number, default: null },
  npsDate: { type: Date, default: null },
  litigation: { type: Boolean, default: false },
  referrals: { type: [ReferralSchema], default: [] },
  events: { type: [EventSchema], default: [] },
  siteVisits: { type: Number, default: 0 },
  portalLast: { type: Date, default: null },
  statements: { type: [StatementSchema], default: [] },
}, {
  toJSON: {
    transform: (_doc, ret) => { delete ret._id; delete ret.__v; return ret; },
  },
});

export default mongoose.model('Customer', CustomerSchema);
