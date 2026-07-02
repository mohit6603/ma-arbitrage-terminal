import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

export const ForceGraph = ({ nodes = [], links = [], height = 380 }) => {
  const fgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (fgRef.current) {
      setTimeout(() => fgRef.current?.zoomToFit(400, 50), 300);
    }
  }, [nodes, links]);

  return (
    <div ref={containerRef} style={{ height, width: "100%", background: "#050505" }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        backgroundColor="#050505"
        nodeRelSize={4}
        linkColor={(l) => l.color || "#333"}
        linkWidth={(l) => l.value || 1}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(l) => l.color || "#666"}
        cooldownTicks={80}
        nodeCanvasObject={(node, ctx, scale) => {
          const r = (node.size || 10) / Math.max(1, scale * 0.5);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r / 2, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || "#fff";
          ctx.shadowColor = node.color || "#fff";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = `${10}px JetBrains Mono`;
          ctx.fillStyle = "#e5e5e5";
          ctx.textAlign = "center";
          ctx.fillText(node.label || node.id, node.x, node.y + r / 2 + 10);
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.size || 10) / 2, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />
    </div>
  );
};
