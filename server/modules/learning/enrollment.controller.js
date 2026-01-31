const Enrollment = require('./enrollment.model');
const Course = require('./course.model');
const { createNotificationForUser } = require('../notification/notification.controller');

// @desc    Enroll user in a course
// @route   POST /api/enrollments/:courseId
// @access  Private
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if already enrolled
        const existing = await Enrollment.findOne({ user: userId, course: courseId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            user: userId,
            course: courseId,
            paidAmount: course.price || 0
        });

        // Increment enrolled count on course
        await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

        // Create notification for the user
        try {
            await createNotificationForUser(
                userId,
                'success',
                'Enrollment Confirmed! 🎉',
                `You've successfully enrolled in "${course.title}". Start learning now!`,
                `/course/${courseId}/learn`
            );
        } catch (notifError) {
            console.error('Failed to create notification:', notifError);
            // Don't fail the enrollment if notification fails
        }

        res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Enrollment failed', error: error.message });
    }
};

// @desc    Get user's enrollments
// @route   GET /api/enrollments/my
// @access  Private
exports.getMyEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ user: req.user.id })
            .populate('course', 'title thumbnail category level duration')
            .sort({ enrolledAt: -1 });

        res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments', error: error.message });
    }
};

// @desc    Check if user is enrolled in a course
// @route   GET /api/enrollments/check/:courseId
// @access  Private
exports.checkEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            user: req.user.id,
            course: req.params.courseId
        });

        res.status(200).json({
            success: true,
            enrolled: !!enrollment,
            data: enrollment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Check failed', error: error.message });
    }
};

// @desc    Update enrollment progress
// @route   PUT /api/enrollments/:courseId/progress
// @access  Private
exports.updateProgress = async (req, res) => {
    try {
        const { progress, completedModule } = req.body;

        const enrollment = await Enrollment.findOne({
            user: req.user.id,
            course: req.params.courseId
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (progress !== undefined) {
            enrollment.progress = progress;
        }

        if (completedModule && !enrollment.completedModules.includes(completedModule)) {
            enrollment.completedModules.push(completedModule);
        }

        enrollment.lastAccessedAt = Date.now();

        if (enrollment.progress >= 100) {
            enrollment.status = 'completed';
            enrollment.completedAt = new Date();
        }

        await enrollment.save();

        res.status(200).json({ success: true, data: enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed', error: error.message });
    }
};

// @desc    Unenroll from a course
// @route   DELETE /api/enrollments/:courseId
// @access  Private
exports.unenroll = async (req, res) => {
    try {
        const enrollment = await Enrollment.findOneAndDelete({
            user: req.user.id,
            course: req.params.courseId
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Decrement enrolled count
        await Course.findByIdAndUpdate(req.params.courseId, { $inc: { enrolledCount: -1 } });

        res.status(200).json({ success: true, message: 'Unenrolled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Unenroll failed', error: error.message });
    }
};

// @desc    Get all users enrolled in a course (Admin)
// @route   GET /api/enrollments/course/:courseId/users
// @access  Private (Admin)
exports.getCourseUsers = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ course: req.params.courseId })
            .populate('user', 'name email avatar')
            .sort({ enrolledAt: -1 });

        res.status(200).json({ success: true, count: enrollments.length, data: enrollments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
};

// @desc    Admin unenroll a user
// @route   DELETE /api/enrollments/admin/:courseId/:userId
// @access  Private (Admin)
exports.adminUnenrollUser = async (req, res) => {
    try {
        const { courseId, userId } = req.params;

        const enrollment = await Enrollment.findOneAndDelete({
            user: userId,
            course: courseId
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        // Decrement enrolled count
        await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: -1 } });

        res.status(200).json({ success: true, message: 'User removed from course' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Admin action failed', error: error.message });
    }
};
