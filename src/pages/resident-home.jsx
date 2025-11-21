import React, { useState, useEffect, useMemo, useRef } from "react";
import Calendar from "react-calendar";
import { useNavigate, useParams } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import "../styles/resident.css";
import {
  FaUser,
  FaCog,
  FaFileAlt,
  FaHeadset,
  FaClipboardList,
  FaInfoCircle,
  FaBell,
  FaInbox,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisH,
  FaEdit,
  FaExclamationTriangle,
  FaTrash,
  FaBullhorn,
} from "react-icons/fa";
import { MdOutlineAssignment } from "react-icons/md";
import CommentSection from "../components/comment-section.jsx";
import Header from "../components/header.jsx";
import { toast } from "react-toastify";
import ProfileModal from "../components/modal-profile.jsx";
import SettingModal from "../components/modal-settings.jsx";
import ReportModal from "../components/modal-r-report.jsx";
import { ThemeProvider } from "../components/ThemeContext.jsx";
import { LanguageProvider } from "../components/LanguageContext.jsx";
import ViewReportsModal from "../components/modal-view-reports.jsx";
import NotificationModal from "../components/modal-notification.jsx"; // Import the new modal
import RequestCertificationModal from "../components/modal-request-cert.jsx";
import ViewEventsModal from "../components/view-events-modal.jsx";
import InboxModal from "../components/modal-inbox.jsx"; // Import the modal for all events
import SupportModal from "../components/r-support-modal.jsx";
import { logAuditAction } from "../utils/auditLogger.js";
import { useLanguage } from "../components/LanguageContext.jsx";
import { checkEventStatus } from "../utils/eventUtils.js";

