import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Shield, Sparkles, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { ReportDialog } from "@/components/ReportDialog";

interface BlockedModalProps {
  open: boolean;
  confidence: number;
  reason: string;
  onClose: () => void;
  analysisLogId?: string;
}

export function InstagramBlockedModal({ open, confidence, reason, onClose, analysisLogId }: BlockedModalProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden">
          {/* Red Header */}
          <div className="bg-red-500 p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </motion.div>
            <h2 className="text-xl font-semibold text-white">Upload blocked</h2>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            <p className="text-gray-700">
              We detected manipulated or impersonated content.
            </p>
            <p className="text-gray-500 text-sm">
              This post goes against our authenticity guidelines.
            </p>

            {/* Secura.AI Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-gray-600">
                Secura.AI blocked this upload
              </span>
            </div>

            {/* Details */}
            <div className="bg-red-50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-red-700">Confidence:</span>{" "}
                <span className="text-red-600">{confidence}%</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-red-700">Reason:</span>{" "}
                <span className="text-red-600">{reason}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={onClose}
                className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white"
              >
                OK
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => setShowReportDialog(true)}
              >
                <Flag className="w-3 h-3 mr-1" />
                This is wrong? Report it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        analysisLogId={analysisLogId}
        currentClassification="deepfake"
      />
    </>
  );
}

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  isAISafe?: boolean;
  analysisLogId?: string;
}

export function InstagramSuccessModal({ open, onClose, isAISafe = false, analysisLogId }: SuccessModalProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden">
          {/* Header - Green for authentic, Amber for AI Safe */}
          <div className={`p-6 text-center ${isAISafe ? 'bg-amber-500' : 'bg-green-500'}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-3">
                {isAISafe ? (
                  <Sparkles className="h-8 w-8 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>
            </motion.div>
            <h2 className="text-xl font-semibold text-white">
              {isAISafe ? 'Post shared with label' : 'Post shared'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            <p className="text-gray-700 text-lg">
              {isAISafe 
                ? 'Your AI-generated content has been shared with an appropriate label.'
                : 'Your post has been shared.'
              }
            </p>

            {/* Secura.AI Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              isAISafe ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <Shield className={`h-4 w-4 ${isAISafe ? 'text-amber-600' : 'text-green-600'}`} />
              <span className={`text-sm font-medium ${isAISafe ? 'text-amber-700' : 'text-green-700'}`}>
                {isAISafe ? 'AI Content Labeled by Secura.AI' : 'Verified by Secura.AI'}
              </span>
            </div>

            {isAISafe && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Your post will display an "AI Generated" label to maintain transparency
              </p>
            )}

            <p className="text-xs text-gray-400">
              {isAISafe 
                ? 'AI-generated content is allowed when properly labeled'
                : 'Your content passed authenticity verification'
              }
            </p>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={onClose}
                className="w-full bg-[#0095f6] hover:bg-[#1877f2] text-white"
              >
                Back to Home
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
                onClick={() => setShowReportDialog(true)}
              >
                <Flag className="w-3 h-3 mr-1" />
                This is wrong? Report it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        analysisLogId={analysisLogId}
        currentClassification={isAISafe ? "ai_safe" : "real"}
      />
    </>
  );
}
