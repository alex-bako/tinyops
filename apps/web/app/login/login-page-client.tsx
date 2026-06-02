"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Body,
  EditorialItalic,
  Eyebrow,
  Mono,
} from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import { requestMagicLink } from "@/app/login/actions"
import { initialLoginState, type LoginState } from "@/app/login/_state"

const SHOW_INACTIVE_AUTH_OPTIONS = false

export default function LoginPage() {
  const [state, formAction, pending] = React.useActionState(
    requestMagicLink,
    initialLoginState
  )
  const submitted = state.status === "sent"

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr] bg-background overflow-x-hidden">
      <Masthead />
      <main className="grid min-h-0 grid-cols-1 min-[960px]:grid-cols-[1.35fr_1fr]">
        <Editorial />
        <FormPane
          state={state}
          pending={pending}
          submitted={submitted}
          formAction={formAction}
        />
      </main>
    </div>
  )
}

/* ─── Masthead ─────────────────────────────────────────────────────────── */

function Masthead() {
  return (
    <header
      className={cn(
        "grid items-center gap-6 border-b border-border bg-background",
        "grid-cols-[1fr_auto] px-6 py-[18px]",
        "min-[960px]:grid-cols-[1fr_auto_1fr] min-[960px]:px-10 min-[960px]:py-[22px]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo-mark.svg"
          alt=""
          width={28}
          height={28}
          className="block size-7"
        />
        <span className="font-sans text-[16px] font-semibold tracking-[-0.02em] text-foreground">
          tinyops
        </span>
      </div>

      <Mono
        aria-hidden
        className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-muted-foreground min-[960px]:inline-flex min-[960px]:justify-self-center"
      >
        Vol. 01 &nbsp;·&nbsp;{" "}
        <b className="font-medium text-foreground">Issue 042</b> &nbsp;·&nbsp;{" "}
        May 2026
      </Mono>

      <div className="flex items-center justify-end gap-2.5 text-[13px] text-muted-foreground">
        <span className="hidden sm:inline">New here?</span>
        <a
          href="mailto:hello@tinyops.app?subject=TinyOps%20invite"
          className={cn(
            "border-b border-input pb-px font-medium tracking-[-0.005em] text-foreground",
            "transition-colors duration-[120ms] ease-out",
            "hover:border-cobalt-500 hover:text-cobalt-500"
          )}
        >
          Request an invite
        </a>
      </div>
    </header>
  )
}

/* ─── Editorial pane ───────────────────────────────────────────────────── */

function Editorial() {
  return (
    <section
      aria-labelledby="hero-title"
      className={cn(
        "relative flex flex-col justify-center gap-10 overflow-hidden bg-background",
        "border-b border-border min-[960px]:border-b-0 min-[960px]:border-r",
        "px-[22px] py-10 min-[640px]:px-8 min-[640px]:py-14",
        "min-[960px]:px-[72px] min-[960px]:pb-12 min-[960px]:pt-[88px]"
      )}
    >
      {/* Faint hand-drawn arc background */}
      <svg
        aria-hidden
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <path
          d="M-20 480 C 180 460, 360 380, 520 300 S 820 60, 920 -20"
          stroke="#0F172A"
          strokeWidth="1"
          strokeOpacity="0.06"
          fill="none"
        />
      </svg>

      <div className="relative z-[1] flex flex-col gap-10">
        <Eyebrow
          className={cn(
            "flex items-center gap-3 text-[11px] tracking-[0.22em] text-muted-foreground",
            "before:block before:h-px before:w-7 before:bg-current before:content-['']"
          )}
        >
          A field manual for remembering
        </Eyebrow>

        <h1
          id="hero-title"
          className={cn(
            "m-0 max-w-[14ch] font-sans font-semibold text-foreground",
            "text-[clamp(48px,7.6vw,104px)] leading-[0.96] tracking-[-0.04em]"
          )}
        >
          <span className="block">A small,</span>
          <span className="block">
            <EditorialItalic className="text-cobalt-500">
              careful memory
            </EditorialItalic>
          </span>
          <span className="block">
            <EditorialItalic className="text-cobalt-500">
              for tiny
              <span
                aria-hidden
                className="ml-[0.05em] inline-block size-[0.6em] rounded-full bg-citron-500 align-[0.05em]"
              />{" "}
              teams
            </EditorialItalic>
          </span>
        </h1>

        <Body
          size="lg"
          className="m-0 max-w-[46ch] text-[16px] leading-[1.55] text-muted-foreground"
        >
          TinyOps is a private memory for solo operators - every email, form,
          payment, and follow-up gathered in one quiet place.{" "}
          <EditorialItalic className="text-foreground">
            Sign in and pick up exactly where you left off.
          </EditorialItalic>
        </Body>
      </div>

      <footer
        className={cn(
          "relative z-[1] mt-auto flex items-center gap-4 border-t border-border pt-7",
          "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
        )}
      >
        <span className="font-medium text-foreground">№ 001 / Login</span>
        <span
          aria-hidden
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          <svg
            viewBox="0 0 220 14"
            fill="none"
            className="h-[14px] w-full max-w-[220px]"
          >
            <circle cx="4" cy="9" r="2.5" fill="#0F172A" />
            <path
              d="M8 9 C 60 9, 90 1, 140 3 S 210 7, 216 5"
              stroke="#0F172A"
              strokeOpacity="0.45"
              strokeWidth="1"
              fill="none"
            />
            <circle
              cx="216"
              cy="5"
              r="3.5"
              fill="#BEF264"
              stroke="#0F172A"
              strokeOpacity="0.2"
            />
          </svg>
        </span>
        <span className="text-muted-foreground">tinyops.co</span>
      </footer>
    </section>
  )
}

/* ─── Form pane ────────────────────────────────────────────────────────── */

function FormPane({
  state,
  pending,
  submitted,
  formAction,
}: {
  state: LoginState
  pending: boolean
  submitted: boolean
  formAction: (formData: FormData) => void
}) {
  return (
    <section
      aria-labelledby="form-title"
      className={cn(
        "relative flex items-center justify-center bg-card",
        "px-[22px] py-9 min-[640px]:px-8 min-[640px]:py-12 min-[960px]:px-12 min-[960px]:py-16"
      )}
    >
      <div className="flex w-full max-w-[360px] flex-col">
        <Eyebrow className="mb-[18px] text-[11px] tracking-[0.22em] text-muted-foreground">
          - Sign in
        </Eyebrow>

        <h2
          id="form-title"
          className="m-0 font-sans text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground"
        >
          Welcome <EditorialItalic className="text-cobalt-500">back.</EditorialItalic>
        </h2>

        <p
          aria-live="polite"
          className={cn(
            "mb-8 mt-3.5 text-[14.5px] leading-[1.55]",
            state.status === "error" || state.status === "invalid"
              ? "text-coral-700"
              : "text-muted-foreground"
          )}
        >
          {state.message}
        </p>

        <form action={formAction} className="flex flex-col">
          <label htmlFor="login-email" className="mb-4 flex flex-col gap-1.5">
            <span className="text-[12px] tracking-[0.01em] text-muted-foreground">
              Email address
            </span>
            <Input
              id="login-email"
              type="email"
              name="email"
              placeholder="anna@example.co"
              autoComplete="email"
              required
              readOnly={pending || submitted}
              onKeyDown={(event) => {
                // Explicitly submit on Enter. Some password managers / autofill
                // overlays swallow the browser's implicit form submission on
                // email login fields, leaving the form stuck until the button
                // is clicked manually.
                if (event.key === "Enter" && !pending && !submitted) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              className={cn(
                "h-11 rounded-md border-input bg-card px-3.5 font-mono text-[14px] text-foreground",
                "placeholder:text-muted-foreground/45",
                "focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/15",
                (pending || submitted) && "opacity-60"
              )}
            />
          </label>

          <Button
            type="submit"
            disabled={pending || submitted}
            className={cn(
              "group/cta relative h-[46px] w-full rounded-md px-[18px] text-[14.5px]",
              "tracking-[-0.005em] gap-2 active:scale-[0.99]",
              "disabled:opacity-100"
            )}
          >
            {pending ? (
              "Sending link..."
            ) : submitted ? (
              "Check your inbox →"
            ) : (
              <>
                Send sign-in link
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 transition-transform duration-[160ms] ease-out group-hover/cta:translate-x-[2px]"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </>
            )}
            {/* Citron ping - corner accent */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-[3px] -top-[3px] size-2.5 rounded-full bg-citron-500 ring-[3px] ring-card"
            />
          </Button>
        </form>

        {SHOW_INACTIVE_AUTH_OPTIONS ? <InactiveAuthOptions /> : null}

        <footer
          className={cn(
            "mt-14 flex items-center justify-center gap-3.5 border-t border-border pt-[22px] text-[12px] text-muted-foreground",
            "max-[520px]:flex-wrap max-[520px]:gap-y-2"
          )}
        >
          <a
            href="mailto:hello@tinyops.app?subject=TinyOps%20sign-in%20help"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Trouble signing in?
          </a>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/privacy"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link
            href="/terms"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
        </footer>
      </div>

      {/* Decorative folio in the bottom-right corner */}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-[22px] right-7 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground/40",
          "max-[960px]:hidden"
        )}
      >
        A quiet place to begin
      </span>
    </section>
  )
}

function InactiveAuthOptions() {
  return (
    <>
      {/* "or" divider */}
      <div
        className={cn(
          "my-[22px] flex items-center gap-3",
          "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/40",
          "before:h-px before:flex-1 before:bg-border before:content-['']",
          "after:h-px after:flex-1 after:bg-border after:content-['']"
        )}
      >
        or
      </div>

      <Button
        type="button"
        variant="secondary"
        className={cn(
          "h-11 w-full gap-2.5 rounded-md border-input px-4 text-[14px]",
          "text-foreground hover:bg-muted hover:border-slate-300"
        )}
      >
        <svg viewBox="0 0 48 48" aria-hidden className="size-[18px]">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-10.3 7.2A11 11 0 0 1 13 23.8 11 11 0 0 1 24 12.8c2.7 0 5.2 1 7.1 2.7l5.1-5.1A18 18 0 0 0 24 5.8a18 18 0 1 0 0 36 18 18 0 0 0 17.7-15c.2-1 .3-2 .3-3.1 0-1.1-.1-2.1-.4-3.2z"
          />
          <path
            fill="#FF3D00"
            d="M7.3 14.5l5.9 4.3A11 11 0 0 1 24 12.8c2.7 0 5.2 1 7.1 2.7l5.1-5.1A18 18 0 0 0 7.3 14.5z"
          />
          <path
            fill="#4CAF50"
            d="M24 41.8a18 18 0 0 0 12-4.6l-5.5-4.7a11 11 0 0 1-6.5 2.1c-4.7 0-8.7-3-10.2-7.2L8 32.2A18 18 0 0 0 24 41.8z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20.4H24v7.2h11.3a11 11 0 0 1-3.8 5.1l5.5 4.6c-.4.4 5.9-4.3 5.9-13.1 0-1.1-.1-2.1-.4-3.2z"
          />
        </svg>
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="tertiary"
        className={cn(
          "mt-2.5 h-auto w-full bg-transparent px-0 py-2 text-[13px] font-normal text-muted-foreground",
          "hover:bg-transparent hover:text-cobalt-500"
        )}
      >
        Prefer a password?{" "}
        <span className="border-b border-input">Use one instead</span>
      </Button>
    </>
  )
}
