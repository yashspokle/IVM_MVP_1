import { useRef, useState, useCallback, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Volume2, Loader2, Scan, X, Calendar } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useToast } from "@/hooks/use-toast";

interface DetectedItem {
  name: string;
  confidence: number;
}

interface SmartScannerProps {
  onAddItem: (name: string, quantity: number, source: "scan", expiryDate?: string) => void;
}

const SmartScanner = ({ onAddItem }: SmartScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedItem, setDetectedItem] = useState<DetectedItem | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const { speak, isSpeaking } = useTextToSpeech();
  const { toast } = useToast();

  // Confidence threshold for detection
  const CONFIDENCE_THRESHOLD = 0.1;

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading model:", error);
        toast({
          title: "Error",
          description: "Failed to load AI model. Please refresh.",
          variant: "destructive",
        });
      }
    };
    loadModel();
  }, [toast]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setDetectedItem(null);
        setCapturedImage(null);
        setQuantity(1);
        setExpiryDate("");
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please allow permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  }, []);

  const scanItem = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setDetectedItem(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvas.toDataURL("image/jpeg"));

    try {
      const predictions = await model.classify(canvas);
      
      // Filter by confidence threshold
      const validPredictions = predictions.filter(p => p.probability >= CONFIDENCE_THRESHOLD);
      
      if (validPredictions.length > 0) {
        const rawName = validPredictions[0].className;
        const cleanName = rawName.split(",")[0].trim().toLowerCase();

        setDetectedItem({
          name: cleanName,
          confidence: validPredictions[0].probability,
        });
      } else {
        toast({
          title: "Not recognized",
          description: "Could not identify the item. Try again with better lighting.",
        });
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to analyze. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [model, toast]);

  const handleSpeak = () => {
    if (detectedItem) {
      speak(`This looks like ${detectedItem.name}`);
    }
  };

  const handleAddToInventory = () => {
    if (detectedItem) {
      onAddItem(detectedItem.name, quantity, "scan", expiryDate || undefined);
      toast({
        title: "Added!",
        description: `${quantity} ${detectedItem.name} added to inventory`,
      });
      setDetectedItem(null);
      setCapturedImage(null);
      setQuantity(1);
      setExpiryDate("");
    }
  };

  const resetScan = () => {
    setDetectedItem(null);
    setCapturedImage(null);
    setQuantity(1);
    setExpiryDate("");
  };

  return (
    <Card className="overflow-hidden shadow-xl border-2 border-emerald-200">
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-gradient-to-br from-emerald-50 to-teal-50">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="mt-3 text-muted-foreground text-sm">Loading AI Scanner...</p>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="relative aspect-[4/3] bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!cameraActive || capturedImage ? "hidden" : ""}`}
              />
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              )}
              {!cameraActive && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                  <Camera className="h-16 w-16 text-emerald-300" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-white mx-auto" />
                    <p className="text-white mt-2">Analyzing...</p>
                  </div>
                </div>
              )}
            </div>

            {detectedItem && (
              <div className="p-4 bg-emerald-50 border-b border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-emerald-800 capitalize text-lg">
                      {detectedItem.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(detectedItem.confidence * 100)}% confidence
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSpeak}
                      className="text-emerald-700"
                    >
                      <Volume2 className={`h-5 w-5 ${isSpeaking ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={resetScan}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expiry Date
                    </Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddToInventory}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Add to Inventory
                </Button>
              </div>
            )}

            <div className="p-3 flex gap-2 justify-center bg-gradient-to-r from-emerald-50 to-teal-50">
              {!cameraActive ? (
                <Button onClick={startCamera} className="bg-emerald-600 hover:bg-emerald-700">
                  <Camera className="mr-2 h-4 w-4" />
                  Open Camera
                </Button>
              ) : (
                <>
                  <Button
                    onClick={scanItem}
                    disabled={isScanning}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Scan className="mr-2 h-4 w-4" />
                    {isScanning ? "Scanning..." : "Scan Item"}
                  </Button>
                  <Button onClick={stopCamera} variant="outline" className="border-emerald-300">
                    Close
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartScanner;
