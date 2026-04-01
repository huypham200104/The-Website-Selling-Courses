import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const STORAGE_KEY = 'course_platform_language';

const translations = {
  vi: {
    'language.switcher.vi': 'VI',
    'language.switcher.en': 'EN',
    'language.switcher.label': 'Chọn ngôn ngữ',
    'student.header.title': '🎓 Course Platform',
    'student.header.tabs.all': '📚 Tất cả khóa học',
    'student.header.tabs.pending': '⏳ Đang chờ duyệt ({{count}})',
    'student.header.tabs.favorites': '❤️ Yêu thích ({{count}})',
    'student.header.menu.myCourses': '⭐ Khóa học của tôi ({{count}})',
    'student.header.menu.profile': '⚙️ Thông tin cá nhân',
    'student.header.menu.quizResults': '📊 Kết quả bài tập',
    'student.header.menu.chat': '💬 Tin nhắn với giảng viên',
    'student.header.menu.logout': '🚪 Đăng xuất',
    'student.dashboard.loading': 'Đang tải...',
    'student.dashboard.heading.profile': 'Thông tin cá nhân',
    'student.dashboard.heading.myCourses': 'Khóa học của tôi',
    'student.dashboard.heading.pending': 'Đang chờ duyệt',
    'student.dashboard.heading.favorites': 'Yêu thích',
    'student.dashboard.heading.discover': 'Khám phá khóa học',
    'student.dashboard.buttons.continue': '▶️ Tiếp tục học',
    'student.dashboard.buttons.enroll': 'Xem chi tiết',
    'student.dashboard.buttons.pending': '⏳ Đang chờ duyệt',
    'student.dashboard.buttons.viewPayment': 'Xem thông tin thanh toán',
    'student.dashboard.buttons.browse': 'Khám phá khóa học',
    'student.dashboard.favorites.add': 'Yêu thích',
    'student.dashboard.favorites.remove': 'Bỏ yêu thích',
    'student.dashboard.empty.pending': '⏳ Bạn không có khóa học nào đang chờ xét duyệt',
    'student.dashboard.empty.favorites': '❤️ Bạn chưa có khóa học yêu thích nào',
    'student.dashboard.empty.myCourses': '📚 Bạn chưa đăng ký khóa học nào',
    'student.dashboard.profile.title': 'Cập nhật thông tin',
    'student.dashboard.profile.name': 'Họ và tên',
    'student.dashboard.profile.email': 'Email',
    'student.dashboard.profile.currentPassword': 'Mật khẩu hiện tại',
    'student.dashboard.profile.newPassword': 'Mật khẩu mới',
    'student.dashboard.profile.confirmPassword': 'Xác nhận mật khẩu mới',
    'student.dashboard.profile.submit': 'Lưu thay đổi',
    'student.dashboard.profile.passwordSectionTitle': 'Đổi mật khẩu (Tuỳ chọn)',
    'student.dashboard.profile.passwordHint': 'Bỏ trống nếu bạn không muốn đổi mật khẩu',
    'student.dashboard.profile.googleNote': '*Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.',
    'student.dashboard.profile.emailTooltip': 'Email không thể thay đổi',
    'student.dashboard.profile.passwordMismatch': 'Mật khẩu mới không khớp!',
    'student.dashboard.profile.success': 'Cập nhật thành công!'
  },
  en: {
    'language.switcher.vi': 'VI',
    'language.switcher.en': 'EN',
    'language.switcher.label': 'Language switcher',
    'student.header.title': '🎓 Course Platform',
    'student.header.tabs.all': '📚 All courses',
    'student.header.tabs.pending': '⏳ Pending ({{count}})',
    'student.header.tabs.favorites': '❤️ Favorites ({{count}})',
    'student.header.menu.myCourses': '⭐ My courses ({{count}})',
    'student.header.menu.profile': '⚙️ Profile',
    'student.header.menu.quizResults': '📊 Quiz results',
    'student.header.menu.chat': '💬 Messages',
    'student.header.menu.logout': '🚪 Log out',
    'student.dashboard.loading': 'Loading...',
    'student.dashboard.heading.profile': 'Profile',
    'student.dashboard.heading.myCourses': 'My courses',
    'student.dashboard.heading.pending': 'Pending approval',
    'student.dashboard.heading.favorites': 'Favorites',
    'student.dashboard.heading.discover': 'Discover courses',
    'student.dashboard.buttons.continue': '▶️ Continue learning',
    'student.dashboard.buttons.enroll': 'View details',
    'student.dashboard.buttons.pending': '⏳ Pending approval',
    'student.dashboard.buttons.viewPayment': 'View payment details',
    'student.dashboard.buttons.browse': 'Browse courses',
    'student.dashboard.favorites.add': 'Add to favorites',
    'student.dashboard.favorites.remove': 'Remove from favorites',
    'student.dashboard.empty.pending': '⏳ You have no courses waiting for approval',
    'student.dashboard.empty.favorites': '❤️ You do not have any favorite courses yet',
    'student.dashboard.empty.myCourses': '📚 You have not enrolled in any courses yet',
    'student.dashboard.profile.title': 'Update profile',
    'student.dashboard.profile.name': 'Full name',
    'student.dashboard.profile.email': 'Email',
    'student.dashboard.profile.currentPassword': 'Current password',
    'student.dashboard.profile.newPassword': 'New password',
    'student.dashboard.profile.confirmPassword': 'Confirm new password',
    'student.dashboard.profile.submit': 'Save changes',
    'student.dashboard.profile.passwordSectionTitle': 'Change password (optional)',
    'student.dashboard.profile.passwordHint': 'Leave blank if you do not want to change the password',
    'student.dashboard.profile.googleNote': '*Google sign-in accounts cannot update the password.',
    'student.dashboard.profile.emailTooltip': 'Email cannot be changed',
    'student.dashboard.profile.passwordMismatch': 'New password does not match!',
    'student.dashboard.profile.success': 'Updated successfully!'
  }
};

const LanguageContext = createContext({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, updateLanguage] = useState(() => {
    if (typeof window === 'undefined') {
      return 'vi';
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'vi';
  });

  const setLanguage = useCallback((nextLang) => {
    updateLanguage(nextLang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLang);
    }
  }, []);

  const getTranslation = useCallback((key, values) => {
    const template = translations[language]?.[key] ?? translations.vi[key] ?? key;
    if (!values) return template;
    return template.replace(/\{\{(.*?)\}\}/g, (_, variable) => {
      const trimmed = variable.trim();
      return Object.prototype.hasOwnProperty.call(values, trimmed) ? values[trimmed] : '';
    });
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: getTranslation,
  }), [language, setLanguage, getTranslation]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
