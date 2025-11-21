import React, { createContext, useState, useContext, useEffect } from "react";

// Define translations directly for simplicity. In a larger app, these would be in separate JSON files.
const translations = {
  en: {
    settings: "Settings",
    notifications: "Notifications",
    emailNotifications: "Email Notifications",
    appearanceAndAccessibility: "Appearance & Accessibility",
    theme: "Theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    fontSize: "Font Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    languageAndRegion: "Language & Region",
    language: "Language",
    english: "English",
    tagalog: "Tagalog",
    accountSecurity: "Account Security",
    changePassword: "Change Password",
    viewActivityLog: "View Activity Log",
    saveSettings: "Save Settings",
    settingsSaved: "Settings Saved!",
    // Sidebar
    profile: "Profile",
    inbox: "Inbox",
    viewTrackReports: "View and Track Reports",
    requestCertification: "Request Certification",
    fileReport: "File a Report",
    support: "Support",
    createAnnouncement: "Create Announcement",
    certificationRequests: "Certification Requests",
    residentReports: "Resident Reports",
    // Feed
    announcementsFeed: "Announcements Feed",
    allCategories: "All Categories",
    newestFirst: "Newest First",
    oldestFirst: "Oldest First",
    noAnnouncementsYet: "No Announcements Yet",
    noAnnouncementsDescription:
      "Stay tuned! Updates from your barangay will appear here.",
  },
  tl: {
    settings: "Mga Setting",
    notifications: "Mga Abiso",
    emailNotifications: "Mga Abiso sa Email",
    appearanceAndAccessibility: "Hitsura at Accessibility",
    theme: "Tema",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    fontSize: "Laki ng Font",
    small: "Maliit",
    medium: "Katamtaman",
    large: "Malaki",
    languageAndRegion: "Wika at Rehiyon",
    language: "Wika",
    english: "Ingles",
    tagalog: "Tagalog",
    accountSecurity: "Seguridad ng Account",
    changePassword: "Baguhin ang Password",
    viewActivityLog: "Tingnan ang Log ng Aktibidad",
    saveSettings: "I-save ang Mga Setting",
    settingsSaved: "Nai-save na ang mga setting!",
    // Sidebar
    profile: "Profile",
    inbox: "Inbox",
    viewTrackReports: "Tingnan ang mga Ulat",
    requestCertification: "Humiling ng Sertipikasyon",
    fileReport: "Mag-file ng Ulat",
    support: "Suporta",
    createAnnouncement: "Gumawa ng Anunsyo",
    certificationRequests: "Mga Kahilingan sa Sertipikasyon",
    residentReports: "Mga Ulat ng Residente",
    // Feed
    announcementsFeed: "Feed ng mga Anunsyo",
    allCategories: "Lahat ng Kategorya",
    newestFirst: "Pinakabago",
    oldestFirst: "Pinakaluma",
    noAnnouncementsYet: "Wala Pang Mga Anunsyo",
    noAnnouncementsDescription:
      "Manatiling nakatutok! Ang mga update mula sa iyong barangay ay lalabas dito.",
  },
};

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split(".");
    let result = translations[language];
    for (const k of keys) {
      result = result?.[k];
    }
    return result || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
