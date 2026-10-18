// Same look as the landing + auth pages. Kept here so the dashboard works
// even if globals.css hasn't been updated yet.
const CSS = `
.sw-grid {
  background-image:
    linear-gradient(to right, #161616 1px, transparent 1px),
    linear-gradient(to bottom, #161616 1px, transparent 1px);
  background-size: 3rem 3rem;
  -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%);
  mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%);
}
.sw-gradient-text {
  background-image: linear-gradient(to right, #8b5cf6, #d946ef);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.auth-card::before,
.auth-card::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(transparent, rgba(255, 255, 255, 0.7), transparent 15%);
  animation: rotate-border 8s linear infinite;
}
.auth-card::after { animation-delay: -4s; }
.fade-up { animation: fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
.pop-in { animation: pop-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes rotate-border { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop-in {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-card::before, .auth-card::after, .fade-up, .pop-in { animation: none !important; }
}
`;

export default function ThemeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}