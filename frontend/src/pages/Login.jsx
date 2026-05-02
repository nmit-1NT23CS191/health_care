import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../services/api';
import logo from '../assets/veraclaim_icon.png';
import { RefreshCw } from 'lucide-react';

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
        <div className="flex items-center justify-center min-h-screen mesh-gradient px-4">
            <div className="w-full max-w-md p-10 glass-card rounded-[32px] shadow-2xl animate-fade-in-up">
                <div className="flex flex-col items-center mb-10 group">
                    <div className="logo-container mb-10">
                        <img src={logo} alt="VeraClaim" className="w-56 h-56 object-contain animate-float logo-hover-effect" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 font-['Manrope'] tracking-tighter gradient-text">VeraClaim AI</h2>
                    <p className="text-slate-500 font-bold mt-2 tracking-widest text-[10px] uppercase text-center">{isLogin ? 'Secure Intelligence Access' : 'Create Your Insurance Profile'}</p>
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
                        className="w-full py-4 bg-gradient-to-r from-[#0052CC] to-[#0EA5E9] text-white rounded-[16px] font-bold text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 flex items-center justify-center"
                    >
                        {loading ? <RefreshCw className="animate-spin w-5 h-5 mr-2" /> : null}
                        {loading ? 'Processing...' : (isLogin ? 'Sign In to VeraClaim' : 'Join VeraClaim AI')}
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
