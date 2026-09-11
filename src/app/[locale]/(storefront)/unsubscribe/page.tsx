"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ds/button";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No unsubscribe token provided.");
      return;
    }

    fetch("/api/v1/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setEmail(data.data.email || "");
        } else {
          setStatus("error");
          setErrorMessage(data.error || "Invalid or expired link.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Network error while unsubscribing. Please try again later.");
      });
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center p-6 text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">Processing your unsubscribe request…</h1>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You are unsubscribed</h1>
          <p className="text-muted-foreground">
            {email ? (
              <>
                <strong className="text-foreground">{email}</strong> has been removed from all marketing outreach.
              </>
            ) : (
              "You have been successfully removed from our promotional email list."
            )}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Important transactional emails (such as order confirmations and shipping updates) will still be delivered.
          </p>
          <div className="pt-4">
            <Button asChild>
              <Link href="/">Return to Store</Link>
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Unsubscribe Link Expired or Invalid</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <div className="pt-4">
            <Button asChild variant="outline">
              <Link href="/">Return to Store</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
