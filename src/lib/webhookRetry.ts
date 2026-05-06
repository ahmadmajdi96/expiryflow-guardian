/**
 * Idempotent webhook retry utility for CoreERP receipt confirmations.
 * Logs attempts and supports configurable retries with exponential backoff.
 */
import { supabase } from "@/integrations/supabase/client";

export interface WebhookPayload {
  event: string;
  idempotencyKey: string;
  data: Record<string, unknown>;
}

export interface WebhookResult {
  success: boolean;
  attempts: number;
  lastError?: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWebhookWithRetry(
  payload: WebhookPayload,
  maxRetries = MAX_RETRIES
): Promise<WebhookResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("coreerp-po-webhook", {
        body: {
          ...payload,
          attempt,
          sentAt: new Date().toISOString(),
        },
      });

      if (error) {
        lastError = error.message ?? String(error);
        console.warn(`[Webhook] Attempt ${attempt}/${maxRetries} failed:`, lastError);
      } else {
        // Log success
        console.info(`[Webhook] ${payload.event} sent successfully on attempt ${attempt}`, {
          idempotencyKey: payload.idempotencyKey,
        });
        await logWebhookAttempt(payload, attempt, "SUCCESS", null);
        return { success: true, attempts: attempt };
      }
    } catch (err: any) {
      lastError = err?.message ?? String(err);
      console.warn(`[Webhook] Attempt ${attempt}/${maxRetries} exception:`, lastError);
    }

    await logWebhookAttempt(payload, attempt, "FAILED", lastError);

    if (attempt < maxRetries) {
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(backoff);
    }
  }

  console.error(`[Webhook] ${payload.event} failed after ${maxRetries} attempts`, {
    idempotencyKey: payload.idempotencyKey,
    lastError,
  });
  return { success: false, attempts: maxRetries, lastError };
}

async function logWebhookAttempt(
  payload: WebhookPayload,
  attempt: number,
  status: string,
  error: string | null
) {
  try {
    await supabase.from("webhook_log").insert({
      direction: "OUT",
      event_type: payload.event,
      payload: { ...payload.data, idempotencyKey: payload.idempotencyKey, attempt },
      status,
      response_body: error ? { error } : null,
    } as any);
  } catch {
    // Non-blocking — don't let logging failures break the flow
  }
}