import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import Orders from './pages/Orders';
import Users from './pages/Users';
import InstructorCourses from './pages/InstructorCourses';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import InstructorCourseDetail from './pages/InstructorCourseDetail';
import InstructorStudents from './pages/InstructorStudents';
import InstructorProfile from './pages/InstructorProfile';
import CourseLearn from './pages/CourseLearn';
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
          <PrivateRoute allowedRoles={['instructor']}>
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
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
