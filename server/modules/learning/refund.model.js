const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    enrollment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    originalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    refundAmount: {
        type: Number,
        required: true,
        min: 0
    },
    refundPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processed'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminNotes: {
        type: String,
        maxlength: 500
    },
    userReason: {
        type: String,
        maxlength: 500
    }
});

// Index for faster queries
refundSchema.index({ user: 1, status: 1 });
refundSchema.index({ enrollment: 1 }, { unique: true });

module.exports = mongoose.model('Refund', refundSchema);
