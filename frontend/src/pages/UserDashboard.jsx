import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserClaims, createClaim, uploadClaimDocument, triggerAiAnalysis } from '../services/api';
import { UploadCloud, FileText, Activity, LogOut, CheckCircle, Clock, Search, ShieldAlert, ArrowRight, ShieldCheck, FileCheck, CheckSquare, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

const UserDashboard = () => {
    const { t } = useLanguage();
    const [claims, setClaims] = useState([]);
    const [step, setStep] = useState(0); // 0: List, 1: Auth Gate, 2: Claim Type, 3: Hospital, 4: Upload, 5: Processing, 6: Results
    
    // Form States
    const [auth, setAuth] = useState({ policyNumber: '', dob: '', otpSent: false, otp: '', verified: false });
    const [claimType, setClaimType] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [currentClaimId, setCurrentClaimId] = useState(null);
    const [file, setFile] = useState(null);
    
    // UI States
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [analysisStage, setAnalysisStage] = useState(0);
    const [processedClaim, setProcessedClaim] = useState(null);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user.id) {
            navigate('/login');
            return;
        }
        loadClaims();
    }, []);

    const loadClaims = async () => {
        try {
            const data = await getUserClaims(user.id);
            setClaims(data);
        } catch (err) {
            console.error('Failed to load claims');
        }
    };

    const handleSendOTP = () => {
        if (!auth.policyNumber || !auth.dob) return setError('Enter Policy Number and DOB');
        setError('');
        setAuth({ ...auth, otpSent: true });
    };

    const handleVerifyOTP = () => {
        if (auth.otp !== '1234') return setError('Invalid OTP. Use 1234 for demo.');
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
            const res = await createClaim(hospitalName, diagnosis, claimType);
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
        setFile(demoFile);
    };

    const handleFileUpload = async () => {
        if (!file || !currentClaimId) return setError('Please select a file');
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('document', file);

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
        // Simulate Processing Stages
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
        setFile(null);
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

    const renderPlainLanguageError = (reason) => {
        if (reason.includes('Tampering')) return 'We detected possible alterations in the uploaded document. Please upload an original clear copy.';
        if (reason.includes('GST')) return 'The hospital GST number could not be verified in the national registry.';
        if (reason.includes('Velocity')) return 'Multiple claims have been filed from this account recently. This requires manual review.';
        return reason;
    };

    return (
        <div className="flex h-screen bg-slate-50 flex-col">
            <Navbar userName={user.name} />
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col">
                    <div className="flex-1 space-y-2 mt-4">
                        <button onClick={() => setStep(0)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[12px] font-medium ${step === 0 ? 'bg-blue-50 text-[#0052CC]' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <FileText className="w-5 h-5" />
                            <span>{t('Dashboard', 'डैशबोर्ड')}</span>
                        </button>
                        <button onClick={() => { resetForm(); setStep(1); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-[12px] font-medium ${step !== 0 && step !== 6 ? 'bg-blue-50 text-[#0052CC]' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <UploadCloud className="w-5 h-5" />
                            <span>{t('New Claim', 'नया दावा')}</span>
                        </button>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">KYC: {user.kycStatus || 'UNVERIFIED'}</p>
                        </div>
                        <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-600 hover:text-red-600 transition-colors text-sm font-medium">
                            <LogOut className="w-4 h-4" />
                            <span>{t('Sign Out', 'साइन आउट')}</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-10 relative">
                    <div className="max-w-4xl mx-auto">
                        
                        {step === 0 && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-3xl font-bold font-['Manrope'] text-slate-900">{t('Dashboard', 'डैशबोर्ड')}</h1>
                                    <button onClick={() => { resetForm(); setStep(1); }} className="px-5 py-2.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors shadow-sm">
                                        {t('Start New Claim', 'नया दावा शुरू करें')}
                                    </button>
                                </div>
                                
                                {/* Eligibility & Cover Overview */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-[#0052CC]"/> Eligibility & Cover Overview</h2>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-slate-500">Total Cover</span>
                                                <span className="text-slate-900">₹5,00,000</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3">
                                                <div className="bg-[#0052CC] h-3 rounded-full" style={{ width: '30%' }}></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500 pt-1">
                                                <span>Used: ₹1,50,000</span>
                                                <span className="font-bold text-green-600">Available: ₹3,50,000</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Policies */}
                                    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm">
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><FileCheck className="w-5 h-5 mr-2 text-green-600"/> Active Policies</h2>
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-[12px]">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-slate-900">Comprehensive Health Plus</span>
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">ACTIVE</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2">Policy ID: POL-492810-AB</p>
                                            <p className="text-xs text-slate-600 font-medium"><RefreshCw className="w-3 h-3 inline mr-1"/> Renews on 12 Nov 2026</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-4">{t('Claim History', 'दावा इतिहास')}</h2>
                                    {claims.length === 0 ? (
                                        <div className="text-slate-500 text-center py-16 bg-white rounded-[16px] border border-slate-200 shadow-sm">No claims found. Start by creating a new claim.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {claims.map(claim => (
                                                <div key={claim._id} className="bg-white p-6 rounded-[16px] border border-slate-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
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
                                            className="w-32 px-4 py-3 text-center text-2xl tracking-widest bg-slate-50 border border-slate-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] mx-auto block"
                                            placeholder="••••"
                                        />
                                        <p className="text-xs text-slate-400 mt-2">Hint: Use 1234 for hackathon demo</p>
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
                                        <label key={type} className={`flex items-center p-4 border rounded-[12px] cursor-pointer transition-colors ${claimType === type ? 'border-[#0052CC] bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
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
                                
                                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-[16px] cursor-pointer hover:border-[#0052CC] hover:bg-blue-50 transition-colors mb-4 relative overflow-hidden group">
                                    {file ? (
                                        <div className="text-center">
                                            <FileCheck className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                            <span className="text-sm font-bold text-slate-800">{file.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-10 h-10 text-[#0052CC] mb-3 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm text-slate-600 font-semibold mb-1">Click to browse or drag and drop</span>
                                            <span className="text-xs text-slate-400">PNG, JPG, PDF up to 10MB</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} accept="image/*,.pdf" />
                                </label>
                                
                                <div className="flex justify-center mb-8">
                                    <button onClick={handleLoadDemoData} className="text-xs font-semibold text-[#0052CC] hover:underline bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                        ⚡ Load Demo Data (Hackathon Mode)
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={handleFileUpload}
                                    disabled={!file || uploading}
                                    className="w-full flex items-center justify-center py-3.5 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {uploading ? 'Uploading...' : 'Submit & Run AI Analysis'}
                                </button>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="max-w-xl mx-auto bg-white p-12 rounded-[16px] shadow-sm border border-slate-200 text-center animate-fade-in mt-10">
                                <div className="relative w-24 h-24 mx-auto mb-8">
                                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[#0052CC] rounded-full border-t-transparent animate-spin"></div>
                                    <Activity className="absolute inset-0 m-auto w-10 h-10 text-[#0052CC] animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-bold font-['Manrope'] mb-4 text-slate-900">ClaimAssist AI is thinking...</h2>
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
                            <div className="max-w-3xl mx-auto animate-fade-in pb-10">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h1 className="text-3xl font-bold font-['Manrope'] text-slate-900">AI Analysis Complete</h1>
                                    <p className="text-slate-500 mt-2">Your claim has been processed by ClaimAssist AI.</p>
                                </div>

                                <div className="bg-white rounded-[16px] shadow-sm border border-slate-200 overflow-hidden mb-6">
                                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-slate-400 font-semibold mb-1">AI Approval Probability Score</p>
                                            <div className="flex items-end">
                                                <span className={`text-4xl font-bold mr-2 ${processedClaim.riskScore < 40 ? 'text-green-400' : processedClaim.riskScore < 70 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {100 - processedClaim.riskScore}%
                                                </span>
                                                <span className="text-slate-400 mb-1 font-medium">Likelihood</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-400 font-semibold mb-1">Extracted Bill Amount</p>
                                            <p className="text-2xl font-bold text-white">₹{processedClaim.ocrData?.billAmount || 0}</p>
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
