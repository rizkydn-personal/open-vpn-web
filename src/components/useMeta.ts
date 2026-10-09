"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Meta } from "@/components/Portal";

const POLL_INTERVAL_MS = 30_000;

type MetaState = {
  meta: Meta | null;
  failed: boolean;
  retry: () => void;
};

// Memuat /api/meta di klien: first paint tidak menunggu upstream.
// Polling berjeda 30 detik dan berhenti saat tab tidak terlihat.
export function useMeta(): MetaState {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    async function load() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/meta", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`meta ${response.status}`);
        const payload = (await response.json()) as { data?: Meta };
        if (alive && payload?.data) {
          setMeta(payload.data);
          setFailed(false);
        }
      } catch {
        if (alive && !controller.signal.aborted) setFailed(true);
      }
    }

    function schedule() {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        await load();
        if (alive) schedule();
      }, POLL_INTERVAL_MS);
    }

    function onVisibility() {
      if (!document.hidden) {
        void load();
        schedule();
      }
    }

    void load().then(() => {
      if (alive) schedule();
    });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [attempt]);

  return { meta, failed: failed && meta === null, retry };
}
