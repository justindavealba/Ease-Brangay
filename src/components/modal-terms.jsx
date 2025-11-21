import React from 'react';
import { FaTimes } from 'react-icons/fa';
import '../styles/modal-terms.css';

const TermsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="terms-modal-overlay" onClick={onClose}>
            <div className="terms-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Terms and Conditions</h2>
                
                </div>
                <div className="terms-body">
                    <h3>1. Introduction</h3>
                    <p>Welcome to Ease-Barangay. By creating an account, you agree to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern Ease-Barangay's relationship with you in relation to this application.</p>

                    <h3>2. User Accounts</h3>
                    <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                    <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>

                    <h3>3. User Conduct</h3>
                    <p>You agree not to use the Service for any unlawful purpose or to violate any laws in your jurisdiction. You must not post or transmit any content that is defamatory, obscene, pornographic, vulgar, or offensive. Harassment, spamming, and any form of abuse are strictly prohibited.</p>

                    <h3>4. Content</h3>
                    <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>

                    <h3>5. Termination</h3>
                    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                </div>
                <div className="modal-footer">
                    <button className="accept-btn" onClick={onClose}>
                        I Understand and Agree
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
