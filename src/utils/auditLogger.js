/**
 * Logs an action to the audit trail in localStorage.
 * @param {string} action - A description of the action (e.g., 'User Login', 'Deleted Post').
 * @param {object} [details={}] - An object containing relevant details (e.g., { username: 'benjo', postId: 123 }).
 * @param {string} role - The role of the user performing the action (e.g., 'moderator', 'resident').
 */
export const logAuditAction = async (action, details = {}, role) => {
  try {
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));

    // If role is not passed, try to get it from the user profile
    const effectiveRole = role || userProfile?.role;

    if (!effectiveRole) {
      console.error("Audit log failed: Role could not be determined.");
      return;
    }

    const newLogEntry = {
      userId: userProfile?.id || null, // Can be null for system actions before login
      username: userProfile?.username || "System/Anonymous",
      role: effectiveRole,
      action,
      details,
    };

    // Send the log to the backend
    await fetch('http://localhost:5000/api/audit_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newLogEntry),
    });
  } catch (error) {
    console.error("Failed to write to audit log:", error);
  }
};