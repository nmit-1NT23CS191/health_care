import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('EN');

    const toggleLanguage = () => {
        setLanguage(prev => (prev === 'EN' ? 'HI' : 'EN'));
    };

    const t = (enString, hiString) => {
        return language === 'EN' ? enString : (hiString || enString);
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
