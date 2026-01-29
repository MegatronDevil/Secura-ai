import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, ShieldAlert, ShieldCheck, Info, Flag, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/ReportDialog";

export interface AnalysisResult {
  filename: string;
  isDeepfake: boolean;
  isAISafe?: boolean;
  classification?: 'real' | 'ai_safe' | 'deepfake';
  message: string;
  confidence: number;
  label?: string;
  details?: string;
  artifacts?: string[];
  analysisType?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  analysisLogId?: string;
}

interface ImageAnalysisResultProps {
  result: AnalysisResult;
  showReportButton?: boolean;
}

export const ImageAnalysisResult = ({ result, showReportButton = true }: ImageAnalysisResultProps) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  // Determine classification type
  const classification = result.classification || 
    (result.isDeepfake ? 'deepfake' : result.isAISafe ? 'ai_safe' : 'real');
  
  const isDeepfake = classification === 'deepfake';
  const isAISafe = classification === 'ai_safe';
  const isReal = classification === 'real';
  
  const confidence = result.confidence || 0;
  
  // Color schemes for each classification
  const getColorScheme = () => {
    if (isDeepfake) return {
      border: 'border-destructive/50',
      bg: 'bg-destructive/5',
      iconBg: 'bg-destructive/20',
      iconColor: 'text-destructive',
      textColor: 'text-destructive',
      progressColor: '[&>div]:bg-destructive',
      badgeVariant: 'destructive' as const,
      badgeClass: '',
    };
    if (isAISafe) return {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/5',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-500',
      progressColor: '[&>div]:bg-amber-500',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-amber-500 hover:bg-amber-600',
    };
    return {
      border: 'border-green-500/50',
      bg: 'bg-green-500/5',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
      textColor: 'text-green-500',
      progressColor: '[&>div]:bg-green-500',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-green-500 hover:bg-green-600',
    };
  };

  const colors = getColorScheme();

  const getIcon = () => {
    if (isDeepfake) return <ShieldAlert className={`w-6 h-6 ${colors.iconColor}`} />;
    if (isAISafe) return <Sparkles className={`w-6 h-6 ${colors.iconColor}`} />;
    return <ShieldCheck className={`w-6 h-6 ${colors.iconColor}`} />;
  };

  const getLabel = () => {
    if (result.label) return result.label;
    if (isDeepfake) return 'Deepfake Detected';
    if (isAISafe) return 'AI Generated (Safe)';
    return 'Authentic';
  };

  const getRiskBadge = () => {
    if (!result.riskLevel) return null;
    const riskColors = {
      low: 'bg-green-500/20 text-green-700 border-green-500/30',
      medium: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
      high: 'bg-destructive/20 text-destructive border-destructive/30',
    };
    return (
      <Badge variant="outline" className={riskColors[result.riskLevel]}>
        {result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)} Risk
      </Badge>
    );
  };
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <Card className={`border-2 ${colors.border} ${colors.bg}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                  {getIcon()}
                </div>
                <div>
                  <CardTitle className={`text-lg ${colors.textColor}`}>
                    {getLabel()}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI Forensic Analysis Complete
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={colors.badgeVariant}
                  className={colors.badgeClass}
                >
                  {confidence}% Confidence
                </Badge>
                {getRiskBadge()}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Confidence Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Detection Confidence</span>
                <span className={colors.textColor}>
                  {confidence}%
                </span>
              </div>
              <Progress 
                value={confidence} 
                className={`h-2 ${colors.progressColor}`}
              />
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-start gap-2">
                {isDeepfake ? (
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                ) : isAISafe ? (
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{result.message}</p>
              </div>
            </div>

            {/* Detailed Analysis */}
            {result.details && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Analysis Explanation</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border text-sm text-muted-foreground">
                  {result.details}
                </div>
              </div>
            )}

            {/* Artifacts Found */}
            {result.artifacts && result.artifacts.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Detected Indicators:</span>
                <div className="flex flex-wrap gap-2">
                  {result.artifacts.map((artifact, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={`${colors.border} ${colors.textColor}`}
                    >
                      {artifact}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Footer with Analysis Type and Report Button */}
            <div className="flex items-center justify-between pt-2">
              {result.analysisType && (
                <Badge variant="secondary" className="text-xs">
                  {result.analysisType === 'image-forensics' ? '🔬 Image Forensics' : 
                   result.analysisType === 'video-forensics' ? '📹 Video Forensics' :
                   '🔬 AI Forensic Analysis'}
                </Badge>
              )}
              
              {showReportButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowReportDialog(true)}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Report Incorrect Result
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        analysisLogId={result.analysisLogId}
        currentClassification={classification}
      />
    </>
  );
};
