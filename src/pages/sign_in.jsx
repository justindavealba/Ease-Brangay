import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/sign_in.css";
import "@fontsource/poppins";
import bgVideo from "../assets/bg-video.mp4";
import "../styles/login.css";
import {
  FaUser,
  FaCalendarAlt,
  FaVenusMars,
  FaEnvelope,
  FaLock,
  FaMapMarkerAlt,
  FaEye,
  FaEyeSlash,
  FaBullhorn,
  FaFileContract,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import TermsModal from "../components/modal-terms";

const PasswordStrengthIndicator = ({ password = "" }) => {
  const calculateStrength = (password) => {
    let score = 0;
    if (!password) return 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score > 5) return 4;
    if (score > 3) return 3;
    if (score > 1) return 2;
    if (score > 0) return 1;
    return 0;
  };

  const strength = calculateStrength(password);
  const strengthLabels = [
    "Very Weak",
    "Weak",
    "Medium",
    "Strong",
    "Very Strong",
  ];
  const strengthColors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#22c55e",
  ];

  return (
    <div
      className="password-strength-container"
      style={{ "--strength-color": strengthColors[strength] }}
    >
      <div
        className="strength-bar"
        style={{ width: `${(strength + 1) * 20}%` }}
      />
    </div>
  );
};

export default function SignIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "",
    gender: "",
    municipality: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    barangay: "",
  });

  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState("");
  const [signupStatus, setSignupStatus] = useState(null); // To show confirmation screen
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  // NEW STATE: Tracks if the user has manually changed the username
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Fetch municipalities on component mount
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/municipalities"
        );
        const data = await response.json();
        setMunicipalities(data);
      } catch (error) {
        console.error("Failed to fetch municipalities:", error);
        setNotification(
          "Could not load location data. Please refresh the page."
        );
      }
    };
    fetchMunicipalities();
  }, []);

  // Function to validate the email format
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "middleName") {
      value = value.toUpperCase();
    } else if (name === "firstName" || name === "lastName") {
      value = value
        .split(" ")
        .map((word) =>
          word ? word.charAt(0).toUpperCase() + word.slice(1) : ""
        )
        .join(" ");
    }

    // Clear errors and notifications
    setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
    if (name !== "terms")
      setErrors((prevErrors) => ({ ...prevErrors, terms: false }));
    setNotification("");

    if (name === "municipality") {
      const municipalityId = value;
      setForm((prev) => ({
        ...prev,
        municipality: municipalityId,
        barangay: "",
      }));
      setBarangays([]); // Clear previous barangays

      if (municipalityId) {
        const fetchBarangays = async () => {
          try {
            const response = await fetch(
              `http://localhost:5000/api/barangays/${municipalityId}`
            );
            const data = await response.json();
            setBarangays(data);
          } catch (error) {
            console.error("Failed to fetch barangays:", error);
            setNotification("Could not load barangay data.");
          }
        };
        fetchBarangays();
      }
    }

    const newForm = { ...form, [name]: value };
    setForm(newForm);

    // 2. Handle Live Email validation
    if (name === "email") {
      if (value && !validateEmail(value)) {
        setErrors((prevErrors) => ({ ...prevErrors, email: "invalid" }));
        setNotification(
          "Please enter a valid email address (e.g., example@domain.com)."
        );
      } else {
        setErrors((prevErrors) => {
          const { email, ...rest } = prevErrors;
          return rest;
        });
      }
    }

    // Live DOB validation
    if (name === "dob") {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        setErrors((prev) => ({ ...prev, dob: "future" }));
        setNotification("Date of Birth cannot be in the future.");
      } else {
        let age = today.getFullYear() - selectedDate.getFullYear();
        const m = today.getMonth() - selectedDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
          age--;
        }
        if (age < 12) {
          setErrors((prev) => ({ ...prev, dob: "age" }));
          setNotification("You must be at least 12 years old to sign up.");
        }
      }
    }

    // 3. Handle Live Password Confirmation validation
    if (name === "password" || name === "confirmPassword") {
      const password = name === "password" ? value : form.password;
      const confirmPassword =
        name === "confirmPassword" ? value : form.confirmPassword;

      if (password && confirmPassword && password !== confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: true }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: false }));
      }
    }
  };

  const handleOpenTerms = () => {
    let newErrors = {};
    let currentNotification = "";

    // Run all validations before opening
    Object.keys(form).forEach((key) => {
      if (!form[key] && key !== "middleName") newErrors[key] = true;
    });

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = "invalid";
      currentNotification = "Please enter a valid email address.";
    }

    if (form.dob) {
      const selectedDate = new Date(form.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.dob = "future";
        currentNotification = "Date of Birth cannot be in the future.";
      } else {
        let age = today.getFullYear() - selectedDate.getFullYear();
        const m = today.getMonth() - selectedDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate()))
          age--;
        if (age < 12) {
          newErrors.dob = "age";
          currentNotification = "You must be at least 12 years old.";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setNotification(
        currentNotification ||
          "Please fill in all required fields before proceeding."
      );
    } else {
      setIsTermsModalOpen(true);
    }
  };

  /**
   * PASSWORD VALIDATION:
   * Requires a minimum of 6 characters.
   * Updated to require 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character for better security.
   */
  const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form from reloading the page
    let newErrors = {};
    let currentNotification = "";

    // 1. Validation
    Object.keys(form).forEach((key) => {
      if (!form[key] && key !== "middleName") newErrors[key] = true;
    });

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = "invalid";
      currentNotification = "Please enter a valid email address.";
    }

    if (form.dob) {
      const selectedDate = new Date(form.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.dob = "future";
        currentNotification = "Date of Birth cannot be in the future.";
      } else {
        let age = today.getFullYear() - selectedDate.getFullYear();
        const m = today.getMonth() - selectedDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate()))
          age--;
        if (age < 12) {
          newErrors.dob = "age";
          currentNotification = "You must be at least 12 years old.";
        }
      }
    }

    if (form.password && !validatePassword(form.password)) {
      newErrors.password = true;
      currentNotification =
        "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = true;
      currentNotification = currentNotification || "Passwords do not match.";
    }

    if (!termsAccepted) {
      newErrors.terms = true;
      currentNotification =
        currentNotification || "You must accept the Terms and Conditions.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setNotification(currentNotification);
      return;
    }

    try {
      setSignupStatus("submitting");

      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotification(data.message || "Registration failed.");
        setSignupStatus(null); // Allow user to try again
        return;
      }

      // Success
      setSignupStatus("success");
    } catch (error) {
      console.error(error);
      setNotification(
        "Could not connect to the server. Please try again later."
      );
      setSignupStatus(null);
    }
  };

  return (
    <div className="sign-page">
      {/* Video background for the entire page */}
      <video autoPlay loop muted playsInline className="sign-bg-video">
        <source src={bgVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="sign-bg-overlay"></div>

      <div className="sign-content-wrapper">
        <div className="sign-promo">
          <div className="promo-content">
            <h1>Join Your Community</h1>
            <p>
              Create an account to connect with your barangay, access services,
              and stay informed.
            </p>
            <ul className="promo-features">
              <li>
                <FaBullhorn className="promo-icon" /> Get real-time
                announcements.
              </li>
              <li>
                <FaFileContract className="promo-icon" /> Request documents
                online.
              </li>
              <li>
                <FaExclamationTriangle className="promo-icon" /> Report local
                concerns easily.
              </li>
            </ul>
          </div>
        </div>

        <TermsModal
          isOpen={isTermsModalOpen}
          onClose={() => {
            setHasViewedTerms(true); // Mark as viewed even if they just close it
            setIsTermsModalOpen(false);
          }}
        />

        {signupStatus === "success" ? (
          <div className="sign-box success-confirmation">
            <svg
              className="success-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
              <path
                d="M8 12L11 15L16 9"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1>Account Created!</h1>
            <p className="confirmation-text">
              A verification link has been sent to <strong>{form.email}</strong>
              . Please check your inbox to activate your account.
            </p>
            <button className="signin-btn" onClick={() => navigate("/login")}>
              Proceed to Login
            </button>
          </div>
        ) : (
          <form className="sign-box" onSubmit={handleSubmit}>
            <Link to="/" className="back-to-home-link">
              <FaArrowLeft /> Back to Home
            </Link>
            <h1 style={{ marginTop: "15px" }}>Sign Up</h1>
            <h2>------</h2>
            <h3>Fill up information</h3>

            <div className="info-inputs form-category">
              <h4 className="form-category-header">Personal Information</h4>
              <div className="name-column">
                <input
                  id="firstName"
                  name="firstName"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={handleChange}
                  className={`no-icon ${errors.firstName ? "error-input" : ""}`}
                />
                <div className="last-name-group">
                  <input
                    name="lastName"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={handleChange}
                    className={`no-icon ${
                      errors.lastName ? "error-input" : ""
                    }`}
                  />
                  <input
                    name="middleName"
                    placeholder="M.I."
                    value={form.middleName}
                    onChange={handleChange}
                    className="no-icon middle-initial-input"
                    maxLength="1"
                  />
                </div>
              </div>
            </div>

            <div className="info-inputs form-category">
              <h4 className="form-category-header">Extra Information</h4>
              <div className="extra-info">
                <div className="input-container">
                  <FaCalendarAlt className="input-icon" />
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    className={errors.dob ? "error-input" : ""}
                  />
                </div>
                <div className="input-container">
                  <FaVenusMars className="input-icon" />
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={errors.gender ? "error-input" : ""}
                  >
                    {" "}
                    <option value="">Select gender</option>{" "}
                    <option value="male">Male</option>{" "}
                    <option value="female">Female</option>{" "}
                    <option value="other">Other</option>{" "}
                  </select>
                </div>
              </div>
            </div>

            <div className="info-inputs form-category">
              <h4 className="form-category-header">Account Security</h4>
              <div className="input-container">
                {" "}
                <FaEnvelope className="input-icon" />{" "}
                <input
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  className={errors.email ? "error-input" : ""}
                />{" "}
                {isEmailFocused && (
                  <p className="email-check-notification">
                    Please double-check your email. A verification link will be
                    sent here.
                  </p>
                )}
              </div>
              <div className="input-container">
                {" "}
                <FaUser className="input-icon" />{" "}
                <input
                  name="username"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  className={errors.username ? "error-input" : ""}
                />{" "}
              </div>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className={errors.password ? "error-input" : ""}
                />
                <div
                  className="password-toggle-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
              {form.password && (
                <PasswordStrengthIndicator password={form.password} />
              )}

              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "error-input" : ""}
                />
                <div
                  className="password-toggle-icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            <div className="info-inputs form-category">
              <h4 className="form-category-header">Location</h4>
              <div className="input-container">
                <FaMapMarkerAlt className="input-icon" />
                <select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  className={errors.municipality ? "error-input" : ""}
                >
                  <option value="">Select City/Municipality</option>
                  {municipalities.map((mun) => (
                    <option key={mun.id} value={mun.id}>
                      {mun.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-container">
                {" "}
                <FaMapMarkerAlt className="input-icon" />
                <select
                  name="barangay"
                  value={form.barangay}
                  onChange={handleChange}
                  className={errors.barangay ? "error-input" : ""}
                  disabled={!form.municipality}
                >
                  {" "}
                  <option value="">Select Barangay</option>{" "}
                  {barangays.map((brgy) => (
                    <option key={brgy.id} value={brgy.name}>
                      {brgy.name}
                    </option>
                  ))}{" "}
                </select>{" "}
              </div>
            </div>

            <div className="terms-container">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => {
                  // Create a temporary error object to check form validity
                  const tempErrors = { ...errors };
                  delete tempErrors.terms; // Don't count the terms error itself

                  if (Object.values(tempErrors).some((v) => v)) {
                    setNotification(
                      "Please correct the errors before accepting the terms."
                    );
                    return; // Prevent checking
                  }

                  if (e.target.checked) {
                    // If user is trying to check the box
                    if (hasViewedTerms) {
                      setTermsAccepted(true);
                    } else {
                      setNotification(
                        "Please click to read the Terms and Conditions before accepting."
                      );
                    }
                  } else {
                    // Allow unchecking anytime
                    setTermsAccepted(false);
                  }
                }}
              />
              <label htmlFor="terms">
                I agree to the{" "}
                <span className="terms-link" onClick={handleOpenTerms}>
                  Terms and Conditions
                </span>
              </label>
            </div>

            {notification && <p className="notification">{notification}</p>}

            <button
              className="signin-btn"
              type="submit"
              disabled={signupStatus === "submitting"}
            >
              {signupStatus === "submitting" ? (
                <>
                  <div className="spinner"></div> Creating Account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>

            <p className="signup-text">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
