import React from 'react';
import { Bell, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Navbar = ({ userName }) => {
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-2">
                <span className="text-xl font-bold font-['Manrope'] text-slate-900">
                    {t('ClaimAssist AI', 'दावा सहायता AI')}
                </span>
            </div>
            
            <div className="flex items-center space-x-6">
                <button 
                    onClick={toggleLanguage}
                    className="flex items-center space-x-2 text-slate-600 hover:text-[#0052CC] font-medium transition-colors"
                >
                    <Globe className="w-5 h-5" />
                    <span>{language}</span>
                </button>
                
                <div className="relative cursor-pointer text-slate-600 hover:text-[#0052CC] transition-colors group">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        2
                    </span>
                    {/* Mock Notification Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
                            {t('Notifications', 'सूचनाएं')}
                        </div>
                        <div className="p-3 text-sm text-slate-600 hover:bg-slate-50 border-b border-slate-100">
                            <p className="font-semibold text-slate-800 mb-1">Claim Update</p>
                            <p className="text-xs">Your claim CLM-9021 is under review.</p>
                        </div>
                        <div className="p-3 text-sm text-slate-600 hover:bg-slate-50">
                            <p className="font-semibold text-slate-800 mb-1">Policy Alert</p>
                            <p className="text-xs">Health Plus policy renews in 15 days.</p>
                        </div>
                    </div>
                </div>

                {userName && (
                    <div className="flex items-center space-x-2 pl-6 border-l border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0052CC] flex items-center justify-center font-bold text-sm">
                            {userName.charAt(0)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Navbar;
