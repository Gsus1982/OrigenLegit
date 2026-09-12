"use client";

import { useEffect, useRef } from "react";

interface OriginMapProps {
  lat: number;
  lng: number;
  label: string;
}

export default function OriginMap({ lat, lng, label }: OriginMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMap() {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.setAttribute("data-leaflet", "true");
        document.head.appendChild(link);
      }

      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (instanceRef.current) {
        instanceRef.current.remove();
      }

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView([lat, lng], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 6,
      }).addTo(map);

      L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();

      instanceRef.current = map;
    }

    loadMap();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, [lat, lng, label]);

  return <div ref={mapRef} className="origin-map" />;
}
