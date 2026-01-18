"use client";

import MapView from "@/components/map/MapView";
import Sidebar from "@/components/dashboard/Sidebar";
import Scanner from "@/components/dashboard/Scanner";
import BentoGrid from "@/components/dashboard/BentoGrid";

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950">
      {/* The Map sits in the background */}
      <MapView />

      <Sidebar />
      <Scanner />
      <BentoGrid />
    </main>
  );
}