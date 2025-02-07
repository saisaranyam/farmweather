import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, Mic, Volume2 } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { getCoordinates, getWeatherData } from './services/weatherService';
import type { WeatherData } from './types/weather';
import { numberToTelugu } from './utils/teluguNumbers';
import { getAgricultureSuggestions } from './utils/weatherSuggestions';

function App() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition({
    clearTranscriptOnListen: true
  });

  useEffect(() => {
    if (transcript) {
      handleLocationSubmit(transcript);
    }
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return <div className="text-center p-4">మీ బ్రౌజర్ వాయిస్ ఇన్పుట్‌ని సపోర్ట్ చేయదు.</div>;
  }

  if (!isMicrophoneAvailable) {
    return <div className="text-center p-4">మైక్రోఫోన్ అందుబాటులో లేదు. దయచేసి మైక్రోఫోన్ అనుమతులు ఇవ్వండి.</div>;
  }

  const handleLocationSubmit = useCallback(async (location: string) => {
    try {
      setError(null);
      const coordinates = await getCoordinates(location);
      const data = await getWeatherData(coordinates, location);
      setWeatherData(data);
      speakWeatherInfo(data);
    } catch (err) {
      setError('స్థలం కనుగొనబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.');
      console.error('Error fetching weather data:', err);
    }
  }, []);

  const startListening = useCallback(() => {
    try {
      setIsListening(true);
      resetTranscript();
      SpeechRecognition.startListening({ 
        language: 'te-IN',
        continuous: false
      });
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('వాయిస్ ఇన్పుట్ ప్రారంభించడంలో సమస్య. దయచేసి మళ్లీ ప్రయత్నించండి.');
    }
  }, [resetTranscript]);

  const stopListening = useCallback(() => {
    try {
      setIsListening(false);
      SpeechRecognition.stopListening();
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, []);

  const speakWeatherInfo = useCallback((data: WeatherData) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    try {
      const suggestions = getAgricultureSuggestions(data);
      const tempInTelugu = numberToTelugu(Math.round(data.temperature));
      const humidityInTelugu = numberToTelugu(Math.round(data.humidity));
      const windSpeedInTelugu = numberToTelugu(Math.round(data.windSpeed));

      const text = `
        ${data.location} వాతావరణ వివరాలు.
        ఉష్ణోగ్రత ${tempInTelugu} డిగ్రీల సెల్సియస్.
        వాతావరణం ${data.weatherDesc}.
        తేమ ${humidityInTelugu} శాతం.
        గాలి వేగం ${windSpeedInTelugu} కిలోమీటర్లు పర్ గంట.

        రైతు సోదరులకు సూచనలు:
        ${suggestions}
      `;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'te-IN';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Error in speech synthesis:', err);
      setError('వాయిస్ అవుట్‌పుట్‌లో సమస్య. దయచేసి మళ్లీ ప్రయత్నించండి.');
    }
  }, [isSpeaking]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-8">
          <Cloud className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">రైతుల వాతావరణ సమాచారం</h1>
          <p className="text-gray-600 mt-2">మీ ప్రాంతం పేరు చెప్పండి</p>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg ${
              isListening ? 'bg-red-500' : 'bg-sky-500'
            } text-white hover:opacity-90 transition-opacity`}
          >
            <Mic className="w-5 h-5" />
            {isListening ? 'ఆపండి' : 'మాట్లాడండి'}
          </button>
        </div>

        {transcript && (
          <div className="text-center mb-4 text-gray-700">
            మీరు చెప్పింది: {transcript}
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 mb-4">
            {error}
          </div>
        )}

        {weatherData && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">{weatherData.location} వాతావరణం</h2>
            <div className="space-y-2">
              <p>🌡️ ఉష్ణోగ్రత: {Math.round(weatherData.temperature)}°C</p>
              <p>🌤️ వాతావరణం: {weatherData.weatherDesc}</p>
              <p>💧 తేమ: {weatherData.humidity}%</p>
              <p>💨 గాలి వేగం: {weatherData.windSpeed} km/h</p>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">వ్యవసాయ సూచనలు:</h3>
              <div className="text-green-700 whitespace-pre-line">
                {getAgricultureSuggestions(weatherData)}
              </div>
            </div>

            <button
              onClick={() => weatherData && speakWeatherInfo(weatherData)}
              className={`mt-4 flex items-center gap-2 px-4 py-2 ${
                isSpeaking ? 'bg-red-500' : 'bg-green-500'
              } text-white rounded hover:opacity-90 transition-colors`}
            >
              <Volume2 className="w-5 h-5" />
              {isSpeaking ? 'ఆపండి' : 'మళ్ళీ వినండి'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;