import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisLogId?: string;
  currentClassification?: string;
}

export function ReportDialog({ open, onOpenChange, analysisLogId, currentClassification }: ReportDialogProps) {
  const [expectedClassification, setExpectedClassification] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!expectedClassification || !reason.trim()) {
      toast({
        title: "Missing information",
        description: "Please select the correct classification and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to submit a report.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.functions.invoke('submit-report', {
        body: {
          analysisLogId: analysisLogId || 'manual-report',
          expectedClassification,
          reason: reason.trim(),
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      
      setTimeout(() => {
        onOpenChange(false);
        setIsSubmitted(false);
        setExpectedClassification("");
        setReason("");
      }, 2000);

    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <DialogTitle>Report Submitted</DialogTitle>
            <DialogDescription className="text-center">
              Thank you for your feedback. Our team will review this classification.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Incorrect Classification</DialogTitle>
          <DialogDescription>
            Help us improve by reporting misclassified content. Your feedback helps train our AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentClassification && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <span className="text-muted-foreground">Current classification: </span>
              <span className="font-medium capitalize">{currentClassification.replace('_', ' ')}</span>
            </div>
          )}

          <div className="space-y-3">
            <Label>What should the correct classification be?</Label>
            <RadioGroup value={expectedClassification} onValueChange={setExpectedClassification}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="real" id="real" />
                <Label htmlFor="real" className="font-normal cursor-pointer">
                  <span className="font-medium text-green-600">Authentic/Real</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    — Genuine photo/video, not AI-generated
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ai_safe" id="ai_safe" />
                <Label htmlFor="ai_safe" className="font-normal cursor-pointer">
                  <span className="font-medium text-amber-600">AI Generated (Safe)</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    — AI art or filter, but not harmful
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deepfake" id="deepfake" />
                <Label htmlFor="deepfake" className="font-normal cursor-pointer">
                  <span className="font-medium text-destructive">Deepfake/Harmful</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    — Malicious manipulation or deception
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you believe this is incorrect?</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you think the classification is wrong..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
