"use client";

import React from "react";

export default function AdSidebar() {
  return (
    <div className="w-[120px] h-full bg-gray-100 border-l border-gray-300 flex flex-col flex-shrink-0">
      {[1, 2, 3, 4].map((slot) => (
        <div
          key={slot}
          className="flex-1 border-b border-gray-300 last:border-b-0 flex items-center justify-center p-2"
        >
          <div className="w-full h-full bg-gray-200 border-2 border-dashed border-gray-400 rounded flex items-center justify-center text-gray-500 text-xs font-medium">
            <div className="text-center">
              <div className="text-[10px]">AD SPACE</div>
              <div className="text-[8px] mt-1">120x{Math.floor(100 / 4)}%</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
