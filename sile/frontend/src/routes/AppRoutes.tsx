import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { PreferencesPage } from '../pages/preferences/PreferencesPage';
import { AssessmentListPage } from '../pages/assessment/AssessmentListPage';
import { TakeAssessmentPage } from '../pages/assessment/TakeAssessmentPage';
import { AssessmentResultsPage } from '../pages/assessment/AssessmentResultsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route element={<RootLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Public Authentication Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Learner Portal Pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/assessments" element={<AssessmentListPage />} />
          <Route path="/assessments/:id" element={<TakeAssessmentPage />} />
          <Route path="/assessments/:id/result" element={<AssessmentResultsPage />} />
          {/* Legacy route alias */}
          <Route path="/assessment" element={<Navigate to="/assessments" replace />} />
          <Route path="/assessment/results" element={<Navigate to="/assessments" replace />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
