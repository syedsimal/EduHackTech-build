const mongoose = require('mongoose');

const refundSettingsSchema = new mongoose.Schema({
    // Use a singleton pattern - only one settings document
    _id: {
        type: String,
        default: 'global'
    },
    defaultRefundPercentage: {
        type: Number,
        default: 90,
        min: 0,
        max: 100
    },
    refundWindowDays: {
        type: Number,
        default: 90,
        min: 1
    },
    requiresCourseCompletion: {
        type: Boolean,
        default: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    minimumCoursePrice: {
        type: Number,
        default: 0,
        min: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Static method to get or create settings
refundSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findById('global');
    if (!settings) {
        settings = await this.create({ _id: 'global' });
    }
    return settings;
};

module.exports = mongoose.model('RefundSettings', refundSettingsSchema);
