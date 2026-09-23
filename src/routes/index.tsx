import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchRisks, type RiskRecord } from "../lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Карта рисков — BatysMonitor" },
      { name: "description", content: "Интерактивная карта экономических рисков Западно-Казахстанской области" },
    ],
  }),
  component: MapPage,
});

type Risk = "critical" | "warning" | "ok";

type MarkerData = {
  id: string;
  name: string;
  bin: string;
  district: string;
  risk: Risk;
  debt?: string;
  note: string;
  lat: number;
  lng: number;
};

const DEFAULT_MARKERS: MarkerData[] = [
  { id: "1", name: 'ТОО "БатысСтрой"', bin: "110240001234", district: "Уральск", risk: "critical", debt: "12 млн ₸", note: "Налоговая задолженность", lat: 51.2333, lng: 51.3667 },
  { id: "5", name: 'ИП "Жайык Логистик"', bin: "210140005555", district: "Байтерек", risk: "ok", note: "Нарушений нет", lat: 51.09, lng: 51.65 },
];

const RISK_COLOR: Record<Risk, string> = {
  critical: "critical",
  warning: "warning",
  ok: "ok",
};

const clinicCoordinates = (clinicName: string) => {
  const seed = clinicName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const lat = 51.18 + ((seed % 97) / 97) * 0.11;
  const lng = 51.28 + (((seed * 7) % 89) / 89) * 0.12;
  return { lat, lng };
};

const buildClinicMarkers = (risks: RiskRecord[]): MarkerData[] => {
  const grouped = new Map<string, RiskRecord[]>();

  risks.forEach((risk) => {
    const key = risk.clinic_name || "Неизвестная клиника";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(risk);
  });

  return Array.from(grouped.entries()).map(([clinicName, clinicRisks], index) => {
    const totalAmount = clinicRisks.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalCount = clinicRisks.length;
    const riskLevel: Risk = totalAmount > 80 ? "critical" : totalAmount > 30 ? "warning" : "ok";
    const coords = clinicCoordinates(clinicName);

    return {
      id: `${clinicName}-${index}`,
      name: clinicName,
      bin: clinicRisks[0]?.patient_iin || "000000000000",
      district: "Уральск",
      risk: riskLevel,
      note: `Нарушений: ${totalCount}. Сумма превышения: ${totalAmount}`,
      lat: coords.lat,
      lng: coords.lng,
    };
  });
};

function MapPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [markers, setMarkers] = useState<MarkerData[]>(DEFAULT_MARKERS);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    let L: any;
    let isMounted = true;

    (async () => {
      L = (await import("leaflet")).default;
      if (!isMounted) return;

      const el = document.getElementById("risk-map");
      if (!el || (el as any)._leaflet_id) return;

      const map = L.map(el, { center: [51.2, 51.35], zoom: 8, zoomControl: true });
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      renderMarkers(markers, L);
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layerGroupRef.current = null;
    };
  }, [isDark]);

  const renderMarkers = (data: MarkerData[], L: any) => {
    if (!layerGroupRef.current || !mapRef.current) return;

    layerGroupRef.current.clearLayers();

    data.forEach((m) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="risk-marker ${RISK_COLOR[m.risk]}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layerGroupRef.current);
      marker.on("click", () => navigate({ to: "/registry" }));

      const tooltipHtml = `
        <div class="space-y-2 w-64 p-1">
          <div class="flex items-start gap-2">
            <span class="risk-marker ${RISK_COLOR[m.risk]} mt-1.5 h-3 w-3 inline-block rounded-full"></span>
            <div>
              <div class="text-sm font-semibold text-white">${m.name}</div>
              <div class="font-mono text-xs text-slate-400">${m.bin}</div>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-slate-300">${m.note}</p>
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -10],
        className: "!bg-slate-900/95 !backdrop-blur-xl !text-white !border !border-white/10 !rounded-xl !p-3 !shadow-2xl",
      });
    });
  };

  useEffect(() => {
    import("leaflet").then((L) => renderMarkers(markers, L.default));
  }, [markers]);

  return (
    <>
      <PageHeader
        title="Карта рисков"
        subtitle="Западно-Казахстанская область · оперативный мониторинг"
        right={
          <div className="relative w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              placeholder="Поиск по названию ТОО или БИН..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        }
      />

      <div className="relative h-[calc(100vh-89px)] w-full">
        <div id="risk-map" className="absolute inset-0 cyber-grid" />

      </div>
    </>
  );
}
