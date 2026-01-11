import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { sendEmailVerificationOTP, verifyEmailOTP } from "@/lib/auth-client";
import { EmailVerificationDialog } from "@/components/email-verification-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/nav/header";

export const Route = createFileRoute("/auth/verify-email/")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  // Check if user is already verified
  useEffect(() => {
    if (!loading && user?.emailVerified) {
      setIsVerified(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate({ to: "/app/dashboard" });
      }, 2000);
    } else if (!loading && user && !user.emailVerified) {
      // Open OTP dialog automatically if user is not verified
      setOtpDialogOpen(true);
    }
  }, [user, loading, navigate]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/signin" });
    }
  }, [user, loading, navigate]);

  const handleVerifyOTP = async (code: string) => {
    if (!user?.email) {
      throw new Error("No email address found");
    }

    // Verify OTP using Better Auth
    await verifyEmailOTP(user.email, code);
    
    setIsVerified(true);
    setOtpDialogOpen(false);
    toast.success("Email verified successfully!");
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigate({ to: "/app/dashboard" });
    }, 1500);
  };

  const handleResendOTP = async () => {
    if (!user?.email) {
      throw new Error("No email address found");
    }

    try {
      await sendEmailVerificationOTP(user.email);
      toast.success("Verification code resent successfully");
    } catch (error) {
      console.error("Failed to resend verification code:", error);
      throw error; // Re-throw so the dialog can handle it
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center px-6 py-24">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center px-6 py-24">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Email Verified
              </CardTitle>
              <CardDescription>
                Your email has been verified successfully!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center px-6 py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification code to <strong>{user.email}</strong>.
              Please enter the code below to verify your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Check your inbox for a 6-digit verification code. If you don't
                see it, check your spam folder.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-4">
              <Button
                onClick={() => setOtpDialogOpen(true)}
                className="w-full"
              >
                Enter Verification Code
              </Button>

              <Button
                variant="outline"
                onClick={handleResendOTP}
                className="w-full"
              >
                Resend Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {user.email && (
        <EmailVerificationDialog
          open={otpDialogOpen}
          onOpenChange={setOtpDialogOpen}
          email={user.email}
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
        />
      )}
    </div>
  );
}
