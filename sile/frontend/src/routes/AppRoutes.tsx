import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { LearningHomePage } from '../pages/learning/LearningHomePage';
import { SubjectsPage } from '../pages/curriculum/SubjectsPage';
import { TopicsPage } from '../pages/curriculum/TopicsPage';
import { ContentViewerPage } from '../pages/content/ContentViewerPage';
import { RecommendationsPage } from '../pages/recommendations/RecommendationsPage';
import { LearningPathPage } from '../pages/learning-path/LearningPathPage';
import { TopicPerformancePage } from '../pages/performance/TopicPerformancePage';
import { PracticePage } from '../pages/practice/PracticePage';
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
          {/* Phase 2 Learning Home & Dashboard */}
          <Route path="/dashboard" element={<LearningHomePage />} />
          <Route path="/learning" element={<LearningHomePage />} />

          {/* Phase 2 Curriculum & Content */}
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/content/:contentId" element={<ContentViewerPage />} />

          {/* Phase 2 Adaptive Practice & Mastery */}
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/:topicId" element={<PracticePage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/learning-path" element={<LearningPathPage />} />
          <Route path="/learning-paths" element={<Navigate to="/learning-path" replace />} />
          <Route path="/performance" element={<TopicPerformancePage />} />

          {/* Phase 1 Foundations */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/assessments" element={<AssessmentListPage />} />
          <Route path="/assessments/:id" element={<TakeAssessmentPage />} />
          <Route path="/assessments/:id/result" element={<AssessmentResultsPage />} />
          
          {/* Aliases */}
          <Route path="/assessment" element={<Navigate to="/assessments" replace />} />
          <Route path="/assessment/results" element={<Navigate to="/assessments" replace />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
