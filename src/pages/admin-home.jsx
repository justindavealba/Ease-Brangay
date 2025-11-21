import React, { useState, useEffect, useMemo } from "react";
import "react-calendar/dist/Calendar.css";
import "../styles/admin-home.css";
import {
  FaBullhorn,
  FaHistory,
  FaTrash,
  FaTimes,
  FaFilter,
  FaSortAmountDown,
  FaSortAmountUp,
  FaCog,
  FaUsers,
} from "react-icons/fa"; // Added FaCog, FaUsers
import AuditLogModal from "../components/modal-audit-log.jsx";
import { logAuditAction } from "../utils/auditLogger.js";
import { useNavigate, useParams } from "react-router-dom";
import UserManagementModal from "../components/admin-user-management.jsx";
import SystemSettingsModal from "../components/admin-system-settings.jsx";
import AdminAnalyticsDashboard from "../components/admin-analytics-dashboard.jsx";
import Header from "../components/header"; // Assuming a shared Header component
import ProfileModal from "../components/modal-profile.jsx";

// A simple modal component structure
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="admin-close-btn">
            <FaTimes />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
};

function AdminHome() {
  //1. Super-Moderation & Content Oversight
  //Global Content Management: Ability to edit or delete any announcement or post made by any moderator.
  //Audit Trail Viewer: A dedicated interface to view all actions logged by both moderators and residents (e.g., post creation, report status updates, user logins). This is crucial for accountability.
  //System-Wide Broadcasts: Send high-priority messages that appear as a banner or special notification to all users (residents and moderators).
  const { id, username } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [reports, setReports] = useState([]);
  const [certificationRequests, setCertificationRequests] = useState([]);
  const [disputeReports, setDisputeReports] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);

  // Modal states
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] =
    useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Audit Log filters
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [logFilterType, setLogFilterType] = useState("All");
  const [logSortOrder, setLogSortOrder] = useState("newest");

  // Pagination state for audit logs
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const logsPerPage = 15;
  const [jumpToPageInput, setJumpToPageInput] = useState("");

  const [sortOrder, setSortOrder] = useState("newest");
  const [filterCategory, setFilterCategory] = useState("All");

  // Post search state
  const [postSearchTerm, setPostSearchTerm] = useState("");

  // Broadcast form state
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("info");

  const POST_CATEGORIES = [
    "General",
    "Event",
    "Health Advisory",
    "Safety Alert",
    "Community Program",
    "Traffic Update",
    "Weather Alert",
    "Maintenance Notice",
    "Other",
  ];

  const getCategoryClass = (categoryName) => {
    if (!categoryName) return "category-general";
    return `category-${categoryName.toLowerCase().replace(/\s+/g, "-")}`;
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all primary data from the database
        const [
          usersRes,
          municipalitiesRes,
          certsRes,
          reportsRes,
          disputesRes,
          adminMessagesRes,
          broadcastsRes,
        ] = await Promise.all([
          fetch("http://localhost:5000/api/users"),
          fetch("http://localhost:5000/api/municipalities"),
          fetch("http://localhost:5000/api/certificate_requests"),
          fetch("http://localhost:5000/api/reports"),
          fetch("http://localhost:5000/api/dispute_reports"),
          fetch("http://localhost:5000/api/admin_messages"),
          fetch("http://localhost:5000/api/broadcasts/all"), // Fetch all broadcasts
        ]);

        if (
          !usersRes.ok ||
          !municipalitiesRes.ok ||
          !certsRes.ok ||
          !reportsRes.ok ||
          !disputesRes.ok ||
          !adminMessagesRes.ok ||
          !broadcastsRes.ok
        ) {
          throw new Error("Failed to fetch initial data");
        }

        const usersData = await usersRes.json();
        const municipalitiesData = await municipalitiesRes.json();

        // Create the locations object for the analytics dashboard
        const locations = {};
        for (const mun of municipalitiesData) {
          const barangaysRes = await fetch(
            `http://localhost:5000/api/barangays/${mun.id}`
          );
          const barangaysData = await barangaysRes.json();
          locations[mun.name] = barangaysData.map((b) => b.name);
        }

        // Update state with fetched and local data
        setUsers(usersData);
        setCertificationRequests(await certsRes.json());
        setReports(await reportsRes.json());
        setDisputeReports(await disputesRes.json());
        setAdminMessages(await adminMessagesRes.json());
        setBroadcasts(await broadcastsRes.json());
        setSettings({ locations });
      } catch (error) {
        console.error("Error loading data:", error);
        alert(
          "Failed to load data from the server. Please ensure the backend is running."
        );
      }
    };

    loadData();
  }, []); // This useEffect runs once on initial load

  const newModeratorMessageCount = useMemo(() => {
    const openDisputes = disputeReports.filter(
      (report) => report.status === "open"
    ).length;
    const openMessages = adminMessages.filter(
      (message) => message.status === "open"
    ).length;
    return openDisputes + openMessages;
  }, [disputeReports, adminMessages]);

  // --- Super-Moderation: Content Management ---
  const handleDeletePost = (postId) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this post? This action cannot be undone."
      )
    ) {
      const updatedPosts = posts.filter((p) => p.id !== postId);
      setPosts(updatedPosts);
      localStorage.setItem("announcements", JSON.stringify(updatedPosts));
      logAuditAction("Admin Deleted Post", { postId }, "admin");
    }
  };

  // --- Post Feed Logic ---
  const processedPosts = useMemo(() => {
    let filtered = posts;

    // Filter by category
    if (filterCategory !== "All") {
      filtered = filtered.filter((post) => post.category === filterCategory);
    }

    // Filter by search term (post ID)
    if (postSearchTerm.trim()) {
      filtered = filtered.filter((post) =>
        String(post.id).includes(postSearchTerm.trim())
      );
    }

    return filtered.sort((a, b) => {
      return sortOrder === "newest"
        ? new Date(b.date) - new Date(a.date)
        : new Date(a.date) - new Date(b.date);
    });
  }, [posts, postSearchTerm, filterCategory, sortOrder]);

  // --- System-Wide Broadcasts Logic ---
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Broadcast message cannot be empty.");
      return;
    }
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    try {
      const response = await fetch("http://localhost:5000/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMessage,
          type: broadcastType,
          userId: userProfile.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to send broadcast.");

      const newBroadcast = await response.json();
      setBroadcasts((prev) => [newBroadcast, ...prev]);
      logAuditAction(
        "Admin Sent Broadcast",
        { message: broadcastMessage, type: broadcastType },
        "admin"
      );
      setBroadcastMessage("");
      setBroadcastType("info");
    } catch (error) {
      console.error(error);
      alert("Error: Could not send broadcast.");
    }
  };

  const handleToggleBroadcast = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const response = await fetch(
        `http://localhost:5000/api/broadcasts/${id}/toggle`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to toggle broadcast status.");

      setBroadcasts((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: newStatus } : b))
      );
      logAuditAction(
        "Admin Toggled Broadcast",
        { broadcastId: id, status: newStatus ? "active" : "inactive" },
        "admin"
      );
    } catch (error) {
      console.error(error);
      alert("Error: Could not update broadcast status.");
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (window.confirm("Are you sure you want to delete this broadcast?")) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/broadcasts/${id}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to delete broadcast.");
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
        logAuditAction("Admin Deleted Broadcast", { broadcastId: id }, "admin");
      } catch (error) {
        console.error(error);
        alert("Error: Could not delete broadcast.");
      }
    }
  };

  return (
    <div className="admin-page">
      {isLoggingOut && (
        <div className="logout-overlay">
          <div className="spinner"></div>
          <p>Logging out...</p>
        </div>
      )}
      {/* Pass onLogout to the Header */}
      <Header
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogout={async () => {
          setIsLoggingOut(true);
          await logAuditAction("User Logged Out", {}, "admin"); // Ensure audit is logged
          setTimeout(() => {
            localStorage.removeItem("userProfile");
            navigate("/admin-login");
          }, 500); // 500ms delay to show the loading screen
        }}
      />
      <div className="admin-content">
        <main className="admin-main-content">
          <AdminAnalyticsDashboard
            users={users}
            reports={reports}
            certificationRequests={certificationRequests}
            settings={settings}
            // Props for Global Content Feed
            processedPosts={processedPosts}
            postSearchTerm={postSearchTerm}
            setPostSearchTerm={setPostSearchTerm}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            POST_CATEGORIES={POST_CATEGORIES}
            handleDeletePost={handleDeletePost}
            getCategoryClass={getCategoryClass}
          />
        </main>

        <aside className="admin-right-panel">
          <div className="admin-widget">
            <h4
              style={{ color: "var(--admin-primary-blue)", fontWeight: "bold" }}
            >
              <FaHistory /> Audit Trail
            </h4>
            <p>
              Review all actions taken by users and moderators across the
              system.
            </p>
            <button onClick={() => setIsAuditModalOpen(true)}>
              Open Audit Viewer
            </button>
          </div>
          <div className="admin-widget">
            <h4 style={{ color: "var(--admin-primary-blue)" }}>
              <FaBullhorn /> System Broadcasts
            </h4>
            <p>Send or manage high-priority messages for all users.</p>
            <button onClick={() => setIsBroadcastModalOpen(true)}>
              Manage Broadcasts
            </button>
          </div>
          <div className="admin-widget">
            <h4
              className="widget-title-container"
              style={{ color: "var(--admin-primary-blue)" }}
            >
              <span>
                <FaUsers /> User Management
              </span>
              {newModeratorMessageCount > 0 && (
                <span className="widget-badge">{newModeratorMessageCount}</span>
              )}
            </h4>
            <p>Control user accounts, manage roles, and resolve disputes.</p>
            <button onClick={() => setIsUserManagementModalOpen(true)}>
              Open User Dashboard
            </button>
          </div>
          <div className="admin-widget">
            <h4 style={{ color: "var(--admin-primary-blue)" }}>
              <FaCog /> System Configuration
            </h4>
            <p>Manage application settings, data, and integrations.</p>
            <button onClick={() => setIsSettingsModalOpen(true)}>
              Open System Settings
            </button>
          </div>
        </aside>
      </div>

      {/* Audit Trail Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        role="admin"
      />

      {/* Broadcast Modal */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="System Broadcasts"
      >
        <div className="broadcast-form">
          <h4>Create New Broadcast</h4>
          <textarea
            placeholder="Enter broadcast message..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
          <select
            value={broadcastType}
            onChange={(e) => setBroadcastType(e.target.value)}
          >
            <option value="info">Info (Blue)</option>
            <option value="warning">Warning (Yellow)</option>
            <option value="critical">Critical (Red)</option>
          </select>
          <button onClick={handleSendBroadcast}>Send Broadcast</button>
        </div>
        <div className="broadcast-list">
          <h4>Active & Past Broadcasts</h4>
          {broadcasts.length > 0 ? (
            broadcasts.map((b) => (
              <div
                key={b.id}
                className={`broadcast-item type-${b.type} ${
                  b.is_active ? "active" : "inactive"
                }`}
              >
                <p>{b.message}</p>
                <div className="broadcast-actions">
                  <small>{new Date(b.created_at).toLocaleString()}</small>
                  <button
                    onClick={() => handleToggleBroadcast(b.id, b.is_active)}
                  >
                    {b.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="delete"
                    onClick={() => handleDeleteBroadcast(b.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No broadcasts have been sent.</p>
          )}
        </div>
      </Modal>

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        users={users}
        setUsers={setUsers}
        disputeReports={disputeReports}
        setDisputeReports={setDisputeReports}
        adminMessages={adminMessages}
        setAdminMessages={setAdminMessages}
        settings={settings}
      />

      <SystemSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
export default AdminHome;
