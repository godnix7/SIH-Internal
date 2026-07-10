import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      common: {
        continue: 'Continue',
        back: 'Back',
        save: 'Save',
        cancel: 'Cancel',
        demo: 'Demo mode',
      },
      status: {
        live: 'Protected · live',
        offline: 'Protected · syncing (offline)',
        limited: 'Limited — background off',
        paused: 'Paused',
        emergency: 'EMERGENCY',
      },
      onboarding: {
        title: "Travel far. Someone's watching over you.",
        subtitle:
          'Choose the support that fits this trip. You stay in control of what leaves your phone.',
        getStarted: 'Get started',
        exploreDemo: 'Explore demo mode',
      },
      sos: {
        hold: 'Hold for SOS',
        countdown: 'Sending SOS',
        cancel: "I'm safe — cancel",
        call: 'Call 112',
        offline: 'No network — SOS saved. Trying every 10 s. Send by SMS instead?',
      },
    },
  },
  hi: {
    translation: {
      common: {
        continue: 'आगे बढ़ें',
        back: 'वापस',
        save: 'सहेजें',
        cancel: 'रद्द करें',
        demo: 'डेमो मोड',
      },
      status: {
        live: 'सुरक्षित · लाइव',
        offline: 'सुरक्षित · ऑफ़लाइन सिंक हो रहा है',
        limited: 'सीमित — बैकग्राउंड बंद है',
        paused: 'रुका हुआ',
        emergency: 'आपातकाल',
      },
      onboarding: {
        title: 'दूर तक जाइए। कोई आपका ध्यान रख रहा है।',
        subtitle:
          'इस यात्रा के लिए अपनी सुविधा का सुरक्षा स्तर चुनें। आपके फ़ोन से क्या बाहर जाता है, वह आपके नियंत्रण में है।',
        getStarted: 'शुरू करें',
        exploreDemo: 'डेमो मोड देखें',
      },
      sos: {
        hold: 'SOS के लिए दबाकर रखें',
        countdown: 'SOS भेजा जा रहा है',
        cancel: 'मैं सुरक्षित हूँ — रद्द करें',
        call: '112 पर कॉल करें',
        offline: 'नेटवर्क नहीं है — SOS सुरक्षित है। हर 10 सेकंड में फिर कोशिश होगी। SMS से भेजें?',
      },
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
