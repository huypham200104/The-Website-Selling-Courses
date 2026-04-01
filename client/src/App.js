import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import Orders from './pages/Orders';
import Users from './pages/Users';
import AdminReports from './pages/AdminReports';
import InstructorCourses from './pages/InstructorCourses';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import InstructorCourseDetail from './pages/InstructorCourseDetail';
import InstructorStudents from './pages/InstructorStudents';
import InstructorProfile from './pages/InstructorProfile';
import InstructorQuizStats from './pages/InstructorQuizStats';
import CourseLearn from './pages/CourseLearn';
import Checkout from './pages/Checkout';
import StudentQuizResults from './pages/StudentQuizResults';
import PrivateRoute from './components/PrivateRoute';
import ChatPage from './pages/ChatPage';
import './App.css';


function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">Đang tải...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
      
      {/* Admin Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Courses />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Users />
          </PrivateRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Orders />
          </PrivateRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminReports />
          </PrivateRoute>
        }
      />

      {/* Instructor Routes */}
      <Route
        path="/instructor/courses"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorCourses />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/create-course"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <CreateCourse />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/courses/:id"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorCourseDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/courses/:id/edit"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <EditCourse />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/students"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorStudents />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/profile"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/courses/:id/quiz-stats"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorQuizStats />
          </PrivateRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/course/:courseId"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <CourseLearn />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/checkout/:courseId"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <Checkout />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/quiz-results"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentQuizResults />
          </PrivateRoute>
        }
      />

      {/* Chat Routes - Admin, Instructor & Student */}
      <Route
        path="/chat"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/chat"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/chat"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <ChatPage />
          </PrivateRoute>
        }
      />

      {/* Default Route */}

      <Route
        path="/"
        element={
          user ? (
            user.role === 'admin' ? (
              <Navigate to="/dashboard" replace />
            ) : user.role === 'instructor' ? (
              <Navigate to="/instructor/courses" replace />
            ) : (
              <Navigate to="/student/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
