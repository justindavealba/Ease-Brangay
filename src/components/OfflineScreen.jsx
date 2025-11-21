import React, { useState, useEffect } from 'react';
import { FaWifi } from 'react-icons/fa';
import '../styles/offline-screen.css';

const OfflineScreen = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show overlay modal if offline
  return (
    <>
      {!isOnline && (
        <div className="offline-modal-overlay">
          <div className="offline-modal-content">
            <FaWifi size={50} style={{ marginBottom: '20px' }} />
            <h1>You are offline</h1>
            <p>Please check your internet connection and try again.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineScreen;