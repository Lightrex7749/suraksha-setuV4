"""
Translation service for multilingual support
Supports 6 Indian languages: English, Hindi, Tamil, Telugu, Bengali, Marathi
Uses deep-translator library for Google Translate API (free tier)
"""
from deep_translator import GoogleTranslator
import logging
from typing import Dict, Optional, List, Any
from functools import lru_cache

# Language codes mapping
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'bn': 'Bengali',
    'mr': 'Marathi'
}


class TranslationService:
    """Service for translating text and structured data"""
    
    def __init__(self):
        self.cache = {}  # Simple in-memory cache
    
    def translate_text(self, text: str, target_lang: str, source_lang: str = 'en') -> str:
        """
        Translate a single text string
        
        Args:
            text: Text to translate
            target_lang: Target language code (hi, ta, te, bn, mr)
            source_lang: Source language code (default: en)
        
        Returns:
            Translated text
        """
        if not text or target_lang == source_lang or target_lang not in SUPPORTED_LANGUAGES:
            return text
        
        try:
            cache_key = f"{text}:{source_lang}:{target_lang}"
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            # Translate using GoogleTranslator
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            translated = translator.translate(text)
            
            # Cache the result
            self.cache[cache_key] = translated
            return translated
        except Exception as e:
            logging.error(f"Translation error: {e}")
            return text  # Return original text on error
    
    def translate_list(self, items: List[str], target_lang: str, source_lang: str = 'en') -> List[str]:
        """
        Translate a list of strings
        
        Args:
            items: List of strings to translate
            target_lang: Target language code
            source_lang: Source language code
        
        Returns:
            List of translated strings
        """
        if not items or target_lang == source_lang:
            return items
        
        return [self.translate_text(item, target_lang, source_lang) for item in items]
    
    def translate_dict(self, data: Dict[str, Any], fields: List[str], target_lang: str, source_lang: str = 'en') -> Dict[str, Any]:
        """
        Translate specific fields in a dictionary
        
        Args:
            data: Dictionary containing data
            fields: List of field names to translate
            target_lang: Target language code
            source_lang: Source language code
        
        Returns:
            Dictionary with translated fields
        """
        if not data or target_lang == source_lang or target_lang not in SUPPORTED_LANGUAGES:
            return data
        
        result = data.copy()
        for field in fields:
            if field in result and isinstance(result[field], str):
                result[field] = self.translate_text(result[field], target_lang, source_lang)
            elif field in result and isinstance(result[field], list):
                result[field] = self.translate_list(result[field], target_lang, source_lang)
        
        return result
    
    def translate_weather_data(self, weather: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translate weather data fields"""
        if not weather or target_lang == 'en':
            return weather
        
        result = weather.copy()
        
        # Translate current weather
        if 'current' in result:
            current = result['current'].copy()
            if 'condition' in current:
                current['condition'] = self.translate_text(current['condition'], target_lang)
            if 'description' in current:
                current['description'] = self.translate_text(current['description'], target_lang)
            result['current'] = current
        
        # Translate forecast
        if 'forecast' in result and isinstance(result['forecast'], list):
            translated_forecast = []
            for day in result['forecast']:
                day_copy = day.copy()
                if 'condition' in day_copy:
                    day_copy['condition'] = self.translate_text(day_copy['condition'], target_lang)
                if 'description' in day_copy:
                    day_copy['description'] = self.translate_text(day_copy['description'], target_lang)
                translated_forecast.append(day_copy)
            result['forecast'] = translated_forecast
        
        return result
    
    def translate_alert(self, alert: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translate alert fields"""
        fields_to_translate = ['title', 'message', 'description', 'location', 'severity']
        return self.translate_dict(alert, fields_to_translate, target_lang)
    
    def translate_chat_message(self, message: str, target_lang: str) -> str:
        """Translate chatbot message"""
        return self.translate_text(message, target_lang)
    
    def translate_disaster_data(self, disaster: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translate disaster information"""
        fields_to_translate = ['type', 'location', 'description', 'status', 'severity']
        result = self.translate_dict(disaster, fields_to_translate, target_lang)
        
        # Translate affected areas
        if 'affected_areas' in result and isinstance(result['affected_areas'], list):
            result['affected_areas'] = self.translate_list(result['affected_areas'], target_lang)
        
        return result
    
    def translate_aqi_data(self, aqi: Dict[str, Any], target_lang: str) -> Dict[str, Any]:
        """Translate AQI data"""
        if not aqi or target_lang == 'en':
            return aqi
        
        result = aqi.copy()
        
        if 'current' in result:
            current = result['current'].copy()
            if 'category' in current:
                current['category'] = self.translate_text(current['category'], target_lang)
            if 'health_implications' in current:
                current['health_implications'] = self.translate_text(current['health_implications'], target_lang)
            if 'primary_pollutant' in current:
                current['primary_pollutant'] = self.translate_text(current['primary_pollutant'], target_lang)
            result['current'] = current
        
        return result
    
    def clear_cache(self):
        """Clear translation cache"""
        self.cache.clear()


# Global translation service instance
_translation_service = None

def get_translation_service() -> TranslationService:
    """Get or create translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service


def translate_response(data: Any, target_lang: str, data_type: str = 'generic') -> Any:
    """
    Translate API response data
    
    Args:
        data: Response data to translate
        target_lang: Target language code
        data_type: Type of data (weather, alert, chat, disaster, aqi, generic)
    
    Returns:
        Translated data
    """
    if not data or target_lang == 'en' or target_lang not in SUPPORTED_LANGUAGES:
        return data
    
    service = get_translation_service()
    
    if data_type == 'weather':
        return service.translate_weather_data(data, target_lang)
    elif data_type == 'alert':
        if isinstance(data, list):
            return [service.translate_alert(item, target_lang) for item in data]
        else:
            return service.translate_alert(data, target_lang)
    elif data_type == 'chat':
        return service.translate_chat_message(data, target_lang)
    elif data_type == 'disaster':
        if isinstance(data, list):
            return [service.translate_disaster_data(item, target_lang) for item in data]
        else:
            return service.translate_disaster_data(data, target_lang)
    elif data_type == 'aqi':
        return service.translate_aqi_data(data, target_lang)
    else:
        # Generic translation for dict
        if isinstance(data, dict):
            common_fields = ['title', 'description', 'message', 'name', 'location', 'status']
            return service.translate_dict(data, common_fields, target_lang)
        elif isinstance(data, str):
            return service.translate_text(data, target_lang)
        else:
            return data
