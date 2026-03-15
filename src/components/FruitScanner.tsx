import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Volume2, VolumeX, Loader2, RefreshCw, Scan } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { matchFruit, generateSpeechText, FruitInfo } from "@/lib/fruit-info";
import { useToast } from "@/hooks/use-toast";
import VisionAPIService from "@/services/visionAPI";

const FruitScanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visionAPI, setVisionAPI] = useState<VisionAPIService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [fruitInfo, setFruitInfo] = useState<FruitInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<Array<{ name: string; count: number }>>([]);
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const { toast } = useToast();

  // Initialize Google Cloud Vision API
  useEffect(() => {
    const initVisionAPI = async () => {
      try {
        const apiKey = process.env.REACT_APP_GOOGLE_VISION_API_KEY || '';

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          setIsLoading(false);
          toast({
            title: "API Key Required",
            description: "Please configure your Google Cloud Vision API key in .env file.",
            variant: "destructive",
          });
          return;
        }

        const api = new VisionAPIService(apiKey);
        setVisionAPI(api);
        setIsLoading(false);
        console.log("Google Cloud Vision API initialized successfully");

        toast({
          title: "Ready to scan!",
          description: "AI-powered vision system loaded",
        });
      } catch (error) {
        console.error("Error initializing Vision API:", error);
        setIsLoading(false);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize Vision API. Please check your API key.",
          variant: "destructive",
        });
      }
    };

    initVisionAPI();
  }, [toast]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please allow camera permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  // Scan fruit with Google Cloud Vision API
  const scanFruit = useCallback(async () => {
    if (!visionAPI || !videoRef.current || !canvasRef.current) {
      toast({
        title: "Not Ready",
        description: "Vision API not initialized. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setPrediction(null);
    setFruitInfo(null);
    setDetectedObjects([]);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture frame from video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    // Save captured image
    const imageDataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageDataUrl);

    try {
      // Scan with Google Cloud Vision API
      const response = await visionAPI.scanImage(imageDataUrl);

      console.log("Vision API Response:", response);

      // Convert object counts to array format
      const objectsArray = Object.entries(response.objectCounts).map(([name, count]) => ({
        name,
        count
      }));

      setDetectedObjects(objectsArray);

      // Try to find fruits in detected objects
      let matched = null;
      let detectedName = null;

      // First, check localized objects
      for (const obj of response.detectedObjects) {
        const fruitMatch = matchFruit(obj.name);
        if (fruitMatch) {
          matched = fruitMatch;
          detectedName = obj.name;
          break;
        }
      }

      // If no fruit found in objects, try labels
      if (!matched) {
        for (const label of response.labels) {
          const fruitMatch = matchFruit(label.name);
          if (fruitMatch) {
            matched = fruitMatch;
            detectedName = label.name;
            break;
          }
        }
      }

      if (matched) {
        setPrediction(detectedName);
        setFruitInfo(matched);

        // Auto-speak the fruit info
        const speechText = generateSpeechText(matched);
        speak(speechText);

        toast({
          title: "Fruit detected! 🍎",
          description: `Found ${matched.name}`,
        });
      } else {
        // Show what was detected even if not a fruit
        const firstDetection = response.detectedObjects[0]?.name || response.labels[0]?.name;

        if (firstDetection) {
          setPrediction(firstDetection);
          toast({
            title: "Not a fruit",
            description: `Detected: ${firstDetection}. Try scanning a fruit!`,
          });
        } else {
          toast({
            title: "Nothing detected",
            description: "No objects found. Please try again with better lighting.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error during scanning:", error);
      toast({
        title: "Scan Error",
        description: error instanceof Error ? error.message : "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [visionAPI, speak, toast]);

  // Reset scan
  const resetScan = useCallback(() => {
    stop();
    setPrediction(null);
    setFruitInfo(null);
    setCapturedImage(null);
    setDetectedObjects([]);
  }, [stop]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            🍎 Fruit Scanner
          </h1>
          <p className="text-muted-foreground mt-2">
            Point your camera at a fruit to learn about it!
          </p>
          <p className="text-xs text-green-600 mt-1">
            Powered by Google Cloud Vision AI
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="border-2 border-dashed border-green-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-green-600" />
              <p className="mt-4 text-muted-foreground">Initializing Vision AI...</p>
            </CardContent>
          </Card>
        )}

        {/* Camera View */}
        {!isLoading && (
          <Card className="overflow-hidden shadow-xl border-2 border-green-200">
            <CardContent className="p-0 relative">
              {/* Video/Canvas Container */}
              <div className="relative aspect-[4/3] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!cameraActive || capturedImage ? "hidden" : ""}`}
                />
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                )}
                {!cameraActive && !capturedImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100">
                    <Camera className="h-24 w-24 text-green-300" />
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                      <p className="mt-2">Analyzing with AI...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-4 flex gap-3 justify-center bg-gradient-to-r from-green-50 to-emerald-50">
                {!cameraActive ? (
                  <Button
                    onClick={startCamera}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                    disabled={!visionAPI}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={scanFruit}
                      disabled={isScanning || !visionAPI}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                    >
                      <Scan className="mr-2 h-5 w-5" />
                      {isScanning ? "Scanning..." : "Scan Fruit"}
                    </Button>
                    {(fruitInfo || detectedObjects.length > 0) && (
                      <Button
                        onClick={resetScan}
                        variant="outline"
                        size="lg"
                        className="border-green-300"
                      >
                        <RefreshCw className="mr-2 h-5 w-5" />
                        New Scan
                      </Button>
                    )}
                    <Button
                      onClick={stopCamera}
                      variant="destructive"
                      size="lg"
                    >
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Object Count Summary */}
        {detectedObjects.length > 0 && (
          <Card className="shadow-xl border-2 border-blue-200 animate-in slide-in-from-bottom-4">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100">
              <CardTitle className="text-xl text-blue-800">
                📊 Detected Objects
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {detectedObjects.map((obj, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500"
                  >
                    <div className="text-sm font-medium text-gray-600 mb-1">{obj.name}</div>
                    <div className="text-3xl font-bold text-blue-600">{obj.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fruit Info Display */}
        {fruitInfo && (
          <Card className="shadow-xl border-2 border-green-200 animate-in slide-in-from-bottom-4">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-green-800">
                  {fruitInfo.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    isSpeaking ? stop() : speak(generateSpeechText(fruitInfo))
                  }
                  className="text-green-700"
                >
                  {isSpeaking ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-muted-foreground">{fruitInfo.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-1">🔥 Calories</h4>
                  <p className="text-sm text-orange-700">{fruitInfo.calories}</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-1">💊 Vitamins</h4>
                  <p className="text-sm text-blue-700">
                    {fruitInfo.vitamins.join(", ")}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">✨ Health Benefits</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  {fruitInfo.benefits.map((benefit, i) => (
                    <li key={i}>• {benefit}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-1">🎉 Fun Fact</h4>
                <p className="text-sm text-yellow-700">{fruitInfo.funFact}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Prediction (for debugging) */}
        {prediction && !fruitInfo && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <p className="text-amber-800 text-center">
                Detected: <strong>{prediction}</strong>
                <br />
                <span className="text-sm">Try scanning a recognizable fruit!</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* No API Key Warning */}
        {!visionAPI && !isLoading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="text-red-800 font-semibold mb-2">⚠️ API Key Required</h3>
                <p className="text-red-700 text-sm mb-4">
                  Google Cloud Vision API key is not configured.
                </p>
                <div className="text-left text-xs text-red-600 bg-white p-3 rounded">
                  <p className="font-mono">1. Get API key from Google Cloud Console</p>
                  <p className="font-mono">2. Add to .env file:</p>
                  <p className="font-mono ml-4">REACT_APP_GOOGLE_VISION_API_KEY=your_key</p>
                  <p className="font-mono">3. Restart development server</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FruitScanner;