const ResidentPageContent = () => {
  const { id, username } = useParams();
  const [date, setDate] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isViewReportsModalOpen, setIsViewReportsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certSubmissionStatus, setCertSubmissionStatus] = useState(null); // 'submitting', 'success', 'error'
  const [reportingUser, setReportingUser] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'submitting', 'success', 'error'
  const [notifications, setNotifications] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [inboxMessages, setInboxMessages] = useState(
    () => JSON.parse(localStorage.getItem("residentInbox")) || []
  );
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [recentlyDeletedMessage, setRecentlyDeletedMessage] = useState(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);
  const [recentlyClearedItems, setRecentlyClearedItems] = useState(null); // For Clear All
  const [undoClearTimeoutId, setUndoClearTimeoutId] = useState(null);
  const [notificationClearStatus, setNotificationClearStatus] = useState(null);
  const [inboxClearStatus, setInboxClearStatus] = useState(null);
  const timersRef = useRef({});

  // State for the new event view modal
  const [isViewEventsModalOpen, setIsViewEventsModalOpen] = useState(false);
  const [eventsForModal, setEventsForModal] = useState([]);

  const [broadcasts, setBroadcasts] = useState([]);
  const [postCategories, setPostCategories] = useState([]);
  const navigate = useNavigate();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortOrder, setSortOrder] = useState("newest");
  const [serverTime, setServerTime] = useState(new Date()); // State for server-provided time
  const [filterCategory, setFilterCategory] = useState("All");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { t } = useLanguage();
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

  // --- NEW: Effect to blur header when any modal is open ---
  const isAnyModalOpen =
    isProfileModalOpen ||
    isSettingsModalOpen ||
    isReportModalOpen ||
    isViewReportsModalOpen ||
    isNotificationModalOpen ||
    isCertModalOpen ||
    isSupportModalOpen ||
    isViewEventsModalOpen ||
    isInboxModalOpen ||
    isImageModalOpen;

  useEffect(() => {
    const header = document.querySelector(".top-bar");
    if (header) {
      header.classList.toggle("blurred", isAnyModalOpen);
    }
  }, [isAnyModalOpen]);

  const getCategoryClass = (categoryName) => {
    if (!categoryName) return "category-general";
    return `category-${categoryName.toLowerCase().replace(/\s+/g, "-")}`;
  };

  // Load data and listen for changes from other tabs
  useEffect(() => {
    // Centralized data loading function
    const loadData = async () => {
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      if (!userProfile?.id) return;

      try {
        const [
          inboxRes,
          reportsRes,
          notifRes,
          announcementsRes,
          categoriesRes,
          broadcastsRes,
          eventsRes,
          timeRes,
        ] = await Promise.all([
          fetch(`http://localhost:5000/api/resident_inbox/${userProfile.id}`),
          fetch(`http://localhost:5000/api/reports/user/${userProfile.id}`),
          fetch(`http://localhost:5000/api/notifications/${userProfile.id}`),
          fetch(
            `http://localhost:5000/api/announcements/barangay/${userProfile.barangay_id}`
          ),
          fetch("http://localhost:5000/api/announcement-categories"),
          fetch("http://localhost:5000/api/broadcasts"),
          fetch(
            `http://localhost:5000/api/events/barangay/${userProfile.barangay_id}`
          ),
          fetch("http://localhost:5000/api/time"),
        ]);

        if (inboxRes.ok) setInboxMessages(await inboxRes.json());
        if (reportsRes.ok) setUserReports(await reportsRes.json());
        if (notifRes.ok) setNotifications(await notifRes.json());
        if (announcementsRes.ok) setPosts(await announcementsRes.json());
        if (broadcastsRes.ok) {
          const allBroadcasts = await broadcastsRes.json();
          const dismissedIds =
            JSON.parse(localStorage.getItem("dismissedBroadcasts")) || [];
          const activeAndNotDismissed = allBroadcasts.filter(
            (b) => b.is_active && !dismissedIds.includes(b.id)
          );
          setBroadcasts(activeAndNotDismissed);
        }
        if (categoriesRes.ok) setPostCategories(await categoriesRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
        if (timeRes.ok) {
          const { currentTime: serverTimeValue } = await timeRes.json();
          setServerTime(new Date(serverTimeValue));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Could not load data. Please try refreshing the page.");
      }
    };
    loadData();

    const handleStorageChange = (e) => {
      if (
        [
          "announcements",
          "userReports",
          "notifications",
          "calendarEvents",
          "residentInbox",
          "systemBroadcasts",
        ].includes(e.key)
      ) {
        loadData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [submissionStatus, certSubmissionStatus]);

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

  // Filter and sort posts
  const processedPosts = useMemo(() => {
    let filtered =
      filterCategory === "All"
        ? posts
        : posts.filter((post) => post.category === filterCategory);

    return filtered.sort((a, b) =>
      sortOrder === "newest" ? b.id - a.id : a.id - b.id
    );
  }, [posts, filterCategory, sortOrder]);
  // --- Comment Handler ---
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

      // Update the state correctly
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
      logAuditAction("Added Comment", { postId, comment: text }, "resident");
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
      logAuditAction("Edited Comment", { commentId, newText }, "resident");
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
        logAuditAction("Deleted Comment", { commentId }, "resident");
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error("Could not delete comment.");
      }
    }
  };

  const handleReportComment = (comment) => {
    setReportingUser(comment.author);
    setIsSupportModalOpen(true);
    logAuditAction(
      "Opened Report Form for Comment",
      { reportedUser: comment.author, commentId: comment.id },
      "resident"
    );

    // Notify the support modal (in case it's rendered via portal) so it can
    // prefill and scroll to the report area reliably.
    // Small timeout gives React time to render the modal into the DOM.
    setTimeout(() => {
      // This custom event is for a more robust way to communicate with the modal,
      // especially if it were rendered in a portal or a different part of the DOM tree.
      // The modal will listen for this event and scroll to the report section.
      window.dispatchEvent(
        new CustomEvent("openSupportReport", {
          detail: { reportedUser: comment.author, commentId: comment.id },
        })
      );
    }, 60); // A small delay is enough for React to render the modal.
  };

  const handleReportUserSubmit = (reportedUserName, reason) => {
    const newReport = {
      id: Date.now(),
      date: Date.now(),
      status: "submitted",
      type: "User Behavior", // A new, distinct type
      description: `Report against ${reportedUserName}: ${reason}`,
      media: [],
      location: null,
    };
    setUserReports((prev) => [...prev, newReport]);
    logAuditAction(
      "Submitted User Behavior Report",
      { reportedUser: reportedUserName },
      "resident"
    );
    alert(
      `Your report against "${reportedUserName}" has been submitted to the moderator for review.`
    );
  };

  const handleReportSubmit = async (reportData) => {
    // In a real app, you'd send this to a server.
    setSubmissionStatus("submitting");

    try {
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      if (!userProfile || !userProfile.id) {
        throw new Error("User not logged in.");
      }

      const formData = new FormData();
      formData.append("userId", userProfile.id);
      formData.append("type", reportData.type);
      formData.append("description", reportData.description);
      if (reportData.location) {
        formData.append("locationLat", reportData.location.lat);
        formData.append("locationLng", reportData.location.lng);
        formData.append("locationAddress", reportData.location.address);
      }

      // Append each file to the FormData object
      reportData.media.forEach((file) => {
        formData.append("media", file);
      });

      const response = await fetch("http://localhost:5000/api/reports", {
        method: "POST",
        body: formData, // Send FormData instead of JSON
      });

      if (!response.ok) {
        throw new Error("Failed to submit report to the server.");
      }

      const data = await response.json();
      logAuditAction(
        "Submitted Report",
        { reportId: data.reportId, type: reportData.type },
        "resident"
      );
      setSubmissionStatus("success");
      setTimeout(() => {
        setIsReportModalOpen(false);
        setSubmissionStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Report submission failed:", error);
      setSubmissionStatus("error");
    }
  };

  const handleCancelReport = async (reportId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/${reportId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "canceled" }),
        }
      );
      if (!response.ok) throw new Error("Failed to cancel report.");

      setUserReports((prevReports) =>
        prevReports.map((report) =>
          report.id === reportId ? { ...report, status: "canceled" } : report
        )
      );
      logAuditAction("Canceled Report by Resident", { reportId }, "resident");
    } catch (error) {
      console.error("Failed to cancel report:", error);
      alert("Error: Could not cancel the report.");
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this report? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/reports/${reportId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Failed to delete report.");
        setUserReports((prev) => prev.filter((r) => r.id !== reportId));
        logAuditAction("Deleted Report by Resident", { reportId }, "resident");
      } catch (error) {
        console.error("Failed to delete report:", error);
        alert("Error: Could not delete the report.");
      }
    }
  };

  const handleCertRequestSubmit = async (requestData) => {
    setCertSubmissionStatus("submitting");
    const minLoadingTime = 2000; // 2 seconds
    const startTime = Date.now();

    try {
      const apiCallPromise = fetch(
        "http://localhost:5000/api/certificate_requests",
        {
          method: "POST",
          body: requestData,
        }
      );

      const [response] = await Promise.all([
        apiCallPromise,
        new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - (Date.now() - startTime))
        ),
      ]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit request.");
      }

      const data = await response.json();
      logAuditAction(
        "Submitted Certificate Request",
        { certId: data.requestId, type: requestData.certificateType },
        "resident"
      );
      setCertSubmissionStatus("success");

      setTimeout(() => {
        setIsCertModalOpen(false);
        setCertSubmissionStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Certificate request submission failed:", error);
      setCertSubmissionStatus("error");
    }
  };

  const handleOpenCertModal = () => {
    setIsCertModalOpen(true);
  };

  const handleOpenViewReports = async () => {
    setIsViewReportsModalOpen(true);
    // Mark all report-related notifications as read on the backend
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (userProfile && userProfile.id) {
      try {
        await fetch(
          `http://localhost:5000/api/notifications/mark-read-by-type/${userProfile.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "report_update" }),
          }
        );
        // Optimistically update the UI
        const updatedNotifications = notifications.map((n) =>
          n.type === "report_update" ? { ...n, is_read: 1 } : n
        );
        setNotifications(updatedNotifications);
      } catch (error) {
        console.error("Failed to mark report notifications as read:", error);
      }
    }
  };

  const handleOpenNotifications = async () => {
    setIsNotificationModalOpen(true);
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (userProfile && userProfile.id) {
      try {
        // Mark only general (non-report) notifications as read on the backend
        await fetch(
          `http://localhost:5000/api/notifications/mark-all-read/${userProfile.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            // We tell the backend to mark everything *except* 'report_update' as read.
            body: JSON.stringify({ type: "report_update", inverse: true }),
          }
        );
        // Optimistically update the UI to reflect the change
        const updatedNotifications = notifications.map((n) => ({
          ...n,
          is_read: 1,
        }));

        setNotifications(updatedNotifications);
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
  };

  const handleClearNotifications = () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      setNotificationClearStatus("clearing");
      setTimeout(() => {
        setNotifications([]);
        setNotificationClearStatus("success");
        setTimeout(() => {
          setNotificationClearStatus(null);
          setIsNotificationModalOpen(false);
        }, 1000);
      }, 1500);
    }
  };

  const handleDeleteNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      // 1. Tell the server to update the message status.
      await fetch(
        `http://localhost:5000/api/resident_inbox/${messageId}/read`,
        {
          method: "PUT",
        }
      );

      // 2. Re-fetch the inbox to get the latest data, ensuring the UI is in sync.
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      if (userProfile && userProfile.id) {
        const inboxRes = await fetch(
          `http://localhost:5000/api/resident_inbox/${userProfile.id}`
        );
        if (inboxRes.ok) {
          const inboxData = await inboxRes.json();
          setInboxMessages(inboxData);
        }
      }
    } catch (error) {
      console.error("Failed to mark message as read on server:", error);
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      const updatedMessages = inboxMessages.filter(
        (msg) => msg.id !== messageId
      );
      setInboxMessages(updatedMessages);
    }
  };

  const handleClearInbox = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all messages from your inbox?"
      )
    ) {
      setInboxClearStatus("clearing");
      setTimeout(() => {
        setInboxMessages([]);
        setInboxClearStatus(null);
        setIsInboxModalOpen(false);
      }, 1000);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logAuditAction("User Logged Out", {}, "resident");
    // Use a short timeout to make the loading screen visible
    setTimeout(() => {
      localStorage.removeItem("userProfile");
      navigate("/login");
    }, 500);
  };

  // --- Image Preview Modal Logic (Moved from ViewReportsModal) ---
  const openImageModal = (allImages, index) => {
    setModalImages(allImages);
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => setIsImageModalOpen(false);

  const nextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % modalImages.length);
  const prevImage = () =>
    setCurrentImageIndex(
      (prev) => (prev - 1 + modalImages.length) % modalImages.length
    );

  // --- Image Rendering Logic ---
  const renderPostImages = (postImages, onClickFunction) => {
    const totalImages = postImages.length;
    const visibleImages = totalImages > 3 ? postImages.slice(0, 3) : postImages;

    return (
      <div
        className={`update-images update-images-${Math.min(totalImages, 4)}`}
      >
        {visibleImages.map((img, index) => (
          <img
            src={`http://localhost:5000${img}`}
            alt={`post ${index}`}
            key={index}
            onClick={() => onClickFunction(postImages, index)}
          />
        ))}
        {totalImages >= 4 && (
          <div
            className="image-count-overlay"
            onClick={() => onClickFunction(postImages, 3)}
          >
            <span>+{totalImages - 3}</span>
          </div>
        )}
      </div>
    );
  };

  // --- Image Preview Modal Component ---
  const ImagePreviewModal = () => {
    if (!isImageModalOpen || modalImages.length === 0) return null;

    return (
      <div className="preview-modal-overlay" onClick={closeImageModal}>
        <div
          className="preview-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-btn" onClick={closeImageModal}>
            <FaTimes />
          </button>
          <img
            src={`http://localhost:5000${modalImages[currentImageIndex]}`}
            alt={`Preview ${currentImageIndex + 1}`}
            className="modal-image"
          />
          {modalImages.length > 1 && (
            <>
              <button className="nav-btn prev-btn" onClick={prevImage}>
                <FaChevronLeft size={30} />
              </button>
              <button className="nav-btn next-btn" onClick={nextImage}>
                <FaChevronRight size={30} />
              </button>
            </>
          )}
          <div className="image-counter">
            {currentImageIndex + 1} of {modalImages.length}
          </div>
        </div>
      </div>
    );
  };

  const handleTileMouseEnter = (date) => {
    clearTimeout(hoverTimeoutRef.current);
    const dateString = date.toISOString().split("T")[0];
    const dayEvents = events.filter((event) => event.date === dateString);

    if (dayEvents.length > 0) {
      hoverTimeoutRef.current = setTimeout(() => {
        setEventsForModal(dayEvents);
        setHoveredDate(date);
        setIsViewEventsModalOpen(true);
      }, 500); // 500ms delay before showing modal
    }
  };

  const handleTileMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
  };

  const handleModalMouseLeave = () => {
    // Optional: close modal when mouse leaves it
    // For better UX, we can leave it open until the user explicitly closes it.
    // If you want it to close, uncomment the line below.
    // setIsViewEventsModalOpen(false);
  };

  const handleDateClick = (clickedDate) => {
    // Set the date for the modal title
    setDate(clickedDate);

    // Get the date part (YYYY-MM-DD) from the clicked date
    const year = clickedDate.getFullYear();
    const month = String(clickedDate.getMonth() + 1).padStart(2, "0");
    const day = String(clickedDate.getDate()).padStart(2, "0");
    const clickedDateString = `${year}-${month}-${day}`;

    // Filter events to find ones that match the clicked date
    const dayEvents = events.filter(
      (event) => event.event_date === clickedDateString
    );

    // If there are events, set them in state and open the modal
    setEventsForModal(dayEvents);
    setIsViewEventsModalOpen(true);
  };

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

  // --- Event Logic for Resident View ---
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of today

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
  }, [events, serverTime]);

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      // Get the date part (YYYY-MM-DD) from the calendar tile's date object
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      // Find all events for the current calendar day that have NOT ended
      const dayEvents = events.filter(
        (event) =>
          // Compare YYYY-MM-DD strings directly for timezone safety
          event.event_date.split("T")[0] === dateString &&
          checkEventStatus(event, currentTime) && // Ensure status is not null
          !checkEventStatus(event, currentTime).hasEnded
      );

      if (dayEvents.length > 0) {
        // Only show a dot if there are active/upcoming events
        return (
          <>
            <div className="event-dot"></div>
            <div className="event-tooltip">
              {dayEvents.map(
                (
                  event // Now 'dayEvents' is correctly defined and can be mapped
                ) => (
                  <div key={event.id} className="event-tooltip-item">
                    <strong>{event.title}</strong>
                    {event.description && <p>{event.description}</p>}
                  </div>
                )
              )}
            </div>
          </>
        );
      }
    }
    return null;
  };

  const handleBroadcastMouseEnter = (broadcastId) => {
    const timer = timersRef.current[broadcastId];
    if (timer) {
      clearTimeout(timer.timerId);
      const elapsedTime = Date.now() - timer.startTime;
      timer.remaining -= elapsedTime;
    }
  };

  const handleBroadcastMouseLeave = (broadcastId) => {
    const timer = timersRef.current[broadcastId];
    if (timer && timer.remaining > 0) {
      timer.startTime = Date.now();
      timer.timerId = setTimeout(() => {
        handleCloseBroadcast(broadcastId);
      }, timer.remaining);
    }
  };

  return (
    <div className="home-page">
      {isLoggingOut && (
        <div className="logout-overlay">
          <div className="spinner"></div>
          <p>Logging out...</p>
        </div>
      )}
      <ImagePreviewModal />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SettingModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        role="resident"
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSubmissionStatus(null);
        }}
        onSubmit={handleReportSubmit}
        submissionStatus={submissionStatus}
      />

      <ViewReportsModal
        isOpen={isViewReportsModalOpen}
        onClose={() => setIsViewReportsModalOpen(false)}
        reports={userReports}
        onCancelReport={handleCancelReport}
        onDeleteReport={handleDeleteReport}
        onOpenImage={openImageModal}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onClear={handleClearNotifications}
        onDelete={handleDeleteNotification}
        submissionStatus={notificationClearStatus}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        onReportUser={handleReportUserSubmit}
        initialReportedUser={reportingUser}
      />

      <RequestCertificationModal
        isOpen={isCertModalOpen}
        onClose={() => {
          setIsCertModalOpen(false);
          setCertSubmissionStatus(null); // Reset submission status when modal closes
        }}
        onSubmit={handleCertRequestSubmit}
        submissionStatus={certSubmissionStatus}
      />

      <ViewEventsModal
        isOpen={isViewEventsModalOpen}
        onClose={() => setIsViewEventsModalOpen(false)}
        events={eventsForModal}
        date={date}
      />

      <InboxModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        messages={inboxMessages}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDeleteMessage}
        onClearAll={handleClearInbox}
        submissionStatus={inboxClearStatus}
      />

      {/* ✅ Using your Header.jsx */}
      <Header
        onLogout={handleLogout}
        onProfileClick={() => setIsProfileModalOpen(true)}
      />
      {broadcasts.length > 0 && (
        <div className="broadcast-banner-container">
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className={`broadcast-item type-${b.type}`}
              onMouseEnter={() => handleBroadcastMouseEnter(b.id)}
              onMouseLeave={() => handleBroadcastMouseLeave(b.id)}
            >
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
        <aside className="left-panel">
          <div className="side-buttons">
            <button
              className="sidebar-btn orange"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <FaUser size={30} />
              <span>{t("profile")}</span>
            </button>

            <button
              className="sidebar-btn blue notification-bell-btn"
              onClick={handleOpenNotifications}
            >
              <FaBell size={30} />
              <span>{t("notifications")}</span>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="notification-badge">
                  {notifications.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>

            <button
              className="sidebar-btn soft-blue notfication-bell-btn"
              onClick={() => setIsInboxModalOpen(true)}
            >
              <FaInbox size={30} />
              <span>{t("inbox")}</span>
              {inboxMessages.filter((m) => !m.is_read).length > 0 && ( // Corrected from isRead
                <span className="notification-badge">
                  {inboxMessages.filter((m) => !m.is_read).length}
                </span>
              )}
            </button>

            <button
              className="sidebar-btn purple"
              onClick={handleOpenViewReports}
            >
              <FaClipboardList size={30} />
              <span>{t("viewTrackReports")}</span>
              {notifications.filter(
                (n) => n.type === "report_update" && !n.is_read
              ).length > 0 && (
                <span className="notification-badge">
                  {
                    notifications.filter(
                      (n) => n.type === "report_update" && !n.is_read
                    ).length
                  }
                </span>
              )}
            </button>

            <button className="sidebar-btn teal" onClick={handleOpenCertModal}>
              <MdOutlineAssignment size={30} />
              <span>{t("requestCertification")}</span>
            </button>

            <button
              className="sidebar-btn red"
              onClick={() => setIsReportModalOpen(true)}
            >
              <FaFileAlt size={30} />
              <span>{t("fileReport")}</span>
            </button>

            <button
              className="sidebar-btn green"
              onClick={() => setIsSupportModalOpen(true)}
            >
              <FaHeadset size={30} />
              <span>{t("support")}</span>
            </button>

            <button
              className="sidebar-btn gray"
              onClick={() => setIsSettingsModalOpen(true)}
            >
              <FaCog size={30} />
              <span>{t("settings")}</span>
            </button>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="main-content">
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
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">{t("newestFirst")}</option>
              <option value="oldest">{t("oldestFirst")}</option>
            </select>
          </div>
          {processedPosts.length > 0 ? (
            <>
              {processedPosts.map((post) => (
                <div className="update-card" key={post.id}>
                  <div className="post-header">
                    <img
                      src={
                        post.authorAvatar
                          ? `http://localhost:5000${post.authorAvatar}`
                          : defaultAvatar
                      }
                      alt="author avatar"
                      className="author-avatar"
                    />
                    <div className="post-info">
                      <span className="author-name">{post.author}</span>
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
                      </span>
                    </div>
                    <button className="options-btn" title="Post Options">
                      <FaEllipsisH size={18} />
                    </button>
                  </div>

                  {post.title && <p className="update-title">{post.title}</p>}
                  <p className="update-description">{post.description}</p>

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

                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      margin: "15px 0 0 0",
                    }}
                  ></div>

                  <CommentSection
                    postId={post.id}
                    comments={post.comments ? JSON.parse(post.comments) : []}
                    handleAddComment={handleAddComment}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onReportComment={handleReportComment}
                    currentUser={JSON.parse(
                      localStorage.getItem("userProfile")
                    )}
                  />
                </div>
              ))}
            </>
          ) : (
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
        </main>

        {/* Right Panel */}
        <aside className="right-panel">
          <div className="calendar-box">
            <h4>CALENDAR</h4>
            <Calendar
              value={date}
              tileContent={tileContent}
              onClickDay={handleDateClick}
            />
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
                      onClick={() => {
                        // Correctly parse the date to avoid timezone shifts.
                        const [year, month, day] = event.event_date
                          .split("T")[0]
                          .split("-")
                          .map(Number);
                        handleDateClick(new Date(year, month - 1, day));
                      }}
                    >
                      <div className="event-item-header">
                        <p className="event-item-title">{event.title}</p>
                        <span
                          className={
                            status.text === "Happening Now"
                              ? "event-status-now" // Red
                              : status.text === "Today"
                              ? "event-status-today" // Blue
                              : status.text === "Tomorrow"
                              ? "event-status-upcoming" // Green (for tomorrow)
                              : "event-status-upcoming" // Default Green
                          }
                        >
                          {status.text}
                        </span>
                      </div>
                      {event.description && (
                        <p className="event-item-desc">{event.description}</p>
                      )}
                      <p className="event-item-date-display">
                        {new Date(
                          event.event_date.split("T")[0].replace(/-/g, "/")
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
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

function Home() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ResidentPageContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default Home;
