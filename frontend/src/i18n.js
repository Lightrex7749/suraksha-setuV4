import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      "nav.dashboard": "Dashboard",
      "nav.alerts": "Alerts",
      "nav.weather": "Weather",
      "nav.disasters": "Disasters",
      "nav.map": "Map",
      "nav.community": "Community",
      "nav.analytics": "Analytics",
      "nav.contacts": "Emergency Contacts",
      "nav.profile": "Profile",
      "nav.logout": "Logout",
      
      // Dashboard
      "dashboard.welcome": "Welcome to Suraksha Setu",
      "dashboard.safetyScore": "Suraksha Score",
      "dashboard.weatherSummary": "Weather Summary",
      "dashboard.activeAlerts": "Active Alerts",
      "dashboard.impactStats": "Impact Statistics",
      
      // Alerts
      "alerts.critical": "Critical",
      "alerts.warning": "Warning",
      "alerts.info": "Information",
      "alerts.noAlerts": "No active alerts",
      "alerts.viewDetails": "View Details",
      
      // Weather
      "weather.temperature": "Temperature",
      "weather.humidity": "Humidity",
      "weather.windSpeed": "Wind Speed",
      "weather.aqi": "Air Quality Index",
      "weather.goodAir": "Good",
      "weather.moderateAir": "Moderate",
      "weather.unhealthyAir": "Unhealthy",
      
      // AI Chat
      "chat.placeholder": "Ask me anything about disasters, weather, or safety...",
      "chat.voiceMode": "Voice Mode",
      "chat.send": "Send",
      "chat.listening": "Listening...",
      
      // Safety Score
      "safety.excellent": "Excellent",
      "safety.good": "Good",
      "safety.moderate": "Moderate",
      "safety.poor": "Poor",
      "safety.critical": "Critical",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      "common.cancel": "Cancel",
      "common.save": "Save",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.view": "View",
      "common.upload": "Upload",
      "common.download": "Download",
    }
  },
  hi: {
    translation: {
      // Navigation
      "nav.dashboard": "डैशबोर्ड",
      "nav.alerts": "अलर्ट",
      "nav.weather": "मौसम",
      "nav.disasters": "आपदाएं",
      "nav.map": "नक्शा",
      "nav.community": "समुदाय",
      "nav.analytics": "विश्लेषण",
      "nav.contacts": "आपातकालीन संपर्क",
      "nav.profile": "प्रोफाइल",
      "nav.logout": "लॉग आउट",
      
      // Dashboard
      "dashboard.welcome": "सुरक्षा सेतु में आपका स्वागत है",
      "dashboard.safetyScore": "सुरक्षा स्कोर",
      "dashboard.weatherSummary": "मौसम सारांश",
      "dashboard.activeAlerts": "सक्रिय अलर्ट",
      "dashboard.impactStats": "प्रभाव आंकड़े",
      
      // Alerts
      "alerts.critical": "गंभीर",
      "alerts.warning": "चेतावनी",
      "alerts.info": "जानकारी",
      "alerts.noAlerts": "कोई सक्रिय अलर्ट नहीं",
      "alerts.viewDetails": "विवरण देखें",
      
      // Weather
      "weather.temperature": "तापमान",
      "weather.humidity": "आर्द्रता",
      "weather.windSpeed": "हवा की गति",
      "weather.aqi": "वायु गुणवत्ता सूचकांक",
      "weather.goodAir": "अच्छा",
      "weather.moderateAir": "मध्यम",
      "weather.unhealthyAir": "अस्वास्थ्यकर",
      
      // AI Chat
      "chat.placeholder": "आपदाओं, मौसम या सुरक्षा के बारे में कुछ भी पूछें...",
      "chat.voiceMode": "वॉइस मोड",
      "chat.send": "भेजें",
      "chat.listening": "सुन रहे हैं...",
      
      // Safety Score
      "safety.excellent": "उत्कृष्ट",
      "safety.good": "अच्छा",
      "safety.moderate": "मध्यम",
      "safety.poor": "खराब",
      "safety.critical": "गंभीर",
      
      // Common
      "common.loading": "लोड हो रहा है...",
      "common.error": "त्रुटि",
      "common.success": "सफलता",
      "common.cancel": "रद्द करें",
      "common.save": "सहेजें",
      "common.delete": "हटाएं",
      "common.edit": "संपादित करें",
      "common.view": "देखें",
      "common.upload": "अपलोड करें",
      "common.download": "डाउनलोड करें",
    }
  },
  ta: {
    translation: {
      // Navigation
      "nav.dashboard": "டாஷ்போர்டு",
      "nav.alerts": "எச்சரிக்கைகள்",
      "nav.weather": "வானிலை",
      "nav.disasters": "பேரிடர்கள்",
      "nav.map": "வரைபடம்",
      "nav.community": "சமூகம்",
      "nav.analytics": "பகுப்பாய்வு",
      "nav.contacts": "அவசர தொடர்புகள்",
      "nav.profile": "சுயவிவரம்",
      "nav.logout": "வெளியேறு",
      
      // Dashboard
      "dashboard.welcome": "சுரக்ஷா சேதுவிற்கு வரவேற்கிறோம்",
      "dashboard.safetyScore": "பாதுகாப்பு மதிப்பெண்",
      "dashboard.weatherSummary": "வானிலை சுருக்கம்",
      "dashboard.activeAlerts": "செயலில் உள்ள எச்சரிக்கைகள்",
      "dashboard.impactStats": "தாக்க புள்ளிவிவரங்கள்",
      
      // Alerts
      "alerts.critical": "முக்கியமான",
      "alerts.warning": "எச்சரிக்கை",
      "alerts.info": "தகவல்",
      "alerts.noAlerts": "செயலில் உள்ள எச்சரிக்கைகள் இல்லை",
      "alerts.viewDetails": "விவரங்களைக் காண்க",
      
      // Weather
      "weather.temperature": "வெப்பநிலை",
      "weather.humidity": "ஈரப்பதம்",
      "weather.windSpeed": "காற்றின் வேகம்",
      "weather.aqi": "காற்று தர குறியீடு",
      "weather.goodAir": "நல்லது",
      "weather.moderateAir": "மிதமான",
      "weather.unhealthyAir": "ஆரோக்கியமற்றது",
      
      // AI Chat
      "chat.placeholder": "பேரிடர்கள், வானிலை அல்லது பாதுகாப்பு பற்றி எதையும் கேளுங்கள்...",
      "chat.voiceMode": "குரல் பயன்முறை",
      "chat.send": "அனுப்பு",
      "chat.listening": "கேட்கிறது...",
      
      // Safety Score
      "safety.excellent": "சிறந்தது",
      "safety.good": "நல்லது",
      "safety.moderate": "மிதமான",
      "safety.poor": "மோசமான",
      "safety.critical": "முக்கியமான",
      
      // Common
      "common.loading": "ஏற்றுகிறது...",
      "common.error": "பிழை",
      "common.success": "வெற்றி",
      "common.cancel": "ரத்து செய்",
      "common.save": "சேமி",
      "common.delete": "நீக்கு",
      "common.edit": "திருத்து",
      "common.view": "பார்",
      "common.upload": "பதிவேற்று",
      "common.download": "பதிவிறக்கு",
    }
  },
  bn: {
    translation: {
      // Navigation
      "nav.dashboard": "ড্যাশবোর্ড",
      "nav.alerts": "সতর্কতা",
      "nav.weather": "আবহাওয়া",
      "nav.disasters": "দুর্যোগ",
      "nav.map": "মানচিত্র",
      "nav.community": "সম্প্রদায়",
      "nav.analytics": "বিশ্লেষণ",
      "nav.contacts": "জরুরি যোগাযোগ",
      "nav.profile": "প্রোফাইল",
      "nav.logout": "লগআউট",
      
      // Dashboard
      "dashboard.welcome": "সুরক্ষা সেতুতে স্বাগতম",
      "dashboard.safetyScore": "নিরাপত্তা স্কোর",
      "dashboard.weatherSummary": "আবহাওয়া সারাংশ",
      "dashboard.activeAlerts": "সক্রিয় সতর্কতা",
      "dashboard.impactStats": "প্রভাব পরিসংখ্যান",
      
      // Alerts
      "alerts.critical": "গুরুতর",
      "alerts.warning": "সতর্কতা",
      "alerts.info": "তথ্য",
      "alerts.noAlerts": "কোন সক্রিয় সতর্কতা নেই",
      "alerts.viewDetails": "বিস্তারিত দেখুন",
      
      // Weather
      "weather.temperature": "তাপমাত্রা",
      "weather.humidity": "আর্দ্রতা",
      "weather.windSpeed": "বাতাসের গতি",
      "weather.aqi": "বায়ু মান সূচক",
      "weather.goodAir": "ভালো",
      "weather.moderateAir": "মাঝারি",
      "weather.unhealthyAir": "অস্বাস্থ্যকর",
      
      // AI Chat
      "chat.placeholder": "দুর্যোগ, আবহাওয়া বা নিরাপত্তা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন...",
      "chat.voiceMode": "ভয়েস মোড",
      "chat.send": "পাঠান",
      "chat.listening": "শুনছি...",
      
      // Safety Score
      "safety.excellent": "চমৎকার",
      "safety.good": "ভালো",
      "safety.moderate": "মাঝারি",
      "safety.poor": "খারাপ",
      "safety.critical": "গুরুতর",
      
      // Common
      "common.loading": "লোড হচ্ছে...",
      "common.error": "ত্রুটি",
      "common.success": "সফলতা",
      "common.cancel": "বাতিল",
      "common.save": "সংরক্ষণ",
      "common.delete": "মুছুন",
      "common.edit": "সম্পাদনা",
      "common.view": "দেখুন",
      "common.upload": "আপলোড",
      "common.download": "ডাউনলোড",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
