import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));

    // Check if userProfile exists and if the role is 'admin'
    const isAdmin = userProfile && userProfile.role === 'admin';

    return isAdmin ? <Outlet /> : <Navigate to="/admin-login" replace />;
};

export default AdminProtectedRoute;