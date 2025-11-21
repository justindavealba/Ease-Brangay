import React, { useState, useMemo, useEffect } from "react";
import {
  FaUsers,
  FaUserPlus,
  FaGavel,
  FaSearch,
  FaUserCheck,
  FaUserSlash,
  FaUserShield,
  FaKey,
  FaEnvelope,
  FaReply,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import "../styles/user-management-modal.css";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content user-management-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="admin-close-btn">
            &times;
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
};

const UserManagementModal = ({
  isOpen,
  onClose,
  users,
  setUsers,
  disputeReports,
  setDisputeReports,
  adminMessages,
  setAdminMessages,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState("viewUsers");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingState, setLoadingState] = useState({ type: null, id: null }); // For loading indicators
  const [localUsers, setLocalUsers] = useState(users); // Use local state to manage users
  const [error, setError] = useState(null);

  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Generic loading button component
  const LoadingButton = ({ isLoading, children, ...props }) => (
    <button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? <FaSpinner className="spinner" /> : children}
    </button>
  );

  // State for creating a new moderator
  const [newModMunicipality, setNewModMunicipality] = useState("");
  const [newModBarangay, setNewModBarangay] = useState("");
  const [mailboxFilter, setMailboxFilter] = useState("All"); // 'All', 'Disputes', 'Inquiries'
  const [newModUsername, setNewModUsername] = useState("");
  const [newModEmail, setNewModEmail] = useState("");
  const [newModPassword, setNewModPassword] = useState("");

  // State for replying to moderator
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/municipalities"
        );
        if (!response.ok) throw new Error("Failed to fetch municipalities");
        const data = await response.json();
        setMunicipalities(data);
      } catch (err) {
        console.error(err);
        alert("Could not load location data for moderator creation.");
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setLocalUsers(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not load user data. Please try again.");
      }
    };

    if (isOpen) {
      fetchMunicipalities();
      fetchUsers();
      setActiveTab("viewUsers");
      setReplyingTo(null);
    } else {
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchBarangays = async () => {
      if (newModMunicipality) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/barangays/${newModMunicipality}`
          );
          if (!response.ok) throw new Error("Failed to fetch barangays");
          const data = await response.json();
          setBarangays(data);
        } catch (err) {
          console.error(err);
          setBarangays([]); // Clear barangays on error
        }
      }
    };
    fetchBarangays();
  }, [newModMunicipality]);

  useEffect(() => {
    // This effect runs when the modal opens or the activeTab changes.
    // We want to mark messages as viewed only when the "mailbox" tab is active.
    if (activeTab === "mailbox") {
      const markAllAsViewed = async () => {
        // Filter for open items from the current state of disputeReports and adminMessages
        const currentOpenDisputes = disputeReports.filter(
          (item) => item.status === "open"
        );
        const currentOpenMessages = adminMessages.filter(
          (item) => item.status === "open"
        );

        const openItemsToMark = [
          ...currentOpenDisputes.map((item) => ({
            ...item,
            messageType: "Dispute",
          })),
          ...currentOpenMessages.map((item) => ({
            ...item,
            messageType: "Inquiry",
          })),
        ];

        if (openItemsToMark.length === 0) return;

        try {
          await Promise.all(
            openItemsToMark.map((item) => {
              const endpoint =
                item.messageType === "Dispute"
                  ? `/api/dispute_reports/${item.id}/status`
                  : `/api/admin_messages/${item.id}/status`;
              return fetch(`http://localhost:5000${endpoint}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "viewed" }),
              });
            })
          );

          // Optimistically update the state
          setDisputeReports((prev) =>
            prev.map((r) =>
              r.status === "open" ? { ...r, status: "viewed" } : r
            )
          );
          setAdminMessages((prev) =>
            prev.map((m) =>
              m.status === "open" ? { ...m, status: "viewed" } : m
            )
          );
        } catch (error) {
          console.error("Failed to mark messages as viewed:", error);
        }
      };

      markAllAsViewed();
    }
  }, [
    activeTab,
    disputeReports,
    adminMessages,
    setDisputeReports,
    setAdminMessages,
  ]);

  const filteredUsers = useMemo(() => {
    return (localUsers || [])
      .filter((user) => user.role === "resident" || user.role === "moderator")
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [localUsers, searchTerm]);

  const allMailboxItems = useMemo(() => {
    const disputes = disputeReports.map((item) => ({
      ...item,
      messageType: "Dispute",
    }));
    const inquiries = adminMessages.map((item) => ({
      ...item,
      messageType: "Inquiry",
    }));
    const allItems = [...disputes, ...inquiries].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    if (mailboxFilter === "All") {
      return allItems;
    }
    if (mailboxFilter === "Disputes") {
      return allItems.filter((item) => item.messageType === "Dispute");
    }
    // Default to 'Inquiries'
    return allItems.filter((item) => item.messageType === "Inquiry");
  }, [disputeReports, adminMessages, mailboxFilter]);

  const handleViewMessage = async (item) => {
    // If the item is already not 'open', no need to do anything.
    if (item.status !== "open") {
      return;
    }

    const newStatus = "viewed";
    let endpoint = "";
    let isDispute = false;

    if (item.messageType === "Dispute") {
      endpoint = `/api/dispute_reports/${item.id}/status`;
      isDispute = true;
    } else {
      endpoint = `/api/admin_messages/${item.id}/status`;
    }

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update message status.");

      // Update local state to immediately reflect the change
      if (isDispute) {
        setDisputeReports(
          disputeReports.map((r) =>
            r.id === item.id ? { ...r, status: newStatus } : r
          )
        );
      } else {
        setAdminMessages(
          adminMessages.map((m) =>
            m.id === item.id ? { ...m, status: newStatus } : m
          )
        );
      }
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    setLoadingState({ type: "status", id: userId });
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${userId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error("Failed to update status");

      const updatedUsers = localUsers.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      );
      setLocalUsers(updatedUsers);
      logAuditAction("User Status Changed", { userId, newStatus }, "admin");
    } catch (err) {
      console.error(err);
      alert("Failed to update user status.");
    } finally {
      setLoadingState({ type: null, id: null });
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    setLoadingState({ type: "role", id: userId });
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${userId}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!response.ok) throw new Error("Failed to update role");

      const updatedUsers = localUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      );
      setLocalUsers(updatedUsers);
      logAuditAction("User Role Changed", { userId, newRole }, "admin");
    } catch (err) {
      console.error(err);
      alert("Failed to update user role.");
    } finally {
      setLoadingState({ type: null, id: null });
    }
  };

  const handleResetPassword = async (userId, username) => {
    const newPassword = prompt(`Enter a new password for user "${username}":`);

    if (newPassword && newPassword.trim() !== "") {
      setLoadingState({ type: "password", id: userId });
      try {
        const response = await fetch(
          `http://localhost:5000/api/admin/users/${userId}/reset-password`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to reset password.");
        }

        logAuditAction("User Password Reset", { userId, username }, "admin");
        alert(`Password for "${username}" has been successfully reset.`);
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message}`);
      } finally {
        setLoadingState({ type: null, id: null });
      }
    }
  };
  const handleCreateModerator = async (e) => {
    e.preventDefault();
    if (!newModUsername || !newModEmail || !newModPassword || !newModBarangay) {
      alert("Please fill all fields.");
      return;
    }
    setLoadingState({ type: "createMod" });

    const moderatorData = {
      username: newModUsername,
      email: newModEmail,
      password: newModPassword,
      barangay: newModBarangay,
    };

    try {
      const response = await fetch("http://localhost:5000/api/moderator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moderatorData),
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Failed to create moderator");

      // Add the new moderator to the local state to update the UI
      const selectedMunicipality = municipalities.find(
        (m) => m.id === parseInt(newModMunicipality)
      );
      const newModerator = {
        id: data.userId,
        username: newModUsername,
        email: newModEmail,
        role: "moderator",
        status: "active",
        verified: true,
        municipality: selectedMunicipality ? selectedMunicipality.name : "N/A",
        barangay: newModBarangay,
        created_at: new Date().toISOString(), // Set current date for "Joined"
        dob: null, // Moderators created by admin don't have a DOB
      };
      setLocalUsers((prevUsers) => [newModerator, ...prevUsers]);

      logAuditAction(
        "Created Moderator Account",
        { username: newModUsername },
        "admin"
      );
      alert(`Moderator account for "${newModUsername}" created successfully.`);
      setNewModMunicipality("");
      setNewModBarangay("");
      setNewModUsername("");
      setNewModEmail("");
      setNewModPassword("");
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingState({ type: null, id: null });
    }
  };

  const handleResolveDispute = (reportId) => {
    // For now, this just simulates resolving by removing the report.
    // A real implementation might change a status.
    if (
      window.confirm(
        "Are you sure you want to mark this dispute as resolved? This will remove it from this view."
      )
    ) {
      const updatedReports = disputeReports.filter(
        (r) => r.reportId !== reportId
      );
      setDisputeReports(updatedReports);
      localStorage.setItem("disputeReports", JSON.stringify(updatedReports));
      logAuditAction("Resolved Dispute Report", { reportId }, "admin");
      alert("Dispute marked as resolved.");
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyingTo || !replyMessage.trim()) return;

    setLoadingState({
      type: "reply",
      id: replyingTo.reportId || replyingTo.id,
    });

    try {
      // 1. Send the reply to the moderator's inbox
      const replyPayload = {
        userId: replyingTo.sender_id || replyingTo.reporter_id,
        title: `Re: ${
          replyingTo.issue_type || `Dispute: ${replyingTo.reported_user_name}`
        }`,
        body: replyMessage,
        original_message: replyingTo.reason || replyingTo.issue_description,
      };

      const replyResponse = await fetch(
        "http://localhost:5000/api/moderator_inbox",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replyPayload),
        }
      );
      if (!replyResponse.ok) throw new Error("Failed to send reply.");

      // 2. Update the status of the original message to 'replied'
      const isDispute = !!replyingTo.reported_user_name;
      const statusEndpoint = isDispute
        ? `/api/dispute_reports/${replyingTo.id}/status`
        : `/api/admin_messages/${replyingTo.id}/status`;

      const statusResponse = await fetch(
        `http://localhost:5000${statusEndpoint}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "replied" }),
        }
      );
      if (!statusResponse.ok)
        throw new Error("Failed to update message status.");

      // 3. Update local state to reflect the change
      if (isDispute) {
        setDisputeReports(
          disputeReports.map((r) =>
            r.id === replyingTo.id ? { ...r, status: "replied" } : r
          )
        );
      } else {
        setAdminMessages(
          adminMessages.map((m) =>
            m.id === replyingTo.id ? { ...m, status: "replied" } : m
          )
        );
      }

      logAuditAction(
        "Replied to Moderator",
        { moderatorId: replyPayload.userId, subject: replyPayload.title },
        "admin"
      );
      alert("Your reply has been sent to the moderator's inbox.");
    } catch (error) {
      console.error("Failed to process reply:", error);
      alert("Error: Could not send the reply.");
    } finally {
      setReplyingTo(null);
      setReplyMessage("");
      setLoadingState({ type: null, id: null });
    }
  };

  const handleDeleteMessage = (itemId, isDispute) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this message?"
      )
    ) {
      if (isDispute) {
        const updatedDisputes = disputeReports.filter(
          (report) => report.reportId !== itemId
        );
        setDisputeReports(updatedDisputes);
        localStorage.setItem("disputeReports", JSON.stringify(updatedDisputes));
        logAuditAction(
          "Admin Deleted Dispute Report Message",
          { reportId: itemId },
          "admin"
        );
      } else {
        const updatedAdminMessages = adminMessages.filter(
          (message) => message.id !== itemId
        );
        setAdminMessages(updatedAdminMessages);
        localStorage.setItem(
          "adminContactMessages",
          JSON.stringify(updatedAdminMessages)
        );
        logAuditAction(
          "Admin Deleted Moderator Message",
          { messageId: itemId },
          "admin"
        );
      }
      alert("Message deleted.");
    }
  };

  const handleClearAllMessages = async () => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete ALL messages in the mailbox? This action cannot be undone."
      )
    ) {
      try {
        await fetch("http://localhost:5000/api/admin_mailbox/clear-all", {
          method: "DELETE",
        });
        setDisputeReports([]);
        setAdminMessages([]);
        logAuditAction(
          "Admin Cleared All Moderator Mailbox Messages",
          {},
          "admin"
        );
        alert("All messages have been cleared.");
      } catch (error) {
        alert("Error: Could not clear all messages.");
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Management">
      <div className="user-management-tabs">
        <button
          onClick={() => setActiveTab("viewUsers")}
          className={activeTab === "viewUsers" ? "active" : ""}
        >
          <FaUsers /> View Users
        </button>
        <button
          onClick={() => setActiveTab("createModerator")}
          className={activeTab === "createModerator" ? "active" : ""}
        >
          <FaUserPlus /> Create Moderator
        </button>
        <button
          onClick={() => setActiveTab("mailbox")}
          className={activeTab === "mailbox" ? "active" : ""}
        >
          <FaEnvelope /> Mailbox
        </button>
      </div>

      <div className="user-management-tab-content">
        {activeTab === "viewUsers" && (
          <div className="user-list-container">
            <div className="user-search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers &&
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`status-badge status-${user.status}`}>
                          {user.status}
                        </span>
                        {user.verified ? (
                          <span className="status-badge status-verified">
                            Verified
                          </span>
                        ) : (
                          <span className="status-badge status-unverified">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="user-actions">
                        {user.status === "active" ? (
                          <LoadingButton
                            title="Suspend User"
                            className="action-suspend"
                            onClick={() =>
                              handleUserStatusChange(user.id, "suspended")
                            }
                            isLoading={
                              loadingState.type === "status" &&
                              loadingState.id === user.id
                            }
                          >
                            <FaUserSlash />
                          </LoadingButton>
                        ) : (
                          <LoadingButton
                            title="Reactivate User"
                            className="action-activate"
                            onClick={() =>
                              handleUserStatusChange(user.id, "active")
                            }
                            isLoading={
                              loadingState.type === "status" &&
                              loadingState.id === user.id
                            }
                          >
                            <FaUserCheck />
                          </LoadingButton>
                        )}
                        {user.role === "resident" ? (
                          <LoadingButton
                            title="Promote to Moderator"
                            onClick={() =>
                              handleUserRoleChange(user.id, "moderator")
                            }
                            isLoading={
                              loadingState.type === "role" &&
                              loadingState.id === user.id
                            }
                          >
                            <FaUserShield />
                          </LoadingButton>
                        ) : (
                          <LoadingButton
                            title="Demote to Resident"
                            className="action-demote"
                            onClick={() =>
                              handleUserRoleChange(user.id, "resident")
                            }
                            isLoading={
                              loadingState.type === "role" &&
                              loadingState.id === user.id
                            }
                          >
                            <FaUsers />
                          </LoadingButton>
                        )}
                        <LoadingButton
                          title="Reset Password"
                          onClick={() =>
                            handleResetPassword(user.id, user.username)
                          }
                          isLoading={
                            loadingState.type === "password" &&
                            loadingState.id === user.id
                          }
                        >
                          <FaKey />
                        </LoadingButton>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "createModerator" && (
          <div className="create-moderator-container">
            <h3>Create New Moderator Account</h3>
            <p>Directly create a new account with moderator privileges.</p>
            <form
              className="create-moderator-form"
              onSubmit={handleCreateModerator}
            >
              <div className="form-group">
                <label htmlFor="new-mod-municipality">Municipality</label>
                <select
                  id="new-mod-municipality"
                  value={newModMunicipality}
                  onChange={(e) => {
                    setNewModMunicipality(e.target.value);
                    setNewModBarangay("");
                  }}
                  required
                >
                  <option value="" disabled>
                    Select Municipality...
                  </option>
                  {municipalities.map((mun) => (
                    <option key={mun.id} value={mun.id}>
                      {mun.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="new-mod-barangay">Barangay</label>
                <select
                  id="new-mod-barangay"
                  value={newModBarangay}
                  onChange={(e) => setNewModBarangay(e.target.value)}
                  disabled={!newModMunicipality}
                  required
                >
                  <option value="" disabled>
                    Select Barangay...
                  </option>
                  {barangays.map((brgy) => (
                    <option key={brgy.id} value={brgy.name}>
                      {brgy.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="new-mod-username">Username</label>
                <input
                  id="new-mod-username"
                  type="text"
                  value={newModUsername}
                  onChange={(e) => setNewModUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-mod-email">Email</label>
                <input
                  id="new-mod-email"
                  type="email"
                  value={newModEmail}
                  onChange={(e) => setNewModEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-mod-password">Password</label>
                <input
                  id="new-mod-password"
                  type="password"
                  value={newModPassword}
                  onChange={(e) => setNewModPassword(e.target.value)}
                  required
                />
              </div>

              <LoadingButton
                type="submit"
                className="submit-btn"
                isLoading={loadingState.type === "createMod"}
              >
                {loadingState.type === "createMod"
                  ? "Creating..."
                  : "Create Moderator"}
              </LoadingButton>
            </form>
          </div>
        )}

        {activeTab === "mailbox" && (
          <div className="moderator-mailbox-container">
            <h3>Moderator Mailbox</h3>
            <p>Review and respond to reports and inquiries from moderators.</p>

            <div className="mailbox-filter-controls">
              <button
                onClick={() => setMailboxFilter("All")}
                className={mailboxFilter === "All" ? "active" : ""}
              >
                All ({disputeReports.length + adminMessages.length})
              </button>
              <button
                onClick={() => setMailboxFilter("Disputes")}
                className={mailboxFilter === "Disputes" ? "active" : ""}
              >
                Dispute Reports ({disputeReports.length})
              </button>
              <button
                onClick={() => setMailboxFilter("Inquiries")}
                className={mailboxFilter === "Inquiries" ? "active" : ""}
              >
                Inquiries ({adminMessages.length})
              </button>
            </div>

            {allMailboxItems.length > 0 && !replyingTo && (
              <div className="mailbox-actions">
                <button
                  className="clear-all-btn"
                  onClick={handleClearAllMessages}
                >
                  <FaTrash /> Clear All Messages
                </button>
              </div>
            )}

            {replyingTo && (
              <form className="inbox-reply-form" onSubmit={handleSendReply}>
                <h4>
                  Replying to{" "}
                  {replyingTo.reporter_username || replyingTo.sender_username}
                </h4>
                <blockquote
                  className="original-message-quote"
                  style={{ backgroundColor: "var(--admin-bg-subtle)" }}
                >
                  "{replyingTo.reason || replyingTo.issue_description}"
                </blockquote>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Write your response..."
                  required
                />
                <div className="reply-actions">
                  <button
                    type="button"
                    className="cancel-reply-btn"
                    onClick={() => setReplyingTo(null)}
                    disabled={loadingState.type === "reply"}
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    className="send-reply-btn"
                    isLoading={
                      loadingState.type === "reply" &&
                      loadingState.id === (replyingTo.reportId || replyingTo.id)
                    }
                  >
                    {loadingState.type === "reply"
                      ? "Sending..."
                      : "Send Reply"}
                  </LoadingButton>
                </div>
              </form>
            )}
            <div
              className="dispute-list"
              style={{
                maxHeight: "50vh",
                overflowY: "auto",
                marginTop: "15px",
              }}
            >
              {allMailboxItems.map((item) => (
                <div key={item.reportId || item.id} className="dispute-card">
                  <div className="dispute-body">
                    <div className="dispute-info-row">
                      <span className="info-label">From:</span>
                      <span className="info-value">
                        {item.reporter_username || item.sender_username}
                      </span>
                    </div>
                    <div className="dispute-info-row">
                      <span className="info-label">Date:</span>
                      <span className="info-value">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="dispute-info-row">
                      <span className="info-label">Subject:</span>
                      <span className="info-value">
                        {item.messageType === "Dispute"
                          ? `Dispute Report: ${item.reported_user_name}`
                          : item.issue_type}
                      </span>
                    </div>
                    <div className="dispute-info-row">
                      <span className="info-label">Status:</span>
                      <span className="info-value status-tag">
                        {item.status || "open"}
                      </span>
                    </div>
                    <strong className="message-label">Message:</strong>
                    <blockquote>
                      {item.reason || item.issue_description}
                    </blockquote>
                  </div>
                  <div className="dispute-actions">
                    <button
                      className="action-btn reply"
                      onClick={() => setReplyingTo(item)}
                      disabled={item.status === "replied"}
                    >
                      <FaReply /> Reply
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() =>
                        handleDeleteMessage(
                          item.reportId || item.id,
                          !!item.reportId
                        )
                      }
                    >
                      <FaTrash /> Delete
                    </button>
                    {item.reportedUser && (
                      <button
                        className="action-btn suspend"
                        onClick={() => {
                          const userToSuspend = localUsers.find(
                            (u) => u.username === item.reportedUser
                          );
                          if (userToSuspend)
                            handleUserStatusChange(
                              userToSuspend.id,
                              "suspended"
                            );
                        }}
                      >
                        <FaUserSlash /> Suspend User
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!replyingTo && allMailboxItems.length === 0 && (
                <div className="no-items-placeholder">
                  <p>The moderator mailbox is empty.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserManagementModal;
