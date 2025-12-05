"use client";

import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

export const MapContainer: React.FC = () => {
    const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<Leaflet.Map | null>(null);

    // Inject Leaflet CSS and load leaflet dynamically (avoids SSR issues)
    useEffect(() => {
        const cssId = "leaflet-css";
        if (!document.getElementById(cssId)) {
            const link = document.createElement("link");
            link.id = cssId;
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
        }

        let mounted = true;
        import("leaflet")
            .then((mod) => {
                if (mounted) setLeaflet(mod);
            })
            .catch((err) => {
                // keep short: log error
                console.error("Failed to load leaflet", err);
            });

        return () => {
            mounted = false;
        };
    }, []);

    // Initialize map once leaflet is loaded
    useEffect(() => {
        if (!leaflet || !mapContainerRef.current || mapRef.current) return;

        mapRef.current = leaflet.map(mapContainerRef.current).setView(
            [-6.2088, 106.8456],
            12
        );

        leaflet
            .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            })
            .addTo(mapRef.current);

        // cleanup on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [leaflet]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100vh" }}
            id="map"
        />
    );
};