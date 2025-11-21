import React, { useState, useRef, useEffect } from "react";
import {
  FaTimes,
  FaCamera,
  FaUpload,
  FaPaperPlane,
  FaMapMarkerAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import "../styles/modal-r-report.css";

const ReportModal = ({ isOpen, onClose, onSubmit, submissionStatus }) => {
  if (!isOpen) return null;

  const [reportCategories, setReportCategories] = useState([]);
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [location, setLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaPreviews]);

  useEffect(() => {
    return () => {
      if (!isOpen) {
        stopCamera();
        mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
        setLocation(null);
        setMediaFiles([]);
        setMediaPreviews([]);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchReportCategories = async () => {
        try {
          const response = await fetch(
            "http://localhost:5000/api/report-categories"
          );
          if (!response.ok) {
            throw new Error("Failed to fetch report categories");
          }
          const data = await response.json(); // This will be an array of objects like {id, name}
          setReportCategories(data);
          if (data.length > 0 && !reportType) {
            setReportType(data[0].name); // Set the first category name as default
          }
        } catch (error) {
          console.error("Error fetching report categories:", error);
          // Fallback to default categories if fetch fails
          const defaultCategories = [
            { name: "General Maintenance" },
            { name: "Safety Hazard" },
            { name: "Noise Complaint" },
            { name: "Pest Control" },
            { name: "Facilities Issue" },
          ];
          setReportCategories(defaultCategories);
          setReportType(defaultCategories[0]?.name || "");
        }
      };
      fetchReportCategories();
    }
  }, [isOpen, reportType]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setMediaFiles((prev) => [...prev, ...files]);
      const newPreviews = files.map((file) => URL.createObjectURL(file)); // This was missing for uploaded files
      setMediaPreviews((prev) => [...prev, ...newPreviews]);
      e.target.value = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Your device does not support camera access.");
      return;
    }

    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Camera error:", error);
      setIsCameraActive(false);
      alert("Unable to access camera. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takePicture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    // Flip the canvas context horizontally to counteract the CSS mirror effect
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `capture-${Date.now()}.png`, {
          type: "image/png",
        });
        setMediaFiles((prev) => [...prev, capturedFile]);
        setMediaPreviews((prev) => [...prev, URL.createObjectURL(blob)]);
        stopCamera();
      }
    }, "image/png");
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setLocation({ lat: latitude, lng: longitude, address: address });
        } catch (error) {
          setLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          });
        }

        setIsFetchingLocation(false);
      },
      () => {
        alert(
          "Unable to retrieve your location. Please check your browser permissions."
        );
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleRemoveLocation = () => {
    setLocation(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reportType || !description) {
      alert("Please select a report type and add a description.");
      return;
    }

    // Pass data to parent component
    onSubmit({
      type: reportType,
      description: description,
      media: mediaFiles,
      location: location, // Include location data
    });

    // The parent component will now handle closing and resetting.
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleRemoveImage = (i) => {
    URL.revokeObjectURL(mediaPreviews[i]);
    setMediaFiles((prev) => prev.filter((_, index) => index !== i));
    setMediaPreviews((prev) => prev.filter((_, index) => index !== i));
  };

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div
        className="report-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {submissionStatus && (
          <div className="submission-overlay">
            {submissionStatus === "submitting" && (
              <>
                <div className="spinner"></div>
                <p>Sending your report...</p>
              </>
            )}
            {submissionStatus === "success" && (
              <>
                <FaCheckCircle className="success-icon" size={60} />
                <p>Report Submitted Successfully!</p>
              </>
            )}
            {submissionStatus === "error" && (
              <>
                <FaExclamationCircle className="error-icon" size={60} />
                <p>Something went wrong. Please try again.</p>
                <button
                  type="button"
                  className="submit-report-btn"
                  onClick={handleSubmit}
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* Camera View */}
        {isCameraActive && (
          <div className="camera-view">
            <video ref={videoRef} autoPlay playsInline></video>
            <div className="camera-controls">
              <button
                type="button"
                className="close-camera-btn"
                onClick={stopCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="capture-btn"
                onClick={takePicture}
              >
                <FaCamera size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="modal-header">
          <h2>New Resident Report</h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="report-form" onSubmit={handleSubmit}>
          <div className="setting-item-column">
            <label htmlFor="report-type">Report Type:</label>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              required
            >
              {reportCategories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-item-column">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the issue..."
              required
            />
          </div>

          <div className="setting-item-column">
            <label>Add Evidence (Optional):</label>
            <div className="evidence-buttons">
              <label htmlFor="file-upload" className="evidence-btn">
                <FaUpload size={16} /> Upload Picture
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="button"
                className="evidence-btn"
                onClick={startCamera}
              >
                <FaCamera size={16} /> Take Picture
              </button>
            </div>
          </div>

          {/* Location Section */}
          <div className="setting-item-column">
            <label>Location (Optional):</label>
            {location ? (
              <div className="location-preview osm-preview">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    location.lng - 0.0005
                  },${location.lat - 0.00025},${location.lng + 0.0005},${
                    location.lat + 0.00025
                  }&layer=mapnik&marker=${location.lat},${location.lng}`}
                  title="Report Location Preview"
                />
                <div className="location-actions">
                  <button
                    type="button"
                    className="refresh-location-btn"
                    onClick={handleGetLocation}
                    disabled={isFetchingLocation}
                  >
                    <FaSyncAlt className={isFetchingLocation ? "spin" : ""} />
                    {isFetchingLocation ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    className="remove-location-btn"
                    onClick={handleRemoveLocation}
                  >
                    <FaTimes /> Remove
                  </button>
                </div>
                <p>{location.address}</p>
              </div>
            ) : (
              <button
                type="button"
                className="evidence-btn location-btn"
                onClick={handleGetLocation}
                disabled={isFetchingLocation}
              >
                <FaMapMarkerAlt size={16} />
                {isFetchingLocation
                  ? "Getting Location..."
                  : "Add Current Location"}
              </button>
            )}
          </div>

          {mediaPreviews.length > 0 && (
            <div className="image-preview-gallery">
              {mediaPreviews.map((url, index) => (
                <div key={index} className="image-preview">
                  <img src={url} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="submit-report-btn"
            disabled={!reportType || !description}
          >
            <FaPaperPlane size={16} /> Submit Report
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
