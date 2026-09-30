import { READ_ONLY_MODE } from "../config/runtimeConfig";

export default function TestModeBanner() {
  if (!READ_ONLY_MODE) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        zIndex: 99999,
        left: "50%",
        top: 8,
        transform: "translateX(-50%)",
        padding: "7px 12px",
        borderRadius: 999,
        background: "rgba(127, 29, 29, 0.96)",
        color: "#fff",
        border: "1px solid rgba(254, 202, 202, 0.7)",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: "0.04em",
        boxShadow: "0 8px 28px rgba(0, 0, 0, 0.28)",
        pointerEvents: "none",
      }}
    >
      MODO TESTE · ALTERAÇÕES EXTERNAS BLOQUEADAS
    </div>
  );
}
