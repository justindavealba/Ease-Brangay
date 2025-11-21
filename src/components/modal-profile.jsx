import React, { useState, useEffect, useRef } from "react";
import { FaTimes, FaCamera, FaTrash } from "react-icons/fa";
import "../styles/modal-profile.css";
import defaultAvatar from "../assets/default-avatar.png"; // Import the default avatar

const ProfileModal = ({ isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isUploading, setIsUploading] = useState(false); // State for loading indicator

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      } else {
        // Handle case where no profile is found (e.g., direct access without login)
        onClose(); // Close modal if no user data
      }
    }
  }, [isOpen]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);

      try {
        const response = await fetch(
          `http://localhost:5000/api/users/${userProfile.id}/avatar`,
          {
            method: "PUT",
            body: formData, // Send FormData, browser sets Content-Type
          }
        );

        if (!response.ok) throw new Error("Failed to save avatar.");

        const { avatar: newAvatarPath } = await response.json();
        const newProfile = { ...userProfile, avatar: newAvatarPath };
        setUserProfile(newProfile); // Update UI immediately
        localStorage.setItem("userProfile", JSON.stringify(newProfile)); // Also update localStorage for consistency
      } catch (error) {
        console.error("Avatar update failed:", error);
        alert("Could not update your profile picture. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveAvatar = async (e) => {
    e.stopPropagation(); // Prevent the file input from opening
    if (
      window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      setIsUploading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/users/${userProfile.id}/avatar`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar: "null" }), // Send 'null' string to indicate removal
          }
        );

        if (!response.ok) throw new Error("Failed to remove avatar.");

        const newProfile = { ...userProfile, avatar: null };
        setUserProfile(newProfile);
        localStorage.setItem("userProfile", JSON.stringify(newProfile));
      } catch (error) {
        console.error("Avatar removal failed:", error);
        alert("Could not remove your profile picture. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  if (!isOpen || !userProfile) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>My Profile</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Profile Section */}
        <div className="profile-details">
          <div className="avatar-container" onClick={handleAvatarClick}>
            <img
              src={
                userProfile.avatar
                  ? `http://localhost:5000${userProfile.avatar}`
                  : defaultAvatar
              }
              alt="Profile"
              className="profile-avatar-large"
              style={{ objectFit: "cover", aspectRatio: "1 / 1" }}
            />
            {isUploading ? (
              <div className="avatar-loading-overlay">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="avatar-edit-overlay">
                <div className="overlay-action">
                  <FaCamera size={20} />
                  <span>Change</span>
                </div>
              </div>
            )}
          </div>
          <div className="avatar-actions">
            {userProfile.avatar && userProfile.avatar !== defaultAvatar && (
              <button
                className="avatar-action-btn remove"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
              >
                Remove Profile
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/png, image/jpeg, image/gif"
            style={{ display: "none" }}
          />
          <h3>{`${userProfile.firstName} ${userProfile.lastName}`}</h3>
          <p className="username">@{userProfile.username}</p>
        </div>

        {/* Info Grid */}
        <div className="profile-info-grid">
          <div className="info-row">
            <span className="label">User ID</span>
            <span className="value">{userProfile.id}</span>
          </div>
          <div className="info-row">
            <span className="label">Role</span>
            <span className="value">{userProfile.role}</span>
          </div>
          <div className="info-row">
            <span className="label">Municipality</span>
            <span className="value">{userProfile.municipality}</span>
          </div>
          <div className="info-row">
            <span className="label">Barangay</span>
            <span className="value">{userProfile.barangay}</span>
          </div>
          <div className="info-row">
            <span className="label">Birth Date</span>
            <span className="value">
              {userProfile.dob
                ? (() => {
                    const [year, month, day] = userProfile.dob
                      .split("T")[0]
                      .split("-")
                      .map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    );
                  })()
                : "N/A"}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Email</span>
            <span className="value">{userProfile.email || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="label">Joined</span>
            <span className="value">
              {new Date(userProfile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
