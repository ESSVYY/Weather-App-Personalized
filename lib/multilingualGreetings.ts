export type MultilingualGreeting = {
  id: string;
  language: string;
  text: string;
  direction: "ltr" | "rtl";
  locale: string;
};

export const multilingualGreetings: MultilingualGreeting[] = [
  { id: "english", language: "English", text: "Hello", direction: "ltr", locale: "en" },
  { id: "maori", language: "Māori", text: "Kia ora", direction: "ltr", locale: "mi" },
  { id: "spanish", language: "Spanish", text: "Hola", direction: "ltr", locale: "es" },
  { id: "hindi", language: "Hindi", text: "नमस्ते", direction: "ltr", locale: "hi" },
  { id: "punjabi", language: "Punjabi", text: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", direction: "ltr", locale: "pa" },
  { id: "tamil", language: "Tamil", text: "வணக்கம்", direction: "ltr", locale: "ta" },
  { id: "kannada", language: "Kannada", text: "ನಮಸ್ಕಾರ", direction: "ltr", locale: "kn" },
  { id: "malayalam", language: "Malayalam", text: "നമസ്കാരം", direction: "ltr", locale: "ml" },
  { id: "bengali", language: "Bengali", text: "নমস্কার", direction: "ltr", locale: "bn" },
  { id: "nepali", language: "Nepali", text: "नमस्ते", direction: "ltr", locale: "ne" },
  { id: "chinese", language: "Chinese", text: "你好", direction: "ltr", locale: "zh" },
  { id: "japanese", language: "Japanese", text: "こんにちは", direction: "ltr", locale: "ja" },
  { id: "korean", language: "Korean", text: "안녕하세요", direction: "ltr", locale: "ko" },
  { id: "vietnamese", language: "Vietnamese", text: "Xin chào", direction: "ltr", locale: "vi" },
  { id: "portuguese", language: "Portuguese", text: "Olá", direction: "ltr", locale: "pt" },
  { id: "latin", language: "Latin", text: "Salve", direction: "ltr", locale: "la" },
  { id: "french", language: "French", text: "Bonjour", direction: "ltr", locale: "fr" },
  { id: "russian", language: "Russian", text: "Привет", direction: "ltr", locale: "ru" },
  { id: "ukrainian", language: "Ukrainian", text: "Привіт", direction: "ltr", locale: "uk" },
  { id: "hebrew", language: "Hebrew", text: "שלום", direction: "rtl", locale: "he" },
  { id: "urdu", language: "Urdu", text: "سلام", direction: "rtl", locale: "ur" },
  { id: "arabic", language: "Arabic", text: "مرحبًا", direction: "rtl", locale: "ar" },
  { id: "malay", language: "Malay", text: "Hai", direction: "ltr", locale: "ms" },
];
