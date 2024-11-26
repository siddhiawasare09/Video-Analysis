import * as faceapi from "face-api.js";
import { useEffect, useRef, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import "./VideoInterview.css";
import { FaSun, FaMoon } from "react-icons/fa";

Chart.register(ArcElement, Tooltip, Legend);

export default function VideoInterview() {
  const videoRef = useRef(null);
  const [emotionData, setEmotionData] = useState({});
  const [currentSpeech, setCurrentSpeech] = useState("");
  const [cumulativeTranscript, setCumulativeTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState({
    pacing: 0,
    fillerWords: 0,
    volume: 0,
  });

  // Timer for recording
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setRecordedChunks((prev) => prev.concat(event.data));
            }
          };
          videoRef.current.addEventListener("play", () => {
            setInterval(async () => {
              const detections = await faceapi
                .detectAllFaces(
                  videoRef.current,
                  new faceapi.TinyFaceDetectorOptions()
                )
                .withFaceExpressions();
              if (detections.length > 0) {
                setEmotionData(detections[0].expressions);
              }
            }, 1000);
          });
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
          alert("Please enable camera and microphone permissions.");
        });
    };

    loadModels();
  }, []);

  // Speech recognition logic
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Speech recognition started.");
      setIsRecording(true);
      monitorVolume(); // Start monitoring volume when recording starts
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setCurrentSpeech(finalTranscript + " " + interimTranscript);
      if (finalTranscript) {
        setCumulativeTranscript((prev) => prev + " " + finalTranscript);
        analyzeSpeech(finalTranscript); // Analyze speech for feedback
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended.");
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      alert(`Speech recognition error: ${event.error}`);
    };

    if (isRecording) {
      recognition.start();
    }

    return () => {
      recognition.stop();
      console.log("Speech recognition stopped.");
    };
  }, [isRecording]);

  // Function to analyze speech for pacing and filler words
  const analyzeSpeech = (transcript) => {
    const wordsArray = transcript
      .split(" ")
      .filter((word) => word.trim() !== ""); // Filter out empty strings

    // Calculate pacing (words per minute)
    const totalWords = wordsArray.length;
    const minutesSpentSpeaking = timer > 0 ? timer / 60 : 1; // Prevent division by zero

    const pacing = totalWords / minutesSpentSpeaking;

    // Count filler words
    const fillerWordsList = ["um", "uh", "like", "you know", "so"];
    let fillerWordsCount = 0;

    wordsArray.forEach((word) => {
      if (fillerWordsList.includes(word.toLowerCase())) {
        fillerWordsCount++;
      }
    });

    // Update feedback report
    setFeedbackReport((prevReport) => ({
      ...prevReport,
      pacing: pacing.toFixed(2),
      fillerWords: fillerWordsCount,
    }));
  };

  // Function to monitor audio volume levels
  const monitorVolume = () => {
    if (!mediaRecorder || mediaRecorder.state !== "recording") return;

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const getVolumeLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / dataArray.length; // Average volume level
        updateVolumeFeedback(averageVolume); // Update feedback based on volume level

        requestAnimationFrame(getVolumeLevel); // Continue monitoring
      };

      getVolumeLevel();
    });
  };

  // Function to update feedback based on volume level
  const updateVolumeFeedback = (averageVolume) => {
    let volumeFeedback;
    if (averageVolume < 50) {
      // Assuming a scale where lower values mean quieter sounds
      volumeFeedback = "The voice is too low. Speak up!";
    } else if (averageVolume >= 50 && averageVolume <= 150) {
      volumeFeedback = "Voice level is good.";
    } else {
      volumeFeedback = "The voice is too loud. Please lower your volume.";
    }

    setFeedbackReport((prevReport) => ({
      ...prevReport,
      volume: volumeFeedback,
    }));
  };

  // Function to toggle recording
  const handleToggleRecording = () => {
    if (!mediaRecorder) {
      console.error("MediaRecorder is not initialized.");
      return;
    }

    if (mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      setRecordedChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  // Function to download the recorded video
  const handleDownload = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview-recording.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to save the transcript
  const handleSaveTranscript = () => {
    const blob = new Blob([cumulativeTranscript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to play or pause the video
  const handlePlayPauseVideo = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Pie chart data for emotions
  const pieChartData = {
    labels: Object.keys(emotionData).map(
      (emotion) =>
        `${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${(
          emotionData[emotion] * 100
        ).toFixed(2)}%`
    ),
    datasets: [
      {
        label: "Emotion Distribution",
        data: Object.values(emotionData).map((value) =>
          (value * 100).toFixed(2)
        ),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
        ],
      },
    ],
  };

  return (
    <div className={`video-interview ${darkMode ? "dark-mode" : ""}`}>
      <div className="dark-mode-toggle-container">
        <button onClick={toggleDarkMode} className="dark-mode-toggle">
          {darkMode ? (
            <FaSun size={24} color="#FFC107" title="Light Mode" />
          ) : (
            <FaMoon size={24} color="#1e1f04" title="Dark Mode" />
          )}
        </button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ width: "700px", height: "300px" }}
      />
      <div>
        <button onClick={handleToggleRecording}>
          {mediaRecorder && mediaRecorder.state === "recording"
            ? "Stop Recording"
            : "Start Recording"}
        </button>
        <button onClick={handleDownload} disabled={!recordedChunks.length}>
          Download Recording
        </button>
        <button onClick={handleSaveTranscript}>Save Transcript</button>
        <button onClick={handlePlayPauseVideo}>
          {isPlaying ? "Pause Video" : "Play Video"}
        </button>
        <h4>Recognized Speech:</h4>
        <p>{currentSpeech || "No speech detected yet."}</p>
        <h4>Full Transcript:</h4>
        <p>{cumulativeTranscript || "No transcript recorded yet."}</p>
        <h4>Recording Timer: {timer}s</h4>
      </div>
      <h3 className="emotion-heading">Detected Emotions:</h3>
      <Pie data={pieChartData} style={{ width: "40%", margin: "auto" }} />
      {/* Feedback Report */}
      <div className="feedback-report">
        <h4>Instant Feedback Report:</h4>
        <p>Pacing (words per minute): {feedbackReport.pacing}</p>
        <p>Filler Words Count: {feedbackReport.fillerWords}</p>
        <p>Volume Feedback: {feedbackReport.volume}</p>{" "}
        {/* Volume analysis feedback */}
      </div>
    </div>
  );
}
