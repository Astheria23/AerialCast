import React from "react";

const features = [
  {
    title: "Real-Time Telemetry Monitoring",
    desc: "Stream GPS, voltage, and RSSI data from drones via LoRa communication in real-time",
  },
  {
    title: "Mission Planning & Approval",
    desc: "Complete flight mission planning with waypoints, geofences, and admin approval workflow",
  },
  {
    title: "Drone Fleet Management",
    desc: "Centralized control over UAV fleet with comprehensive maintenance tracking",
  },
];

export function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-white p-16 flex-col justify-center">
      <div className="max-w-xl">
        <div className="mb-8">
          <div className="inline-flex items-center">
            <img
              src="images/aerialcast-logo.svg"
              alt="AerialCast Logo"
              className="w-lg"
            />
          </div>
        </div>

        <div className="space-y-4 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <svg
                  className="w-4 h-4 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
