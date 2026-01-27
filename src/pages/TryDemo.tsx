import { motion } from "framer-motion";
import { Upload, Image, Video, Link, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageAnalysisResult } from "@/components/ImageAnalysisResult";

interface AnalysisResult {
  filename: string;
  isDeepfake: boolean;
  message: string;
  confidence: number;
  label?: string;
  details?: string;
  artifacts?: string[];
  analysisType?: string;
}

const TryDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageResult, setImageResult] = useState<AnalysisResult | null>(null);
  const [videoResult, setVideoResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImageResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setVideoResult(null);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;
    
    setIsAnalyzingImage(true);
    setImageResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const { data, error } = await supabase.functions.invoke('analyze-deepfake', {
        body: formData,
      });

      if (error) throw error;

      setImageResult(data);

      toast({
        title: data.isDeepfake ? "⚠️ AI-Generated Content Detected" : "✓ Analysis Complete",
        description: data.message,
        variant: data.isDeepfake ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const analyzeVideo = async () => {
    if (!videoFile) return;
    
    setIsAnalyzingVideo(true);
    setVideoResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const { data, error } = await supabase.functions.invoke('analyze-deepfake', {
        body: formData,
      });

      if (error) throw error;

      setVideoResult(data);

      toast({
        title: data.isDeepfake ? "⚠️ AI-Generated Content Detected" : "✓ Analysis Complete",
        description: data.message,
        variant: data.isDeepfake ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error analyzing video:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const resetImage = () => {
    setImageFile(null);
    setImageResult(null);
    setImagePreview(null);
  };

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="container max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold">
            AI <span className="gradient-text">Forensics Lab</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered detection system analyzing pixel-level data to identify deepfakes and AI-generated content
          </p>
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <p className="text-sm text-primary">
              🔬 Powered by Vision AI • Analyzes texture, artifacts & patterns
            </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Image Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="p-8 rounded-2xl bg-card border border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Image className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Image Analysis</h3>
              <p className="text-muted-foreground text-center text-sm">
                AI-powered forensic analysis of image authenticity
              </p>
              
              {imagePreview ? (
                <div className="w-full space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-primary/30">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground truncate">
                    {imageFile?.name}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetImage}
                    className="w-full"
                  >
                    Choose Different Image
                  </Button>
                </div>
              ) : (
                <div className="w-full">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </div>
                  </label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={analyzeImage}
                disabled={!imageFile || isAnalyzingImage}
              >
                {isAnalyzingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Image'
                )}
              </Button>
              
              {imageResult && <ImageAnalysisResult result={imageResult} />}
            </div>
          </motion.div>

          {/* Video Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="p-8 rounded-2xl bg-card border border-secondary/20 hover:border-secondary/40 transition-all"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                <Video className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold">Video Analysis</h3>
              <p className="text-muted-foreground text-center text-sm">
                Detect deepfake manipulation in videos
              </p>
              <div className="w-full">
                <label htmlFor="video-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-secondary/30 rounded-lg p-8 text-center hover:border-secondary/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <p className="text-sm text-muted-foreground">
                      {videoFile ? videoFile.name : "Click to upload video"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, MOV, AVI up to 50MB
                    </p>
                  </div>
                </label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>
              <Button 
                className="w-full"
                onClick={analyzeVideo}
                disabled={!videoFile || isAnalyzingVideo}
              >
                {isAnalyzingVideo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Video'
                )}
              </Button>
              
              {videoResult && <ImageAnalysisResult result={videoResult} />}
            </div>
          </motion.div>

          {/* Link Analysis Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="p-8 rounded-2xl bg-card border border-accent/20 hover:border-accent/40 transition-all"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                <Link className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">URL Analysis</h3>
              <p className="text-muted-foreground text-center text-sm">
                Check if a URL contains manipulated content
              </p>
              <div className="w-full space-y-4">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                URL analysis feature is under development
              </p>
            </div>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 p-8 rounded-2xl bg-muted/30 border"
        >
          <h3 className="text-xl font-bold mb-4 text-center">How Our AI Forensics Works</h3>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <span className="text-xl">🔍</span>
              </div>
              <h4 className="font-semibold">Texture Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Examines unnatural smoothness and repetitive patterns
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                <span className="text-xl">🎨</span>
              </div>
              <h4 className="font-semibold">Artifact Detection</h4>
              <p className="text-sm text-muted-foreground">
                Identifies GAN and diffusion model signatures
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <span className="text-xl">💡</span>
              </div>
              <h4 className="font-semibold">Lighting Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Checks shadow and reflection consistency
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <span className="text-xl">📊</span>
              </div>
              <h4 className="font-semibold">Noise Patterns</h4>
              <p className="text-sm text-muted-foreground">
                Analyzes digital noise vs camera sensor noise
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TryDemo;
