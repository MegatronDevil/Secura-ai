import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, UserCheck, AlertTriangle, CheckCircle2, ArrowLeft, Camera, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { compressImage, blobToFile } from "@/utils/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VerificationResult {
  result: "REAL" | "FAKE";
  confidence: number;
  reason: string;
}

interface VerifiedIdentity {
  id: string;
  name: string;
  photoHash: string;
  referenceImage?: string;
}

export default function ImpersonationGuard() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Demo verified identities (in real app, these would come from database)
  const [verifiedIdentities, setVerifiedIdentities] = useState<VerifiedIdentity[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        // Create demo verified identities based on logged-in user
        setVerifiedIdentities([
          {
            id: session.user.id,
            name: session.user.email?.split('@')[0] || "Current User",
            photoHash: "verified_" + session.user.id.substring(0, 8),
          },
          {
            id: "demo-celebrity-1",
            name: "Demo Celebrity (Protected)",
            photoHash: "verified_celebrity_001",
          },
          {
            id: "demo-public-figure",
            name: "Demo Public Figure (Protected)",
            photoHash: "verified_public_002",
          },
        ]);
        setSelectedIdentity(session.user.id);
      }
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please allow camera permissions.",
        variant: "destructive",
      });
    }
  };

  const captureReferencePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = 200;
        canvasRef.current.height = 200;
        context.drawImage(videoRef.current, 0, 0, 200, 200);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
        setReferenceImage(dataUrl);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCameraActive(false);
        toast({
          title: "Reference Captured",
          description: "Your verified identity reference has been captured.",
        });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
        toast({
          title: "Invalid Format",
          description: "Please upload JPG, PNG, or WEBP images only.",
          variant: "destructive",
        });
        return;
      }
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setVerificationResult(null);
    }
  };

  const handlePostContent = async () => {
    if (!uploadedImage) {
      toast({
        title: "No Image",
        description: "Please upload an image to post.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedIdentity) {
      toast({
        title: "No Identity Selected",
        description: "Please select the identity you are posting as.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setVerificationResult(null);

    try {
      toast({
        title: "Processing",
        description: "Compressing and preparing image for verification...",
      });

      const compressedBlob = await compressImage(uploadedImage, 512, 0.7);
      const compressedFile = blobToFile(compressedBlob, uploadedImage.name);

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('checkType', 'impersonation');
      formData.append('claimedIdentityId', selectedIdentity);
      formData.append('claimedIdentityName', verifiedIdentities.find(i => i.id === selectedIdentity)?.name || "Unknown");
      if (referenceImage) {
        formData.append('referenceImage', referenceImage);
      }

      const { data, error } = await supabase.functions.invoke('impersonation-check', {
        body: formData,
      });

      if (error) throw error;

      setVerificationResult(data);
      setShowResultModal(true);
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Could not complete identity verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setUploadedImage(null);
    setImagePreview("");
    setVerificationResult(null);
    setShowResultModal(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold gradient-text">Secura.AI</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold">
                Impersonation <span className="gradient-text">Guard</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
                This page simulates how social media platforms like Instagram integrate Secura.AI.
                Before any content goes public, Secura.AI verifies authenticity and identity ownership.
              </p>
            </motion.div>
          </div>

          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3"
          >
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> When integrated into platforms like Instagram, 
              Secura.AI intercepts uploads and verifies the content isn't a deepfake impersonation of a protected identity 
              before allowing it to be posted publicly.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Section 1: Claimed Identity */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Claimed Identity</CardTitle>
                      <CardDescription>Select the identity you are posting as</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedIdentity} onValueChange={setSelectedIdentity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select identity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedIdentities.map((identity) => (
                        <SelectItem key={identity.id} value={identity.id}>
                          {identity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-muted-foreground">
                    This simulates posting content under a public profile. 
                    Verified identities are protected from impersonation.
                  </p>

                  {/* Reference Image Capture */}
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm font-medium">Capture Reference Photo (Optional)</p>
                    <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-primary/30 bg-muted">
                      {referenceImage ? (
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                      ) : isCameraActive ? (
                        <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 justify-center">
                      {!referenceImage && !isCameraActive && (
                        <Button size="sm" variant="outline" onClick={startCamera}>
                          <Camera className="h-4 w-4 mr-1" />
                          Start Camera
                        </Button>
                      )}
                      {isCameraActive && (
                        <Button size="sm" onClick={captureReferencePhoto}>
                          Capture
                        </Button>
                      )}
                      {referenceImage && (
                        <Button size="sm" variant="outline" onClick={() => setReferenceImage("")}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 2: Upload Media */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-secondary/10">
                      <Upload className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Upload Media</CardTitle>
                      <CardDescription>Upload the image you want to post online</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label className="block">
                      <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        imagePreview ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                      }`}>
                        {imagePreview ? (
                          <div className="space-y-4">
                            <img 
                              src={imagePreview} 
                              alt="Upload preview" 
                              className="max-h-48 mx-auto rounded-lg object-contain"
                            />
                            <p className="text-sm text-muted-foreground">
                              {uploadedImage?.name}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              JPG, PNG, WEBP (Max 10MB)
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    
                    {imagePreview && (
                      <Button variant="outline" size="sm" onClick={resetForm} className="w-full">
                        Clear Image
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Section 3: Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Button
              size="lg"
              className="px-12"
              onClick={handlePostContent}
              disabled={!uploadedImage || !selectedIdentity || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Shield className="h-5 w-5" />
                  </motion.div>
                  Verifying with Secura.AI...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Post Content
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Content will be verified by Secura.AI before posting
            </p>
          </motion.div>
        </div>
      </main>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verificationResult?.result === "FAKE" ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <span className="text-destructive">Upload Blocked</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-green-500">Content Approved</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {verificationResult?.result === "FAKE" 
                ? "Secura.AI has blocked this upload" 
                : "Secura.AI has verified this content"}
            </DialogDescription>
          </DialogHeader>
          
          <AnimatePresence>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {verificationResult.result === "FAKE" ? (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <span className="font-semibold text-destructive">
                        🚨 Deepfake / Impersonation Attempt Detected
                      </span>
                    </div>
                    <div className="text-sm space-y-2">
                      <p><strong>Confidence:</strong> {verificationResult.confidence}%</p>
                      <p><strong>Reason:</strong> {verificationResult.reason}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Incident logged for security monitoring (demo).
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-500">
                        ✅ Content verified and approved by Secura.AI
                      </span>
                    </div>
                    <div className="text-sm space-y-2">
                      <p><strong>Confidence:</strong> {verificationResult.confidence}%</p>
                      <p><strong>Analysis:</strong> {verificationResult.reason}</p>
                    </div>
                  </div>
                )}

                <Button onClick={() => setShowResultModal(false)} className="w-full">
                  {verificationResult.result === "FAKE" ? "Try Different Content" : "Continue"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
