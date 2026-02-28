"use client";

import { useEffect, useState } from "react";
import ReactCardFlip from "react-card-flip";
import Tilt from "react-parallax-tilt";

export default function Home() {
  const [phone, setPhone] = useState("");
  const [formState, setFormState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const formatForDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      return;
    }
    setFormState("submitting");
    try {
      const res = await fetch("/api/tpo/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: `+1${phone}` }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      let responseMessage = "Something went wrong.";

      if (contentType.includes("application/json")) {
        const data = (await res.json()) as { message?: string };
        responseMessage = data.message ?? responseMessage;
      } else {
        const text = await res.text();
        if (text.trim()) responseMessage = text;
      }

      if (!res.ok) {
        setErrorMsg(responseMessage);
        setFormState("error");
        return;
      }
      setFormState("success");
      setIsFlipped(true);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? `Unable to reach the server: ${error.message}`
          : "Unable to reach the server. Please try again.",
      );
      setFormState("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] px-4 font-pp-neue-montreal">
      <Tilt
        tiltEnable={!isTouchDevice}
        tiltReverse
        tiltMaxAngleX={8}
        tiltMaxAngleY={8}
        glareEnable={!isTouchDevice}
        glareBorderRadius="1rem"
        glarePosition="top"
        transitionSpeed={2000}
      >
        <ReactCardFlip isFlipped={isFlipped} flipDirection="horizontal">
          <form
            onSubmit={handleSubmit}
            className="w-[350px] rounded-2xl bg-gradient-to-b from-[#2563eb] to-[#90A9F1] p-[1px] shadow-lg"
          >
            <div className="relative flex min-h-[340px] flex-col rounded-2xl bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] px-5 pt-6 pb-5 text-white">
              <div className="mb-5 flex justify-center">
                <div className="rounded-xl border border-white/25 bg-white/20 px-3 py-1">
                  <p className="text-xs">welcome to jøsh</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center">
                <p className="mb-5 text-center text-2xl leading-9">
                  no swiping. no chit-chat.
                  <br />
                  no joshes.
                </p>

                <div className="flex h-10 items-center text-xl">
                  <div className="mr-3 flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1">
                    <span className="text-sm">🇺🇸</span>
                    <span className="text-sm text-white">+1</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={formatForDisplay(phone)}
                    onChange={handlePhoneChange}
                    placeholder="123-456-7890"
                    maxLength={14}
                    autoComplete="tel-national"
                    disabled={formState === "submitting"}
                    className="w-[126px] bg-transparent text-white outline-none placeholder:text-[#dbeafe]"
                  />
                </div>
              </div>

              <div className="h-[44px]">
                <button
                  type="submit"
                  disabled={formState === "submitting" || phone.length !== 10}
                  className="flex h-full w-full items-center justify-center rounded-lg bg-[#1e40af] text-xl text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {formState === "submitting" ? "sending..." : "get started"}
                </button>
              </div>
              {errorMsg && (
                <p
                  className={`pt-2 text-center text-xs ${
                    errorMsg.includes("already signed up")
                      ? "text-[#1e40af]"
                      : "text-red-100"
                  }`}
                >
                  {errorMsg}
                </p>
              )}
            </div>
          </form>

          <div className="w-[350px] rounded-2xl bg-gradient-to-b from-[#2563eb] to-[#90A9F1] p-[1px] shadow-lg">
            <div className="relative flex min-h-[340px] flex-col rounded-2xl bg-gradient-to-b from-[#1d4ed8] to-[#90A9F1] px-5 pt-6 pb-5 text-white">
              <div className="mb-5 flex justify-center">
                <div className="rounded-xl border border-white/25 bg-white/20 px-3 py-1">
                  <p className="text-xs">welcome to jøsh</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="text-2xl leading-9">check your texts!</p>
                <p className="mt-3 text-sm text-white/90">
                  we just sent you a message to get started.
                </p>
              </div>
              <div className="opacity-0 mb-5 flex justify-center">
                <div className="rounded-xl border border-white/25 bg-white/20 px-3 py-1">
                  <p className="text-xs">welcome to jøsh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="absolute bottom-4 right-4 rounded-full p-1 text-white/70 transition-colors hover:text-white"
                aria-label="flip back"
              >
                ↺
              </button>
            </div>
          </div>
        </ReactCardFlip>
      </Tilt>

      <div className="mt-5 w-full max-w-[300px] px-2">
        <p className="text-center text-[11px] leading-[18px] text-[#22324a9e]">
          by submitting, you agree to receive texts from jøsh.
        </p>
        <p className="text-center text-[11px] leading-[18px] text-[#22324a9e]">
          msg & data rates may apply.
        </p>
      </div>
    </div>
  );
}
