import { useCallback, useEffect, useRef, useState } from "react";

const NOTES_MAX_LENGTH = 2000;

function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function joinDictation(base: string, spoken: string): string {
  const left = base.trimEnd();
  const right = spoken.trimStart();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

function capNotes(text: string): string {
  return text.slice(0, NOTES_MAX_LENGTH);
}

type UseSpeechToTextOptions = {
  lang?: string;
  maxLength?: number;
  onUnsupported?: () => void;
  onError?: (message: string) => void;
};

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const lang = options.lang ?? "en-IN";
  const maxLength = options.maxLength ?? NOTES_MAX_LENGTH;
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const baseTextRef = useRef("");
  const sessionFinalRef = useRef("");
  const onTextRef = useRef<(text: string) => void>(() => {});

  const onUnsupportedRef = useRef(options.onUnsupported);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    onUnsupportedRef.current = options.onUnsupported;
    onErrorRef.current = options.onError;
  }, [options.onUnsupported, options.onError]);

  useEffect(() => {
    setSupported(createSpeechRecognition() !== null);
  }, []);

  const publishDisplayText = useCallback((interim = "") => {
    const spoken = joinDictation(sessionFinalRef.current, interim);
    onTextRef.current(capNotes(joinDictation(baseTextRef.current, spoken)));
  }, []);

  const commitSessionToBase = useCallback(() => {
    if (!sessionFinalRef.current.trim()) return;
    baseTextRef.current = capNotes(joinDictation(baseTextRef.current, sessionFinalRef.current));
    sessionFinalRef.current = "";
    onTextRef.current(baseTextRef.current);
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    commitSessionToBase();
    recognitionRef.current?.stop();
  }, [commitSessionToBase]);

  const startListening = useCallback(
    (baseText: string, onText: (text: string) => void) => {
      const recognition = createSpeechRecognition();
      if (!recognition) {
        onUnsupportedRef.current?.();
        return;
      }

      recognitionRef.current?.abort();
      recognitionRef.current = recognition;
      baseTextRef.current = baseText;
      sessionFinalRef.current = "";
      onTextRef.current = onText;
      listeningRef.current = true;
      setListening(true);

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = (event) => {
        if (!listeningRef.current) return;

        let interim = "";
        // Only consume NEW results — prevents duplicate text when the engine restarts.
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript ?? "";
          if (!transcript) continue;

          if (result.isFinal) {
            sessionFinalRef.current = joinDictation(sessionFinalRef.current, transcript);
          } else {
            interim = joinDictation(interim, transcript);
          }
        }

        publishDisplayText(interim);
      };

      recognition.onerror = (event) => {
        if (event.error === "aborted" || event.error === "no-speech") return;
        onErrorRef.current?.(event.error);
        stopListening();
      };

      recognition.onend = () => {
        if (!listeningRef.current) return;

        commitSessionToBase();

        try {
          recognition.start();
        } catch {
          stopListening();
        }
      };

      try {
        recognition.start();
      } catch {
        onErrorRef.current?.("microphone-unavailable");
        stopListening();
      }
    },
    [commitSessionToBase, lang, publishDisplayText, stopListening],
  );

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleListening = useCallback(
    (baseText: string, onText: (text: string) => void) => {
      if (listeningRef.current) {
        stopListening();
        return;
      }
      startListening(baseText, onText);
    },
    [startListening, stopListening],
  );

  return {
    listening,
    supported,
    maxLength,
    startListening,
    stopListening,
    toggleListening,
  };
}
