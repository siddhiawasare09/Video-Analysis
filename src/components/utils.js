export const monitorVolume = () => {
  const monitorVolume = () => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const averageVolume =
            dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

          console.log("Volume level:", averageVolume); // Replace with your feedback logic
          requestAnimationFrame(checkVolume);
        };

        checkVolume();
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });
  };
};
