import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import Dashboard from './pages/Dashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Orders from './pages/Orders';
import Users from './pages/Users';
import InstructorCourses from './pages/InstructorCourses';
import CreateCourse from './pages/CreateCourse';
import InstructorStudents from './pages/InstructorStudents';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import EditCourse from './pages/EditCourse';
import PrivateRoute from './components/PrivateRoute';
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
        path="/courses/:id"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <CourseDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:id/edit"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <EditCourse />
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
        path="/settings"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['admin', 'instructor', 'student']}>
            <Profile />
          </PrivateRoute>
        }
      />

      {/* Instructor Routes */}
      <Route
        path="/instructor/dashboard"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/instructor/courses"
        element={
          <PrivateRoute allowedRoles={['instructor']}>
            <InstructorCourses />
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
        path="/instructor/create-course"
        element={
          <PrivateRoute allowedRoles={['instructor', 'admin']}>
            <CreateCourse />
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

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
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
              <Navigate to="/instructor/dashboard" replace />
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
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
