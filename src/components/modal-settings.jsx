import React, { useState, useEffect } from "react";
import { FaTimes, FaHistory, FaSave, FaCheckCircle } from "react-icons/fa";
import "../styles/modal-settings.css";
import { useTheme } from "./ThemeContext";
import { useLanguage } from "./LanguageContext";
import AuditLogModal from "./modal-audit-log.jsx"; // Assuming this is for viewing logs
import ChangePasswordModal from "./modal-change-password.jsx"; // Import the new modal

const SettingModal = ({ isOpen, onClose, role }) => {
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Local state to manage selections before saving
  const [localTheme, setLocalTheme] = useState(theme);
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLanguage, setLocalLanguage] = useState(language);

  useEffect(() => {
    if (isOpen) {
      setLocalTheme(theme);
      setLocalFontSize(fontSize);
      setLocalLanguage(language);
    }
  }, [isOpen, theme, fontSize, language]);

  const handleSaveSettings = () => {
    setTheme(localTheme);
    setFontSize(localFontSize);
    setLanguage(localLanguage);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <>
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      <div
        className="settings-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="settings-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{t("settings")}</h2>
            <button className="close-btn" onClick={onClose}>
              <FaTimes size={20} />
            </button>
          </div>

          <AuditLogModal
            isOpen={isAuditLogOpen}
            onClose={() => setIsAuditLogOpen(false)}
            role={role}
          />

          {showConfirmation && (
            <div className="settings-save-confirmation">
              <FaCheckCircle />
              <span>{t("settingsSaved")}</span>
            </div>
          )}
          <div className="settings-body">
            <h3 className="settings-section-header">{t("notifications")}</h3>
            <div className="setting-item">
              <label htmlFor="notification-toggle">
                {t("emailNotifications")}
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  id="notification-toggle"
                  defaultChecked
                />
                <span className="slider round"></span>
              </label>
            </div>

            <h3 className="settings-section-header">
              {t("appearanceAndAccessibility")}
            </h3>
            <div className="setting-item">
              <label>{t("theme")}</label>
              <select
                value={localTheme}
                onChange={(e) => setLocalTheme(e.target.value)}
              >
                <option value="light">{t("lightMode")}</option>
                <option value="dark">{t("darkMode")}</option>
              </select>
            </div>
            <div className="setting-item">
              <label>{t("fontSize")}</label>
              <select
                value={localFontSize}
                onChange={(e) => setLocalFontSize(e.target.value)}
              >
                <option value="small">{t("small")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="large">{t("large")}</option>
              </select>
            </div>

            <h3 className="settings-section-header">
              {t("languageAndRegion")}
            </h3>
            <div className="setting-item">
              <label>{t("language")}</label>
              <select
                value={localLanguage}
                onChange={(e) => setLocalLanguage(e.target.value)}
              >
                <option value="en">{t("english")}</option>
                <option value="tl">{t("tagalog")}</option>
              </select>
            </div>

            <h3 className="settings-section-header">{t("accountSecurity")}</h3>
            <button
              className="change-password-btn"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              {t("changePassword")}
            </button>
            <button
              className="view-log-btn"
              onClick={() => setIsAuditLogOpen(true)}
            >
              <FaHistory /> {t("viewActivityLog")}
            </button>
          </div>
          <div className="settings-footer">
            <button className="save-settings-btn" onClick={handleSaveSettings}>
              <FaSave /> {t("saveSettings")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingModal;
