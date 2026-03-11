import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const baseTranslation = {
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.alerts': 'Alerts',
  'nav.weather': 'Weather',
  'nav.disasters': 'Disasters',
  'nav.map': 'Map',
  'nav.community': 'Community',
  'nav.analytics': 'Analytics',
  'nav.contacts': 'Emergency Contacts',
  'nav.profile': 'Profile',
  'nav.myProfile': 'My Profile',
  'nav.studentPortal': 'Student Portal',
  'nav.scientistPortal': 'Scientist Portal',
  'nav.adminDashboard': 'Admin Dashboard',
  'nav.logout': 'Logout',
  'role.student': 'Student',
  'role.scientist': 'Scientist',
  'role.admin': 'Administrator',
  'role.citizen': 'Citizen',
  'role.user': 'User',

  // Dashboard
  'dashboard.welcome': 'Welcome to Suraksha Setu',
  'dashboard.commandCenter': 'Command Center',
  'dashboard.commandSubtitle': 'Live disaster management and safety monitoring dashboard',
  'dashboard.safetyScore': 'Suraksha Score',
  'dashboard.weatherSummary': 'Weather Summary',
  'dashboard.activeAlerts': 'Active Alerts',
  'dashboard.impactStats': 'Impact Statistics',
  'dashboard.refresh': 'Refresh',
  'dashboard.export': 'Export',
  'dashboard.share': 'Share',

  // Safety score breakdown
  'safety.locationRisk': 'Location Risk',
  'safety.weatherRisk': 'Weather Risk',
  'safety.disasterProximity': 'Disaster Proximity',
  'safety.infrastructure': 'Infrastructure',

  // Alerts
  'alerts.critical': 'Critical',
  'alerts.warning': 'Warning',
  'alerts.info': 'Information',
  'alerts.noAlerts': 'No active alerts',
  'alerts.viewDetails': 'View Details',

  // Weather
  'weather.temperature': 'Temperature',
  'weather.humidity': 'Humidity',
  'weather.windSpeed': 'Wind Speed',
  'weather.aqi': 'Air Quality Index',
  'weather.goodAir': 'Good',
  'weather.moderateAir': 'Moderate',
  'weather.unhealthyAir': 'Unhealthy',

  // AI Chat
  'chat.placeholder': 'Ask me anything about disasters, weather, or safety...',
  'chat.voiceMode': 'Voice Mode',
  'chat.send': 'Send',
  'chat.listening': 'Listening...',

  // Safety score labels
  'safety.excellent': 'Excellent',
  'safety.good': 'Good',
  'safety.moderate': 'Moderate',
  'safety.poor': 'Poor',
  'safety.critical': 'Critical',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.view': 'View',
  'common.upload': 'Upload',
  'common.download': 'Download',
};

const resources = {
  en: { translation: { ...baseTranslation } },
  hi: { translation: { ...baseTranslation, 'nav.dashboard': 'डैशबोर्ड', 'nav.alerts': 'अलर्ट', 'nav.weather': 'मौसम', 'nav.community': 'समुदाय', 'common.save': 'सहेजें', 'common.cancel': 'रद्द करें' } },
  ta: { translation: { ...baseTranslation, 'nav.dashboard': 'டாஷ்போர்டு', 'nav.alerts': 'எச்சரிக்கைகள்', 'nav.weather': 'வானிலை', 'nav.community': 'சமூகம்', 'common.save': 'சேமி', 'common.cancel': 'ரத்து செய்' } },
  bn: { translation: { ...baseTranslation, 'nav.dashboard': 'ড্যাশবোর্ড', 'nav.alerts': 'সতর্কতা', 'nav.weather': 'আবহাওয়া', 'nav.community': 'সম্প্রদায়', 'common.save': 'সংরক্ষণ', 'common.cancel': 'বাতিল' } },
  te: { translation: { ...baseTranslation } },
  mr: { translation: { ...baseTranslation } },
  gu: { translation: { ...baseTranslation } },
  kn: { translation: { ...baseTranslation } },
  ml: { translation: { ...baseTranslation } },
  pa: { translation: { ...baseTranslation } },
  ur: { translation: { ...baseTranslation } },
  es: { translation: { ...baseTranslation } },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'es'],
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    debug: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
