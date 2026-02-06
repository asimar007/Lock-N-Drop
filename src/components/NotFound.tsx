import React from "react";
import { Unplug, ArrowLeft } from "lucide-react";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white relative overflow-hidden font-sans">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#222_1px,transparent_1px),linear-gradient(to_bottom,#222_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
      </div>

      <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex p-6 rounded-full bg-red-500/10 mb-4 animate-pulse">
          <Unplug className="h-16 w-16 text-red-500" />
        </div>

        <h1 className="text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Connection Lost in Space</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            The insecure frequency you are looking for does not exist. Return to
            the secure channel.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-all transform hover:scale-105"
        >
          <ArrowLeft className="h-5 w-5" />
          Return Home
        </a>
      </div>
    </div>
  );
};
