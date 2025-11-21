import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Calendar from "react-calendar";
import { useNavigate, Link, useParams } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import "../styles/moderator-home.css";
// Import only icons needed in ModeratorHome (sidebar, posts, modals, etc.)
import {
  FaUser,
  FaPlus,
  FaFileAlt,
  FaChartBar,
  FaInfoCircle,
  FaCog,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisH,
  FaBell,
  FaEdit,
  FaTrash,
  FaHeadset,
  FaSyncAlt,
  FaCheckCircle,
  FaInbox,
  FaExclamationTriangle,
  FaBullhorn,
} from "react-icons/fa";
import { MdOutlineAssignment } from "react-icons/md";
import ReviewCertsModal from "../components/m-review-certs.jsx";
import ReportUserModal from "../components/m-report-user-modal.jsx";
import SupportModal from "../components/m-support-modal.jsx";
import AnalyticsDashboard from "../components/m-analytics-dashboard.jsx";
import CommentSection from "../components/comment-section.jsx";
import "../styles/m-create-post.css";
import ModeratorInboxModal from "../components/m-inbox-modal.jsx";
import ReviewReportModal from "../components/m-review-report.jsx"; // Import the new modal
import PostModal from "../components/m-create-post.jsx";
import NotificationModal from "../components/modal-notification.jsx";
import EventModal from "../components/m-event-modal.jsx";
// Import the new Header component
import Header from "../components/header.jsx";
import ProfileModal from "../components/modal-profile.jsx";
import SettingModal from "../components/modal-settings.jsx";
import { ThemeProvider } from "../components/ThemeContext";
import {
  LanguageProvider,
  useLanguage,
} from "../components/LanguageContext.jsx";
import { logAuditAction } from "../utils/auditLogger.js";
import { toast } from "react-toastify";
import { checkEventStatus } from "../utils/eventUtils.js";
import defaultAvatar from "../assets/default-avatar.png"; // Import the default avatar

// =========================================================
// Main Content Feed Component
// =========================================================
const MainContentFeed = ({
  posts,
  handleDeletePost,
  handleEditClick,
  renderPostImages,
  openImageModal,
  handleAddComment,
  openMenuPostId,
  setOpenMenuPostId,
  handleEditComment,
  handleDeleteComment,
  handleReportComment,
  getCategoryClass,
  currentUser,
  t,
  getRandomColor,
}) => {
  return (
    <div className="feed-content">
                  {/* Posts Feed - Social Media Style */}           {" "}
      {posts.map((post) => (
        <div className="update-card" key={post.id}>
                             {" "}
          <div className="post-header">
                                   {" "}
            <img
              src={
                post.authorAvatar
                  ? `http://localhost:5000${post.authorAvatar}`
                  : defaultAvatar
              }
              alt="author avatar"
              className="author-avatar"
            />
                                 {" "}
            <div className="post-info">
                                         {" "}
              <span className="author-name">{post.author}</span>               
                         {" "}
              <span className="post-time">
                {post.category && (
                  <span
                    className="post-category-badge"
                    style={{
                      backgroundColor: getRandomColor(post.category),
                    }}
                  >
                    {post.category}
                  </span>
                )}
                {new Date(post.created_at).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                                           {" "}
              </span>
                                     {" "}
            </div>
            <div className="post-actions-container">
              <button
                className="options-btn"
                onClick={() =>
                  setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)
                }
              >
                <FaEllipsisH size={18} />
              </button>
              {openMenuPostId === post.id && (
                <div className="post-actions-menu">
                  <button
                    onClick={() => {
                      handleEditClick(post);
                      setOpenMenuPostId(null);
                    }}
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => {
                      handleDeletePost(post.id);
                      setOpenMenuPostId(null);
                    }}
                    className="delete"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              )}
            </div>
                               {" "}
          </div>
                                                 {" "}
          {post.title && <p className="update-title">{post.title}</p>}         
                    <p className="update-description">{post.description}</p>   
                         {" "}
          {post.images &&
            typeof post.images === "string" &&
            (() => {
              const imageArray = JSON.parse(post.images);
              return (
                imageArray &&
                imageArray.length > 0 &&
                renderPostImages(imageArray, openImageModal)
              );
            })()}
                              {/* Comment Section Divider */}                   {" "}
          <div
            style={{ borderTop: "1px solid #e5e7eb", margin: "15px 0 0 0" }}
          ></div>
                                                  {/* Comment Section */}       
                     {" "}
          <CommentSection
            postId={post.id}
            comments={post.comments ? JSON.parse(post.comments) : []}
            handleAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onReportComment={handleReportComment}
            onDeleteComment={handleDeleteComment}
            currentUser={JSON.parse(localStorage.getItem("userProfile")) || {}}
          />
                         {" "}
        </div>
      ))}
                             {" "}
      {posts.length === 0 && (
        <div className="no-announcements">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
            alt="No announcements"
            className="no-announcement-icon"
          />
          <h3>{t("noAnnouncementsYet")}</h3>
          <p>{t("noAnnouncementsDescription")}</p>
        </div>
      )}
             {" "}
    </div>
  );
};

