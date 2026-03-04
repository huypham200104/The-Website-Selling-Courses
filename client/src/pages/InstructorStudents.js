import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/apiService';
import Layout from '../components/Layout';
import './InstructorStudents.css';

function InstructorStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const response = await courseService.getAll();
      const myCourses = (response.data || []).filter(
        course => course.instructor._id === user._id
      );
      
      setCourses(myCourses);

      // Extract all unique students from courses
      const studentsMap = new Map();
      
      myCourses.forEach(course => {
        course.students?.forEach(student => {
          if (!studentsMap.has(student._id || student)) {
            studentsMap.set(student._id || student, {
              ...student,
              courses: [{ id: course._id, title: course.title }]
            });
          } else {
            const existingStudent = studentsMap.get(student._id || student);
            existingStudent.courses.push({ id: course._id, title: course.title });
          }
        });
      });

      setStudents(Array.from(studentsMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = selectedCourse === 'all'
    ? students
    : students.filter(student =>
        student.courses?.some(c => c.id === selectedCourse)
      );

  if (loading) {
    return (
      <Layout>
        <div className="loading">Đang tải...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="instructor-students-page">
        <div className="page-header">
          <h1>👨‍🎓 Học viên của tôi</h1>
          <p>Tổng số: {students.length} học viên</p>
        </div>

        <div className="filter-section">
          <label htmlFor="course-filter">Lọc theo khóa học:</label>
          <select
            id="course-filter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">Tất cả khóa học ({students.length})</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title} ({course.students?.length || 0})
              </option>
            ))}
          </select>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h2>Chưa có học viên nào</h2>
            <p>Học viên sẽ xuất hiện ở đây khi họ đăng ký khóa học của bạn</p>
          </div>
        ) : (
          <div className="students-grid">
            {filteredStudents.map((student, index) => (
              <div key={student._id || index} className="student-card">
                <div className="student-avatar">
                  <img 
                    src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name || 'Student')}&background=667eea&color=fff`}
                    alt={student.name}
                  />
                </div>
                <div className="student-info">
                  <h3>{student.name || 'Học viên'}</h3>
                  <p className="student-email">{student.email || 'N/A'}</p>
                  
                  <div className="enrolled-courses">
                    <strong>Đã đăng ký:</strong>
                    <ul>
                      {student.courses?.map((course, idx) => (
                        <li key={idx}>{course.title}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="student-stats">
                    <span className="stat-badge">
                      📚 {student.courses?.length || 0} khóa học
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {courses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>Bạn chưa có khóa học nào</h2>
            <p>Hãy tạo khóa học để có học viên</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default InstructorStudents;
