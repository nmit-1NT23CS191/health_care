import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserClaims, createClaim, uploadClaimDocument, triggerAiAnalysis, updateUserPolicy, deleteUserPolicy, getUserProfile } from '../services/api';
import { UploadCloud, FileText, Activity, LogOut, CheckCircle, Clock, Search, ShieldAlert, ArrowRight, ShieldCheck, FileCheck, CheckSquare, RefreshCw, X, Trash2, History } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

const UserDashboard = () => {
    const { t } = useLanguage();
    const [claims, setClaims] = useState([]);
    const [step, setStep] = useState(() => {
        const saved = localStorage.getItem('user_claim_step');
        return saved !== null ? parseInt(saved) : 0;
    }); // 0: List, 1: Auth Gate, 2: Claim Type, 3: Hospital, 4: Upload, 5: Processing, 6: Results
    
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const navigate = useNavigate();

    // Form States
    const [auth, setAuth] = useState({ policyNumber: '', dob: '', otpSent: false, otp: '', verified: false });
    const [claimType, setClaimType] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [currentClaimId, setCurrentClaimId] = useState(() => localStorage.getItem('user_current_claim_id'));
    const [files, setFiles] = useState([]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: 'Good Morning', icon: '☀️' };
        if (hour < 17) return { text: 'Good Afternoon', icon: '🌤️' };
        return { text: 'Good Evening', icon: '🌙' };
    };

    useEffect(() => {
        localStorage.setItem('user_claim_step', step);
    }, [step]);

    useEffect(() => {
        if (currentClaimId) localStorage.setItem('user_current_claim_id', currentClaimId);
        else localStorage.removeItem('user_current_claim_id');
    }, [currentClaimId]);
    
    // UI States
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [analysisStage, setAnalysisStage] = useState(0);
    const [processedClaim, setProcessedClaim] = useState(null);
    const [userPolicies, setUserPolicies] = useState(user.policies || []);
    const [isAddingPolicy, setIsAddingPolicy] = useState(false);
    const [policyNameInput, setPolicyNameInput] = useState('');
    const [policyIdInput, setPolicyIdInput] = useState('');
    const [policyFile, setPolicyFile] = useState(null);
    const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(user.policies?.length > 0 ? 0 : -1);

    useEffect(() => {
        if (!user.id) {
            navigate('/login');
            return;
        }
        loadUserProfile();
        loadClaims();

        // Poll every 5 seconds so agent-approved policies reflect instantly
        const interval = setInterval(() => {
            loadUserProfile();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadUserProfile = async () => {
        try {
            const data = await getUserProfile(user.id);
            setUser(data);
            setUserPolicies(data.policies || []);
            localStorage.setItem('user', JSON.stringify(data));
            // Auto-select first policy if none selected yet
            if (data.policies?.length > 0) {
                setSelectedPolicyIndex(prev => prev === -1 ? 0 : prev);
            }
        } catch (err) {
            console.error('Failed to load user profile');
        }
    };

    const loadClaims = async () => {
        try {
            const data = await getUserClaims(user.id);
            setClaims(data);
        } catch (err) {
            console.error('Failed to load claims');
        }
    };

    const handleDeletePolicy = async (policyId) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) return;
        try {
            const res = await deleteUserPolicy(user.id, policyId);
            setUserPolicies(res.user.policies);
            const updatedUser = { ...user, policies: res.user.policies };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            if (res.user.policies.length === 0) setSelectedPolicyIndex(-1);
            else setSelectedPolicyIndex(0);
        } catch (err) {
            setError('Failed to delete policy');
        }
    };

    const handleAddPolicy = async () => {
        if (!policyNameInput || !policyIdInput) return setError('Please enter both Policy Name and ID');
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('name', policyNameInput);
            formData.append('policyId', policyIdInput);
            if (policyFile) {
                formData.append('policyDoc', policyFile);
            }

            const res = await updateUserPolicy(user.id, formData);
            setUserPolicies(res.user.policies);
            
            const updatedUser = { ...user, policies: res.user.policies };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            if (res.user.policies.length > 0) {
                setSelectedPolicyIndex(res.user.policies.length - 1);
            }

            setIsAddingPolicy(false);
            setPolicyNameInput('');
            setPolicyIdInput('');
            setPolicyFile(null);
            setPolicyAmountInput(500000);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add policy');
        } finally {
            setUploading(false);
        }
    };

    const handleSendOTP = () => {
        if (!auth.policyNumber || !auth.dob) return setError('Enter Policy Number and DOB');
        
        // Verify policy exists before sending OTP
        const policyExists = userPolicies.some(p => p.policyId === auth.policyNumber);
        if (!policyExists) return setError('The Policy ID you entered is not correct or not linked to your account. Please link it from the dashboard.');
        
        setError('');
        setAuth({ ...auth, otpSent: true });
    };

    const handleVerifyOTP = () => {
        const birthYear = auth.dob ? new Date(auth.dob).getFullYear().toString() : '';
        if (auth.otp !== birthYear) return setError('Invalid OTP. Please try again.');
        
        const policy = userPolicies.find(p => p.policyId === auth.policyNumber);
        if (!policy) return setError('This policy ID is not linked to your account. Please link it first on the dashboard.');
        if (policy.status === 'PENDING') return setError('This policy is pending verification by an agent. You cannot file claims against it yet.');
        if (policy.status === 'REJECTED') return setError('This policy document was rejected. Please upload a valid document.');

        
        setError('');
        setAuth({ ...auth, verified: true });
        setStep(2);
    };

    const getChecklist = () => {
        switch(claimType) {
            case 'Accident': return ['FIR Copy', 'MLC Report', 'Hospital Bill', 'Discharge Summary'];
            case 'Surgery': return ['OT Notes', 'Surgeon Bill', 'Implant Invoices', 'Discharge Summary'];
            case 'Chronic Illness': return ['Prescriptions', 'Diagnostic Reports', 'Consultation Bills'];
            default: return ['Hospital Bill', 'Discharge Summary', 'Diagnostic Reports'];
        }
    };

    const handleCreateDraft = async () => {
        if (!hospitalName || !diagnosis) return setError('Please fill all fields');
        setUploading(true);
        setError('');
        try {
            const res = await createClaim(hospitalName, diagnosis, claimType, auth.policyNumber);
            setCurrentClaimId(res.claim._id);
            setStep(4);
        } catch (err) {
            console.error(err.response?.data);
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create draft');
        } finally {
            setUploading(false);
        }
    };

    const handleLoadDemoData = () => {
        const demoFile = new File(["dummy content"], "demo_hospital_bill.pdf", { type: "application/pdf" });
        const demoFile2 = new File(["dummy content 2"], "demo_lab_report.pdf", { type: "application/pdf" });
        setFiles([demoFile, demoFile2]);
    };

    const handleFileUpload = async () => {
        if (files.length === 0 || !currentClaimId) return setError('Please select files');
        setUploading(true);
        setError('');
        const formData = new FormData();
        files.forEach(file => {
            formData.append('documents', file);
        });

        try {
            await uploadClaimDocument(currentClaimId, formData);
            setStep(5);
            runAiAnalysis(currentClaimId);
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
            setUploading(false);
        }
    };

    const runAiAnalysis = async (claimId) => {
        const stages = [
            'Extracting text via OCR...',
            'Matching Entities (spaCy NLP)...',
            'Running Policy Validity Checks...',
            'Detecting Duplicate Bills & Fraud...'
        ];
        
        for (let i = 0; i < stages.length; i++) {
            setAnalysisStage(i);
            await new Promise(res => setTimeout(res, 1500));
        }

        try {
            const res = await triggerAiAnalysis(claimId);
            setProcessedClaim(res.claim);
            setStep(6);
            loadClaims();
        } catch (err) {
            setError('AI Analysis failed. Please contact support.');
            setStep(0);
        } finally {
            setUploading(false);
        }
    };

    const renderPlainLanguageError = (reason) => {
        if (!reason) return reason;
        const map = {
            'HIGH_VELOCITY': 'Too many claims filed in a short period — possible abuse detected.',
            'DOCUMENT_TAMPERING': 'Document metadata shows signs of tampering or editing.',
            'HOSPITAL_MISMATCH': 'Hospital names across uploaded documents do not match.',
            'LOW_OCR_CONFIDENCE': 'Document image quality is poor — text could not be extracted clearly.',
            'GST_INVALID': 'Hospital GST registration could not be verified.',
            'REGISTRY_UNVERIFIED': 'Hospital is not listed in IMA/NHA medical registry.',
            'ADMISSION_UNCONFIRMED': 'Hospital admission could not be independently confirmed.',
        };
        for (const key in map) {
            if (reason.toUpperCase().includes(key)) return map[key];
        }
        return reason;
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const resetForm = () => {
        setAuth({ policyNumber: '', dob: '', otpSent: false, otp: '', verified: false });
        setClaimType('');
        setHospitalName('');
        setDiagnosis('');
        setFiles([]);
        setCurrentClaimId(null);
        setProcessedClaim(null);
        setError('');
    };

    const renderProgressBar = (status) => {
        const stages = ['SUBMITTED', 'ANALYZING', 'VERIFYING', 'PENDING_AGENT', 'APPROVED'];
        let currentIndex = stages.indexOf(status);
        if (status === 'REJECTED') currentIndex = 4;
        
        return (
            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${status === 'REJECTED' ? 'bg-red-500' : 'bg-[#0052CC]'}`} 
                    style={{ width: `${Math.max(10, ((currentIndex + 1) / stages.length) * 100)}%` }}
                ></div>
            </div>
        );
    };


    return (
        <div className="flex h-screen mesh-gradient flex-col font-['Manrope'] overflow-hidden">
            <Navbar userName={user.name} />
            <div className="flex flex-1 overflow-hidden p-6 gap-6">
                {/* Sidebar */}
                <div className="w-80 glass-card rounded-[32px] p-8 flex flex-col shadow-2xl animate-fade-in-up">
                    <div className="flex-1 space-y-4 mt-4">
                        <button onClick={() => setStep(0)} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-[20px] font-bold transition-all hover-3d ${step === 0 ? 'bg-[#0052CC] text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-white/50'}`}>
                            <FileText className="w-5 h-5" />
                            <span>{t('Dashboard', 'डैशबोर्ड')}</span>
                        </button>
                        <button onClick={() => { resetForm(); setStep(1); }} className={`w-full flex items-center space-x-4 px-6 py-4 rounded-[20px] font-bold transition-all hover-3d ${step !== 0 && step !== 6 ? 'bg-[#0052CC] text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-white/50'}`}>
                            <UploadCloud className="w-5 h-5" />
                            <span>{t('New Claim', 'नया दावा')}</span>
                        </button>
                    </div>

                    <div className="pt-8 border-t border-slate-200/50">
                        <div className="mb-6">
                            <p className="text-lg font-black text-slate-900 tracking-tight">{user.name}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">KYC: {user.kycStatus || 'UNVERIFIED'}</p>
                        </div>
                        <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 transition-all font-bold text-sm hover:translate-x-1">
                            <LogOut className="w-5 h-5" />
                            <span>{t('Sign Out', 'साइन आउट')}</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 glass-card rounded-[32px] overflow-auto p-10 relative shadow-2xl animate-fade-in-up stagger-1">
                    <div className="max-w-4xl mx-auto">
                        
                        {step === 0 && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex justify-between items-center animate-fade-in-up">
                                    <div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">{getGreeting().icon} {getGreeting().text}</p>
                                        <h1 className="text-4xl font-black font-['Manrope'] gradient-text tracking-tight">{t('Dashboard', 'डैशबोर्ड')}</h1>
                                    </div>
                                    <button onClick={() => { resetForm(); setStep(1); }} className="px-6 py-4 bg-gradient-to-r from-[#0052CC] to-[#0EA5E9] text-white rounded-[20px] font-bold hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 shadow-lg shadow-blue-500/20">
                                        + {t('New Claim', 'नया दावा')}
                                     </button>
                                 </div>
                                
                                {/* Eligibility & Cover Overview */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up stagger-1">
                                    <div className="bg-white p-7 rounded-[24px] border border-slate-200 shadow-sm min-h-[180px] hover-3d">
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-[#0052CC]"/> Eligibility & Cover Overview</h2>
                                        
                                        {selectedPolicyIndex >= 0 && userPolicies[selectedPolicyIndex] ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between text-sm font-medium">
                                                    <span className="text-slate-500">Total Cover ({userPolicies[selectedPolicyIndex].name})</span>
                                                    <span className="text-slate-900 font-bold">
                                                        {userPolicies[selectedPolicyIndex].status === 'PENDING' ? 'Pending Verification' : `₹${userPolicies[selectedPolicyIndex].totalCover?.toLocaleString()}`}
                                                    </span>
                                                </div>
                                                {userPolicies[selectedPolicyIndex].status === 'PENDING' ? (
                                                    <div className="w-full bg-amber-50 rounded-lg p-3 border border-amber-200">
                                                        <p className="text-xs text-amber-700 font-medium">Your policy is currently under review by an agent. Claims cannot be filed until verification is complete.</p>
                                                    </div>
                                                ) : userPolicies[selectedPolicyIndex].status === 'REJECTED' ? (
                                                    <div className="w-full bg-red-50 rounded-lg p-3 border border-red-200">
                                                        <p className="text-xs text-red-700 font-medium">This policy document was rejected by verification agents. Please delete and upload a valid document.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-full bg-slate-100 rounded-full h-3">
                                                            <div 
                                                                className="bg-[#0052CC] h-3 rounded-full transition-all duration-1000" 
                                                                style={{ width: `${Math.min(100, (userPolicies[selectedPolicyIndex].usedCover / userPolicies[selectedPolicyIndex].totalCover) * 100 || 0)}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between text-xs pt-1">
                                                            <span className="text-slate-500">Used: ₹{userPolicies[selectedPolicyIndex].usedCover?.toLocaleString()}</span>
                                                            <span className="font-bold text-green-600">Available: ₹{(userPolicies[selectedPolicyIndex].totalCover - userPolicies[selectedPolicyIndex].usedCover)?.toLocaleString()}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 rounded-lg">
                                                <p className="text-slate-400 text-sm italic">Select a policy to view coverage</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Active Policies */}
                                    <div className="bg-white p-7 rounded-[24px] border border-slate-200 shadow-sm min-h-[180px] flex flex-col hover-lift">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-lg font-bold text-slate-800 flex items-center"><FileCheck className="w-5 h-5 mr-2 text-[#0052CC]"/> My Policies</h2>
                                            {userPolicies.length > 0 && !isAddingPolicy && (
                                                <button onClick={() => setIsAddingPolicy(true)} className="text-[10px] font-bold text-[#0052CC] hover:underline">+ ADD MORE</button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
                                            {userPolicies.length > 0 ? (
                                                userPolicies.map((p, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setSelectedPolicyIndex(idx)}
                                                        className={`p-4 border rounded-[16px] cursor-pointer transition-all relative group hover-lift ${selectedPolicyIndex === idx ? 'bg-blue-50 border-[#0052CC] ring-2 ring-blue-100 shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200'}`}
                                                    >
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeletePolicy(p._id); }}
                                                            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="flex justify-between items-start mb-1 pr-6">
                                                            <span className="font-bold text-slate-900 text-sm">{p.name || 'Untitled Policy'}</span>
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {p.status || 'PENDING'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">ID: {p.policyId}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                !isAddingPolicy && (
                                                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[12px] p-4 text-center">
                                                        <p className="text-[11px] text-slate-500 mb-2">No active policies found.</p>
                                                        <button 
                                                            onClick={() => setIsAddingPolicy(true)}
                                                            className="px-4 py-2 bg-[#0052CC] text-white text-xs font-bold rounded-[8px] hover:bg-blue-800 transition-colors shadow-sm"
                                                        >
                                                            + ADD POLICY
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isAddingPolicy && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-[12px] p-3 space-y-2">
                                                    <div className="space-y-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Policy Name"
                                                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                                                            value={policyNameInput}
                                                            onChange={(e) => setPolicyNameInput(e.target.value)}
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Policy ID"
                                                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                                                            value={policyIdInput}
                                                            onChange={(e) => setPolicyIdInput(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="relative">
                                                        <input 
                                                            type="file" 
                                                            id="policyDoc"
                                                            className="hidden"
                                                            onChange={(e) => setPolicyFile(e.target.files[0])}
                                                        />
                                                        <label 
                                                            htmlFor="policyDoc"
                                                            className={`w-full flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-md cursor-pointer transition-colors ${policyFile ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            <UploadCloud className="w-5 h-5 mb-1" />
                                                            <span className="text-[10px] font-bold uppercase">{policyFile ? policyFile.name : 'Upload Policy Document (Proof)'}</span>
                                                        </label>
                                                    </div>

                                                    <div className="flex space-x-2 pt-1">
                                                        <button 
                                                            onClick={handleAddPolicy} 
                                                            disabled={uploading}
                                                            className="flex-1 py-2 bg-[#0052CC] text-white text-[10px] font-bold rounded shadow-sm disabled:opacity-50"
                                                        >
                                                            {uploading ? 'SAVING...' : 'CONFIRM & SAVE'}
                                                        </button>
                                                        <button onClick={() => setIsAddingPolicy(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">CANCEL</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-fade-in-up stagger-2">
                                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center">
                                        <History className="w-6 h-6 mr-3 text-[#0052CC]" />
                                        {t('Claim History', 'दावा इतिहास')}
                                    </h2>
                                    {claims.length === 0 ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-28 bg-white/50 rounded-[24px] border border-slate-100 shimmer"></div>
                                            ))}
                                            <div className="text-slate-400 text-center py-20 bg-white rounded-[24px] border border-slate-200 shadow-sm italic">No claims found. Start by creating a new claim.</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {claims.map((claim, idx) => (
                                                <div key={claim._id} className={`bg-white p-7 rounded-[24px] border border-slate-200 flex flex-col shadow-sm hover-lift animate-fade-in-up stagger-${(idx % 3) + 1}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                                                                {new Date(claim.createdAt).toLocaleDateString()}
                                                            </p>
                                                            <h3 className="font-bold text-slate-900 text-xl">{claim.ocrData?.hospitalName || 'Pending OCR'}</h3>
                                                            <p className="text-slate-600 text-sm mt-1 flex items-center">
                                                                <Search className="w-3 h-3 mr-1" /> {claim.claimType || 'Other'} • {claim.ocrData?.diagnosis || 'Pending'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-2xl text-[#0052CC] mb-2">₹{claim.approvedAmount || claim.ocrData?.billAmount || 0}</p>
                                                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border ${claim.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : claim.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                {claim.status === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> : claim.status === 'REJECTED' ? <ShieldAlert className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                                <span>{claim.status.replace('_', ' ')}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {renderProgressBar(claim.status)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="max-w-md mx-auto bg-white p-8 rounded-[16px] shadow-sm border border-slate-200 animate-fade-in mt-10">
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-blue-50 text-[#0052CC] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-bold font-['Manrope'] text-slate-900">Secure Policy Gate</h2>
                                    <p className="text-sm text-slate-500 mt-1">Authenticate to link your policy</p>
                                </div>
                                
                                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-[12px] text-sm text-center font-medium">{error}</div>}
                                
                                {!auth.otpSent ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Policy Number</label>
                                            <input 
                                                type="text" 
                                                value={auth.policyNumber}
                                                onChange={e => setAuth({...auth, policyNumber: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC]"
                                                placeholder="e.g. POL-12345"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Patient DOB</label>
                                            <input 
                                                type="date" 
                                                value={auth.dob}
                                                onChange={e => setAuth({...auth, dob: e.target.value})}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC]"
                                            />
                                        </div>
                                        <button onClick={handleSendOTP} className="w-full py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors mt-6">
                                            Send OTP
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-center">
                                        <p className="text-sm text-slate-600 mb-4">Enter the 4-digit OTP sent to your registered mobile number.</p>
                                        <input 
                                            type="text" 
                                            maxLength="4"
                                            value={auth.otp}
                                            onChange={e => setAuth({...auth, otp: e.target.value})}
                                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                                            className="w-32 px-4 py-3 text-center text-2xl tracking-widest bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] mx-auto block"
                                            placeholder="••••"
                                            autoFocus
                                        />
                                        <button onClick={handleVerifyOTP} className="w-full py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors mt-6">
                                            Verify & Proceed
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="max-w-xl mx-auto bg-white p-8 rounded-[16px] shadow-sm border border-slate-200 animate-fade-in mt-10">
                                <h2 className="text-2xl font-bold font-['Manrope'] mb-6 text-slate-900">Select Claim Type</h2>
                                <p className="text-slate-600 mb-6 text-sm">Help us generate the correct document checklist for your claim.</p>
                                
                                <div className="space-y-3 mb-8">
                                    {['Accident', 'Surgery', 'Chronic Illness', 'General Consultation'].map(type => (
                                        <label key={type} onKeyDown={(e) => e.key === 'Enter' && setStep(3)} tabIndex="0" className={`flex items-center p-4 border rounded-[12px] cursor-pointer transition-colors ${claimType === type ? 'border-[#0052CC] bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="radio" name="claimType" className="w-4 h-4 text-[#0052CC] focus:ring-[#0052CC]" checked={claimType === type} onChange={() => setClaimType(type)} />
                                            <span className="ml-3 font-medium text-slate-800">{type}</span>
                                        </label>
                                    ))}
                                </div>
                                
                                {claimType && (
                                    <div className="p-5 bg-slate-50 rounded-[12px] border border-slate-100 mb-6">
                                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center"><CheckSquare className="w-4 h-4 mr-2 text-[#0052CC]"/> Required Documents Checklist</h3>
                                        <ul className="space-y-2">
                                            {getChecklist().map((item, i) => (
                                                <li key={i} className="text-sm text-slate-600 flex items-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#0052CC] before:rounded-full before:mr-2">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button onClick={() => setStep(3)} disabled={!claimType} className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50">
                                    <span>Continue</span>
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="max-w-xl mx-auto bg-white p-8 rounded-[16px] shadow-sm border border-slate-200 animate-fade-in mt-10">
                                <h2 className="text-2xl font-bold font-['Manrope'] mb-6 text-slate-900">Hospital Details</h2>
                                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-[12px] text-sm font-medium">{error}</div>}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Hospital Name</label>
                                        <input 
                                            type="text" 
                                            value={hospitalName}
                                            onChange={(e) => setHospitalName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-all"
                                            placeholder="e.g. Apollo Hospitals"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Diagnosis</label>
                                        <input 
                                            type="text" 
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-all"
                                            placeholder="e.g. Dengue Fever"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCreateDraft}
                                        disabled={uploading}
                                        className="w-full flex items-center justify-center space-x-2 py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-70 mt-6"
                                    >
                                        <span>{uploading ? 'Processing...' : 'Continue to Upload'}</span>
                                        {!uploading && <ArrowRight className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="max-w-xl mx-auto bg-white p-8 rounded-[16px] shadow-sm border border-slate-200 animate-fade-in mt-10">
                                <h2 className="text-2xl font-bold font-['Manrope'] mb-2 text-slate-900">Smart Document Upload</h2>
                                <p className="text-slate-600 mb-6 text-sm">Verified Policy: <span className="font-bold text-slate-800">{auth.policyNumber}</span></p>
                                
                                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-[12px] text-sm font-medium">{error}</div>}
                                
                                <div>
                                    <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-[16px] cursor-pointer hover:border-[#0052CC] hover:bg-blue-50 transition-colors mb-4 relative overflow-hidden group ${files.length > 0 ? 'h-32' : 'h-48'}`}>
                                        <UploadCloud className={`text-[#0052CC] mb-2 group-hover:scale-110 transition-transform ${files.length > 0 ? 'w-8 h-8' : 'w-10 h-10'}`} />
                                        <span className="text-sm text-slate-600 font-semibold mb-1">{files.length > 0 ? 'Upload more files' : 'Click to browse or drag and drop'}</span>
                                        <span className="text-xs text-slate-400">PNG, JPG, PDF up to 10MB</span>
                                        <input type="file" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} accept="image/*,.pdf" />
                                    </label>

                                    {files.length > 0 && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-[12px] p-4 mb-4 max-h-48 overflow-y-auto">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selected Files ({files.length})</h4>
                                            <ul className="space-y-2">
                                                {files.map((f, idx) => (
                                                    <li key={idx} className="flex items-center justify-between bg-white p-3 rounded-[8px] border border-slate-100 shadow-sm">
                                                        <div className="flex items-center overflow-hidden">
                                                            <FileCheck className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                                                            <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                                            className="text-red-400 hover:text-red-600 ml-3"
                                                            title="Remove file"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-center mb-8">
                                    <button onClick={handleLoadDemoData} className="text-xs font-semibold text-[#0052CC] hover:underline bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                        ⚡ Load Demo Data (Hackathon Mode)
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={handleFileUpload}
                                    disabled={files.length === 0 || uploading}
                                    className="w-full flex items-center justify-center py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {uploading ? 'Uploading...' : 'Submit & Run AI Analysis'}
                                </button>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="max-w-xl mx-auto bg-white p-12 rounded-[32px] shadow-xl border border-slate-200 text-center animate-fade-in-up mt-10">
                                <div className="relative w-28 h-28 mx-auto mb-8 shimmer rounded-full p-1 shadow-lg shadow-blue-500/10">
                                    <div className="absolute inset-0 border-4 border-slate-50 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[#0052CC] rounded-full border-t-transparent animate-spin"></div>
                                    <Activity className="absolute inset-0 m-auto w-12 h-12 text-[#0052CC] animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-bold font-['Manrope'] mb-4 text-slate-900">Analyzing your claim...</h2>
                                <div className="h-6">
                                    <p className="text-[#0052CC] font-semibold text-sm animate-pulse">
                                        {['Extracting text via OCR...', 'Matching Entities (spaCy NLP)...', 'Running Policy Validity Checks...', 'Detecting Duplicate Bills & Fraud...'][analysisStage]}
                                    </p>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-8">
                                    <div className="bg-[#0052CC] h-1.5 rounded-full transition-all duration-500" style={{ width: `${((analysisStage + 1) / 4) * 100}%` }}></div>
                                </div>
                            </div>
                        )}

                        {step === 6 && processedClaim && (
                            <div className="max-w-3xl mx-auto animate-fade-in pb-10 relative overflow-hidden">
                                {/* Confetti Rain */}
                                <div className="confetti confetti-1"></div>
                                <div className="confetti confetti-2"></div>
                                <div className="confetti confetti-3"></div>
                                <div className="confetti confetti-4"></div>
                                <div className="confetti confetti-5"></div>
                                <div className="confetti confetti-1" style={{animationDelay: '1.2s'}}></div>
                                <div className="confetti confetti-3" style={{animationDelay: '1.5s'}}></div>
                                
                                <div className="text-center mb-8 relative z-10">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h1 className="text-3xl font-bold font-['Manrope'] text-slate-900">AI Analysis Complete</h1>
                                    <p className="text-slate-500 mt-2">Your claim has been processed by VeraClaim AI.</p>
                                </div>

                                <div className="bg-white rounded-[16px] shadow-sm border border-slate-200 overflow-hidden mb-6">
                                    <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
                                        <div className="flex items-center space-x-10 relative z-10">
                                            {/* Circular Meter */}
                                            <div className="relative w-32 h-32">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                                                    <circle 
                                                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                        strokeDasharray={364.4}
                                                        strokeDashoffset={364.4 - (364.4 * (100 - (processedClaim.riskScore || 0))) / 100}
                                                        className={`transition-all duration-1000 ease-out ${
                                                            (processedClaim.riskScore ?? 50) < 40 ? 'text-green-400' 
                                                            : (processedClaim.riskScore ?? 50) < 70 ? 'text-amber-400' 
                                                            : 'text-red-400'
                                                        }`}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-black">{100 - (processedClaim.riskScore || 0)}%</span>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">AI Approval Probability</p>
                                                <h3 className="text-2xl font-black text-white">VeraScore™ Analysis</h3>
                                                {processedClaim.riskBand && (
                                                    <span className={`inline-block mt-3 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                                                        processedClaim.riskBand === 'LOW' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        : processedClaim.riskBand === 'MEDIUM' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                        : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                    }`}>
                                                        {processedClaim.riskBand} RISK LEVEL
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right relative z-10">
                                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Risk Factor</p>
                                            <p className="text-4xl font-black text-white">{processedClaim.riskScore || 0}<span className="text-lg text-slate-500">/100</span></p>
                                            <div className="mt-4 pt-4 border-t border-slate-800">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bill Extracted</p>
                                                <p className="text-xl font-black text-blue-400">₹{processedClaim.ocrData?.billAmount?.toLocaleString() || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Analysis Breakdown</h3>
                                        {processedClaim.riskBreakdown && processedClaim.riskBreakdown.length > 0 ? (
                                            <ul className="space-y-3">
                                                {processedClaim.riskBreakdown.map((reason, idx) => (
                                                    <li key={idx} className="flex items-start p-3 bg-red-50 text-red-700 rounded-[8px] text-sm font-medium border border-red-100">
                                                        <ShieldAlert className="w-5 h-5 mr-3 shrink-0" />
                                                        {renderPlainLanguageError(reason)}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex items-center p-4 bg-green-50 text-green-700 rounded-[8px] text-sm font-medium border border-green-100">
                                                <CheckCircle className="w-5 h-5 mr-3" />
                                                All documents look perfect! Your claim is highly likely to be auto-approved.
                                            </div>
                                        )}
                                        <div className="mt-4 p-3 bg-blue-50 rounded-[8px] border border-blue-100 text-sm text-blue-700">
                                            <strong>Status:</strong> {processedClaim.status?.replace('_', ' ')} — {
                                                processedClaim.status === 'APPROVED' 
                                                    ? 'Your claim has been auto-approved! Payment will be released shortly.'
                                                    : 'An agent will review your claim and make a final decision.'
                                            }
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => { resetForm(); setStep(0); }} className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-[12px] font-bold hover:bg-slate-50 transition-colors shadow-sm">
                                    Return to Dashboard
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
