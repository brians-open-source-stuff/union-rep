"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { getUserPrivateKeyFromIndexedDB, rewrapCaseWithAllKeys } from "@/lib/client-rewrap";
import { getActiveDeviceUser } from "@/lib/device-crypto";
import type { CaseForRewrap, DeviceKeyForRewrap } from "@/lib/client-rewrap";

export const metadata = {
  title: "Nøgler"
}

type RewrapJob = {
  id: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
};

export default function RewrapManagementPage() {
  const [hasNewKeys, setHasNewKeys] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentJob, setCurrentJob] = useState<RewrapJob | null>(null);
  const [isRewrapping, setIsRewrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Check for new device keys
  const checkNewKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/rewrap/detect");
      if (!response.ok) throw new Error("Failed to check for new keys");
      const data = await response.json();
      setHasNewKeys(data.hasNewKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error checking for new keys");
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for job status
  const pollJobStatus = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/rewrap/status/${jobId}`);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Failed to get job status (${response.status}): ${body}`);
        }
        const job = await response.json();
        setCurrentJob(job);

        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
          setIsRewrapping(false);
          setPollInterval(null);
        }
      } catch (err) {
        console.error("Error polling job status:", err);
        setError(err instanceof Error ? err.message : "Error polling job status");
        clearInterval(interval);
        setIsRewrapping(false);
        setPollInterval(null);
      }
    }, 1000); // Poll every second

    setPollInterval(interval);
    return interval;
  }, []);

  // Start rewrap process
  const startRewrap = async () => {
    try {
      setError(null);
      setIsRewrapping(true);

      // Start the job
      const response = await fetch("/api/rewrap/start", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start rewrap");
      const data = await response.json();

      setCurrentJob({
        id: data.jobId,
        status: "pending",
        totalRecords: data.totalRecords,
        processedRecords: 0,
        failedRecords: 0,
        createdAt: new Date().toISOString(),
      });

      // Start polling
      pollJobStatus(data.jobId);

      // Start client-side rewrap process
      await performClientSideRewrap(data.jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error starting rewrap";
      setError(message);
      setIsRewrapping(false);
    }
  };

  // Client-side rewrap logic
  const performClientSideRewrap = async (jobId: string) => {
    try {
      // Update job status to in_progress
      await fetch(`/api/rewrap/progress/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });

      // Get list of cases needing rewrap
      const casesResponse = await fetch("/api/rewrap/cases");
      if (!casesResponse.ok) throw new Error("Failed to get cases");
      const cases: CaseForRewrap[] = await casesResponse.json();

      // Get all active device keys
      const keysResponse = await fetch("/api/keys/active");
      if (!keysResponse.ok) throw new Error("Failed to get active device keys");
      const allActiveKeys: DeviceKeyForRewrap[] = await keysResponse.json();

      // Get user's private key from IndexedDB
      const userId = getActiveDeviceUser();
      if (!userId) {
        throw new Error("Current user not identified. Please log in again to initialize your active device user.");
      }

      const userPrivateKeyJwk = await getUserPrivateKeyFromIndexedDB(userId);
      if (!userPrivateKeyJwk) throw new Error("User private key not found in IndexedDB");

      let processedCount = 0;
      let failedCount = 0;

      // Process each case
      for (const caseData of cases) {
        try {
          // Rewrap the case
          const rewrappedKeys = await rewrapCaseWithAllKeys(
            caseData,
            allActiveKeys,
            userId,
            userPrivateKeyJwk
          );

          if (rewrappedKeys && rewrappedKeys.length > 0) {
            // Send rewrapped keys back to server
            const updateResponse = await fetch("/api/rewrap/update-case", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caseId: caseData.id,
                wrappedKeys: rewrappedKeys,
                jobId,
              }),
            });

            if (updateResponse.ok) {
              processedCount++;
            } else {
              failedCount++;
              console.error(`Failed to update case ${caseData.id}`);
            }
          } else {
            failedCount++;
            console.error(`Failed to rewrap case ${caseData.id}`);
          }

          // Update progress
          await fetch(`/api/rewrap/progress/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              processedRecords: processedCount,
              failedRecords: failedCount,
            }),
          });
        } catch (caseError) {
          failedCount++;
          console.error(`Error processing case ${caseData.id}:`, caseError);
        }
      }

      // Mark job as completed
      await fetch(`/api/rewrap/progress/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: failedCount > 0 ? "failed" : "completed",
          error: failedCount > 0 ? `${failedCount} records failed to rewrap` : undefined,
        }),
      });

      setHasNewKeys(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error during rewrap";
      console.error("Rewrap error:", message);
      await fetch(`/api/rewrap/progress/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: message }),
      });
    }
  };

  // Initialize
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void checkNewKeys();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [checkNewKeys]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Device Key Management</h1>
        <p className="text-gray-600">Manage rewrapping of encrypted data with new device keys</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* New Keys Detection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                New Device Keys Detected
              </CardTitle>
              <CardDescription>
                {hasNewKeys
                  ? "New device keys have been generated and need to be applied to existing records."
                  : "All device keys are up to date."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasNewKeys ? (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Action Required</p>
                    <p className="text-sm text-amber-800">
                      To ensure new users can decrypt existing data, you need to rewrap all encrypted
                      records with the new device keys. This process will run in the browser background
                      and may take some time depending on the volume of data.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">All Keys Updated</p>
                    <p className="text-sm text-green-800">
                      All encrypted records have been rewrapped with the current device keys.
                    </p>
                  </div>
                </div>
              )}

              {!isRewrapping && hasNewKeys && (
                <Button onClick={startRewrap} className="w-full">
                  Start Key Rewrapping Process
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Rewrap Progress */}
          {currentJob && (
            <Card>
              <CardHeader>
                <CardTitle>Rewrap Progress</CardTitle>
                <CardDescription>
                  Started {currentJob.createdAt ? new Date(currentJob.createdAt).toLocaleString() : "recently"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {currentJob.status === "completed"
                        ? "Rewrapping Complete"
                        : currentJob.status === "failed"
                          ? "Rewrapping Failed"
                          : "Rewrapping in Progress"}
                    </span>
                    <span className="text-sm text-gray-600">
                      {currentJob.processedRecords} / {currentJob.totalRecords}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${currentJob.status === "failed"
                        ? "bg-red-500"
                        : currentJob.status === "completed"
                          ? "bg-green-500"
                          : "bg-blue-500"
                        }`}
                      style={{
                        width:
                          currentJob.totalRecords > 0
                            ? `${(currentJob.processedRecords / currentJob.totalRecords) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                {currentJob.failedRecords > 0 && (
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-sm text-amber-900">
                      ⚠️ {currentJob.failedRecords} record{currentJob.failedRecords !== 1 ? "s" : ""} failed to rewrap
                    </p>
                  </div>
                )}

                {currentJob.error && (
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-900">Error:</p>
                    <p className="text-sm text-red-800">{currentJob.error}</p>
                  </div>
                )}

                {(currentJob.status === "completed" || currentJob.status === "failed") && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-900">
                      Completed {currentJob.completedAt ? new Date(currentJob.completedAt).toLocaleString() : "recently"}
                    </p>
                  </div>
                )}

                {currentJob.status === "in_progress" && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rewrapping records...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
