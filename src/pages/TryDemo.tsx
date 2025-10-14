import { motion } from "framer-motion";
import { Upload, Image, Video, Link, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TryDemo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageResult, setImageResult] = useState<any>(null);
  const [videoResult, setVideoResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const analyzeFile = async (file: File, type: 'image' | 'video') => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('analyze-deepfake', {
        body: formData,
      });

      if (error) throw error;

      if (type === 'image') {
        setImageResult(data);
      } else {
        setVideoResult(data);
      }

      toast({
        title: data.isDeepfake ? "AI-Generated Content Detected!" : "Analysis Complete",
        description: data.message,
        variant: data.isDeepfake ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the file.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
            Try <span className="gradient-text">Demo</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your content to check for deepfake threats
          </p>
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
              <h3 className="text-2xl font-bold">Upload Image</h3>
              <p className="text-muted-foreground text-center text-sm">
                Upload an image to verify its authenticity
              </p>
              <div className="w-full">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {imageFile ? imageFile.name : "Click to upload"}
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
              <Button 
                className="w-full" 
                onClick={() => imageFile && analyzeFile(imageFile, 'image')}
                disabled={!imageFile || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
              </Button>
              {imageResult && (
                <div className={`w-full p-4 rounded-lg border ${
                  imageResult.isDeepfake 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : 'bg-green-500/10 border-green-500/50'
                }`}>
                  <div className="flex items-start gap-3">
                    {imageResult.isDeepfake ? (
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        imageResult.isDeepfake ? 'text-destructive' : 'text-green-500'
                      }`}>
                        {imageResult.isDeepfake ? 'AI-Generated Detected' : 'No AI Markers Found'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {imageResult.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: {imageResult.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
              <h3 className="text-2xl font-bold">Upload Video</h3>
              <p className="text-muted-foreground text-center text-sm">
                Upload a video to detect deepfake manipulation
              </p>
              <div className="w-full">
                <label htmlFor="video-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-secondary/30 rounded-lg p-8 text-center hover:border-secondary/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <p className="text-sm text-muted-foreground">
                      {videoFile ? videoFile.name : "Click to upload"}
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
                onClick={() => videoFile && analyzeFile(videoFile, 'video')}
                disabled={!videoFile || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
              </Button>
              {videoResult && (
                <div className={`w-full p-4 rounded-lg border ${
                  videoResult.isDeepfake 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : 'bg-green-500/10 border-green-500/50'
                }`}>
                  <div className="flex items-start gap-3">
                    {videoResult.isDeepfake ? (
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        videoResult.isDeepfake ? 'text-destructive' : 'text-green-500'
                      }`}>
                        {videoResult.isDeepfake ? 'AI-Generated Detected' : 'No AI Markers Found'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {videoResult.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: {videoResult.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
              <h3 className="text-2xl font-bold">Analyze Link</h3>
              <p className="text-muted-foreground text-center text-sm">
                Check if a URL contains manipulated content
              </p>
              <div className="w-full space-y-4">
                <Input
                  type="url"
                  placeholder="https://example.com/media"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button className="w-full">Analyze Link</Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TryDemo;
