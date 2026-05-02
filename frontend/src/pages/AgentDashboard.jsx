import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingClaims, agentDecision, getPendingPolicies, submitPolicyDecision, getAgentAnalytics, getClaimHistory } from '../services/api';
import { Users, FileText, AlertTriangle, LogOut, Check, X, Info, Activity, ShieldAlert, FileSignature, ShieldCheck, BarChart2, TrendingUp, CalendarDays, Clock, History, Search, ArrowUpDown } from 'lucide-react';

const AgentDashboard = () => {
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('agent_view_mode') || 'analytics'); // 'analytics', 'claims', 'policies', 'history'
    const [claims, setClaims] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [policies, setPolicies] = useState([]);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [notes, setNotes] = useState('');
    const [claimAmount, setClaimAmount] = useState('');
    const [policyAmount, setPolicyAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [decisionError, setDecisionError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'updatedAt', direction: 'desc' });
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('agent_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadClaims();
        loadPolicies();
        loadAnalytics();
        loadHistory();

        const interval = setInterval(() => {
            loadClaims();
            loadPolicies();
            loadAnalytics();
            loadHistory();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (viewMode === 'claims') loadClaims();
        else if (viewMode === 'policies') loadPolicies();
        else if (viewMode === 'history') loadHistory();
        else loadAnalytics();
    }, [viewMode]);

    const loadAnalytics = async () => {
        try {
            const data = await getAgentAnalytics();
            setAnalytics(data);
        } catch (err) {
            console.error('Failed to load analytics');
        }
    };

    const loadClaims = async () => {
        try {
            const data = await getPendingClaims();
            setClaims(data);
        } catch (err) {
            console.error('Failed to load pending claims');
        }
    };

    const loadPolicies = async () => {
        try {
            const data = await getPendingPolicies();
            setPolicies(data);
        } catch (err) {
            console.error('Failed to load pending policies');
        }
    };

    const loadHistory = async () => {
        try {
            const data = await getClaimHistory();
            setHistory(data);
        } catch (err) {
            console.error('Failed to load history');
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedHistory = () => {
        const items = [...history];
        if (sortConfig.key) {
            items.sort((a, b) => {
                let aVal, bVal;
                if (sortConfig.key === 'user') {
                    aVal = a.userId?.name || '';
                    bVal = b.userId?.name || '';
                } else if (sortConfig.key === 'hospital') {
                    aVal = a.ocrData?.hospitalName || a.hospitalId?.name || '';
                    bVal = b.ocrData?.hospitalName || b.hospitalId?.name || '';
                } else {
                    aVal = a[sortConfig.key];
                    bVal = b[sortConfig.key];
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    };

    const handleDecision = async (decision) => {
        if (!selectedClaim) return;
        if ((decision === 'REJECTED' || decision === 'REQUEST_INFO') && !notes.trim()) {
            setDecisionError('Reason is mandatory for Reject or Hold');
            return;
        }
        if (decision === 'APPROVED' && (!claimAmount || isNaN(claimAmount) || Number(claimAmount) <= 0)) {
            setDecisionError('Please enter a valid approved amount before approving.');
            return;
        }
        setDecisionError('');
        setLoading(true);
        try {
            if (decision === 'APPROVED') {
                const policy = selectedClaim.userId?.policies?.find(p => p.policyId === selectedClaim.policyId);
                const remaining = (policy?.totalCover || 0) - (policy?.usedCover || 0);
                if (Number(claimAmount) > remaining) {
                    setDecisionError(`Approved amount exceeds remaining coverage! Only ₹${remaining.toLocaleString()} available.`);
                    return;
                }
            }
            await agentDecision(selectedClaim._id, decision, claimAmount, notes);
            setNotes('');
            setClaimAmount('');
            setSelectedClaim(null);
            loadClaims();
            loadAnalytics();
        } catch (err) {
            console.error(err);
            setDecisionError(err.response?.data?.message || 'Failed to submit decision. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePolicyDecision = async (decision) => {
        if (!selectedPolicy) return;
        if (decision === 'ACTIVE' && (!policyAmount || isNaN(policyAmount) || Number(policyAmount) <= 0)) {
            setDecisionError('Valid coverage amount is required to approve a policy');
            return;
        }
        setDecisionError('');
        setLoading(true);
        try {
            await submitPolicyDecision({
                userId: selectedPolicy.userId,
                policyId: selectedPolicy.policy._id,
                decision: decision,
                totalCover: policyAmount
            });
            setPolicyAmount('');
            setSelectedPolicy(null);
            loadPolicies();
            loadAnalytics();
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

    // SVG Bar Chart Component (inline, no library)
    const BarChart = ({ data }) => {
        if (!data || data.length === 0) return null;
        const maxVal = Math.max(...data.map(d => d.approved + d.rejected), 1);
        const chartH = 120;
        const barW = 22;
        const gap = 6;
        const totalW = data.length * (barW + gap);

        return (
            <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + 30}`} preserveAspectRatio="none" className="w-full">
                {data.map((d, i) => {
                    const x = i * (barW + gap);
                    const approvedH = (d.approved / maxVal) * chartH;
                    const rejectedH = (d.rejected / maxVal) * chartH;
                    const isToday = i === data.length - 1;
                    return (
                        <g key={i}>
                            {/* Rejected bar (bottom) */}
                            <rect x={x} y={chartH - rejectedH} width={barW} height={rejectedH}
                                fill={isToday ? '#ef4444' : '#fca5a5'} rx="3" />
                            {/* Approved bar (on top) */}
                            <rect x={x} y={chartH - rejectedH - approvedH} width={barW} height={approvedH}
                                fill={isToday ? '#2563eb' : '#93c5fd'} rx="3" />
                            {/* Date label */}
                            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle"
                                fontSize="7" fill={isToday ? '#1e40af' : '#94a3b8'} fontWeight={isToday ? 'bold' : 'normal'}>
                                {d.date.split(' ')[0]}
                            </text>
                            <text x={x + barW / 2} y={chartH + 24} textAnchor="middle"
                                fontSize="7" fill={isToday ? '#1e40af' : '#94a3b8'} fontWeight={isToday ? 'bold' : 'normal'}>
                                {d.date.split(' ')[1]}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold font-['Manrope'] mb-8 text-blue-400">Agent Portal</h1>
                    <div className="space-y-2">
                        <button onClick={() => setViewMode('analytics')} className={`w-full flex items-center justify-between px-4 py-3 rounded-[12px] font-medium transition-colors ${viewMode === 'analytics' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                            <span className="flex items-center space-x-3"><BarChart2 className="w-5 h-5" /><span>Analytics</span></span>
                        </button>
                        <button onClick={() => setViewMode('claims')} className={`w-full flex items-center justify-between px-4 py-3 rounded-[12px] font-medium transition-colors ${viewMode === 'claims' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                            <span className="flex items-center space-x-3"><FileText className="w-5 h-5" /><span>Pending Claims</span></span>
                            {claims.length > 0 && <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{claims.length}</span>}
                        </button>
                        <button onClick={() => setViewMode('policies')} className={`w-full flex items-center justify-between px-4 py-3 rounded-[12px] font-medium transition-colors ${viewMode === 'policies' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                            <span className="flex items-center space-x-3"><ShieldCheck className="w-5 h-5" /><span>Pending Policies</span></span>
                            {policies.length > 0 && <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{policies.length}</span>}
                        </button>
                        <button onClick={() => setViewMode('history')} className={`w-full flex items-center justify-between px-4 py-3 rounded-[12px] font-medium transition-colors ${viewMode === 'history' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                            <span className="flex items-center space-x-3"><History className="w-5 h-5" /><span>Claim History</span></span>
                        </button>
                    </div>
                </div>
                <div className="mt-auto p-6 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        <LogOut className="w-4 h-4" /><span>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold flex items-center"><CalendarDays className="w-3 h-3 mr-1"/> Today</p>
                        <p className="text-sm font-bold text-slate-800">{analytics?.currentDate || '...'}</p>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase">Approved Today</p>
                            <p className="text-xl font-bold text-green-600">{analytics?.today?.approved ?? '—'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase">Rejected Today</p>
                            <p className="text-xl font-bold text-red-500">{analytics?.today?.rejected ?? '—'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase">Queue</p>
                            <p className="text-xl font-bold text-amber-500">{analytics?.today?.pending ?? '—'}</p>
                        </div>
                        <span className="flex items-center space-x-1.5 px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span>Live</span>
                        </span>
                    </div>
                </div>

                {/* Analytics View */}
                {viewMode === 'analytics' && (
                    <div className="flex-1 overflow-y-auto p-8">
                        <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900 mb-6 flex items-center">
                            <BarChart2 className="w-6 h-6 mr-2 text-blue-600"/> Performance Analytics
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Approved Today', value: analytics?.today?.approved ?? '—', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: <Check className="w-5 h-5 text-green-500"/> },
                                { label: 'Rejected Today', value: analytics?.today?.rejected ?? '—', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', icon: <X className="w-5 h-5 text-red-500"/> },
                                { label: 'Approved This Month', value: analytics?.month?.approved ?? '—', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <TrendingUp className="w-5 h-5 text-blue-500"/> },
                                { label: 'Rejected This Month', value: analytics?.month?.rejected ?? '—', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertTriangle className="w-5 h-5 text-orange-500"/> },
                            ].map((card, i) => (
                                <div key={i} className={`${card.bg} border ${card.border} rounded-[16px] p-5 shadow-sm`}>
                                    <div className="flex justify-between items-start mb-2">{card.icon}<span className="text-xs font-bold text-slate-500 uppercase tracking-wide text-right">{card.label}</span></div>
                                    <p className={`text-4xl font-bold ${card.color}`}>{card.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">14-Day Claims Activity</h3>
                                <div className="flex items-center space-x-4 text-xs font-semibold">
                                    <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded mr-1 inline-block"></span>Approved</span>
                                    <span className="flex items-center"><span className="w-3 h-3 bg-red-400 rounded mr-1 inline-block"></span>Rejected</span>
                                </div>
                            </div>
                            {analytics?.dailyChart ? <BarChart data={analytics.dailyChart} /> : <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Loading chart...</div>}
                        </div>
                        <div className="bg-slate-900 text-white rounded-[16px] p-6">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/>Current Day Summary</p>
                            <p className="text-lg font-bold mb-4">{analytics?.currentDate}</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-800 rounded-[12px] p-4 text-center"><p className="text-3xl font-bold text-green-400">{analytics?.today?.approved ?? 0}</p><p className="text-xs text-slate-400 mt-1">Approved</p></div>
                                <div className="bg-slate-800 rounded-[12px] p-4 text-center"><p className="text-3xl font-bold text-red-400">{analytics?.today?.rejected ?? 0}</p><p className="text-xs text-slate-400 mt-1">Rejected</p></div>
                                <div className="bg-slate-800 rounded-[12px] p-4 text-center"><p className="text-3xl font-bold text-amber-400">{analytics?.today?.pending ?? 0}</p><p className="text-xs text-slate-400 mt-1">Pending Review</p></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* History View */}
                {viewMode === 'history' && (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900 flex items-center">
                                <History className="w-6 h-6 mr-2 text-blue-600"/> Claim History
                            </h2>
                            <div className="relative w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search user or hospital..." 
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    onChange={(e) => {
                                        const term = e.target.value.toLowerCase();
                                        setHistory(history.map(h => ({ ...h, hidden: !(h.userId?.name?.toLowerCase().includes(term) || h.ocrData?.hospitalName?.toLowerCase().includes(term)) })));
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th onClick={() => requestSort('user')} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                            <div className="flex items-center">User <ArrowUpDown className="w-3 h-3 ml-1"/></div>
                                        </th>
                                        <th onClick={() => requestSort('hospital')} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                            <div className="flex items-center">Hospital <ArrowUpDown className="w-3 h-3 ml-1"/></div>
                                        </th>
                                        <th onClick={() => requestSort('status')} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                                            <div className="flex items-center">Status <ArrowUpDown className="w-3 h-3 ml-1"/></div>
                                        </th>
                                        <th onClick={() => requestSort('approvedAmount')} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right">
                                            <div className="flex items-center justify-end">Approved <ArrowUpDown className="w-3 h-3 ml-1"/></div>
                                        </th>
                                        <th onClick={() => requestSort('updatedAt')} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-right">
                                            <div className="flex items-center justify-end">Date <ArrowUpDown className="w-3 h-3 ml-1"/></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {getSortedHistory().filter(h => !h.hidden).map(item => (
                                        <React.Fragment key={item._id}>
                                            <tr 
                                                onClick={() => setExpandedHistoryId(expandedHistoryId === item._id ? null : item._id)}
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedHistoryId === item._id ? 'bg-blue-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-slate-900">{item.userId?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">{item.userId?.phone}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{item.ocrData?.hospitalName || item.hospitalId?.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">₹{item.approvedAmount || 0}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500 text-right">{new Date(item.updatedAt).toLocaleDateString()}</td>
                                            </tr>
                                            {expandedHistoryId === item._id && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan="5" className="px-8 py-6 border-b border-slate-200">
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Claim Details</h4>
                                                                <div className="space-y-2">
                                                                    <p className="text-sm text-slate-700"><strong>Type:</strong> {item.claimType || 'N/A'}</p>
                                                                    <p className="text-sm text-slate-700"><strong>Diagnosis:</strong> {item.ocrData?.diagnosis || 'N/A'}</p>
                                                                    <p className="text-sm text-slate-700"><strong>Policy ID:</strong> {item.policyId || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Decision Evidence</h4>
                                                                <div className="bg-white p-4 rounded-[12px] border border-slate-200">
                                                                    {item.riskBreakdown && item.riskBreakdown.filter(r => r.startsWith('Agent Note:')).map((note, nidx) => (
                                                                        <p key={nidx} className="text-sm text-slate-700 italic">"{note.replace('Agent Note: ', '')}"</p>
                                                                    ))}
                                                                    {(!item.riskBreakdown || !item.riskBreakdown.some(r => r.startsWith('Agent Note:'))) && (
                                                                        <p className="text-xs text-slate-400">No agent notes provided for this decision.</p>
                                                                    )}
                                                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Risk Score: {item.riskScore}/100</span>
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Decision Date: {new Date(item.updatedAt).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {history.filter(h => !h.hidden).length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-400">No records found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Claims / Policies View */}
                {(viewMode === 'claims' || viewMode === 'policies') && (
                    <div className="flex-1 flex overflow-hidden">
                        {/* List Pane */}
                        <div className="w-1/3 bg-white border-r border-slate-200 overflow-y-auto">
                            <div className="p-6 border-b border-slate-100 bg-slate-50 sticky top-0 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900 font-['Manrope']">{viewMode === 'claims' ? 'Pending Claims' : 'Pending Policies'}</h2>
                                <span className="px-2.5 py-1 bg-[#0052CC] text-white text-xs font-bold rounded-full">{viewMode === 'claims' ? claims.length : policies.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {viewMode === 'claims' ? claims.map(claim => (
                                    <div key={claim._id} onClick={() => { setSelectedClaim(claim); setClaimAmount(claim.ocrData?.billAmount || ''); setDecisionError(''); }} className={`p-5 cursor-pointer transition-colors ${selectedClaim?._id === claim._id ? 'bg-blue-50 border-l-4 border-[#0052CC]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-slate-900">{claim.userId?.name || 'Unknown'}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${claim.riskBand === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{claim.riskBand} RISK</span>
                                        </div>
                                        <p className="text-sm text-slate-600 truncate">{claim.ocrData?.hospitalName || claim.hospitalId?.name}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-sm font-semibold">₹{claim.ocrData?.billAmount}</p>
                                            <span className="text-xs text-slate-400">{new Date(claim.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )) : policies.map(p => (
                                    <div key={p.policy._id} onClick={() => setSelectedPolicy(p)} className={`p-5 cursor-pointer transition-colors ${selectedPolicy?.policy._id === p.policy._id ? 'bg-blue-50 border-l-4 border-[#0052CC]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-slate-900">{p.userName}</h3>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">PENDING</span>
                                        </div>
                                        <p className="text-sm text-slate-600 truncate">{p.policy.name}</p>
                                        <p className="text-sm font-semibold text-slate-500 mt-2">ID: {p.policy.policyId}</p>
                                    </div>
                                ))}
                                {viewMode === 'claims' && claims.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No pending claims</div>}
                                {viewMode === 'policies' && policies.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No pending policies</div>}
                            </div>
                        </div>

                        {/* Detail Pane */}
                        <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
                            {viewMode === 'claims' ? (
                                selectedClaim ? (
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900">Claim Details</h2>
                                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">ID: {selectedClaim._id}</span>
                                        </div>

                                        {/* Patient + Hospital info */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center"><FileText className="w-4 h-4 mr-1"/> OCR Data</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div><p className="text-slate-500 text-xs">Hospital</p><p className="font-medium">{selectedClaim.ocrData?.hospitalName || '—'}</p></div>
                                                    <div><p className="text-slate-500 text-xs">Diagnosis</p><p className="font-medium">{selectedClaim.ocrData?.diagnosis || '—'}</p></div>
                                                    <div><p className="text-slate-500 text-xs">OCR Amount</p><p className={`font-bold text-base ${selectedClaim.ocrData?.billAmount ? 'text-slate-900' : 'text-red-500'}`}>{selectedClaim.ocrData?.billAmount ? `₹${selectedClaim.ocrData.billAmount}` : 'Not extracted'}</p></div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center"><Users className="w-4 h-4 mr-1"/> Patient</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div><p className="text-slate-500 text-xs">Name</p><p className="font-medium">{selectedClaim.userId?.name}</p></div>
                                                    <div><p className="text-slate-500 text-xs">Phone</p><p className="font-medium">{selectedClaim.userId?.phone}</p></div>
                                                    <div><p className="text-slate-500 text-xs">Risk Profile</p><p className="font-medium">{selectedClaim.userId?.riskProfile || '—'}</p></div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center"><Activity className="w-4 h-4 mr-1"/> Hospital</h3>
                                                <div className="space-y-2 text-sm">
                                                    <div><p className="text-slate-500 text-xs">GST</p>{selectedClaim.hospitalId?.isGstVerified ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">VERIFIED</span> : <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">UNVERIFIED</span>}</div>
                                                    <div><p className="text-slate-500 text-xs">Registry</p>{selectedClaim.hospitalId?.isImaRegistered ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">REGISTERED</span> : <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">UNVERIFIED</span>}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Uploaded Documents */}
                                        <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><FileText className="w-4 h-4 mr-2"/> Uploaded Documents ({selectedClaim.documents?.length || 0})</h3>
                                            {selectedClaim.documents && selectedClaim.documents.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedClaim.documents.map((doc, i) => {
                                                        const ext = doc.filename?.split('.').pop()?.toLowerCase();
                                                        const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);
                                                        const isPdf = ext === 'pdf';
                                                        const url = `http://localhost:5001/uploads/${doc.filename}`;
                                                        return (
                                                            <div key={i} className="border border-slate-200 rounded-[12px] overflow-hidden bg-slate-50">
                                                                <div className="bg-slate-100 px-3 py-2 flex justify-between items-center">
                                                                    <span className="text-xs font-semibold text-slate-600 truncate">Doc {i + 1}: {doc.filename}</span>
                                                                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline ml-2 shrink-0">Open ↗</a>
                                                                </div>
                                                                {isImage ? (
                                                                    <img src={url} alt={`Document ${i+1}`} className="w-full max-h-52 object-contain p-2"/>
                                                                ) : isPdf ? (
                                                                    <iframe src={url} title={`PDF ${i+1}`} className="w-full h-52 border-0"/>
                                                                ) : (
                                                                    <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
                                                                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download {doc.filename}</a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-20 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-[12px]">No documents uploaded</div>
                                            )}
                                        </div>

                                        {/* AI Risk */}
                                        <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">AI Risk Score</h3>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-slate-600">Risk Score</span>
                                                <span className={`font-bold ${selectedClaim.riskScore > 65 ? 'text-red-600' : 'text-amber-600'}`}>{selectedClaim.riskScore}/100</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                                                <div className={`h-2 rounded-full ${selectedClaim.riskScore > 65 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(selectedClaim.riskScore || 0, 100)}%` }}></div>
                                            </div>
                                            <ul className="space-y-1 text-sm">
                                                {selectedClaim.riskBreakdown?.map((r, i) => <li key={i} className="flex items-start bg-slate-50 p-2 rounded-[8px] text-xs"><ShieldAlert className="w-3 h-3 mr-2 mt-0.5 text-slate-400 shrink-0"/>{r}</li>)}
                                            </ul>
                                        </div>

                                        {/* Decision Panel */}
                                        <div className="bg-white p-6 rounded-[16px] border-2 border-blue-100 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center"><FileSignature className="w-4 h-4 mr-2 text-blue-600"/> Agent Decision Panel</h3>
                                            {decisionError && <p className="text-red-500 text-xs mb-3 font-semibold bg-red-50 px-3 py-2 rounded-[8px]">{decisionError}</p>}

                                            {/* Editable Approved Amount */}
                                            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-[12px]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <label className="block text-sm font-bold text-amber-800 mb-1">✏️ Approved Amount</label>
                                                        <p className="text-xs text-amber-600">OCR extracted: <strong>{selectedClaim.ocrData?.billAmount ? `₹${selectedClaim.ocrData.billAmount.toLocaleString()}` : 'Not extracted'}</strong></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Policy Balance</p>
                                                        <p className={`text-sm font-bold ${((selectedClaim.userId?.policies?.find(p => p.policyId === selectedClaim.policyId)?.totalCover || 0) - (selectedClaim.userId?.policies?.find(p => p.policyId === selectedClaim.policyId)?.usedCover || 0)) < Number(claimAmount) ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                                                            ₹{((selectedClaim.userId?.policies?.find(p => p.policyId === selectedClaim.policyId)?.totalCover || 0) - (selectedClaim.userId?.policies?.find(p => p.policyId === selectedClaim.policyId)?.usedCover || 0)).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-slate-600 font-bold mr-2 text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Enter verified bill amount"
                                                        className="flex-1 px-4 py-2 rounded-[10px] border-2 border-amber-300 focus:outline-none focus:border-blue-500 text-sm font-semibold"
                                                        value={claimAmount}
                                                        onChange={e => setClaimAmount(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <textarea className="w-full px-4 py-3 rounded-[12px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 mb-4 text-sm" rows="2" placeholder="Notes for audit log (mandatory for reject/hold)..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
                                            <div className="flex space-x-3">
                                                <button onClick={() => handleDecision('APPROVED')} disabled={loading} className="flex-1 flex items-center justify-center py-3 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-md"><Check className="w-5 h-5 mr-2"/> Approve ₹{claimAmount || '?'}</button>
                                                <button onClick={() => handleDecision('REQUEST_INFO')} disabled={loading} className="flex items-center justify-center px-4 py-3 bg-amber-50 text-amber-700 rounded-[12px] font-semibold hover:bg-amber-100 disabled:opacity-50 border border-amber-200"><Info className="w-5 h-5 mr-1"/> Hold</button>
                                                <button onClick={() => handleDecision('REJECTED')} disabled={loading} className="flex items-center justify-center px-4 py-3 bg-red-50 text-red-700 rounded-[12px] font-semibold hover:bg-red-100 disabled:opacity-50 border border-red-200"><X className="w-5 h-5 mr-1"/> Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : <div className="h-full flex items-center justify-center text-slate-400 font-medium">Select a claim to review</div>
                            ) : (
                                selectedPolicy ? (
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900">Policy Verification</h2>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm space-y-4">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center"><Users className="w-4 h-4 mr-2"/> User</h3>
                                                <div><p className="text-slate-500 text-sm mb-1">Name</p><p className="font-medium">{selectedPolicy.userName}</p></div>
                                                <div><p className="text-slate-500 text-sm mb-1">Phone</p><p className="font-medium">{selectedPolicy.userPhone}</p></div>
                                            </div>
                                            <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm space-y-4">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center"><FileText className="w-4 h-4 mr-2"/> Policy</h3>
                                                <div><p className="text-slate-500 text-sm mb-1">Name</p><p className="font-medium">{selectedPolicy.policy.name}</p></div>
                                                <div><p className="text-slate-500 text-sm mb-1">Policy ID</p><p className="font-medium text-[#0052CC]">{selectedPolicy.policy.policyId}</p></div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Document Proof</h3>
                                            {selectedPolicy.policy.documentUrl ? (
                                                <img src={`http://localhost:5001/uploads/${selectedPolicy.policy.documentUrl}`} alt="Policy Document" className="w-full max-h-96 object-contain border border-slate-200 rounded-lg"/>
                                            ) : (
                                                <div className="h-48 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400">No document uploaded</div>
                                            )}
                                        </div>
                                        <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center"><FileSignature className="w-4 h-4 mr-2"/> Agent Decision</h3>
                                            {decisionError && <p className="text-red-500 text-xs mb-2 font-semibold">{decisionError}</p>}
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Total Coverage Amount</label>
                                            <input type="number" placeholder="e.g. 500000" className="w-full px-4 py-3 rounded-[12px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 text-sm mb-4" value={policyAmount} onChange={e => setPolicyAmount(e.target.value)}/>
                                            <div className="flex space-x-4">
                                                <button onClick={() => handlePolicyDecision('ACTIVE')} disabled={loading} className="flex-1 flex items-center justify-center py-3 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 disabled:opacity-50"><Check className="w-5 h-5 mr-2"/> Approve & Activate</button>
                                                <button onClick={() => handlePolicyDecision('REJECTED')} disabled={loading} className="flex-1 flex items-center justify-center py-3 bg-red-50 text-red-700 rounded-[12px] font-semibold hover:bg-red-100 disabled:opacity-50 border border-red-200"><X className="w-5 h-5 mr-2"/> Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : <div className="h-full flex items-center justify-center text-slate-400 font-medium">Select a policy to verify</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentDashboard;
