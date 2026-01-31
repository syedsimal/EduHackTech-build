const Refund = require('./refund.model');
const RefundSettings = require('./refundSettings.model');
const Enrollment = require('./enrollment.model');
const Course = require('./course.model');
const { createNotificationForUser } = require('../notification/notification.controller');

// @desc    Request a refund for a completed course
// @route   POST /api/refunds/request/:enrollmentId
// @access  Private
exports.requestRefund = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        // Get refund settings
        const settings = await RefundSettings.getSettings();

        if (!settings.isEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Refunds are currently disabled'
            });
        }

        // Get enrollment
        const enrollment = await Enrollment.findById(enrollmentId).populate('course');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (enrollment.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check if already requested refund
        if (enrollment.refundStatus !== 'none') {
            return res.status(400).json({
                success: false,
                message: 'Refund already requested for this enrollment'
            });
        }

        // Check if course is completed (if required)
        if (settings.requiresCourseCompletion && enrollment.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Course must be completed to request a refund'
            });
        }

        // Check if within refund window
        const enrollmentDate = new Date(enrollment.enrolledAt);
        const now = new Date();
        const daysSinceEnrollment = Math.floor((now - enrollmentDate) / (1000 * 60 * 60 * 24));

        if (daysSinceEnrollment > settings.refundWindowDays) {
            return res.status(400).json({
                success: false,
                message: `Refund window of ${settings.refundWindowDays} days has expired`
            });
        }

        // --- Determine refund window and percentage (Course-specific fallback to Global) ---
        const refundWindowDays = enrollment.course.refundWindowDays !== null && enrollment.course.refundWindowDays !== undefined
            ? enrollment.course.refundWindowDays
            : settings.refundWindowDays;

        const refundPercentage = enrollment.course.refundPercentage !== null && enrollment.course.refundPercentage !== undefined
            ? enrollment.course.refundPercentage
            : settings.defaultRefundPercentage;

        if (daysSinceEnrollment > refundWindowDays) {
            return res.status(400).json({
                success: false,
                message: `Refund window of ${refundWindowDays} days has expired`
            });
        }

        // Check minimum price
        const paidAmount = enrollment.paidAmount || enrollment.course.price || 0;
        if (paidAmount < settings.minimumCoursePrice) {
            return res.status(400).json({
                success: false,
                message: 'Course price does not meet minimum refund threshold'
            });
        }

        // Calculate refund amount
        const refundAmount = (paidAmount * refundPercentage) / 100;

        // Create refund request
        const refund = await Refund.create({
            user: userId,
            enrollment: enrollmentId,
            course: enrollment.course._id,
            originalAmount: paidAmount,
            refundAmount,
            refundPercentage,
            userReason: reason
        });

        // Update enrollment refund status
        enrollment.refundStatus = 'pending';
        await enrollment.save();

        // Notify user
        await createNotificationForUser(
            userId,
            'info',
            'Refund Request Submitted',
            `Your refund request of ₹${refundAmount.toFixed(2)} for "${enrollment.course.title}" is under review.`,
            '/my-courses'
        ).catch(console.error);

        res.status(201).json({
            success: true,
            data: refund,
            message: `Refund request submitted! You may receive ₹${refundAmount.toFixed(2)} (${refundPercentage}%)`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Refund request failed', error: error.message });
    }
};

// @desc    Get user's refund requests
// @route   GET /api/refunds/my
// @access  Private
exports.getMyRefunds = async (req, res) => {
    try {
        const refunds = await Refund.find({ user: req.user.id })
            .populate('course', 'title thumbnail')
            .sort({ requestedAt: -1 });

        res.status(200).json({ success: true, count: refunds.length, data: refunds });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch refunds', error: error.message });
    }
};

