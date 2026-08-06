"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useGame } from "../context/GameContext";

export default function TutorialAuthentication() {
  const { session, playCyberSe } = useGame();
  const [step, setStep] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("tutorial_progress")
        .select("step_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setStep(data?.step_id ?? null);
    };
    void load();
  }, [session?.user?.id]);

  useEffect(() => {
    const identities = session?.user?.identities || [];
    const hasLinkedIdentity = identities.some((identity: any) => identity.provider && identity.provider !== "anonymous");
    if (step !== "COMPLETE" || !hasLinkedIdentity) return;
    const completeGoogleLink = async () => {
      const { error: progressError } = await supabase.rpc("complete_tutorial_authentication", {
        p_auth_method: "GOOGLE"
      });
      if (!progressError) setStep("AUTHENTICATION");
    };
    void completeGoogleLink();
  }, [session?.user?.identities, step]);

  if (step !== "COMPLETE") return null;

  const finalize = async (method: "EMAIL" | "GOOGLE") => {
    const { error: progressError } = await supabase.rpc("complete_tutorial_authentication", {
      p_auth_method: method
    });
    if (!progressError) setStep("AUTHENTICATION");
  };

  const connectEmail = async () => {
    if (!email.trim() || password.length < 6) {
      setError("Enter an email address and a password of at least 6 characters.");
      return;
    }
    setWorking(true);
    setError(null);
    playCyberSe("click");
    const { error: updateError } = await supabase.auth.updateUser({ email: email.trim(), password });
    if (updateError) setError(updateError.message);
    else await finalize("EMAIL");
    setWorking(false);
  };

  const connectGoogle = async () => {
    setWorking(true);
    setError(null);
    playCyberSe("click");
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (linkError) {
      setError(linkError.message);
      setWorking(false);
    }
  };

  return (
    <div className="modal-overlay background-black-95" style={{ zIndex: 20000 }}>
      <div className="modal-card border-cyan-glow" style={{ maxWidth: 420 }}>
        <div className="font-size-8 text-color-cyan font-weight-bold mb-2">SAVE YOUR PROGRESS</div>
        <div className="modal-desc text-left mb-3">
          Link one sign-in method to keep this account and its progress. Google and email/password cannot be combined on the same account.
        </div>
        <input className="auth-input mb-2" type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="auth-input" type="password" placeholder="Password (6+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="claim-reward-btn mt-3 font-weight-bold py-2 width-100" onClick={() => void connectEmail()} disabled={working}>
          {working ? "CONNECTING..." : "CONNECT EMAIL ACCOUNT"}
        </button>
        <button className="claim-reward-btn mt-2 font-weight-bold py-2 width-100" onClick={() => void connectGoogle()} disabled={working}>
          CONNECT GOOGLE ACCOUNT
        </button>
        {error && <div className="text-color-red font-size-7 mt-2">{error}</div>}
      </div>
    </div>
  );
}
