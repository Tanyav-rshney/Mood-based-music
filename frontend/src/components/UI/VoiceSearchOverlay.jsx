import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdMic, MdClose } from 'react-icons/md';
import useUIStore from '../../store/useUIStore';
import { useNavigate } from 'react-router-dom';

const VoiceSearchOverlay = () => {
  const { isVoiceSearchOpen, setVoiceSearchOpen, setVoiceQuery } = useUIStore();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => setListening(true);
        rec.onresult = (e) => {
          let current = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            current += e.results[i][0].transcript;
          }
          setTranscript(current);
        };
        rec.onerror = (e) => {
          console.error('Speech recognition error', e.error);
          setListening(false);
        };
        rec.onend = () => {
          setListening(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  useEffect(() => {
    if (isVoiceSearchOpen && recognition) {
      setTranscript('');
      try {
        recognition.start();
      } catch (e) {
        // already started
      }
    } else if (!isVoiceSearchOpen && recognition) {
      recognition.stop();
    }
  }, [isVoiceSearchOpen, recognition]);

  const handleClose = () => {
    setVoiceSearchOpen(false);
  };

  // When stopped listening and we have a transcript, execute search
  useEffect(() => {
    if (!listening && transcript.trim().length > 0 && isVoiceSearchOpen) {
      setVoiceQuery(transcript);
      // wait a moment for the user to read their transcript before routing & closing
      setTimeout(() => {
        setVoiceSearchOpen(false);
        navigate('/search');
      }, 1000);
    }
  }, [listening, transcript, isVoiceSearchOpen, navigate, setVoiceQuery, setVoiceSearchOpen]);

  return (
    <AnimatePresence>
      {isVoiceSearchOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl"
        >
          <button 
            onClick={handleClose}
            className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"
          >
            <MdClose className="text-4xl" />
          </button>

          <div className="relative flex items-center justify-center w-64 h-64 mb-12">
            {listening && (
              <>
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-full h-full bg-primary rounded-full blur-[60px]"
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute w-3/4 h-3/4 bg-secondary rounded-full blur-[40px]"
                />
              </>
            )}
            <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-tr from-primary to-secondary shadow-[0_0_40px_rgba(255,0,127,0.5)] ${listening ? 'animate-pulse' : ''}`}>
               <MdMic className="text-5xl text-white" />
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center max-w-2xl px-6"
          >
            {listening ? (
              <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-4">
                {transcript || "Listening..."}
              </h2>
            ) : (
              <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-4">
                {transcript ? transcript : "Tap microphone to speak"}
              </h2>
            )}
            <p className="text-xl text-textMuted font-medium">Try saying "Play upbeat synthwave" or "Find Arijit Singh"</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceSearchOverlay;
