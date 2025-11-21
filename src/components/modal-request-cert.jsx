import React, { useState, useRef, useEffect } from "react";
import {
  FaTimes,
  FaCamera,
  FaUpload,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import "../styles/modal-request-cert.css";

const CERTIFICATE_TYPES = [
  "Select Certificate Type",
  "Barangay Clearance",
  "Certificate of Residency",
  "Certificate of Indigency",
  "Certificate of Good Moral Character",
];

const RequestCertificationModal = ({
  isOpen,
  onClose,
  onSubmit,
  submissionStatus,
}) => {
  const [idImages, setIdImages] = useState({ front: null, back: null });
  const [residencyFiles, setResidencyFiles] = useState({
    govIdFront: null,
    govIdBack: null,
    utilityBill: null,
  });
  const [indigencyFiles, setIndigencyFiles] = useState({
    front: null,
    back: null,
  });
  const [goodMoralFiles, setGoodMoralFiles] = useState({
    govIdFront: null,
    govIdBack: null,
    proofOfResidency: null,
    communityTaxCert: null,
  });

  const [idPreviews, setIdPreviews] = useState({ front: null, back: null });
  const [residencyPreviews, setResidencyPreviews] = useState({
    govIdFront: null,
    govIdBack: null,
    utilityBill: null,
  });
  const [indigencyPreviews, setIndigencyPreviews] = useState({
    front: null,
    back: null,
  });
  const [goodMoralPreviews, setGoodMoralPreviews] = useState({
    govIdFront: null,
    govIdBack: null,
    proofOfResidency: null,
    communityTaxCert: null,
  });

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFor, setCameraFor] = useState(null); // 'front' or 'back'
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [certType, setCertType] = useState(CERTIFICATE_TYPES[0]);
  const [purpose, setPurpose] = useState("");
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    civilStatus: "",
    lengthOfResidency: "",
  });

  // Pre-fill user info from localStorage
  useEffect(() => {
    if (isOpen) {
      const userProfile = JSON.parse(localStorage.getItem("userProfile"));
      if (userProfile) {
        setPersonalInfo({
          firstName: userProfile.firstName || "",
          lastName: userProfile.lastName || "",
          middleName: userProfile.middleName || "",
          civilStatus: "",
          dob: userProfile.dob ? userProfile.dob.split("T")[0] : "", // Format date for input
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    // Cleanup object URLs on unmount
    return () => {
      if (idPreviews.front) URL.revokeObjectURL(idPreviews.front);
      if (idPreviews.back) URL.revokeObjectURL(idPreviews.back);
      if (residencyPreviews.govIdFront)
        URL.revokeObjectURL(residencyPreviews.govIdFront);
      if (residencyPreviews.govIdBack)
        URL.revokeObjectURL(residencyPreviews.govIdBack);
      if (residencyPreviews.utilityBill)
        URL.revokeObjectURL(residencyPreviews.utilityBill);
      if (indigencyPreviews.front) URL.revokeObjectURL(indigencyPreviews.front);
      if (indigencyPreviews.back) URL.revokeObjectURL(indigencyPreviews.back);
      if (goodMoralPreviews.govIdFront)
        URL.revokeObjectURL(goodMoralPreviews.govIdFront);
      if (goodMoralPreviews.govIdBack)
        URL.revokeObjectURL(goodMoralPreviews.govIdBack);
      if (goodMoralPreviews.proofOfResidency)
        URL.revokeObjectURL(goodMoralPreviews.proofOfResidency);
      if (goodMoralPreviews.communityTaxCert)
        URL.revokeObjectURL(goodMoralPreviews.communityTaxCert);
    };
  }, []);

  useEffect(() => {
    // Cleanup on modal close
    if (!isOpen) {
      // Revoke all existing object URLs to prevent memory leaks
      [
        idPreviews,
        residencyPreviews,
        indigencyPreviews,
        goodMoralPreviews,
      ].forEach((previewGroup) => {
        Object.values(previewGroup).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
      });

      // Reset all state to initial values
      setCertType(CERTIFICATE_TYPES[0]);
      setPurpose("");
      setIdImages({ front: null, back: null });
      setIdPreviews({ front: null, back: null });
      setResidencyFiles({
        govIdFront: null,
        govIdBack: null,
        utilityBill: null,
      });
      setResidencyPreviews({
        govIdFront: null,
        govIdBack: null,
        utilityBill: null,
      });
      setIndigencyFiles({ front: null, back: null });
      setIndigencyPreviews({ front: null, back: null });
      setGoodMoralFiles({
        govIdFront: null,
        govIdBack: null,
        proofOfResidency: null,
        communityTaxCert: null,
      });
      setGoodMoralPreviews({
        govIdFront: null,
        govIdBack: null,
        proofOfResidency: null,
        communityTaxCert: null,
      });
      setPersonalInfo({ firstName: "", middleName: "", lastName: "" });
      stopCamera();
    }
  }, [isOpen]);

  const handleFileChange = (e, fileKey, formType) => {
    const file = e.target.files[0];
    if (file) {
      const newPreviewUrl = URL.createObjectURL(file);
      switch (formType) {
        case "clearance":
          if (idPreviews[fileKey]) URL.revokeObjectURL(idPreviews[fileKey]);
          setIdImages((prev) => ({ ...prev, [fileKey]: file }));
          setIdPreviews((prev) => ({ ...prev, [fileKey]: newPreviewUrl }));
          break;
        case "residency":
          if (residencyPreviews[fileKey])
            URL.revokeObjectURL(residencyPreviews[fileKey]);
          setResidencyFiles((prev) => ({ ...prev, [fileKey]: file }));
          setResidencyPreviews((prev) => ({
            ...prev,
            [fileKey]: newPreviewUrl,
          }));
          break;
        case "indigency":
          if (indigencyPreviews[fileKey])
            URL.revokeObjectURL(indigencyPreviews[fileKey]);
          setIndigencyFiles((prev) => ({ ...prev, [fileKey]: file }));
          setIndigencyPreviews((prev) => ({
            ...prev,
            [fileKey]: newPreviewUrl,
          }));
          break;
        case "goodMoral":
          if (goodMoralPreviews[fileKey])
            URL.revokeObjectURL(goodMoralPreviews[fileKey]);
          setGoodMoralFiles((prev) => ({ ...prev, [fileKey]: file }));
          setGoodMoralPreviews((prev) => ({
            ...prev,
            [fileKey]: newPreviewUrl,
          }));
          break;
        default:
          break;
      }
      e.target.value = null; // Reset file input
    }
  };

  const startCamera = async (fileKey, formType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Your device does not support camera access.");
      return;
    }
    setCameraFor({ fileKey, formType });
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
    setCameraFor(null);
  };

  const takePicture = () => {
    if (!videoRef.current || !cameraFor?.fileKey || !cameraFor?.formType)
      return;

    const { fileKey, formType } = cameraFor;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File(
          [blob],
          `${formType}-${fileKey}-${Date.now()}.png`,
          { type: "image/png" }
        );
        const newPreviewUrl = URL.createObjectURL(blob);

        switch (formType) {
          case "clearance":
            if (idPreviews[fileKey]) URL.revokeObjectURL(idPreviews[fileKey]);
            setIdImages((prev) => ({ ...prev, [fileKey]: capturedFile }));
            setIdPreviews((prev) => ({ ...prev, [fileKey]: newPreviewUrl }));
            break;
          case "residency":
            if (residencyPreviews[fileKey])
              URL.revokeObjectURL(residencyPreviews[fileKey]);
            setResidencyFiles((prev) => ({ ...prev, [fileKey]: capturedFile }));
            setResidencyPreviews((prev) => ({
              ...prev,
              [fileKey]: newPreviewUrl,
            }));
            break;
          case "indigency":
            if (indigencyPreviews[fileKey])
              URL.revokeObjectURL(indigencyPreviews[fileKey]);
            setIndigencyFiles((prev) => ({ ...prev, [fileKey]: capturedFile }));
            setIndigencyPreviews((prev) => ({
              ...prev,
              [fileKey]: newPreviewUrl,
            }));
            break;
          case "goodMoral":
            if (goodMoralPreviews[fileKey])
              URL.revokeObjectURL(goodMoralPreviews[fileKey]);
            setGoodMoralFiles((prev) => ({ ...prev, [fileKey]: capturedFile }));
            setGoodMoralPreviews((prev) => ({
              ...prev,
              [fileKey]: newPreviewUrl,
            }));
            break;
          default:
            break;
        }
        stopCamera();
      }
    }, "image/png");
  };

  const takePictureForID = () => {
    if (!videoRef.current || cameraFor?.formType !== "clearance") return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const currentSide = cameraFor.fileKey;
      handleImageCapture(blob, currentSide, "clearance");
    }, "image/png");
  };

  const handleRemoveImage = (fileKey, formType) => {
    const setters = {
      clearance: {
        files: setIdImages,
        previews: setIdPreviews,
        currentPreviews: idPreviews,
      },
      residency: {
        files: setResidencyFiles,
        previews: setResidencyPreviews,
        currentPreviews: residencyPreviews,
      },
      indigency: {
        files: setIndigencyFiles,
        previews: setIndigencyPreviews,
        currentPreviews: indigencyPreviews,
      },
      goodMoral: {
        files: setGoodMoralFiles,
        previews: setGoodMoralPreviews,
        currentPreviews: goodMoralPreviews,
      },
    };

    const { files, previews, currentPreviews } = setters[formType];
    if (currentPreviews[fileKey]) {
      URL.revokeObjectURL(currentPreviews[fileKey]);
    }
    files((prev) => ({ ...prev, [fileKey]: null }));
    previews((prev) => ({ ...prev, [fileKey]: null }));
  };

  // --- End: Camera and Image Upload Logic ---

  const handlePersonalInfoChange = (e) => {
    setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (!userProfile || !userProfile.id) {
      alert("You must be logged in to make a request.");
      return;
    }

    const formData = new FormData();

    // Append text data
    formData.append("userId", userProfile.id);
    formData.append("certificateType", certType);
    formData.append("purpose", purpose);
    formData.append("firstName", personalInfo.firstName);
    formData.append("middleName", personalInfo.middleName);
    formData.append("lastName", personalInfo.lastName);
    formData.append("dob", personalInfo.dob);
    formData.append("civilStatus", personalInfo.civilStatus);
    formData.append("lengthOfResidency", personalInfo.lengthOfResidency);

    // Append image files
    if (idImages.front) formData.append("frontIdImage", idImages.front);
    if (idImages.back) formData.append("backIdImage", idImages.back);

    if (residencyFiles.govIdFront)
      formData.append("govIdFront", residencyFiles.govIdFront);
    if (residencyFiles.govIdBack)
      formData.append("govIdBack", residencyFiles.govIdBack);
    if (residencyFiles.utilityBill)
      formData.append("utilityBill", residencyFiles.utilityBill);

    if (indigencyFiles.front)
      formData.append("indigencyFront", indigencyFiles.front);
    if (indigencyFiles.back)
      formData.append("indigencyBack", indigencyFiles.back);

    if (goodMoralFiles.govIdFront)
      formData.append("goodMoralGovIdFront", goodMoralFiles.govIdFront);
    if (goodMoralFiles.govIdBack)
      formData.append("goodMoralGovIdBack", goodMoralFiles.govIdBack);
    if (goodMoralFiles.proofOfResidency)
      formData.append("proofOfResidency", goodMoralFiles.proofOfResidency);
    if (goodMoralFiles.communityTaxCert)
      formData.append("communityTaxCert", goodMoralFiles.communityTaxCert);

    // The parent component's onSubmit function will handle the API call
    onSubmit(formData);
  };

  const handleClose = () => {
    // The useEffect hook now handles all cleanup. This just calls the parent's onClose.
    onClose();
  };

  const isSubmitDisabled = () => {
    if (certType === CERTIFICATE_TYPES[0] || !purpose.trim()) {
      return true;
    }

    if (certType === "Barangay Clearance") {
      const { firstName, lastName, dob, civilStatus, lengthOfResidency } =
        personalInfo;
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !dob ||
        !civilStatus ||
        !lengthOfResidency ||
        !idImages.front ||
        !idImages.back
      ) {
        return true;
      }
    }

    if (certType === "Certificate of Residency") {
      if (
        !personalInfo.firstName.trim() ||
        !personalInfo.dob ||
        !personalInfo.civilStatus ||
        !personalInfo.lengthOfResidency ||
        !personalInfo.lastName.trim() ||
        !residencyFiles.govIdFront ||
        !residencyFiles.govIdBack ||
        !residencyFiles.utilityBill
      ) {
        return true;
      }
    }

    if (certType === "Certificate of Good Moral Character") {
      const { govIdFront, govIdBack, proofOfResidency, communityTaxCert } =
        goodMoralFiles;
      const { firstName, lastName, dob, civilStatus, lengthOfResidency } =
        personalInfo;
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !dob ||
        !civilStatus ||
        !lengthOfResidency ||
        !govIdFront ||
        !govIdBack ||
        !proofOfResidency ||
        !communityTaxCert
      ) {
        return true;
      }
    }

    if (certType === "Certificate of Indigency") {
      if (
        !personalInfo.firstName.trim() ||
        !personalInfo.dob ||
        !personalInfo.civilStatus ||
        !personalInfo.lengthOfResidency ||
        !personalInfo.lastName.trim() ||
        !indigencyFiles.front ||
        !indigencyFiles.back
      ) {
        return true;
      }
    }

    return false;
  };

  const renderNameInputs = () => (
    <>
      <h4 className="requirements-header">Personal Information</h4>
      <div className="input-group name-inputs">
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={personalInfo.firstName}
          onChange={handlePersonalInfoChange}
          required
        />
        <input
          type="text"
          name="middleName"
          placeholder="Middle (Optional)"
          value={personalInfo.middleName}
          onChange={handlePersonalInfoChange}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={personalInfo.lastName}
          onChange={handlePersonalInfoChange}
          required
        />
      </div>
      <div className="input-group name-inputs" style={{ marginTop: "10px" }}>
        <input
          type="date"
          name="dob"
          placeholder="Date of Birth"
          value={personalInfo.dob}
          onChange={handlePersonalInfoChange}
          required
          title="Date of Birth"
        />
        <select
          name="civilStatus"
          value={personalInfo.civilStatus}
          onChange={handlePersonalInfoChange}
          required
        >
          <option value="" disabled>
            Civil Status
          </option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Widowed">Widowed</option>
          <option value="Separated">Separated</option>
        </select>
      </div>
      <div className="input-group" style={{ marginTop: "10px" }}>
        <input
          type="text"
          name="lengthOfResidency"
          placeholder="Length of Residency (e.g., 5 years)"
          value={personalInfo.lengthOfResidency}
          onChange={handlePersonalInfoChange}
          required
        />
      </div>
    </>
  );

  if (!isOpen) return null;

  return (
    <div className="cert-modal-overlay" onClick={handleClose}>
      <div className="cert-modal-content" onClick={(e) => e.stopPropagation()}>
        {submissionStatus && (
          <div className="submission-overlay">
            {submissionStatus === "submitting" && (
              <>
                <div className="spinner"></div>
                <p>Sending your request...</p>
              </>
            )}
            {submissionStatus === "success" && (
              <>
                <FaCheckCircle className="success-icon" size={60} />
                <p>Request Submitted Successfully!</p>
              </>
            )}
            {submissionStatus === "error" && (
              <>
                <FaExclamationCircle className="error-icon" size={60} />
                <p>Something went wrong. Please try again.</p>
                <button
                  type="button"
                  className="submit-cert-btn"
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
          <div className="camera-view-cert">
            <video ref={videoRef} autoPlay playsInline></video>
            <div className="camera-controls">
              <button
                type="button"
                className="close-camera-btn"
                onClick={stopCamera}
              >
                <FaTimes size={24} />
              </button>
              <button
                type="button"
                className="capture-btn"
                onClick={takePicture}
              >
                <FaCamera size={24} />
              </button>
            </div>
            <div className="camera-overlay-text">
              Capturing {cameraFor?.fileKey} of ID
            </div>
          </div>
        )}

        <div className="modal-header">
          <h2>Request a Certificate</h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <form className="cert-form" onSubmit={handleSubmit}>
          <div className="setting-item-column">
            <label htmlFor="cert-type">Certificate Type:</label>
            <select
              id="cert-type"
              value={certType}
              onChange={(e) => setCertType(e.target.value)}
              required
            >
              {CERTIFICATE_TYPES.map((type, index) => (
                <option key={type} value={type} disabled={index === 0}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Form for Barangay Clearance */}
          {certType === "Barangay Clearance" && (
            <div className="clearance-requirements">
              <h4 className="requirements-header">
                Barangay Clearance Requirements
              </h4>
              {renderNameInputs()}
              <h4 className="requirements-header" style={{ marginTop: "20px" }}>
                Valid ID (Front and Back)
              </h4>
              <div className="id-upload-section">
                {/* Front ID */}
                <div className="id-upload-container">
                  <label>Front of ID</label>
                  {idPreviews.front ? (
                    <div className="id-preview">
                      <img src={idPreviews.front} alt="Front of ID Preview" />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() => handleRemoveImage("front", "clearance")}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label htmlFor="front-id-upload" className="evidence-btn">
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="front-id-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "front", "clearance")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("front", "clearance")}
                      >
                        <FaCamera size={16} /> Take Picture
                      </button>
                    </div>
                  )}
                </div>

                {/* Back ID */}
                <div className="id-upload-container">
                  <label>Back of ID</label>
                  {idPreviews.back ? (
                    <div className="id-preview">
                      <img src={idPreviews.back} alt="Back of ID Preview" />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() => handleRemoveImage("back", "clearance")}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label htmlFor="back-id-upload" className="evidence-btn">
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="back-id-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "back", "clearance")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("back", "clearance")}
                      >
                        <FaCamera size={16} /> Take Picture
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="id-upload-note">
                Please provide a clear picture of the front and back of one
                valid government-issued ID.
              </p>
            </div>
          )}

          {/* Conditional Form for Certificate of Residency */}
          {certType === "Certificate of Residency" && (
            <div className="clearance-requirements">
              <h4 className="requirements-header">
                Residency Certificate Requirements
              </h4>
              {renderNameInputs()}
              <h4 className="requirements-header" style={{ marginTop: "20px" }}>
                Requirements
              </h4>
              <div className="id-upload-section">
                <div className="id-upload-container">
                  <label>Valid ID (Front)</label>
                  {residencyPreviews.govIdFront ? (
                    <div className="id-preview">
                      <img
                        src={residencyPreviews.govIdFront}
                        alt="Government ID Front Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("govIdFront", "residency")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="residency-govIdFront-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="residency-govIdFront-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "govIdFront", "residency")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("govIdFront", "residency")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>

                <div className="id-upload-container">
                  <label>Valid ID (Back)</label>
                  {residencyPreviews.govIdBack ? (
                    <div className="id-preview">
                      <img
                        src={residencyPreviews.govIdBack}
                        alt="Government ID Back Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("govIdBack", "residency")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="residency-govIdBack-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="residency-govIdBack-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "govIdBack", "residency")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("govIdBack", "residency")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>

                <div className="id-upload-container">
                  <label>Utility Bill</label>
                  {residencyPreviews.utilityBill ? (
                    <div className="id-preview">
                      <img
                        src={residencyPreviews.utilityBill}
                        alt="Utility Bill Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("utilityBill", "residency")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="residency-utilityBill-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="residency-utilityBill-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "utilityBill", "residency")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("utilityBill", "residency")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditional Form for Certificate of Indigency */}
          {certType === "Certificate of Indigency" && (
            <div className="clearance-requirements">
              <h4 className="requirements-header">
                Indigency Certificate Requirements
              </h4>
              {renderNameInputs()}
              <div className="id-upload-section">
                <div className="id-upload-container">
                  <label>Valid Government ID (Front)</label>
                  {indigencyPreviews.front ? (
                    <div className="id-preview">
                      <img
                        src={indigencyPreviews.front}
                        alt="Government ID Front Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() => handleRemoveImage("front", "indigency")}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="indigency-id-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="indigency-id-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "front", "indigency")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("front", "indigency")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
                <div className="id-upload-container">
                  <label>Valid Government ID (Back)</label>
                  {indigencyPreviews.back ? (
                    <div className="id-preview">
                      <img
                        src={indigencyPreviews.back}
                        alt="Government ID Back Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() => handleRemoveImage("back", "indigency")}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="indigency-id-back-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="indigency-id-back-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "back", "indigency")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("back", "indigency")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditional Form for Good Moral */}
          {certType === "Certificate of Good Moral Character" && (
            <div className="clearance-requirements">
              <h4 className="requirements-header">
                Good Moral Certificate Requirements
              </h4>
              {renderNameInputs()}
              <div className="id-upload-section">
                {/* Valid ID */}
                <div className="id-upload-container">
                  <label>Valid Government ID (Front)</label>
                  {goodMoralPreviews.govIdFront ? (
                    <div className="id-preview">
                      <img
                        src={goodMoralPreviews.govIdFront}
                        alt="Government ID Front Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("govIdFront", "goodMoral")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="goodmoral-id-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="goodmoral-id-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "govIdFront", "goodMoral")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("govIdFront", "goodMoral")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
                <div className="id-upload-container">
                  <label>Valid Government ID (Back)</label>
                  {goodMoralPreviews.govIdBack ? (
                    <div className="id-preview">
                      <img
                        src={goodMoralPreviews.govIdBack}
                        alt="Government ID Back Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("govIdBack", "goodMoral")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="goodmoral-id-back-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="goodmoral-id-back-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "govIdBack", "goodMoral")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() => startCamera("govIdBack", "goodMoral")}
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="id-upload-section"
                style={{ gridTemplateColumns: "1fr", marginTop: "12px" }}
              >
                {/* Proof of Residency */}
                <div className="id-upload-container">
                  <label>Proof of Residency</label>
                  {goodMoralPreviews.proofOfResidency ? (
                    <div className="id-preview">
                      <img
                        src={goodMoralPreviews.proofOfResidency}
                        alt="Proof of Residency Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("proofOfResidency", "goodMoral")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="goodmoral-residency-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="goodmoral-residency-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "proofOfResidency", "goodMoral")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() =>
                          startCamera("proofOfResidency", "goodMoral")
                        }
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
                {/* Community Tax Certificate */}
                <div className="id-upload-container">
                  <label>Community Tax Certificate</label>
                  {goodMoralPreviews.communityTaxCert ? (
                    <div className="id-preview">
                      <img
                        src={goodMoralPreviews.communityTaxCert}
                        alt="Community Tax Certificate Preview"
                      />
                      <button
                        type="button"
                        className="remove-id-btn"
                        onClick={() =>
                          handleRemoveImage("communityTaxCert", "goodMoral")
                        }
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="evidence-buttons">
                      <label
                        htmlFor="goodmoral-cedula-upload"
                        className="evidence-btn"
                      >
                        <FaUpload size={16} /> Upload
                        <input
                          type="file"
                          id="goodmoral-cedula-upload"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e, "communityTaxCert", "goodMoral")
                          }
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        className="evidence-btn"
                        onClick={() =>
                          startCamera("communityTaxCert", "goodMoral")
                        }
                      >
                        <FaCamera size={16} /> Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Show Purpose and Submit only when a cert type is selected */}
          {certType !== CERTIFICATE_TYPES[0] && (
            <>
              <div className="setting-item-column">
                <label htmlFor="purpose">Purpose:</label>
                <textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., For employment, for school application, etc."
                  required
                />
              </div>
            </>
          )}
          <div className="submit-section">
            <button
              type="submit"
              className="submit-cert-btn"
              disabled={isSubmitDisabled()}
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestCertificationModal;
