import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const loginUser = async (phone, password) => {
    const res = await api.post('/auth/login', { phone, password });
    return res.data;
};

export const registerUser = async (name, phone, password) => {
    const res = await api.post('/auth/register', { name, phone, password });
    return res.data;
};

export const updateUserPolicy = async (userId, formData) => {
    const res = await api.post(`/auth/${userId}/policy`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const deleteUserPolicy = async (userId, policyId) => {
    const res = await api.delete(`/auth/${userId}/policy/${policyId}`);
    return res.data;
};

export const getPolicyOcr = async (formData) => {
    const res = await api.post('/auth/policy/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const verifyUserPolicy = async (policyNumber) => {
    const res = await api.post('/auth/verify-policy', { policyNumber });
    return res.data;
};

export const createClaim = async (hospitalName, diagnosis, claimType, policyId) => {
    const res = await api.post('/claims/create', { hospitalName, diagnosis, claimType, policyId });
    return res.data;
};

export const uploadClaimDocument = async (claimId, formData) => {
    const res = await api.post(`/claims/${claimId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const triggerAiAnalysis = async (claimId) => {
    const res = await api.post(`/ai/analyze/${claimId}`);
    return res.data;
};

export const getUserClaims = async (userId) => {
    const res = await api.get(`/claims/patient/${userId}`);
    return res.data;
};

export const getPendingClaims = async () => {
    const res = await api.get('/agent/claims');
    return res.data;
};

export const agentDecision = async (claimId, decision, finalAmount, notes) => {
    const res = await api.post('/agent/decision', { claimId, decision, finalAmount, notes });
    return res.data;
};

export const getPendingPolicies = async () => {
    const res = await api.get('/agent/policies/pending');
    return res.data;
};

export const submitPolicyDecision = async (data) => {
    const res = await api.post('/agent/policies/decision', data);
    return res.data;
};

export default api;
