import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/api';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const data = await loginUser(phone, password);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                // Simple routing logic: agent uses "9999999999" phone
                if (phone === '9999999999') navigate('/agent/dashboard');
                else navigate('/user/dashboard');
            } else {
                const data = await registerUser(name, phone, password);
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/user/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 bg-white rounded-[12px] shadow-[0_10px_40px_-10px_rgba(0,82,204,0.1)] border border-slate-200">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-blue-50 rounded-full mb-4">
                        <ShieldCheck className="w-8 h-8 text-[#0052CC]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 font-['Manrope']">MedFin Elite</h2>
                    <p className="text-slate-500 text-sm mt-1">{isLogin ? 'Sign in to manage your claims' : 'Create an account to get started'}</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-[12px] text-sm text-center border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-[12px] border border-slate-300 focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-colors"
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Phone Number</label>
                        <input 
                            type="tel" 
                            className="w-full px-4 py-3 rounded-[12px] border border-slate-300 focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-colors"
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            required 
                            placeholder="e.g. 9876543210"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-3 rounded-[12px] border border-slate-300 focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] transition-colors"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-[#0052CC] text-white rounded-[12px] font-semibold hover:bg-blue-800 transition-colors disabled:opacity-70"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-[#0052CC] text-sm hover:underline font-medium"
                    >
                        {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
