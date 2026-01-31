const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completedModules: [{
        type: String
    }],
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'dropped'],
        default: 'active'
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    completedAt: {
        type: Date
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected', 'processed'],
        default: 'none'
    }
});

// Compound index to ensure a user can only enroll once per course
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
