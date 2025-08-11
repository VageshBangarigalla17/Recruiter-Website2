// backend/models/Candidate.js

const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  // ───────────────────────────────────────────────────────────
  dateOfCall:            { type: Date,     required: true },
  interviewType:         { type: String,   required: true, enum: ['Direct', 'Inbound', 'Outbound'] },
  client:                { type: String,   required: true, enum: ['Wonderla','Suzen','Digiphoto','Cospower','Pride','Chakde','Others'] },
  sourceType:            { type: String,   required: true, enum: ['Walkin','Employee Referral','Job Portal','Social Media','Others'] },
  source:                { type: String,   required: true, trim: true },
  candidateName:         { type: String,   required: true, trim: true },
  mobile:                { type: String,   required: true, match: [/^\d{10}$/, 'Mobile must be 10 digits'] },
  email:                 { type: String,   trim: true, lowercase: true, match: [/.+@.+\..+/, 'Must be a valid email'] },
  gender:                { type: String,   required: true, enum: ['Male','Female','Other'] },
  age:                   { type: Number,   min: 15 },
  location:              { type: String,   trim: true },
  qualification:         { type: String,   trim: true },
  experience:            { type: String,   trim: true },
  companyname:           { type: String,   trim: true },
  position:              { type: String,   required: true, trim: true },
  department:            { type: String,   trim: true },
  hrComments:            { type: String,   trim: true },
  hrStatus:              { type: String,   required: true, enum: ['Select','Reject','Hold','Backup','Review'] },
  comments:              { type: String,   trim: true },
  clientInterviewDate:   { type: Date },
  interviewAttended:     { type: String,   trim: true },
  notAttendedComments:   { type: String,   trim: true },
  clientStatus:          { type: String,   enum: ['Reject','Hold','Select'], default: undefined, trim: true },
  clientComments:        { type: String,   trim: true },
  finalStatus:           { type: String,   enum: ['Offer in Progress','Offered','Joined','Yet to Join','Shortlist Dropout','Offer Dropout','Joining Dropout'], default: undefined },
  resume:                { type: String,   trim: true },
  resumePath:            { type: String,   default: null },

  // ─── NEW: auto-incrementing serial reference ───────────────
  serialRefNumber:       { type: Number,   unique: true, index: true },

  // ─── Audit fields ─────────────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// ─── Pre-save hook to assign serialRefNumber ────────────────
candidateSchema.pre('save', async function(next) {
  if (this.isNew) {
    // find the document with highest serialRefNumber
    const last = await this.constructor
      .findOne({})
      .sort({ serialRefNumber: -1 })
      .select('serialRefNumber')
      .lean();

    if (last && last.serialRefNumber) {
      this.serialRefNumber = last.serialRefNumber + 1;
    } else {
      this.serialRefNumber = 100001;
    }
  }
  next();
});

module.exports = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
// ─── End of Candidate model definition ─────────────────────