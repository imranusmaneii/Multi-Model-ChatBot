"use client";

export default function TransformerDiagram() {
  return (
    <div className="my-4 rounded-xl border border-white/10 bg-dark-700/50 p-5 overflow-x-auto">
      <div className="mb-3 text-xs font-medium text-white/60">Transformer Architecture (Vaswani et al., 2017)</div>
      <svg viewBox="0 0 820 520" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[780px] mx-auto">
        {/* Decoder side label */}
        <text x="620" y="20" fill="#a78bfa" fontSize="13" fontWeight="600" textAnchor="middle">Decoder</text>
        {/* Encoder side label */}
        <text x="200" y="20" fill="#a78bfa" fontSize="13" fontWeight="600" textAnchor="middle">Encoder</text>

        {/* === ENCODER STACK === */}
        {/* Input Embedding */}
        <rect x="140" y="470" width="120" height="34" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.2"/>
        <text x="200" y="492" fill="white" fontSize="10" textAnchor="middle">Input Embedding</text>

        {/* Positional Encoding */}
        <rect x="140" y="415" width="120" height="34" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.2"/>
        <text x="200" y="437" fill="white" fontSize="10" textAnchor="middle">+ Positional Enc.</text>

        {/* Encoder block 1 */}
        <rect x="120" y="305" width="160" height="88" rx="8" fill="white" fillOpacity="0.04" stroke="white" strokeWidth="0.8" strokeOpacity="0.15"/>
        <rect x="140" y="315" width="120" height="28" rx="5" fill="#7c3aed" fillOpacity="0.25" stroke="#7c3aed" strokeWidth="1"/>
        <text x="200" y="334" fill="#c4b5fd" fontSize="9" textAnchor="middle">Multi-Head Attention</text>
        <rect x="140" y="350" width="120" height="28" rx="5" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeWidth="0.8" strokeOpacity="0.6"/>
        <text x="200" y="369" fill="#c4b5fd" fontSize="9" textAnchor="middle">Add &amp; Norm</text>
        <rect x="140" y="385" width="120" height="28" rx="5" fill="#7c3aed" fillOpacity="0.2" stroke="#7c3aed" strokeWidth="0.8"/>
        <text x="200" y="404" fill="#c4b5fd" fontSize="9" textAnchor="middle">Feed Forward</text>

        {/* N× label for encoder */}
        <rect x="85" y="310" width="28" height="80" rx="4" fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeWidth="0.8" strokeOpacity="0.5"/>
        <text x="99" y="355" fill="#a78bfa" fontSize="10" textAnchor="middle">N×</text>

        {/* Arrows encoder */}
        <line x1="200" y1="470" x2="200" y2="449" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>
        <line x1="200" y1="415" x2="200" y2="395" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>

        {/* === DECODER STACK === */}
        {/* Output Embedding */}
        <rect x="560" y="470" width="120" height="34" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.2"/>
        <text x="620" y="492" fill="white" fontSize="10" textAnchor="middle">Output Embedding</text>

        {/* Positional Encoding */}
        <rect x="560" y="415" width="120" height="34" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.2"/>
        <text x="620" y="437" fill="white" fontSize="10" textAnchor="middle">+ Positional Enc.</text>

        {/* Decoder block */}
        <rect x="535" y="220" width="170" height="172" rx="8" fill="white" fillOpacity="0.04" stroke="white" strokeWidth="0.8" strokeOpacity="0.15"/>
        {/* Masked Multi-Head Attention */}
        <rect x="555" y="230" width="130" height="26" rx="5" fill="#7c3aed" fillOpacity="0.25" stroke="#7c3aed" strokeWidth="1"/>
        <text x="620" y="248" fill="#c4b5fd" fontSize="9" textAnchor="middle">Masked Multi-Head Attn</text>
        <rect x="555" y="262" width="130" height="22" rx="4" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="0.6" strokeOpacity="0.4"/>
        <text x="620" y="278" fill="#c4b5fd" fontSize="8" textAnchor="middle">Add &amp; Norm</text>
        {/* Cross Multi-Head Attention */}
        <rect x="555" y="290" width="130" height="26" rx="5" fill="#a78bfa" fillOpacity="0.2" stroke="#a78bfa" strokeWidth="1"/>
        <text x="620" y="308" fill="white" fontSize="9" textAnchor="middle">Multi-Head Attention</text>
        <rect x="555" y="322" width="130" height="22" rx="4" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="0.6" strokeOpacity="0.4"/>
        <text x="620" y="338" fill="#c4b5fd" fontSize="8" textAnchor="middle">Add &amp; Norm</text>
        {/* Feed Forward */}
        <rect x="555" y="350" width="130" height="26" rx="5" fill="#7c3aed" fillOpacity="0.2" stroke="#7c3aed" strokeWidth="0.8"/>
        <text x="620" y="368" fill="#c4b5fd" fontSize="9" textAnchor="middle">Feed Forward</text>
        <rect x="555" y="382" width="130" height="22" rx="4" fill="#7c3aed" fillOpacity="0.12" stroke="#7c3aed" strokeWidth="0.6" strokeOpacity="0.4"/>
        <text x="620" y="398" fill="#c4b5fd" fontSize="8" textAnchor="middle">Add &amp; Norm</text>

        {/* N× label for decoder */}
        <rect x="500" y="225" width="28" height="165" rx="4" fill="#7c3aed" fillOpacity="0.1" stroke="#7c3aed" strokeWidth="0.8" strokeOpacity="0.5"/>
        <text x="514" y="312" fill="#a78bfa" fontSize="10" textAnchor="middle">N×</text>

        {/* Arrows decoder */}
        <line x1="620" y1="470" x2="620" y2="449" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>
        <line x1="620" y1="415" x2="620" y2="393" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>

        {/* Cross-attention arrow from encoder to decoder */}
        <path d="M280 350 Q400 350 555 303" stroke="#a78bfa" strokeWidth="1.2" strokeOpacity="0.6" fill="none" strokeDasharray="4 3" markerEnd="url(#arrowPurple)"/>

        {/* Output */}
        <rect x="560" y="470-65" width="120" height="34" rx="6" fill="white" fillOpacity="0.06" stroke="white" strokeWidth="0.8" strokeOpacity="0.2"/>

        {/* Linear + Softmax */}
        <rect x="560" y="140" width="120" height="30" rx="6" fill="#7c3aed" fillOpacity="0.3" stroke="#7c3aed" strokeWidth="1.2"/>
        <text x="620" y="160" fill="white" fontSize="10" textAnchor="middle">Linear + Softmax</text>

        {/* Output label */}
        <rect x="560" y="95" width="120" height="30" rx="6" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeWidth="0.8"/>
        <text x="620" y="115" fill="white" fontSize="10" textAnchor="middle">Output Probabilities</text>

        {/* Arrow decoder -> linear */}
        <line x1="620" y1="220" x2="620" y2="170" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>
        <line x1="620" y1="140" x2="620" y2="125" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" markerEnd="url(#arrow)"/>

        {/* Arrow markers */}
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0 0L6 4L0 8" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
          </marker>
          <marker id="arrowPurple" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0 0L6 4L0 8" fill="none" stroke="#a78bfa" strokeWidth="1"/>
          </marker>
        </defs>
      </svg>
    </div>
  );
}
