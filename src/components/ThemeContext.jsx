import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(
        () => localStorage.getItem('theme') || 'light'
    );

    // Effect to update body attribute and localStorage when theme changes
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const [fontSize, setFontSize] = useState(
        () => localStorage.getItem('fontSize') || 'medium'
    );
    
    // Effect to update body attribute and localStorage when font size changes
    useEffect(() => {
        document.body.setAttribute('data-font-size', fontSize);
        localStorage.setItem('fontSize', fontSize);
    }, [fontSize]);
    const value = { theme, setTheme, fontSize, setFontSize };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
// Custom hook to use the theme context easily
export const useTheme = () => useContext(ThemeContext);