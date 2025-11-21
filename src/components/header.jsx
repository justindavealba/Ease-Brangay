import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
// 1. IMPORT the image file
// Adjust the path to where your logo.png is actually located
import logoImage from "../assets/logo.png";
import defaultAvatar from "../assets/default-avatar.png";
import "../styles/header.css";
import { FaSignOutAlt, FaUserCircle } from "react-icons/fa";

// All the unnecessary and problematic icon imports have been removed.

const Header = ({ logoText = "EaseBarangay", onLogout, onProfileClick }) => {
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [username, setUsername] = useState("{User}");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = () => {
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setUsername(profile.username || "{User}");
        setAvatar(profile.avatar || defaultAvatar);
      }
    };

    loadProfile();

    // Listen for storage changes to update the avatar if it's changed in another tab/component
    window.addEventListener("storage", loadProfile);

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", loadProfile);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior for resident and moderator
      localStorage.removeItem("userProfile");
      navigate("/login");
    }
  };

  return (
    // Top bar
    <header className="top-bar">
      <Link to="/" className="logo-link">
        <div className="logo">
          <img src={logoImage} alt="EaseBarangay Logo" className="logo-icon" />
          <span>{logoText}</span>
        </div>
      </Link>
      <h2 className="updates-title"></h2>
      <div className="user-info" ref={menuRef}>
        <span className="username">{username}</span>
        <img
          src={
            avatar && avatar.startsWith("/uploads")
              ? `http://localhost:5000${avatar}`
              : avatar
          }
          alt="User avatar"
          className="avatar"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
        {isMenuOpen && (
          <div className="header-dropdown-menu">
            {onProfileClick && (
              <button onClick={onProfileClick} className="profile-btn">
                <FaUserCircle /> Profile
              </button>
            )}
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
