/**
 * Refund Service
 * Handles all refund-related API operations using the shared API client
 */

import { get, post } from './api.client';

const BASE = '/refunds';

/**
 * Check refund eligibility for an enrollment
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Eligibility data
 */
export const checkRefundEligibility = async (enrollmentId, token) => {
    try {
        const response = await get(`${BASE}/eligibility/${enrollmentId}`, token);
        return response;
    } catch (error) {
        console.error('Failed to check refund eligibility:', error);
        return { success: false, data: { isEligible: false, reason: 'Check failed' } };
    }
};

/**
 * Request a refund for a course
 * @param {string} enrollmentId - Enrollment ID
 * @param {string} reason - Reason for refund
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Refund request result
 */
export const requestRefund = async (enrollmentId, reason, token) => {
    const response = await post(`${BASE}/request/${enrollmentId}`, { reason }, token);
    return response;
};

/**
 * Get global refund settings (Admin)
 */
export const getGlobalRefundSettings = async (token) => {
    const response = await get(`${BASE}/admin/settings`, token);
    return response;
};

/**
 * Update global refund settings (Admin)
 */
export const updateGlobalRefundSettings = async (settingsData, token) => {
    const response = await put(`${BASE}/admin/settings`, settingsData, token);
    return response;
};

export default {
    checkRefundEligibility,
    requestRefund,
    getGlobalRefundSettings,
    updateGlobalRefundSettings
};
