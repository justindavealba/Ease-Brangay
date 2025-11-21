import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import emailjs from "@emailjs/browser";
import "../styles/landing-page.css";
// 1. Import your video file
// Make sure you have a video named 'bg-video.mp4' in your src/assets folder
import bgVideo from "../assets/bg-video.mp4";
import logo from "../assets/logo.png";
import {
  FaBullhorn,
  FaFileContract,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaUserPlus,
  FaUserCheck,
  FaComments,
  FaBars,
  FaTimes,
  FaArrowUp,
  FaPaperPlane,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  // State for the contact form
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submissionStatus, setSubmissionStatus] = useState({
    state: "idle",
    message: "",
  }); // idle, submitting, success, error

  // Anti-spam measures
  const [honeypot, setHoneypot] = useState("");
  const formLoadTime = useRef(Date.now());

  const toggleFaq = (index) => {
    setOpenFaq((prevOpenFaq) => {
      if (prevOpenFaq.includes(index)) {
        return prevOpenFaq.filter((i) => i !== index);
      } else {
        return [...prevOpenFaq, index];
      }
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    const elementsToAnimate = document.querySelectorAll(".animate-on-scroll");
    elementsToAnimate.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsBackToTopVisible(true);
      } else {
        setIsBackToTopVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setSubmissionStatus({
        state: "error",
        message: "Please fill out all fields.",
      });
      return;
    }

    // --- Anti-Spam Check 1: Honeypot ---
    if (honeypot) {
      console.warn("Honeypot field filled. Likely spam.");
      // Fail silently to not alert the bot
      return;
    }

    // --- Anti-Spam Check 2: Time-based ---
    const timeToSubmit = Date.now() - formLoadTime.current;
    if (timeToSubmit < 3000) {
      // Less than 3 seconds
      console.warn("Form submitted too quickly. Likely spam.");
      setSubmissionStatus({
        state: "error",
        message: "An error occurred. Please try again.",
      });
      return;
    }
    setSubmissionStatus({ state: "submitting", message: "" });

    // Replace the fetch call with EmailJS
    try {
      // IMPORTANT: Replace with your actual IDs from your EmailJS account
      const serviceID = "service_dvlo8dn"; // Your Service ID
      const templateID = "template_idx0b5q"; // Your Template ID
      const publicKey = "svtpuqm3x913tztfs"; // Your Public Key

      // --- DEBUGGING: Check if environment variables are loaded ---
      console.log("EmailJS Service ID:", serviceID);
      console.log("EmailJS Template ID:", templateID);
      console.log("EmailJS Public Key:", publicKey);
      // --- END DEBUGGING ---

      await emailjs.send(
        serviceID,
        templateID,
        {
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
        },
        publicKey
      );

      setSubmissionStatus({
        state: "success",
        message: "Your message has been sent successfully!",
      });
      setContactForm({ name: "", email: "", message: "" });
      setTimeout(
        () => setSubmissionStatus({ state: "idle", message: "" }),
        5000
      );
    } catch (error) {
      console.error("Contact form submission error:", error);
      setSubmissionStatus({
        state: "error",
        message: `Failed to send message. Error: ${
          error?.text || "Please check console for details."
        }`,
      });
      setTimeout(
        () => setSubmissionStatus({ state: "idle", message: "" }),
        5000
      );
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-logo">
          <img src={logo} alt="Ease Barangay Logo" />
          <span>Ease Barangay</span>
        </div>

        <nav className="landing-nav">
          <Link to="/login" className="nav-link">
            Login
          </Link>
          <Link to="/admin-login" className="nav-link">
            Admin Portal
          </Link>
          <Link to="/sign-in" className="nav-link cta-button">
            Sign Up
          </Link>
        </nav>

        <button
          className="burger-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {isMenuOpen && (
          <div
            className="mobile-nav-overlay"
            onClick={() => setIsMenuOpen(false)}
          >
            <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
              <Link
                to="/login"
                className="nav-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/admin-login"
                className="nav-link"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin Portal
              </Link>
              <Link
                to="/sign-in"
                className="nav-link cta-button"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main id="home">
        <section className="hero-section">
          {/* 2. Add the video element */}
          <video autoPlay loop muted playsInline className="hero-video">
            <source src={bgVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>Connecting Your Community, Simplifying Services.</h1>
            <p style={{ textAlign: "center" }}>
              Welcome to Ease Barangay, your one-stop digital portal for all
              local government needs. Stay informed, request documents, and
              engage with your community like never before.
            </p>
            <Link to="/login" className="hero-cta">
              Get Started
            </Link>
          </div>
        </section>

        <section className="features-section">
          <h2 className="animate-on-scroll">Key Features</h2>
          <div className="features-grid">
            <div className="feature-card animate-on-scroll">
              <FaBullhorn className="feature-icon" />
              <h3>Stay Informed</h3>
              <p>
                Receive real-time announcements and updates directly from your
                barangay officials.
              </p>
            </div>
            <div
              className="feature-card animate-on-scroll"
              style={{ transitionDelay: "0.1s" }}
            >
              <FaFileContract className="feature-icon" />
              <h3>Effortless Documents</h3>
              <p>
                Request barangay clearances, certificates, and other documents
                online, anytime.
              </p>
            </div>
            <div
              className="feature-card animate-on-scroll"
              style={{ transitionDelay: "0.2s" }}
            >
              <FaExclamationTriangle className="feature-icon" />
              <h3>Community Reporting</h3>
              <p>
                Easily report local issues, from infrastructure problems to
                safety concerns.
              </p>
            </div>
            <div
              className="feature-card animate-on-scroll"
              style={{ transitionDelay: "0.3s" }}
            >
              <FaCalendarAlt className="feature-icon" />
              <h3>Event Calendar</h3>
              <p>
                Keep track of all community events, meetings, and important
                dates in one place.
              </p>
            </div>
          </div>
        </section>

        <section className="value-prop-section">
          <h2 className="animate-on-scroll">Why Choose Ease Barangay?</h2>
          <p
            className="value-prop-subtitle animate-on-scroll"
            style={{ transitionDelay: "0.1s" }}
          >
            We bridge the gap between residents and local governance through
            technology, fostering a more connected, transparent, and responsive
            community.
          </p>
          <div className="benefits-grid">
            <div
              className="benefit-item animate-on-scroll"
              style={{ transitionDelay: "0.2s" }}
            >
              <FaUserCheck className="benefit-icon" />
              <h3>Empowerment</h3>
              <p>
                Gives residents a direct line to their local government, making
                their voices heard.
              </p>
            </div>
            <div
              className="benefit-item animate-on-scroll"
              style={{ transitionDelay: "0.3s" }}
            >
              <FaComments className="benefit-icon" />
              <h3>Engagement</h3>
              <p>
                Fosters a stronger community through shared information and
                easier communication.
              </p>
            </div>
            <div
              className="benefit-item animate-on-scroll"
              style={{ transitionDelay: "0.4s" }}
            >
              <FaUserPlus className="benefit-icon" />
              <h3>Accessibility</h3>
              <p>
                Provides easy access to essential services for all residents,
                from anywhere.
              </p>
            </div>
          </div>
        </section>

        <section className="testimonials-section">
          <h2 className="animate-on-scroll">What Our Users Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card animate-on-scroll">
              <p className="testimonial-quote">
                "Requesting my barangay clearance used to take half a day. With
                Ease Barangay, I did it in minutes from home. A total
                game-changer!"
              </p>
              <span className="testimonial-author">- Blazy Baby Llanera</span>
            </div>
            <div
              className="testimonial-card animate-on-scroll"
              style={{ transitionDelay: "0.1s" }}
            >
              <p className="testimonial-quote">
                "I love getting updates directly on my phone. I feel more
                connected and informed about what's happening in our community."
              </p>
              <span className="testimonial-author">- Marky Anthonio Talan</span>
            </div>
            <div
              className="testimonial-card animate-on-scroll"
              style={{ transitionDelay: "0.2s" }}
            >
              <p className="testimonial-quote">
                "Reporting the broken street light was so easy. The maintenance
                team fixed it the next day. It's great to see such quick
                responses."
              </p>
              <span className="testimonial-author">- Jeyb Aba</span>
            </div>
          </div>
        </section>

        <section className="faq-section">
          <h2 className="animate-on-scroll">Frequently Asked Questions</h2>
          <div className="faq-container">
            <div
              className={`faq-item animate-on-scroll ${
                openFaq.includes(0) ? "open" : ""
              }`}
            >
              <button className="faq-question" onClick={() => toggleFaq(0)}>
                Is my data secure?
                <span
                  className={`faq-icon ${openFaq.includes(0) ? "open" : ""}`}
                >
                  +
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Absolutely. We use modern security practices to ensure your
                  personal information is protected and handled with the utmost
                  care, in compliance with data privacy laws.
                </p>
              </div>
            </div>
            <div
              className={`faq-item animate-on-scroll ${
                openFaq.includes(1) ? "open" : ""
              }`}
            >
              <button className="faq-question" onClick={() => toggleFaq(1)}>
                How much does it cost to use the platform?
                <span
                  className={`faq-icon ${openFaq.includes(1) ? "open" : ""}`}
                >
                  +
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Ease Barangay is free for all residents. Fees for document
                  requests follow the official barangay rates, with no extra
                  platform charges.
                </p>
              </div>
            </div>
            <div
              className={`faq-item animate-on-scroll ${
                openFaq.includes(2) ? "open" : ""
              }`}
            >
              <button className="faq-question" onClick={() => toggleFaq(2)}>
                What documents can I request online?
                <span
                  className={`faq-icon ${openFaq.includes(2) ? "open" : ""}`}
                >
                  +
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  You can request common documents such as Barangay Clearance,
                  Certificate of Indigency, and Business Permits. The available
                  documents may vary by barangay.
                </p>
              </div>
            </div>
            <div
              className={`faq-item animate-on-scroll ${
                openFaq.includes(3) ? "open" : ""
              }`}
            >
              <button className="faq-question" onClick={() => toggleFaq(3)}>
                Can I report a problem with the platform?
                <span
                  className={`faq-icon ${openFaq.includes(3) ? "open" : ""}`}
                >
                  +
                </span>
              </button>
              <div className="faq-answer">
                <p>
                  Yes, please feel free to contact us if you encounter any
                  issues. Our support team is here to help.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="team-section" id="about">
          <h2 className="animate-on-scroll">Meet Our Team</h2>
          <p
            className="team-subtitle animate-on-scroll"
            style={{ transitionDelay: "0.1s" }}
          >
            The passionate individuals dedicated to bringing local governance
            closer to you.
          </p>
          <div className="team-grid">
            {/* Row 1 */}
            <div className="team-member-card animate-on-scroll">
              <h4>Benjie Cabajar</h4>
              <p className="team-member-role">Full-Stack Developer</p>
              <p className="team-member-bio">
                "Responsible for developing and maintaining the platform’s
                full-stack architecture, ensuring seamless, secure, and
                high-performance interactions between the frontend and backend."
              </p>
            </div>
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.1s" }}
            >
              <h4>Justin Alba</h4>
              <p className="team-member-role">Database Management</p>
              <p className="team-member-bio">
                "Responsible for the robust and secure database architecture
                that powers the platform's data."
              </p>
            </div>

            {/* Row 2 */}
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.2s" }}
            >
              <h4>Joshua Jumawan</h4>
              <p className="team-member-role">Documentation</p>
              <p className="team-member-bio">
                "Crafting detailed guides and reports that make our platform
                easy to understand and use."
              </p>
            </div>
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.3s" }}
            >
              <h4>Gerard Daral</h4>
              <p className="team-member-role">Documentation</p>
              <p className="team-member-bio">
                "Dedicated to creating clear and comprehensive documentation to
                guide users and developers."
              </p>
            </div>
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.4s" }}
            >
              <h4>Blaze Llanera</h4>
              <p className="team-member-role">Documentation</p>
              <p className="team-member-bio">
                "Ensuring that all project processes and features are
                meticulously documented for clarity and future reference."
              </p>
            </div>

            {/* Row 3 */}
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.5s" }}
            >
              <h4>Mark Anthon Talan</h4>
              <p className="team-member-role">Documentation</p>
              <p className="team-member-bio">
                "Specializing in structuring information to create accessible
                and user-friendly documentation."
              </p>
            </div>
            <div
              className="team-member-card animate-on-scroll"
              style={{ transitionDelay: "0.6s" }}
            >
              <h4>Jayvee Canadilla</h4>
              <p className="team-member-role">Documentation</p>
              <p className="team-member-bio">
                "Focused on organizing project information and creating helpful
                documentation for the team and users."
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="contact">
        <div className="footer-content">
          <div className="footer-info">
            <h3>Ease Barangay</h3>
            <p>
              Connecting communities, one barangay at a time. Our platform
              simplifies access to local services and enhances communication
              between residents and officials.
            </p>
            <p>Zone 7 Calalahan, Agusan, Cagayan de Oro City, 9000</p>
            <p>justinalba2345@gmail.com | (+63) 970-0439-304 </p>
          </div>
          <div className="footer-form">
            <h3>Contact Us</h3>
            <form onSubmit={handleContactSubmit}>
              {/* Honeypot field for spam prevention */}
              <div className="honeypot-field" aria-hidden="true">
                <label htmlFor="bot-check">Do not fill this out</label>
                <input
                  id="bot-check"
                  name="bot-check"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={contactForm.name}
                onChange={handleContactFormChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={contactForm.email}
                onChange={handleContactFormChange}
                required
              />
              <textarea
                name="message"
                placeholder="Your Message"
                rows="4"
                value={contactForm.message}
                onChange={handleContactFormChange}
                required
              ></textarea>
              <button
                type="submit"
                className="hero-cta"
                disabled={submissionStatus.state === "submitting"}
              >
                {submissionStatus.state === "submitting" && (
                  <FaSpinner className="spin-icon" />
                )}
                {submissionStatus.state !== "submitting" && <FaPaperPlane />}
                <span style={{ marginLeft: "15px" }}>
                  {submissionStatus.state === "submitting"
                    ? "Sending..."
                    : "Send Message"}
                </span>
              </button>
              {submissionStatus.state === "success" && (
                <p className="submission-message success">
                  <FaCheckCircle /> {submissionStatus.message}
                </p>
              )}
              {submissionStatus.state === "error" && (
                <p className="submission-message error">
                  {submissionStatus.message}
                </p>
              )}
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2024 Ease Barangay. All Rights Reserved.
        </div>
      </footer>

      {isBackToTopVisible && (
        <button onClick={scrollToTop} className="back-to-top-btn">
          <FaArrowUp />
        </button>
      )}
    </div>
  );
};

export default LandingPage;
