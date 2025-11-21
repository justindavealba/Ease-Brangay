import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import '../styles/m-report-user-modal.css';

const ReportUserModal = ({ isOpen, onClose, user, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [submissionStatus, setSubmissionStatus] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (reason.trim()) {
            setSubmissionStatus('submitting');
            // Simulate API call
            setTimeout(() => {
                onSubmit(user, reason);
                setSubmissionStatus('success');
                setTimeout(() => {
                    handleClose();
                }, 1500);
            }, 1000);
        }
    };

    const handleClose = () => {
        setReason('');
        setSubmissionStatus(null);
        onClose();
    };

    return (
        <div className="report-user-modal-overlay" onClick={handleClose}>
            <div className="report-user-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><FaExclamationTriangle /> Report User to Admin</h2>
                    <button className="close-btn" onClick={handleClose}><FaTimes size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <p>You are reporting <strong>{user.author}</strong>. Please provide a reason for the report. This will be sent to the System Administrator for review.</p>
                    <div className="form-group">
                        <label htmlFor="report-reason">Reason for Reporting</label>
                        <textarea
                            id="report-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Spamming, inappropriate content, harassment..."
                            required
                        ></textarea>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={handleClose}>Cancel</button>
                        <button type="submit" className="submit-btn" disabled={!reason.trim() || submissionStatus}>
                            {submissionStatus === 'submitting' ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportUserModal;
