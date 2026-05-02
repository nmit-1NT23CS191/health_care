import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingClaims, agentDecision } from '../services/api';
import { Users, FileText, AlertTriangle, LogOut, Check, X, Info, Activity, ShieldAlert, FileSignature } from 'lucide-react';

const AgentDashboard = () => {
    const [claims, setClaims] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [decisionError, setDecisionError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadClaims();
    }, []);

    const loadClaims = async () => {
        try {
            const data = await getPendingClaims();
            setClaims(data);
            if (data.length > 0 && !selectedClaim) {
                setSelectedClaim(data[0]);
            } else if (data.length === 0) {
                setSelectedClaim(null);
            }
        } catch (err) {
            console.error('Failed to load pending claims');
        }
    };

    const handleDecision = async (decision) => {
        if (!selectedClaim) return;
        if ((decision === 'REJECTED' || decision === 'REQUEST_INFO') && !notes.trim()) {
            setDecisionError('Reason is mandatory for Reject or Hold');
            return;
        }
        setDecisionError('');
        setLoading(true);
        try {
            await agentDecision(selectedClaim._id, decision, selectedClaim.ocrData?.billAmount, notes);
            setNotes('');
            loadClaims();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold font-['Manrope'] mb-8 text-blue-400">Agent Portal</h1>
                    <div className="space-y-2">
                        <button className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-600 rounded-[12px] font-medium transition-colors">
                            <Users className="w-5 h-5" />
                            <span>Review Queue</span>
                        </button>
                    </div>
                </div>
                <div className="mt-auto p-6 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Efficiency Metrics Banner */}
                <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Claims Processed</p>
                        <p className="text-xl font-bold text-slate-900">1,248</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Fraud Flags Detected</p>
                        <p className="text-xl font-bold text-red-600">32</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">AI Auto-Approved</p>
                        <p className="text-xl font-bold text-green-600">68%</p>
                    </div>
                    <div className="flex space-x-2">
                         <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center"><Activity className="w-3 h-3 mr-1"/> Systems Optimal</span>
                    </div>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                {/* List Pane */}
                <div className="w-1/3 bg-white border-r border-slate-200 overflow-y-auto">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 sticky top-0 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900 font-['Manrope']">Pending Reviews</h2>
                        <span className="px-2.5 py-1 bg-[#0052CC] text-white text-xs font-bold rounded-full">{claims.length}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {claims.map(claim => (
                            <div 
                                key={claim._id} 
                                onClick={() => setSelectedClaim(claim)}
                                className={`p-5 cursor-pointer transition-colors ${selectedClaim?._id === claim._id ? 'bg-blue-50 border-l-4 border-[#0052CC]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-slate-900">{claim.userId?.name || 'Unknown Patient'}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${claim.riskBand === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {claim.riskBand} RISK
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 truncate">{claim.ocrData?.hospitalName || claim.hospitalId?.name}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm font-semibold">₹{claim.ocrData?.billAmount}</p>
                                    <span className="text-xs text-slate-400">{new Date(claim.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        {claims.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">Queue is empty</div>}
                    </div>
                </div>

                {/* Detail Pane */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
                    {selectedClaim ? (
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900">Claim Details</h2>
                                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
                                    ID: {selectedClaim._id}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                {/* OCR & NLP Data */}
                                <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><FileText className="w-4 h-4 mr-2"/> OCR & NLP Data</h3>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 mb-1">Hospital (OCR)</p>
                                            <p className="font-medium text-slate-900">{selectedClaim.ocrData?.hospitalName}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Diagnosis (NLP)</p>
                                            <p className="font-medium text-slate-900">{selectedClaim.ocrData?.diagnosis}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-slate-500 mb-1">Bill Amount</p>
                                                <p className="font-bold text-slate-900 text-lg">₹{selectedClaim.ocrData?.billAmount}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 mb-1">Confidence</p>
                                                <p className="font-medium text-slate-900">{selectedClaim.ocrData?.confidenceScore}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Profile */}
                                <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><Users className="w-4 h-4 mr-2"/> Patient Profile</h3>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 mb-1">Name</p>
                                            <p className="font-medium text-slate-900">{selectedClaim.userId?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Contact</p>
                                            <p className="font-medium text-slate-900">{selectedClaim.userId?.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Historical Risk Profile</p>
                                            <p className="font-medium text-slate-900">{selectedClaim.userId?.riskProfile}</p>
                                        </div>
                                        <div className="pt-3 border-t border-slate-100">
                                            <p className="text-slate-500 mb-1">Verified Policy ID</p>
                                            <p className="font-medium text-[#0052CC]">POL-492810-AB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hospital Verification */}
                                <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><Activity className="w-4 h-4 mr-2"/> Hospital Auth</h3>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 mb-1">GST Verification</p>
                                            {selectedClaim.hospitalId?.isGstVerified ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">VERIFIED</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">INVALID</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Medical Registry (IMA/NHA)</p>
                                            {selectedClaim.hospitalId?.isImaRegistered ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                                                    {selectedClaim.hospitalId?.medicalRegistryId ? `Registered (${selectedClaim.hospitalId.medicalRegistryId})` : 'Registered'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">UNVERIFIED</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-slate-500 mb-1">Fetched Legal Name (GST)</p>
                                            <p className="font-medium text-slate-900 italic">
                                                {selectedClaim.hospitalId?.isGstVerified ? selectedClaim.hospitalId?.name : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Analysis Breakdown */}
                            <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><Activity className="w-4 h-4 mr-2"/> Full AI Verification Breakdown</h3>
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-slate-600 font-medium text-sm">Risk Score</span>
                                        <span className={`font-bold ${selectedClaim.riskScore > 65 ? 'text-red-600' : 'text-amber-600'}`}>
                                            {selectedClaim.riskScore}/100
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${selectedClaim.riskScore > 65 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(selectedClaim.riskScore, 100)}%` }}></div>
                                    </div>
                                </div>
                                <ul className="space-y-3 mt-6 text-sm border-t border-slate-100 pt-4">
                                    {selectedClaim.riskBreakdown?.map((reason, idx) => (
                                        <li key={idx} className="flex items-start text-slate-700 bg-slate-50 p-3 rounded-[8px]">
                                            <ShieldAlert className="w-4 h-4 mr-2 mt-0.5 text-slate-400" />
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action Area */}
                            <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm mt-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><FileSignature className="w-4 h-4 mr-2"/> Agent Decision Panel</h3>
                                {decisionError && <p className="text-red-500 text-xs mb-2 font-semibold">{decisionError}</p>}
                                <textarea 
                                    className={`w-full px-4 py-3 rounded-[12px] border ${decisionError ? 'border-red-300' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] mb-4 text-sm transition-all`}
                                    rows="3"
                                    placeholder="Add mandatory notes for the audit log..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                                
                                <div className="flex space-x-4">
                                    <button 
                                        onClick={() => handleDecision('APPROVED')}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center py-3 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
                                    >
                                        <Check className="w-5 h-5 mr-2" /> Approve Final Amount
                                    </button>
                                    <button 
                                        onClick={() => handleDecision('REQUEST_INFO')}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center py-3 bg-amber-50 text-amber-700 rounded-[12px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 border border-amber-200"
                                    >
                                        <Info className="w-5 h-5 mr-2" /> Request Info
                                    </button>
                                    <button 
                                        onClick={() => handleDecision('REJECTED')}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center py-3 bg-red-50 text-red-700 rounded-[12px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200"
                                    >
                                        <X className="w-5 h-5 mr-2" /> Reject Claim
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                            Select a claim from the queue to review
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default AgentDashboard;
