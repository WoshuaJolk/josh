"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SIM_API = "/api/tpo/admin/schedule-sim";
const TEST_PHONE_A = "+15550000001";
const TEST_PHONE_B = "+15550000002";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  body: string;
  createdAt: string;
}

interface DateSnap {
  id: string;
  schedulingPhase: string;
  proposedSlot: string | null;
  agreedTime: string | null;
  suggestedPlace: string | null;
  portalEnabled: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  PROPOSING_TO_A: "Proposing to A",
  WAITING_FOR_A_REPLY: "Waiting for A",
  WAITING_FOR_A_ALTERNATIVE: "A needs to suggest a time",
  PROPOSING_TO_B: "Proposing to B",
  WAITING_FOR_B_REPLY: "Waiting for B",
  WAITING_FOR_B_ALTERNATIVE: "B needs to suggest a time",
  AGREED: "✓ Agreed — portal enabled",
  FAILED: "Failed",
  ESCALATED: "Escalated",
};

export function PhonePanel({
  label,
  phone,
  messages,
  inputValue,
  onInputChange,
  onSend,
  disabled,
  isActor,
  hideInput = false,
  messageBubbleStyle = "default",
  messagesScrollable = true,
}: {
  label: string;
  phone: string;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  isActor: boolean;
  hideInput?: boolean;
  messageBubbleStyle?: "default" | "plain";
  messagesScrollable?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div
          className={`h-2.5 w-2.5 rounded-full ${isActor ? "bg-green-400" : "bg-white/30"}`}
        />
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="ml-1 text-xs text-white/40">{phone}</span>
        {isActor && (
          <span className="ml-auto rounded-full bg-green-400/20 px-2 py-0.5 text-[10px] font-medium text-green-300">
            their turn
          </span>
        )}
      </div>

      <div
        className={`min-h-0 flex-1 space-y-2 p-4 ${
          messagesScrollable ? "overflow-y-auto" : ""
        }`}
        style={messagesScrollable ? { maxHeight: "420px" } : undefined}
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-white/30">no messages yet</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                messageBubbleStyle === "plain"
                  ? `max-w-[80%] whitespace-pre-wrap px-0.5 py-1 text-sm leading-snug ${
                      msg.role === "user" ? "text-white" : "text-white/90"
                    }`
                  : `max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      msg.role === "user"
                        ? "rounded-br-sm bg-[#5684EE] text-white"
                        : "rounded-bl-sm bg-white/12 text-white/90"
                    }`
              }
            >
              {msg.role === "bot" && (
                <span className="mb-0.5 block text-[10px] font-medium text-white/40">
                  jøsh
                </span>
              )}
              {msg.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!hideInput && (
        <div className="flex gap-2 border-t border-white/10 p-3">
          <input
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-40"
            placeholder={isActor ? "type a message…" : "waiting for other user…"}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !disabled) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={disabled}
          />
          <button
            onClick={onSend}
            disabled={disabled || !inputValue.trim()}
            className="rounded-xl bg-[#5684EE] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4070dd] disabled:opacity-30"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export function ScheduleSimulator({
  embedded = false,
  showApiKeyInput = true,
}: {
  embedded?: boolean;
  showApiKeyInput?: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [dateId, setDateId] = useState<string | null>(null);
  const [date, setDate] = useState<DateSnap | null>(null);
  const [messagesA, setMessagesA] = useState<ChatMessage[]>([]);
  const [messagesB, setMessagesB] = useState<ChatMessage[]>([]);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tpo_admin_key") ?? "";
    setApiKey(stored);
    setSavedKey(stored);
  }, []);

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", "x-internal-api-key": savedKey }),
    [savedKey],
  );

  const saveKey = () => {
    localStorage.setItem("tpo_admin_key", apiKey);
    setSavedKey(apiKey);
  };

  const handleInit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(SIM_API, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "init" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Init failed");
        return;
      }
      setDateId(data.dateId);
      setDate(data.date);
      setMessagesA(data.userAMessages ?? []);
      setMessagesB(data.userBMessages ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch(SIM_API, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "reset", dateId }),
      });
      setDateId(null);
      setDate(null);
      setMessagesA([]);
      setMessagesB([]);
      setInputA("");
      setInputB("");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (senderPhone: string, body: string) => {
    if (!dateId || !body.trim()) return;
    setLoading(true);
    setError(null);

    if (senderPhone === TEST_PHONE_A) setInputA("");
    else setInputB("");

    try {
      const res = await fetch(SIM_API, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "send", dateId, senderPhone, messageBody: body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Send failed");
        return;
      }
      setMessagesA(data.userAMessages ?? []);
      setMessagesB(data.userBMessages ?? []);
      if (data.date) setDate(data.date);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const phase = date?.schedulingPhase ?? null;
  const isActorA =
    phase === "WAITING_FOR_A_REPLY" || phase === "WAITING_FOR_A_ALTERNATIVE";
  const isActorB =
    phase === "WAITING_FOR_B_REPLY" || phase === "WAITING_FOR_B_ALTERNATIVE";

  return (
    <div
      className={`${embedded ? "text-white" : "min-h-screen p-6 text-white"}`}
      style={
        embedded
          ? undefined
          : { background: "linear-gradient(135deg, #1d4ed8 0%, #90A9F1 100%)" }
      }
    >
      <div className={embedded ? "" : "mx-auto max-w-4xl"}>
        {showApiKeyInput && (
          <div className="mb-6 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="admin api key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-44 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
              />
              <button
                onClick={saveKey}
                className="rounded-xl bg-white/15 px-3 py-2 text-sm transition-colors hover:bg-white/25"
              >
                save
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleInit}
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#1d4ed8] transition-colors hover:bg-white/90 disabled:opacity-40"
          >
            {loading && !dateId ? "creating..." : "create"}
          </button>

          {dateId && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              reset
            </button>
          )}

          {date && (
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-white/50">phase:</span>
              <span
                className={`font-medium ${phase === "AGREED" ? "text-green-300" : "text-white"}`}
              >
                {PHASE_LABELS[phase ?? ""] ?? phase}
              </span>
              {date.proposedSlot && phase !== "AGREED" && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-white/50">proposed:</span>
                  <span className="text-white/80">{date.proposedSlot}</span>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-2.5 text-sm text-red-200">
            {error}
          </div>
        )}

        {phase === "AGREED" && date && (
          <div className="mb-4 space-y-1 rounded-xl border border-green-400/30 bg-green-400/15 px-4 py-3 text-sm text-green-200">
            <p className="font-semibold">✓ date confirmed for {date.agreedTime}</p>
            {date.suggestedPlace && (
              <p className="text-green-100/70">{date.suggestedPlace}</p>
            )}
          </div>
        )}

        {dateId ? (
          <div className="flex gap-4" style={{ height: "520px" }}>
            <PhonePanel
              label="User A"
              phone={TEST_PHONE_A}
              messages={messagesA}
              inputValue={inputA}
              onInputChange={setInputA}
              onSend={() => handleSend(TEST_PHONE_A, inputA)}
              disabled={loading || !isActorA}
              isActor={isActorA}
            />
            <PhonePanel
              label="User B"
              phone={TEST_PHONE_B}
              messages={messagesB}
              inputValue={inputB}
              onInputChange={setInputB}
              onSend={() => handleSend(TEST_PHONE_B, inputB)}
              disabled={loading || !isActorB}
              isActor={isActorB}
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/30">
            click &quot;create&quot; to start a simulation
          </div>
        )}

        <p className="mt-4 text-center text-xs text-white/25">
          test phones: {TEST_PHONE_A} (User A) · {TEST_PHONE_B} (User B) · no real
          SMS is sent
        </p>
      </div>
    </div>
  );
}
