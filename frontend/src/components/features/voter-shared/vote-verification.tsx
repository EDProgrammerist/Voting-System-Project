import { useRef, type PointerEvent, type KeyboardEvent } from "react";
import { Fingerprint } from "@phosphor-icons/react";
import type { SignaturePoint } from "@/types/voter";

export function VoteVerification({ signature, onSignature, thumbmark, onThumbmark, disabled }: {
  signature: SignaturePoint[][]; onSignature: (value: SignaturePoint[][]) => void;
  thumbmark: boolean; onThumbmark: (value: boolean) => void; disabled: boolean;
}) {
  const drawing = useRef<SignaturePoint[] | null>(null);
  const pointCount = signature.reduce((total, stroke) => total + stroke.length, 0);
  function point(event: PointerEvent<SVGSVGElement>): SignaturePoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(600, (event.clientX - rect.left) * 600 / rect.width)), y: Math.max(0, Math.min(200, (event.clientY - rect.top) * 200 / rect.height)) };
  }
  function finish() {
    if (!drawing.current) return;
    if (drawing.current.length >= 2 && signature.length < 100) onSignature([...signature, drawing.current]);
    drawing.current = null;
  }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    const movement: Record<string, [number, number]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
    const delta = movement[event.key];
    if (!delta || disabled) return;
    event.preventDefault();
    const previous = signature.at(-1) ?? [{ x: 300, y: 100 }];
    if (previous.length >= 2000 || pointCount >= 10000) return;
    const last = previous.at(-1)!;
    const next = { x: Math.max(0, Math.min(600, last.x + delta[0])), y: Math.max(0, Math.min(200, last.y + delta[1])) };
    onSignature([...signature.slice(0, -1), [...previous, next]]);
  }
  return <section aria-labelledby="vote-verification-title" className="vote-verification">
    <h2 id="vote-verification-title">Confirm your ballot</h2>
    <p>Your electronic signature and on-screen thumbmark confirmation record your consent to submit this ballot. The thumbmark is an acknowledgment, not a fingerprint scan.</p>
    <div className="signature-pad">
      <h3>Electronic signature</h3>
      <p id="signature-help">Draw with your mouse, finger, or stylus. Keyboard: focus the drawing area and use the arrow keys to draw. Use Clear signature to start again.</p>
      <svg aria-describedby="signature-help" aria-disabled={disabled} aria-label="Signature drawing area" onKeyDown={keyboard}
        onPointerDown={(event) => { if (!disabled && event.isPrimary && event.button === 0 && signature.length < 100 && pointCount < 9999) { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = [point(event)]; } }}
        onPointerMove={(event) => { if (drawing.current && event.isPrimary && !disabled && drawing.current.length < 2000 && pointCount + drawing.current.length < 10000) { drawing.current.push(point(event)); const path = event.currentTarget.querySelector("[data-preview]"); path?.setAttribute("points", drawing.current.map((p) => `${p.x},${p.y}`).join(" ")); } }}
        onPointerUp={(event) => { finish(); event.currentTarget.querySelector("[data-preview]")?.setAttribute("points", ""); }}
        onPointerCancel={(event) => { drawing.current = null; event.currentTarget.querySelector("[data-preview]")?.setAttribute("points", ""); }} role="application" tabIndex={disabled ? -1 : 0} viewBox="0 0 600 200">
        {signature.map((stroke, index) => <polyline fill="none" key={index} points={stroke.map((p) => `${p.x},${p.y}`).join(" ")} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />)}
        <polyline data-preview="" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
      <button disabled={disabled || signature.length === 0} onClick={() => onSignature([])} type="button">Clear signature</button>
      <p aria-live="polite">{signature.length ? "Signature captured." : "Signature required before submission."}</p>
    </div>
    <button aria-pressed={thumbmark} className="thumbmark-confirm" disabled={disabled} onClick={() => onThumbmark(!thumbmark)} type="button"><Fingerprint aria-hidden="true" /><span>{thumbmark ? "Thumbmark confirmation recorded" : "Confirm on-screen thumbmark"}<br /><small>I confirm that I am submitting my own ballot.</small></span></button>
  </section>;
}
