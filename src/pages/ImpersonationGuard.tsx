import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import InstagramLogin from "@/components/instagram/InstagramLogin";
import InstagramSignup from "@/components/instagram/InstagramSignup";
import InstagramHome from "@/components/instagram/InstagramHome";
import InstagramCreatePost from "@/components/instagram/InstagramCreatePost";
import { InstagramBlockedModal, InstagramSuccessModal } from "@/components/instagram/InstagramResultModals";

type InstagramView = "login" | "signup" | "home" | "create";

interface InstagramUser {
  username: string;
  isVerified: boolean;
}

export default function ImpersonationGuard() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [view, setView] = useState<InstagramView>("login");
  const [instagramUser, setInstagramUser] = useState<InstagramUser | null>(null);
  
  // Modal states
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [blockedConfidence, setBlockedConfidence] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setAuthUser(session.user);
      }
    });
  }, [navigate]);

  const handleLogin = (username: string) => {
    setInstagramUser({ username, isVerified: false });
    setView("home");
  };

  const handleSignup = (username: string, isVerified: boolean) => {
    setInstagramUser({ username, isVerified });
    setView("home");
  };

  const handleLogout = () => {
    setInstagramUser(null);
    setView("login");
  };

  const handleExitDemo = () => {
    navigate("/dashboard");
  };

  const handlePostBlocked = (confidence: number, reason: string) => {
    setBlockedConfidence(confidence);
    setBlockedReason(reason);
    setShowBlockedModal(true);
  };

  const handlePostSuccess = () => {
    setShowSuccessModal(true);
  };

  const handleCloseBlockedModal = () => {
    setShowBlockedModal(false);
    setView("home");
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setView("home");
  };

  if (!authUser) return null;

  return (
    <>
      {/* Instagram Clone Views */}
      {view === "login" && (
        <InstagramLogin 
          onLogin={handleLogin} 
          onSwitchToSignup={() => setView("signup")} 
        />
      )}

      {view === "signup" && (
        <InstagramSignup 
          onSignup={handleSignup} 
          onSwitchToLogin={() => setView("login")} 
        />
      )}

      {view === "home" && instagramUser && (
        <InstagramHome
          username={instagramUser.username}
          isVerified={instagramUser.isVerified}
          onCreatePost={() => setView("create")}
          onLogout={handleLogout}
          onExitDemo={handleExitDemo}
        />
      )}

      {view === "create" && instagramUser && (
        <InstagramCreatePost
          username={instagramUser.username}
          isVerified={instagramUser.isVerified}
          onBack={() => setView("home")}
          onSuccess={handlePostSuccess}
          onBlocked={handlePostBlocked}
        />
      )}

      {/* Result Modals */}
      <InstagramBlockedModal
        open={showBlockedModal}
        confidence={blockedConfidence}
        reason={blockedReason}
        onClose={handleCloseBlockedModal}
      />

      <InstagramSuccessModal
        open={showSuccessModal}
        onClose={handleCloseSuccessModal}
      />
    </>
  );
}
