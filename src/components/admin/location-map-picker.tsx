"use client";

import { useEffect, useId, useRef, useState } from "react";

type LeafletMap = {
  setView: (latLng: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
};

type LeafletMarker = {
  setLatLng: (latLng: [number, number]) => LeafletMarker;
  addTo: (map: LeafletMap) => LeafletMarker;
};

type LeafletNs = {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number }
  ) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number]) => LeafletMarker;
};

const TEHRAN: [number, number] = [35.744, 51.41];

function loadLeaflet(): Promise<LeafletNs> {
  const existing = (window as unknown as { L?: LeafletNs }).L;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    const ready = () => {
      const leaflet = (window as unknown as { L?: LeafletNs }).L;
      if (leaflet) resolve(leaflet);
      else reject(new Error("Leaflet failed"));
    };
    const current = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (current) {
      current.addEventListener("load", ready, { once: true });
      if ((window as unknown as { L?: LeafletNs }).L) ready();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Leaflet failed"));
    document.body.appendChild(script);
  });
}

export function LocationMapPicker({
  latitude,
  longitude,
  readOnly = false
}: {
  latitude?: number | null;
  longitude?: number | null;
  readOnly?: boolean;
}) {
  const mapId = useId();
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [point, setPoint] = useState<[number, number] | null>(
    latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [latitude, longitude]
      : null
  );

  useEffect(() => {
    let cancelled = false;
    void loadLeaflet().then((L) => {
      if (cancelled) return;
      const el = document.getElementById(mapId);
      if (!el) return;
      const start = point ?? TEHRAN;
      const map = L.map(el).setView(start, point ? 15 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19
      }).addTo(map);
      if (point) {
        markerRef.current = L.marker(point).addTo(map);
      }
      if (!readOnly) {
        map.on("click", (event) => {
          const next: [number, number] = [event.latlng.lat, event.latlng.lng];
          setPoint(next);
          if (markerRef.current) {
            markerRef.current.setLatLng(next);
          } else {
            markerRef.current = L.marker(next).addTo(map);
          }
        });
      }
      mapRef.current = map;
      window.setTimeout(() => {
        map.setView(start, point ? 15 : 12);
      }, 80);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Initialize once; later clicks update React state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, readOnly]);

  return (
    <div className="grid gap-2">
      {readOnly ? null : (
        <>
          <p className="text-sm font-bold text-slate-200">محل قرار روی نقشه</p>
          <p className="text-xs leading-6 text-slate-400">
            روی نقشه بزن تا نقطه جمع شدن مشخص شود. طول و عرض جغرافیایی خودکار پر
            می‌شود.
          </p>
        </>
      )}
      <div
        id={mapId}
        dir="ltr"
        className="z-0 h-56 w-full overflow-hidden rounded-xl border border-white/10"
      />
      {readOnly ? null : (
        <>
          <input
            type="hidden"
            name="latitude"
            value={point ? String(point[0]) : ""}
          />
          <input
            type="hidden"
            name="longitude"
            value={point ? String(point[1]) : ""}
          />
          <p className="text-xs font-bold text-slate-400" dir="ltr">
            {point
              ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}`
              : "هنوز نقطه‌ای انتخاب نشده"}
          </p>
        </>
      )}
    </div>
  );
}