const ModeratorPageContent = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const { id, username } = useParams();
  const timersRef = useRef({});
  const [broadcasts, setBroadcasts] = useState([]);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState([]); // To hold the actual File objects
  const [imagePreviews, setImagePreviews] = useState([]); // To hold the blob URLs for preview
  const [postCategory, setPostCategory] = useState("General"); // For new posts
  // These are now handled by the backend query (ORDER BY)
  // const [sortOrder, setSortOrder] = useState("newest");
  // const [filterCategory, setFilterCategory] = useState("All");

  const [postCategories, setPostCategories] = useState([]);
  // NEW: State for filtering
  const [filterCategory, setFilterCategory] = useState("All");

  // --- NEW: Random Color Generation for Categories ---
  const categoryColors = useRef({});
  const getRandomColor = (category) => {
    if (!categoryColors.current[category]) {
      // Generate a random vibrant, dark color to ensure white text is readable
      const hue = Math.floor(Math.random() * 360);
      const saturation = Math.floor(Math.random() * 30) + 70; // 70-100%
      const lightness = Math.floor(Math.random() * 20) + 40; // 40-60%
      categoryColors.current[
        category
      ] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    return categoryColors.current[category];
  };
  // --- END NEW ---

  const getCategoryClass = (categoryName) => {
    if (!categoryName) return "category-general";
    return `category-${categoryName.toLowerCase().replace(/\s+/g, "-")}`;
  };

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [moderatorNotifications, setModeratorNotifications] = useState([]);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [isReviewReportModalOpen, setIsReviewReportModalOpen] = useState(false);
  const [isReviewCertsModalOpen, setIsReviewCertsModalOpen] = useState(false);
  const [allReports, setAllReports] = useState(
    () => JSON.parse(localStorage.getItem("userReports")) || []
  );
  const [isReportUserModalOpen, setIsReportUserModalOpen] = useState(false);
  const [reportingUser, setReportingUser] = useState(null); // For reporting a user/comment
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [moderatorInbox, setModeratorInbox] = useState(
    () => JSON.parse(localStorage.getItem("moderatorInbox")) || []
  );
  const [certificationRequests, setCertificationRequests] = useState([]);
  const [undoClearTimeoutId, setUndoClearTimeoutId] = useState(null);
  const [inboxClearStatus, setInboxClearStatus] = useState(null);

  // Event-related state
  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState(new Date());
  const [currentEvent, setCurrentEvent] = useState({
    id: null,
    title: "",
    description: "",
    time: "",
    endTime: "",
    date: new Date(),
  });
  const [notificationStatus, setNotificationStatus] = useState(null); // 'clearing'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [postSubmissionStatus, setPostSubmissionStatus] = useState(null); // 'saving', 'deleting', 'success'
  const [eventSubmissionStatus, setEventSubmissionStatus] = useState(null); // 'saving', 'deleting', 'success'

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [serverTime, setServerTime] = useState(new Date()); // State for server-provided time
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);
  const [activeMainTab, setActiveMainTab] = useState("feed"); // 'feed' or 'analytics'
  const [analyticsData, setAnalyticsData] = useState(null); // State for analytics
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const newCertsCount = certificationRequests.filter(
    (req) => req.status === "Pending"
  ).length;

  // --- NEW: Effect to blur header when any modal is open ---
  const isAnyModalOpen =
    isPostModalOpen ||
    isProfileModalOpen ||
    isSettingsModalOpen ||
    isNotificationModalOpen ||
    isReviewReportModalOpen ||
    isReviewCertsModalOpen ||
    isReportUserModalOpen ||
    isSupportModalOpen ||
    isInboxModalOpen ||
    isEventModalOpen ||
    isImageModalOpen;

  useEffect(() => {
    const header = document.querySelector(".top-bar");
    if (header) {
      if (isAnyModalOpen) {
        header.classList.add("blurred");
      } else {
        header.classList.remove("blurred");
      }
    }
  }, [isAnyModalOpen]);
  // Helper to format time from 'HH:mm' to 'h:mm A'
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // This is now the single function to load all necessary data for the moderator.
  const loadData = async () => {
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (!userProfile?.id) {
      console.error("No user profile found for moderator.");
      return;
    }

    try {
      const [
        certsRes,
        reportsRes,
        notifRes,
        announcementsRes,
        categoriesRes,
        broadcastsRes,
        eventsRes,
        analyticsRes, // Add analytics request
        timeRes, // Add the missing variable for the time fetch
        inboxRes, // Add inbox request
      ] = await Promise.all([
        fetch(
          `http://localhost:5000/api/certificate_requests/moderator/${userProfile.id}`
        ),
        fetch(`http://localhost:5000/api/reports/moderator/${userProfile.id}`),
        fetch(`http://localhost:5000/api/notifications/${userProfile.id}`),
        fetch(
          `http://localhost:5000/api/announcements/barangay/${userProfile.barangay_id}`
        ),
        fetch("http://localhost:5000/api/announcement-categories"),
        fetch("http://localhost:5000/api/broadcasts"),
        fetch(
          `http://localhost:5000/api/events/barangay/${userProfile.barangay_id}`
        ),
        fetch(
          `http://localhost:5000/api/moderator/${userProfile.id}/analytics`
        ), // Fetch analytics data
        fetch("http://localhost:5000/api/time"), // Fetch server time
        fetch(`http://localhost:5000/api/moderator_inbox/${userProfile.id}`), // Fetch inbox messages
      ]);

      if (certsRes.ok) setCertificationRequests(await certsRes.json());
      if (reportsRes.ok) setAllReports(await reportsRes.json());
      if (notifRes.ok) setModeratorNotifications(await notifRes.json());
      if (broadcastsRes.ok) {
        const allBroadcasts = await broadcastsRes.json();
        const dismissedIds =
          JSON.parse(localStorage.getItem("dismissedBroadcasts")) || [];
        const activeAndNotDismissed = allBroadcasts.filter(
          (b) => b.is_active && !dismissedIds.includes(b.id)
        );
        setBroadcasts(activeAndNotDismissed);
      }
      if (announcementsRes.ok) setPosts(await announcementsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (categoriesRes.ok) {
        const categoryData = await categoriesRes.json();
        if (analyticsRes.ok) setAnalyticsData(await analyticsRes.json()); // Set analytics data
        setPostCategories(categoryData);
      }
      if (timeRes.ok) {
        const { currentTime } = await timeRes.json();
        setServerTime(new Date(currentTime));
      }
      if (inboxRes.ok) setModeratorInbox(await inboxRes.json());
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      alert("There was an error loading some data. Please try refreshing.");
    }
  };

  const [date, setDate] = useState(new Date());

  useEffect(() => {
    loadData();

    const handleStorageChange = (e) => {
      // Listen for broader changes that might affect moderator data
      if (
        [
          "userProfile",
          "announcements",
          "userReports",
          "notifications",
        ].includes(e.key)
      ) {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []); // Run only once on mount. `loadData` is stable.

  const filteredPosts = useMemo(() => {
    if (filterCategory === "All") {
      return posts;
    }
    return posts.filter((post) => post.category === filterCategory);
  }, [posts, filterCategory]);

  // NEW: Effect to update current time every 30 seconds for live event checking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const handleCloseBroadcast = (broadcastId) => {
    setBroadcasts((prev) => prev.filter((b) => b.id !== broadcastId)); // Remove from view
    // Add to dismissed list in localStorage
    const dismissedIds =
      JSON.parse(localStorage.getItem("dismissedBroadcasts")) || [];
    if (!dismissedIds.includes(broadcastId)) {
      localStorage.setItem(
        "dismissedBroadcasts",
        JSON.stringify([...dismissedIds, broadcastId])
      );
    }
    // Clear any running timers for this broadcast
    if (timersRef.current[broadcastId]) {
      clearTimeout(timersRef.current[broadcastId].timerId);
      delete timersRef.current[broadcastId];
    }
  };

  // Auto-dismiss non-critical broadcasts after 10 seconds
  useEffect(() => {
    broadcasts.forEach((broadcast) => {
      if (broadcast.type !== "critical" && !timersRef.current[broadcast.id]) {
        timersRef.current[broadcast.id] = {
          timerId: setTimeout(() => {
            handleCloseBroadcast(broadcast.id);
          }, 10000), // 10 seconds
          startTime: Date.now(),
          remaining: 10000,
        };
      }
    });

    // Cleanup timers when component unmounts or broadcasts change
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        if (timer && timer.timerId) {
          clearTimeout(timer.timerId);
        }
      });
    };
  }, [broadcasts]);

  // Helper to convert a file to a base64 data URL
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handlePost = async () => {
    setPostSubmissionStatus("saving");
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    try {
      // TODO: Implement editing logic (PUT request)
      if (editingPost) {
        alert("Editing is not yet connected to the database.");
        // Here you would make a PUT request to /api/announcements/:id
      } else {
        // Creating a new post

        const formData = new FormData();
        formData.append("userId", userProfile.id);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", postCategory);

        // Append each image file
        imageFiles.forEach((file) => {
          formData.append("images", file);
        });

        const response = await fetch(
          "http://localhost:5000/api/announcements",
          {
            method: "POST",
            // The browser will automatically set the Content-Type to multipart/form-data
            body: formData,
          }
        );

        if (!response.ok) throw new Error("Failed to create announcement.");

        await loadData();

        logAuditAction("Created Announcement", { title }, "moderator");
      }

      setPostSubmissionStatus("success");
      setTimeout(() => {
        handleClosePostModal();
      }, 1000);
    } catch (error) {
      console.error("Failed to post announcement:", error);
      alert("Error: Could not create the announcement.");
      // On error, just reset the submission status to allow the user to try again.
      setPostSubmissionStatus(null);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles((prevFiles) => [...prevFiles, ...files]);

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setImageFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setImagePreviews((prevPreviews) =>
      prevPreviews.filter((_, index) => index !== indexToRemove)
    );
  };

  const handlePermanentDeleteReport = async (reportId) => {
    if (
      window.confirm("Are you sure you want to permanently delete this report?")
    ) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/reports/${reportId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Failed to delete report.");

        setAllReports((prev) =>
          prev.filter((report) => report.id !== reportId)
        );
        logAuditAction("Deleted Report", { reportId }, "moderator");
      } catch (error) {
        console.error("Failed to delete report:", error);
        alert("Error: Could not delete the report.");
      }
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/${reportId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error("Failed to update report status.");

      setAllReports((prevReports) =>
        prevReports.map((report) =>
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );

      logAuditAction(
        "Updated Report Status",
        { reportId, newStatus },
        "moderator"
      );
    } catch (error) {
      console.error("Failed to update report status:", error);
      alert("Error: Could not update the report status.");
    }

    // TODO: This notification logic should also be moved to the backend
    const reportToUpdate = allReports.find((r) => r.id === reportId);
    if (!reportToUpdate) return;

    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    const moderatorName = userProfile?.name || "Moderator";

    // Create a notification for the report update
    const notif = {
      id: Date.now(),
      type: "report_update",
      message: `Your report "${reportToUpdate.type}" has been updated to "${newStatus}" by ${moderatorName}.`,
      reportId: reportId,
      isRead: false,
      date: Date.now(),
    };
    const currentNotifs =
      JSON.parse(localStorage.getItem("notifications")) || [];
    localStorage.setItem(
      "notifications",
      JSON.stringify([notif, ...currentNotifs])
    );
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setPostSubmissionStatus("deleting");
      try {
        const response = await fetch(
          `http://localhost:5000/api/announcements/${postId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Failed to delete post.");

        setPosts(posts.filter((post) => post.id !== postId));
        logAuditAction("Deleted Announcement", { postId }, "moderator");
        setPostSubmissionStatus("success");
      } catch (error) {
        console.error("Failed to delete post:", error);
        alert("Error: Could not delete the post.");
      }
      setTimeout(() => setPostSubmissionStatus(null), 1000);
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setTitle(post.title);
    setDescription(post.description);
    setPostCategory(post.category || "General");
    setImagePreviews(post.images || []); // For editing, we only have the URLs
    setIsPostModalOpen(true);
  };

  const handleUpdateCertRequestStatus = async (requestId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/certificate_requests/${requestId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update status on the server.");
      }

      // Update the state locally to reflect the change in the UI immediately
      const updatedRequests = certificationRequests.map((req) =>
        req.id === requestId ? { ...req, status: newStatus } : req
      );
      setCertificationRequests(updatedRequests);

      // Find the request to get more details for a better audit log message.
      const requestDetails = certificationRequests.find(
        (req) => req.id === requestId
      );

      logAuditAction(
        "Updated Certificate Request Status",
        {
          requestId,
          newStatus,
          certificateType: requestDetails?.type || "N/A",
          residentName: `${requestDetails?.firstName || ""} ${
            requestDetails?.lastName || ""
          }`.trim(),
        },
        "moderator"
      );

      // TODO: Convert this notification logic to use the database instead of localStorage
      const requestToUpdate = certificationRequests.find(
        (req) => req.id === requestId
      );
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      const moderatorName = userProfile?.name || "Moderator";
      const notif = {
        id: Date.now() + 1,
        type: "cert_update",
        message: `Your request for "${
          requestToUpdate.type
        }" has been ${newStatus.toLowerCase()} by ${moderatorName}.`,
        requestId: requestId,
        isRead: false,
        date: Date.now(),
      };
      const currentNotifs =
        JSON.parse(localStorage.getItem("notifications")) || [];
      localStorage.setItem(
        "notifications",
        JSON.stringify([notif, ...currentNotifs])
      );
    } catch (error) {
      console.error("Failed to update certificate status:", error);
      alert("Error: Could not update the request status. Please try again.");
    }
  };

  const handleDeleteCertRequest = async (requestId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/certificate_requests/${requestId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete request on the server.");
      }

      // Update the state locally to remove the request from the UI
      const updatedRequests = certificationRequests.filter(
        (req) => req.id !== requestId
      );
      setCertificationRequests(updatedRequests);

      logAuditAction(
        "Permanently Deleted Certificate Request",
        { requestId },
        "moderator"
      );
    } catch (error) {
      console.error("Failed to delete certificate request:", error);
      alert("Error: Could not delete the request. Please try again.");
    }
  };

  const handleOpenNotifications = async () => {
    setIsNotificationModalOpen(true);
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (userProfile && userProfile.id) {
      try {
        await fetch(
          `http://localhost:5000/api/notifications/mark-all-read/${userProfile.id}`,
          { method: "PUT" }
        );
        setModeratorNotifications(
          moderatorNotifications.map((n) => ({
            ...n,
            is_read: 1,
            isRead: true,
          }))
        );
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
  };

  const handleClearNotifications = async () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      setNotificationStatus("clearing");
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      try {
        await fetch(
          `http://localhost:5000/api/notifications/clear-all/${userProfile.id}`,
          { method: "DELETE" }
        );
        setModeratorNotifications([]);
        setNotificationStatus("success");
        setTimeout(() => {
          setNotificationStatus(null);
          setIsNotificationModalOpen(false);
        }, 1000);
      } catch (error) {
        console.error("Failed to clear notifications:", error);
        setNotificationStatus(null);
        alert("Error: Could not clear notifications.");
      }
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setModeratorNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to delete notification:", error);
      alert("Error: Could not delete the notification.");
    }
  };

  const handleOpenInbox = async () => {
    setIsInboxModalOpen(true);
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (userProfile?.id) {
      try {
        await fetch(
          `http://localhost:5000/api/moderator_inbox/mark-all-read/${userProfile.id}`,
          { method: "PUT" }
        );
        setModeratorInbox((prev) =>
          prev.map((msg) => ({ ...msg, is_read: 1 }))
        );
      } catch (error) {
        console.error("Failed to mark all messages as read:", error);
      }
    }
  };

  const handleMarkInboxAsRead = async (messageId) => {
    try {
      await fetch(
        `http://localhost:5000/api/moderator_inbox/${messageId}/read`,
        { method: "PUT" }
      );
      setModeratorInbox((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_read: 1 } : msg))
      );
      logAuditAction(
        "Marked Inbox Message as Read",
        { messageId },
        "moderator"
      );
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const handleDeleteInboxMessage = async (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await fetch(`http://localhost:5000/api/moderator_inbox/${messageId}`, {
          method: "DELETE",
        });
        setModeratorInbox((prev) => prev.filter((msg) => msg.id !== messageId));
        logAuditAction("Deleted Inbox Message", { messageId }, "moderator");
        toast.success("Message deleted.");
      } catch (error) {
        console.error("Failed to delete message:", error);
        toast.error("Could not delete the message.");
      }
    }
  };

  const handleClearInbox = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all messages from the inbox?"
      )
    ) {
      setInboxClearStatus("clearing");
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      if (!userProfile?.id) {
        setInboxClearStatus(null);
        return;
      }
      try {
        // This endpoint needs to be created on the backend
        // await fetch(`http://localhost:5000/api/moderator_inbox/clear-all/${userProfile.id}`, { method: 'DELETE' });
        setModeratorInbox([]); // Optimistically clear UI

        setInboxClearStatus(null);
        logAuditAction("Cleared All Inbox Messages", {}, "moderator");
        setIsInboxModalOpen(false);
      } catch (error) {
        console.error("Failed to clear inbox:", error);
        toast.error("Could not clear the inbox.");
        setInboxClearStatus(null);
      }
    }
  };

  const handleClearAllDashboardData = () => {
    if (
      window.confirm(
        "DANGER: Are you sure you want to permanently delete ALL reports and certificate requests? This action cannot be undone."
      )
    ) {
      setAllReports([]);
      setCertificationRequests([]);
      localStorage.removeItem("userReports");
      localStorage.removeItem("certificationRequests");
      logAuditAction(
        "Cleared All Dashboard Data (Reports & Requests)",
        {},
        "moderator"
      );
    }
  };

  const handleSendReplyToResident = async (originalMessage, replyText) => {
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    if (!userProfile) return;

    try {
      // 1. Send the reply to the backend
      const response = await fetch(
        "http://localhost:5000/api/reply-to-resident",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderatorId: userProfile.id,
            residentId: originalMessage.from_user_id,
            originalMessage: originalMessage,
            replyText: replyText,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send reply.");

      // 2. Mark the original message in the moderator's inbox as 'replied'
      await fetch(
        `http://localhost:5000/api/moderator_inbox/${originalMessage.id}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "replied" }),
        }
      );

      // 3. Update local state to reflect the change
      const updatedModInbox = moderatorInbox.map((msg) =>
        msg.id === originalMessage.id ? { ...msg, status: "replied" } : msg
      );
      setModeratorInbox(updatedModInbox);

      logAuditAction(
        "Replied to Resident Inquiry",
        {
          residentId: originalMessage.from_user_id,
          subject: originalMessage.title,
        },
        "moderator"
      );
      toast.success("Your reply has been sent to the resident.");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("Error: Could not send your reply.");
    }
  };

  const handleClosePostModal = () => {
    setIsPostModalOpen(false);
    setEditingPost(null); // Clear editing state
    setTitle("");
    setDescription("");
    setImageFiles([]);
    setImagePreviews([]);
    setPostCategory("General");
    setPostSubmissionStatus(null);
  };

  // For now, just navigate to login. In a real app, you'd clear tokens/session state.
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem("userProfile");
      navigate("/login");
    }, 500);
  };

  const handleAddComment = async (postId, userId, text) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/announcements/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, text }),
        }
      );
      if (!response.ok) throw new Error("Failed to post comment.");

      const newComment = await response.json();

      // Correctly update the state by parsing and re-stringifying the comments
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const currentComments = post.comments
              ? JSON.parse(post.comments)
              : [];
            const updatedComments = [...currentComments, newComment];
            return { ...post, comments: JSON.stringify(updatedComments) };
          }
          return post;
        })
      );
      toast.success("Comment posted!");
      logAuditAction("Added Comment", { postId, comment: text }, "moderator");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Could not post comment. Please try again.");
    }
  };

  const handleEditComment = async (commentId, newText, userId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: newText, userId }),
        }
      );
      if (!response.ok) throw new Error("Failed to edit comment.");

      await loadData(); // Refetch all data to show the update
      toast.success("Comment updated.");
      logAuditAction("Edited Comment", { commentId, newText }, "moderator");
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("Could not update comment.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        await fetch(`http://localhost:5000/api/comments/${commentId}`, {
          method: "DELETE",
        });
        await loadData(); // Refetch all data to show the update
        toast.success("Comment deleted.");
        logAuditAction("Deleted Comment", { commentId }, "moderator");
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error("Could not delete comment.");
      }
    }
  };

  const handleReportComment = (comment) => {
    setReportingUser(comment.author); // Pass the author's name
    setIsSupportModalOpen(true); // Open the main support modal
    logAuditAction(
      "Opened Report Form for Comment",
      { reportedUser: comment.author, commentId: comment.id },
      "moderator"
    );
  };

  const handleReportCommentSubmit = (user, reason) => {
    // 'user' here is the comment object we passed
    console.log(
      `Reporting comment by ${user.author} to admin. Reason: ${reason}`
    );
    const adminMessage = {
      id: Date.now(),
      subject: `Comment Report: ${user.author}`,
      body: `A comment has been reported.\n\nAuthor: ${user.author}\nComment: "${user.text}"\n\nReason for report: ${reason}`,
      date: Date.now(),
      isRead: false,
    };
    // In a real app, this would go to an admin-specific inbox, but for now, we can log it
    // or create a new localStorage item for admin messages.
    logAuditAction(
      "Reported Comment to Admin",
      { reportedUser: user.author, commentId: user.id, reason },
      "moderator"
    );
  };

  // --- Event Handlers ---
  const handleSelectDate = (date) => {
    setDate(date);
    // For simplicity, we'll just show events for the selected day.
    // Clicking a date doesn't open the modal directly anymore,
    // but you could change this behavior if you want.
  };

  const handleOpenEventModal = (eventToEdit = null) => {
    if (eventToEdit) {
      // When editing, parse the date string safely to avoid timezone shifts.
      // The date from the server is now YYYY-MM-DD. We need to parse it correctly.
      const [year, month, day] = eventToEdit.event_date.split("-").map(Number);
      const safeDate = new Date(year, month - 1, day);
      setSelectedEventDate(safeDate);
      setCurrentEvent({
        id: eventToEdit.id,
        title: eventToEdit.title,
        description: eventToEdit.description,
        time: eventToEdit.start_time || "",
        endTime: eventToEdit.end_time || "",
      });
    } else {
      // --- Prevent adding events on past dates ---
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight for accurate date comparison

      if (date < today) {
        alert("You cannot add an event for a past date.");
        return; // Stop the function here
      }
      // --- End of check ---

      // When creating, ensure the date is treated as local, not UTC.
      // This prevents the "one day off" bug.
      const localDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      setSelectedEventDate(localDate);
      setCurrentEvent({
        id: null,
        title: "",
        description: "",
        time: "",
        endTime: "",
      });
    }
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId) => {
    setEventSubmissionStatus("deleting");
    try {
      const response = await fetch(
        `http://localhost:5000/api/events/${eventId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete event.");

      await loadData(); // Re-fetch data to update UI
      logAuditAction("Deleted Event", { eventId }, "moderator");
      setEventSubmissionStatus("success");
      setTimeout(() => {
        setIsEventModalOpen(false);
        setEventSubmissionStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Error: Could not delete the event.");
      setEventSubmissionStatus(null);
    }
  };

  const handleSaveEvent = async () => {
    setEventSubmissionStatus("saving");
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    // Helper to format date to YYYY-MM-DD in the local timezone, preventing UTC conversion.
    const toYYYYMMDD = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const eventData = {
      userId: userProfile.id,
      title: currentEvent.title,
      description: currentEvent.description,
      // Send the date in YYYY-MM-DD format to match what the backend sends.
      event_date: toYYYYMMDD(selectedEventDate),
      start_time: currentEvent.time,
      end_time: currentEvent.endTime,
    };

    try {
      let response;
      if (currentEvent.id) {
        // Update existing event
        response = await fetch(
          `http://localhost:5000/api/events/${currentEvent.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          }
        );
        logAuditAction(
          "Updated Event",
          { eventId: currentEvent.id, title: currentEvent.title },
          "moderator"
        );
      } else {
        // Create new event
        response = await fetch(`http://localhost:5000/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        logAuditAction(
          "Created Event",
          { title: currentEvent.title },
          "moderator"
        );
      }

      if (!response.ok) throw new Error("Failed to save event.");

      await loadData(); // Re-fetch all data to update the UI
      setEventSubmissionStatus("success");
      setTimeout(() => {
        setIsEventModalOpen(false);
        setEventSubmissionStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Error: Could not save the event.");
      setEventSubmissionStatus(null);
    }
  };
  const handleEndEvent = async (eventId) => {
    setEventSubmissionStatus("saving");
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5); // Format as HH:mm

    try {
      const response = await fetch(
        `http://localhost:5000/api/events/${eventId}/end`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endTime }),
        }
      );

      if (!response.ok) throw new Error("Failed to end event.");

      await loadData(); // Re-fetch data to update the UI
      logAuditAction(
        "Manually Ended Event",
        { eventId: eventId, eventTitle: currentEvent.title },
        "moderator"
      );
      setEventSubmissionStatus("success");
      setTimeout(() => {
        setIsEventModalOpen(false);
        setEventSubmissionStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Failed to end event:", error);
      alert("Error: Could not end the event.");
      setEventSubmissionStatus(null);
    }
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setEventSubmissionStatus(null);
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      // Timezone-safe date formatting
      const toYYYYMMDD = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const dateString = toYYYYMMDD(date);
      const hasEvent = events.some(
        (event) => event.event_date.split("T")[0] === dateString
      );
      return hasEvent ? <div className="event-dot"></div> : null;
    }
    return null;
  };

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison.

    const filteredAndSortedEvents = events
      .filter((event) => {
        const dateString = event.event_date.split("T")[0];
        const [year, month, day] = dateString.split("-").map(Number);
        const eventDate = new Date(year, month - 1, day);
        return eventDate >= today;
      })
      .sort((a, b) => {
        const statusA = checkEventStatus(a, serverTime);
        const statusB = checkEventStatus(b, serverTime);

        if (
          statusA?.text === "Happening Now" &&
          statusB?.text !== "Happening Now"
        )
          return -1;
        if (
          statusA?.text !== "Happening Now" &&
          statusB?.text === "Happening Now"
        )
          return 1;

        return new Date(a.event_date) - new Date(b.event_date);
      });
    return filteredAndSortedEvents;
  }, [events, serverTime]); // --- Image Preview Modal Logic (for existing posts) ---

  const openImageModal = (allImages, index) => {
    setModalImages(allImages);
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % modalImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prevIndex) => (prevIndex - 1 + modalImages.length) % modalImages.length
    );
  }; // --- Image Rendering Logic (for posts in feed) ---
  const renderPostImages = (postImages, onClickFunction) => {
    const totalImages = postImages.length;
    const visibleImages = totalImages > 3 ? postImages.slice(0, 3) : postImages;

    return (
      <div
        className={`update-images update-images-${Math.min(totalImages, 4)}`}
      >
                       {" "}
        {visibleImages.map((img, index) => (
          <img
            src={`http://localhost:5000${img}`}
            alt={`post ${index}`}
            key={index}
            onClick={() => onClickFunction(postImages, index)}
          />
        ))}
                       {" "}
        {totalImages >= 4 && (
          <div
            className="image-count-overlay"
            onClick={() => onClickFunction(postImages, 3)}
          >
                                    <span>+{totalImages - 3}</span>             
                 {" "}
          </div>
        )}
                   {" "}
      </div>
    );
  }; // --- Image Rendering Logic (for post modal preview) ---

  const renderPreviewImages = (previewImages, onRemove) => {
    const totalImages = previewImages.length;
    return (
      <div
        className={`preview-images preview-images-${Math.min(totalImages, 4)}`}
      >
                       {" "}
        {previewImages.slice(0, 4).map((img, index) => (
          <div className="preview-image-container" key={index}>
                                <img src={img} alt={`preview ${index}`} />
            <button
              type="button"
              className="remove-preview-btn"
              onClick={() => onRemove(index)}
            >
              <FaTimes />
            </button>
          </div>
        ))}
                       {" "}
        {previewImages.length > 4 && (
          <div className="preview-count-overlay">
                                    <span>+{previewImages.length - 4}</span>   
                           {" "}
          </div>
        )}
                   {" "}
      </div>
    );
  }; // --- Image Preview Modal Component ---

  const ImagePreviewModal = () => {
    if (!isImageModalOpen || modalImages.length === 0) return null;

    return (
      <div className="preview-modal-overlay" onClick={closeImageModal}>
                       {" "}
        <div
          className="preview-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
                                                 {" "}
          <button className="close-btn" onClick={closeImageModal}>
            <FaTimes />
          </button>
                                                 {" "}
          <img
            src={`http://localhost:5000${modalImages[currentImageIndex]}`}
            alt={`Preview ${currentImageIndex + 1}`}
            className="modal-image"
          />
                             {" "}
          {modalImages.length > 1 && (
            <>
                                         {" "}
              <button className="nav-btn prev-btn" onClick={prevImage}>
                                                <FaChevronLeft size={30} />     
                                     {" "}
              </button>
                                         {" "}
              <button className="nav-btn next-btn" onClick={nextImage}>
                                                <FaChevronRight size={30} />   
                                       {" "}
              </button>
                                     {" "}
            </>
          )}
                             {" "}
          <div className="image-counter">
                                    {currentImageIndex + 1} of{" "}
            {modalImages.length}                   {" "}
          </div>
                         {" "}
        </div>
                   {" "}
      </div>
    );
  };

  // Calculate the number of new reports to show in the badge
  const newReportsCount = allReports.filter(
    (report) => report.status === "submitted"
  ).length;

  return (
    <div className="moderator-page">
      {isLoggingOut && (
        <div className="logout-overlay">
          <div className="spinner"></div>
          <p>Logging out...</p>
        </div>
      )}
      <ImagePreviewModal />
      {/* --- NEW: Global Post Submission Overlay --- */}
      {postSubmissionStatus && (
        <div className="submission-overlay-global">
          <div className="submission-content">
            {postSubmissionStatus === "saving" && (
              <>
                <div className="spinner"></div>
                <p>{editingPost ? "Saving Changes..." : "Creating Post..."}</p>
              </>
            )}
            {postSubmissionStatus === "deleting" && (
              <>
                <div className="spinner"></div>
                <p>Deleting Post...</p>
              </>
            )}
            {postSubmissionStatus === "success" && (
              <>
                <FaCheckCircle className="success-icon" size={60} />
                <p>Success!</p>
              </>
            )}
          </div>
        </div>
      )}

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <PostModal
        isOpen={isPostModalOpen}
        onClose={handleClosePostModal}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        images={imagePreviews} // Pass previews to the modal
        setImages={setImagePreviews} // This prop might be removable later
        handlePost={handlePost}
        renderPreviewImages={(imgs) =>
          renderPreviewImages(imgs, handleRemoveImage)
        }
        editingPost={editingPost}
        category={postCategory}
        setCategory={setPostCategory}
        handleImageChange={handleImageChange}
      />

      <SettingModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        role="moderator"
      />

      <ReviewReportModal
        isOpen={isReviewReportModalOpen}
        onClose={() => setIsReviewReportModalOpen(false)}
        reports={allReports}
        onUpdateReportStatus={handleUpdateReportStatus}
        onDeleteReport={handlePermanentDeleteReport}
      />

      <ReviewCertsModal
        isOpen={isReviewCertsModalOpen}
        onClose={() => setIsReviewCertsModalOpen(false)}
        requests={certificationRequests}
        onUpdateStatus={handleUpdateCertRequestStatus}
        onDeleteRequest={handleDeleteCertRequest}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={moderatorNotifications}
        onClear={handleClearNotifications}
        onDelete={handleDeleteNotification}
        submissionStatus={notificationStatus}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={handleCloseEventModal}
        selectedDate={selectedEventDate}
        event={currentEvent}
        setEventTitle={(title) =>
          setCurrentEvent((prev) => ({ ...prev, title }))
        }
        setEventDescription={(description) =>
          setCurrentEvent((prev) => ({ ...prev, description }))
        }
        setEventTime={(time) => setCurrentEvent((prev) => ({ ...prev, time }))}
        setEventEndTime={(endTime) =>
          setCurrentEvent((prev) => ({ ...prev, endTime }))
        }
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        onEnd={handleEndEvent}
        submissionStatus={eventSubmissionStatus}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        initialReportedUser={reportingUser}
      />

      <ModeratorInboxModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        messages={moderatorInbox}
        onMarkAsRead={handleMarkInboxAsRead}
        onDelete={handleDeleteInboxMessage}
        onClearAll={handleClearInbox}
        onReply={handleSendReplyToResident}
        submissionStatus={inboxClearStatus}
      />

      <ReportUserModal
        isOpen={isReportUserModalOpen}
        onClose={() => setIsReportUserModalOpen(false)}
        user={reportingUser}
        onSubmit={handleReportCommentSubmit}
      />

      {/* Use the new Header Component */}
      <Header
        onProfileClick={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />
      {broadcasts.length > 0 && (
        <div className="broadcast-banner-container">
          {broadcasts.map((b) => (
            <div key={b.id} className={`broadcast-item type-${b.type}`}>
              <div className="broadcast-message">
                <FaBullhorn style={{ marginRight: "10px", flexShrink: 0 }} />
                <p>
                  <strong>Broadcast:</strong> {b.message}
                </p>
              </div>
              <button
                onClick={() => handleCloseBroadcast(b.id)}
                className="broadcast-close-btn"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="content">
        {/* Left Sidebar */}
        <aside className="m-left-panel">
          <div className="m-side-buttons">
            <button
              className="m-sidebar-btn orange"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <FaUser size={30} />
              <span>{t("profile")}</span>
            </button>

            <button
              className="m-sidebar-btn blue notification-bell-btn"
              onClick={handleOpenNotifications}
            >
              <FaBell size={30} />
              <span>{t("notifications")}</span>
              {moderatorNotifications.filter((n) => !n.is_read).length > 0 && (
                <span className="notification-badge">
                  {moderatorNotifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>

            <button
              className="m-sidebar-btn soft-blue"
              onClick={handleOpenInbox}
            >
              <FaInbox size={30} />
              <span>{t("inbox")}</span>
              {moderatorInbox.filter((m) => !m.is_read).length > 0 && (
                <span className="notification-badge">
                  {moderatorInbox.filter((m) => !m.is_read).length}
                </span>
              )}
            </button>

            <button
              className="m-sidebar-btn purple"
              onClick={() => setIsPostModalOpen(true)}
            >
              <FaPlus size={30} />
              <span>{t("createAnnouncement")}</span>
            </button>

            <button
              className="m-sidebar-btn teal"
              onClick={() => setIsReviewCertsModalOpen(true)}
            >
              <MdOutlineAssignment size={30} />
              <span>{t("certificationRequests")}</span>
              {newCertsCount > 0 && (
                <span className="notification-badge">{newCertsCount}</span>
              )}
            </button>

            <button
              className="m-sidebar-btn red"
              onClick={() => setIsReviewReportModalOpen(true)}
            >
              <FaFileAlt size={30} />
              <span>{t("residentReports")}</span>
              {newReportsCount > 0 && (
                <span className="notification-badge">{newReportsCount}</span>
              )}
            </button>

            <button
              className="m-sidebar-btn green"
              onClick={() => setIsSupportModalOpen(true)}
            >
              <FaHeadset size={30} />
              <span>{t("support")}</span>
            </button>

            <button
              className="m-sidebar-btn gray"
              onClick={() => setIsSettingsModalOpen(true)}
            >
              <FaCog size={30} />
              <span>{t("settings")}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Feed Component */}
        <main className="main-content">
          <div className="main-content-tabs">
            <button
              className={`main-tab-btn ${
                activeMainTab === "feed" ? "active" : ""
              }`}
              onClick={() => setActiveMainTab("feed")}
            >
              Announcements Feed
            </button>
            <button
              className={`main-tab-btn ${
                activeMainTab === "analytics" ? "active" : ""
              }`}
              onClick={() => setActiveMainTab("analytics")}
            >
              Dashboard & Analytics
            </button>
          </div>

          {activeMainTab === "analytics" ? (
            <AnalyticsDashboard
              reports={allReports}
              requests={certificationRequests}
              analyticsData={analyticsData}
              onClearAllData={handleClearAllDashboardData}
            />
          ) : (
            <>
              <div className="feed-controls">
                <h3 className="feed-title">{t("announcementsFeed")}</h3>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">{t("allCategories")}</option>
                  {postCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <MainContentFeed
                posts={filteredPosts}
                handleDeletePost={handleDeletePost}
                renderPostImages={renderPostImages}
                getRandomColor={getRandomColor}
                handleEditClick={handleEditClick}
                openImageModal={openImageModal}
                openMenuPostId={openMenuPostId}
                setOpenMenuPostId={setOpenMenuPostId}
                handleAddComment={handleAddComment}
                handleEditComment={handleEditComment}
                handleDeleteComment={handleDeleteComment}
                handleReportComment={handleReportComment}
                currentUser={
                  JSON.parse(localStorage.getItem("userProfile")) || {}
                }
                getCategoryClass={getCategoryClass}
                t={t}
              />
            </>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="right-panel">
          <div className="calendar-box">
            <h4>CALENDAR</h4>
            <Calendar
              value={date}
              onChange={handleSelectDate}
              tileContent={tileContent}
            />
            <button
              className="add-event-btn"
              onClick={() => handleOpenEventModal()}
            >
              Add Event for this Date
            </button>
          </div>

          <div className="events-box">
            <h4>UPCOMING EVENTS</h4>
            <div className="events-list">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => {
                  // Use serverTime for status checks
                  const status = checkEventStatus(event, serverTime);

                  const eventClasses = `event-item ${
                    status.text === "Today" ? "event-item-today" : ""
                  } ${
                    status.text === "Happening Now"
                      ? "event-item-now"
                      : status.text === "Finished"
                      ? "event-item-ended"
                      : "event-item-upcoming"
                  }`;
                  return (
                    <div
                      key={event.id}
                      className={eventClasses}
                      onClick={() =>
                        handleOpenEventModal({
                          ...event,
                          // Ensure the date passed to the modal is also timezone-safe
                          date: event.event_date.split("T")[0],
                        })
                      }
                    >
                      <div className="event-item-header">
                        <p className="event-item-title">{event.title}</p>
                        {status && (
                          <span
                            className={
                              status.text === "Happening Now"
                                ? "event-status-now"
                                : status.text === "Today"
                                ? "event-status-today"
                                : status.text === "Tomorrow"
                                ? "event-status-upcoming" // Green (for tomorrow)
                                : "event-status-upcoming" // Default Green
                            }
                          >
                            {status.text}
                          </span>
                        )}
                      </div>
                      <p className="event-item-desc">{event.description}</p>
                      <p className="event-item-date-display">
                        {(() => {
                          // Consistently parse the date as local to avoid timezone shifts.
                          const [year, month, day] = event.event_date
                            .split("T")[0]
                            .split("-")
                            .map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          });
                        })()}
                        {event.start_time && (
                          <span className="event-item-time">
                            {" at "}
                            {formatTime(event.start_time)}
                            {event.end_time
                              ? ` - ${formatTime(event.end_time)}`
                              : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="no-events-message">
                  No upcoming events scheduled.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

function ModeratorHome() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ModeratorPageContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default ModeratorHome;