// @desc    Check refund eligibility for an enrollment
// @route   GET /api/refunds/eligibility/:enrollmentId
// @access  Private
exports.checkEligibility = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const userId = req.user.id;

        const settings = await RefundSettings.getSettings();
        const enrollment = await Enrollment.findById(enrollmentId).populate('course');

        if (!enrollment || enrollment.user.toString() !== userId) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        const enrollmentDate = new Date(enrollment.enrolledAt);
        const now = new Date();
        const daysSinceEnrollment = Math.floor((now - enrollmentDate) / (1000 * 60 * 60 * 24));

        // --- Determine refund window and percentage (Course-specific fallback to Global) ---
        const refundWindowDays = enrollment.course.refundWindowDays !== null && enrollment.course.refundWindowDays !== undefined
            ? enrollment.course.refundWindowDays
            : settings.refundWindowDays;

        const refundPercentage = enrollment.course.refundPercentage !== null && enrollment.course.refundPercentage !== undefined
            ? enrollment.course.refundPercentage
            : settings.defaultRefundPercentage;

        const daysRemaining = refundWindowDays - daysSinceEnrollment;

        const paidAmount = enrollment.paidAmount || enrollment.course.price || 0;
        const refundAmount = (paidAmount * refundPercentage) / 100;

        const eligibility = {
            isEnabled: settings.isEnabled,
            isEligible: false,
            reason: '',
            refundPercentage: refundPercentage,
            refundAmount,
            daysRemaining: Math.max(0, daysRemaining),
            requiresCompletion: settings.requiresCourseCompletion
        };

        if (!settings.isEnabled) {
            eligibility.reason = 'Refunds are currently disabled';
        } else if (enrollment.refundStatus !== 'none') {
            eligibility.reason = 'Refund already requested';
        } else if (settings.requiresCourseCompletion && enrollment.status !== 'completed') {
            eligibility.reason = 'Complete the course to be eligible for refund';
        } else if (daysRemaining <= 0) {
            eligibility.reason = 'Refund window has expired';
        } else if (paidAmount < settings.minimumCoursePrice) {
            eligibility.reason = 'Course price below minimum threshold';
        } else {
            eligibility.isEligible = true;
            eligibility.reason = `Eligible for ${settings.defaultRefundPercentage}% refund`;
        }

        res.status(200).json({ success: true, data: eligibility });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Eligibility check failed', error: error.message });
    }
};

// @desc    Get all refund requests (Admin)
// @route   GET /api/refunds/admin/all
// @access  Private (Admin)
exports.getAllRefunds = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;

        const refunds = await Refund.find(query)
            .populate('user', 'name email')
            .populate('course', 'title')
            .populate('processedBy', 'name')
            .sort({ requestedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Refund.countDocuments(query);

        res.status(200).json({
            success: true,
            count: refunds.length,
            total,
            pages: Math.ceil(total / limit),
            data: refunds
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch refunds', error: error.message });
    }
};

// @desc    Process a refund (Admin)
// @route   PUT /api/refunds/admin/:refundId
// @access  Private (Admin)
exports.processRefund = async (req, res) => {
    try {
        const { refundId } = req.params;
        const { status, adminNotes, customRefundAmount } = req.body;
        const adminId = req.user.id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be approved or rejected'
            });
        }

        const refund = await Refund.findById(refundId);
        if (!refund) {
            return res.status(404).json({ success: false, message: 'Refund not found' });
        }

        if (refund.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Refund has already been processed'
            });
        }

        // Update refund
        refund.status = status;
        refund.processedAt = new Date();
        refund.processedBy = adminId;
        if (adminNotes) refund.adminNotes = adminNotes;

        // Allow admin to set custom refund amount
        if (customRefundAmount !== undefined && status === 'approved') {
            refund.refundAmount = customRefundAmount;
            refund.refundPercentage = (customRefundAmount / refund.originalAmount) * 100;
        }

        await refund.save();

        // Update enrollment refund status
        await Enrollment.findByIdAndUpdate(refund.enrollment, {
            refundStatus: status
        });

        // Notify user
        const notifType = status === 'approved' ? 'success' : 'warning';
        const notifTitle = status === 'approved' ? 'Refund Approved! 🎉' : 'Refund Request Update';
        const notifMessage = status === 'approved'
            ? `Your refund of ₹${refund.refundAmount.toFixed(2)} has been approved and will be processed soon.`
            : `Your refund request has been reviewed. ${adminNotes || 'Please contact support for more information.'}`;

        await createNotificationForUser(
            refund.user,
            notifType,
            notifTitle,
            notifMessage,
            '/my-courses'
        ).catch(console.error);

        res.status(200).json({ success: true, data: refund });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to process refund', error: error.message });
    }
};

// @desc    Get refund settings (Admin)
// @route   GET /api/refunds/admin/settings
// @access  Private (Admin)
exports.getRefundSettings = async (req, res) => {
    try {
        const settings = await RefundSettings.getSettings();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
    }
};

// @desc    Update refund settings (Admin)
// @route   PUT /api/refunds/admin/settings
// @access  Private (Admin)
exports.updateRefundSettings = async (req, res) => {
    try {
        const {
            defaultRefundPercentage,
            refundWindowDays,
            requiresCourseCompletion,
            isEnabled,
            minimumCoursePrice
        } = req.body;

        const settings = await RefundSettings.getSettings();

        if (defaultRefundPercentage !== undefined) {
            settings.defaultRefundPercentage = defaultRefundPercentage;
        }
        if (refundWindowDays !== undefined) {
            settings.refundWindowDays = refundWindowDays;
        }
        if (requiresCourseCompletion !== undefined) {
            settings.requiresCourseCompletion = requiresCourseCompletion;
        }
        if (isEnabled !== undefined) {
            settings.isEnabled = isEnabled;
        }
        if (minimumCoursePrice !== undefined) {
            settings.minimumCoursePrice = minimumCoursePrice;
        }

        settings.updatedAt = new Date();
        settings.updatedBy = req.user.id;

        await settings.save();

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
    }
};
