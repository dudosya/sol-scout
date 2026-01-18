"use client";

import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";

export default function Scanner() {
  const analysisStatus = useStore((state) => state.analysisStatus);

  if (analysisStatus !== "scanning") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <motion.div
        className="absolute left-0 right-0 h-24 bg-linear-to-b from-cyan-400/0 via-cyan-400/40 to-cyan-400/0"
        initial={{ y: "-30%" }}
        animate={{ y: "110%" }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
