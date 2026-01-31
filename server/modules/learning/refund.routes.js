const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middlewares/authMiddleware');
const {
    requestRefund,
    getMyRefunds,
    checkEligibility,
    getAllRefunds,
    processRefund,
    getRefundSettings,
    updateRefundSettings
} = require('./refund.controller');

// User routes
router.post('/request/:enrollmentId', protect, requestRefund);
router.get('/my', protect, getMyRefunds);
router.get('/eligibility/:enrollmentId', protect, checkEligibility);

// Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllRefunds);
router.put('/admin/:refundId', protect, authorize('admin'), processRefund);
router.get('/admin/settings', protect, authorize('admin'), getRefundSettings);
router.put('/admin/settings', protect, authorize('admin'), updateRefundSettings);

module.exports = router;
