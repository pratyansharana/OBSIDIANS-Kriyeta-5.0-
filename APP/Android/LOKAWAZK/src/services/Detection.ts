import { useRef, useState, useEffect } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';

export type Detection = {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
};

const MODEL_INPUT_SIZE = 320;

export function usePotholeDetection({ onPotholeConfirmed } = {}) {
  const { resize } = useResizePlugin();
  const [detections, setDetections] = useState([]);

  const lastUpdate = useRef(0);
  const lastSpeechTime = useRef(0);
  const frameCounter = useRef(0);
  const currentLocation = useRef(null);

  const { model, state } = useTensorflowModel(
    require('../../assets/model/pothole2.tflite'),
  );

  useEffect(() => {
    let sub;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => (currentLocation.current = loc.coords)
      );
    };

    start();
    return () => sub?.remove();
  }, []);

const parseYOLO = (output: any) => {
  'worklet';

  const results = [];
  if (!output || !output[0]) return results;

  const arr = output[0];
  const numPredictions = 2100;

  // We loop through the 2100 predictions.
  // Because the tensor is [1, 5, 2100], we access the properties using offsets.
  for (let i = 0; i < numPredictions; i++) {
    
    // Confidence is the 5th attribute (index 4)
    // Offset is 4 * 2100 = 8400
    const confidence = arr[i + 4 * numPredictions];

    // 🔥 STRONG FILTERING
    if (confidence < 0.65) continue;

    // Read cx, cy, w, h using their respective offsets
    const cx = arr[i];
    const cy = arr[i + numPredictions];
    const w = arr[i + 2 * numPredictions];
    const h = arr[i + 3 * numPredictions];

    // Normalize values to 0.0 - 1.0 by dividing by the model input size (320)
    const normalizedW = w / MODEL_INPUT_SIZE;
    const normalizedH = h / MODEL_INPUT_SIZE;

    if (normalizedW > 0.5 || normalizedH > 0.5) continue; // remove huge boxes

    results.push({
      x: (cx - w / 2) / MODEL_INPUT_SIZE,
      y: (cy - h / 2) / MODEL_INPUT_SIZE,
      w: normalizedW,
      h: normalizedH,
      score: confidence,
    });

    // 🔥 LIMIT detections
    if (results.length > 10) break; 
  }

  return results;
};

  const updateDetections = Worklets.createRunOnJS((newDetections) => {
    const now = Date.now();
    if (now - lastUpdate.current < 300) return;

    lastUpdate.current = now;

    if (newDetections.length === 0) return;

    setDetections(newDetections);

    if (now - lastSpeechTime.current > 10000) {
      Speech.stop();
      Speech.speak('Pothole detected');
      lastSpeechTime.current = now;

      onPotholeConfirmed?.(currentLocation.current);
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    if (!model) return;

    frameCounter.current++;

    // 🔥 BIG FPS BOOST
    if (frameCounter.current % 4 !== 0) return;

    const resized = resize(frame, {
      scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
      pixelFormat: 'rgb',
      dataType: 'float32'
    });

    if (!resized) return;

    const output = model.runSync([resized]);
    const parsed = parseYOLO(output);

    if (parsed.length === 0) return;

    updateDetections(parsed);
  }, [model]);

  return {
    detections,
    modelState: state,
    frameProcessor,
  };
}