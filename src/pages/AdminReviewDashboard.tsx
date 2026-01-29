import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Report {
  id: string;
  analysis_log_id: string;
  expected_classification: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reporter_user_id: string;
}

type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

const AdminReviewDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAndLoadReports();
  }, [selectedStatus]);

  const checkAdminAndLoadReports = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin');

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Load reports
      const { data: reportsData, error } = await supabase
        .from('classification_reports')
        .select('*')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(reportsData || []);

    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReport = async (reportId: string, newStatus: ReportStatus) => {
    setProcessingId(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('classification_reports')
        .update({
          status: newStatus,
          admin_notes: adminNotes[reportId] || null,
          reviewed_by: session?.user.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Updated",
        description: `Status changed to ${newStatus}`,
      });

      // Refresh reports
      checkAdminAndLoadReports();

    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: "Error",
        description: "Failed to update report.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'real':
        return <Badge className="bg-green-500">Authentic</Badge>;
      case 'ai_safe':
        return <Badge className="bg-amber-500">AI Safe</Badge>;
      case 'deepfake':
        return <Badge variant="destructive">Deepfake</Badge>;
      default:
        return <Badge variant="outline">{classification}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Review Queue</h1>
            <p className="text-muted-foreground">Review and manage classification reports</p>
          </div>
          <Button variant="outline" onClick={checkAdminAndLoadReports}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as ReportStatus)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No {selectedStatus} reports found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(report.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Expected:</span>
                        {getClassificationBadge(report.expected_classification)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">User's Reason</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {report.reason}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Admin Notes</h4>
                      <Textarea
                        placeholder="Add notes about this report..."
                        value={adminNotes[report.id] || report.admin_notes || ""}
                        onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateReport(report.id, 'resolved')}
                        disabled={processingId === report.id}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        {processingId === report.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateReport(report.id, 'dismissed')}
                        disabled={processingId === report.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateReport(report.id, 'reviewed')}
                        disabled={processingId === report.id}
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewDashboard;
