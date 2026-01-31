const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        maxlength: 2000
    },
    category: {
        type: String,
        required: true,
        enum: ['Web Development', 'Mobile Development', 'Data Science', 'AI/ML', 'DevOps', 'Cybersecurity', 'Blockchain', 'Other'],
        default: 'Other'
    },
    thumbnail: {
        type: String,
        default: '' // URL to course image
    },
    instructor: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String, // e.g., "8 hours", "12 weeks"
        default: ''
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    price: {
        type: Number,
        default: 0 // 0 = Free
    },
    tags: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    refundWindowDays: {
        type: Number,
        default: null // If null, use global settings
    },
    refundPercentage: {
        type: Number,
        default: null // If null, use global settings
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
courseSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Course', courseSchema);
