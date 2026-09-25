import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchRegistry, type RegistrySubject } from "../lib/api";
import { getAuthToken } from "../lib/api";
import { useDomainMeta } from "../lib/domain";
import { RegistrationPage } from "./registration";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Карта рисков — BatysMonitor" },
      { name: "description", content: "Интерактивная карта экономических рисков Западно-Казахстанской области" },
    ],
  }),
  component: HomePage,
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
  address?: string;
  lat: number;
  lng: number;
};

const RISK_COLOR: Record<Risk, string> = {
  critical: "critical",
  warning: "warning",
  ok: "ok",
};

const CLINIC_COORDS: Record<string, { lat: number; lng: number; address?: string }> = {
  'Филиал по Западно-Казахстанской области НАО «ФСМС»': { lat: 51.21852, lng: 51.38549 },
  'ГКП на праве хозяйственного ведения "Городская поликлиника №1" управления здравоохранения акимата Западно-Казахстанской области': { lat: 51.2110, lng: 51.3820 },
  'ГКП "Городская поликлиника №2" на праве хозяйственного ведения управления здравоохранения акимата Западно-Казахстанской области': { lat: 51.2155, lng: 51.4005 },
  'Акционерное общество "Талап"': { lat: 51.2446, lng: 51.4130 },
  'ТОО "Uniserv Medical Center"': {
    lat: 51.2012,
    lng: 51.3503,
    address: "Западно-Казахстанская область, г. Уральск, ул. М. Шолохова, 36",
  },
};

import { NR_COORDS } from "./nr_coords_export";
import DYNAMIC_COORDS from "../assets/clinic_coords.json";
// Используем try-catch логику или просто импорт, предполагая что файл существует.
// В Vite/Webpack JSON импортируется безопасно, если он есть.
import NR_DYNAMIC_COORDS from "../assets/nr_coords_yandex.json";

const normalizeClinicName = (name: string) =>
  name
    .toLocaleLowerCase()
    .replace(/(товарищество с ограниченной ответственностью|акционерное общество|государственное коммунальное предприятие|тоо|тoo|ао|гкп)/gu, "")
    .replace(/(медицинский центр|медицинская организация|медцентр|клиника|поликлиника|больница|medical center|clinic|hospital)/gu, "")
    .replace(/["«»“”„]/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const clinicCoordinates = (clinicName: string, domainId: string) => {
  // Динамические координаты нерезидентов (от Яндекс Геокодера)
  if ((NR_DYNAMIC_COORDS as Record<string, any>)[clinicName]) {
    return (NR_DYNAMIC_COORDS as Record<string, any>)[clinicName];
  }

  // Динамические координаты поликлиник/стационаров (от Яндекс Организаций)
  const dynamicCoordinates = DYNAMIC_COORDS as Record<string, any>;
  const isUsableAddress = (coords: any) =>
    coords &&
    (domainId !== "inpatient" ||
      (coords.address && !String(coords.address).startsWith("г. Уральск (")));
  if (isUsableAddress(dynamicCoordinates[clinicName])) {
    return dynamicCoordinates[clinicName];
  }
  const normalizedName = normalizeClinicName(clinicName);
  const matchedCoordinates = Object.entries(dynamicCoordinates).find(
    ([savedName, coords]) =>
      normalizeClinicName(savedName) === normalizedName && isUsableAddress(coords),
  )?.[1];
  if (matchedCoordinates) {
    return matchedCoordinates;
  }

  // Для стационара без подтверждённой записи 2GIS не используем приблизительные координаты.
  if (domainId === "inpatient") {
    return null;
  }

  // Координаты стационаров (старый хардкод)
  if (CLINIC_COORDS[clinicName]) {
    return CLINIC_COORDS[clinicName];
  }

  // Координаты нерезидентов (старый экспорт)
  if (NR_COORDS[clinicName]) {
    return NR_COORDS[clinicName];
  }

  // Координаты нерезидентов
  if (NR_COORDS[clinicName]) {
    return NR_COORDS[clinicName];
  }


  // Для ОСМС и остальных: генерируем статические "разбросанные" точки
  const seed = clinicName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const lat = 51.2133 + ((seed % 100) / 100 - 0.5) * 0.08;
  const lng = 51.3767 + (((seed * 7) % 100) / 100 - 0.5) * 0.08;
  return { lat, lng };
};

const buildMarkersFromRegistry = (subjects: RegistrySubject[], domainId: string): MarkerData[] => {
  return subjects.map((subject, index) => {
    const totalAmount = Number(subject.total_amount || 0);
    const totalCount = Number(subject.total_risks || 0);
    
    let riskLevel: Risk = "ok";
    if (domainId === "nr") {
      if (totalCount >= 4) riskLevel = "critical";
      else if (totalCount >= 2) riskLevel = "warning";
      else riskLevel = "ok";
    } else {
      if (totalAmount > 5000000) riskLevel = "critical";
      else if (totalAmount > 500000) riskLevel = "warning";
      else riskLevel = "ok";
    }

    const coords = clinicCoordinates(subject.clinic_name, domainId);
    if (!coords) return null;

    return {
      id: `${subject.clinic_name}-${index}`,
      name: subject.clinic_name,
      bin: subject.bin || "—",
      district: subject.district || "—",
      risk: riskLevel,
      note: `Нарушений: ${totalCount}. Сумма ущерба: ${totalAmount.toLocaleString()} ₸`,
      address: coords.address,
      lat: coords.lat,
      lng: coords.lng,
    };
  }).filter((marker): marker is MarkerData => marker !== null);
};

function HomePage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAuthToken()));

  useEffect(() => {
    const syncAuth = () => setAuthenticated(Boolean(getAuthToken()));
    window.addEventListener("batys-auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("batys-auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  if (!authenticated) {
    return <RegistrationPage onAuthenticated={() => setAuthenticated(true)} />;
  }

  return <MapPage />;
}

function MapPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const { id: domain } = useDomainMeta();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markerInstancesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchRegistry(domain)
      .then((data) => {
        if (data && data.subjects) {
          setMarkers(buildMarkersFromRegistry(data.subjects, domain));
        }
      })
      .catch((err) => console.error("Error fetching map data:", err));
  }, [domain]);

  useEffect(() => {
    let L: any;
    let isMounted = true;

    (async () => {
      L = (await import("leaflet")).default;
      if (!isMounted) return;

      const el = document.getElementById("risk-map");
      if (!el || (el as any)._leaflet_id) return;

      const map = L.map(el, { center: [51.2333, 51.3667], zoom: 12, zoomControl: true });
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      tileLayerRef.current = L.tileLayer(tileUrl, { 
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      renderMarkers(markers, L);
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  const renderMarkers = (data: MarkerData[], L: any) => {
    if (!layerGroupRef.current || !mapRef.current) return;

    layerGroupRef.current.clearLayers();
    markerInstancesRef.current = {};

    data.forEach((m) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="risk-marker ${RISK_COLOR[m.risk]}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(layerGroupRef.current);
      markerInstancesRef.current[m.id] = marker;
      marker.on("click", () => navigate({ to: "/registry" }));

      const shortName = m.name.length > 60 ? m.name.substring(0, 57) + "..." : m.name;
      const addressText = m.address ? `<p class="text-[11px] leading-relaxed text-slate-300">${m.address}</p>` : "";
      const tooltipHtml = `
        <div style="max-width:280px;overflow:hidden;word-wrap:break-word;" class="space-y-2 p-1">
          <div class="flex items-start gap-2">
            <span class="risk-marker ${RISK_COLOR[m.risk]} mt-1.5 h-3 w-3 inline-block rounded-full flex-shrink-0"></span>
            <div style="min-width:0;">
              <div class="text-sm font-semibold text-white" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shortName}</div>
              <div class="font-mono text-xs text-slate-400">${m.bin}</div>
            </div>
          </div>
          <p class="text-xs leading-relaxed text-slate-300">${m.note}</p>
          ${addressText}
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -10],
        className: "!bg-slate-900/95 !backdrop-blur-xl !text-white !border !border-white/10 !rounded-xl !p-3 !shadow-2xl !max-w-[320px]",
      });
    });
  };

  useEffect(() => {
    import("leaflet").then((L) => renderMarkers(markers, L.default));
  }, [markers]);

  const filteredMarkers = searchQuery.trim() === "" 
    ? [] 
    : markers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.bin.includes(searchQuery)).slice(0, 5);

  const handleSelectMarker = (m: MarkerData) => {
    setSearchQuery(m.name);
    setShowSuggestions(false);
    if (mapRef.current) {
      mapRef.current.flyTo([m.lat, m.lng], 16, { animate: true, duration: 1.5 });
      const markerObj = markerInstancesRef.current[m.id];
      if (markerObj) {
        setTimeout(() => {
          markerObj.openTooltip();
        }, 1500); // Open tooltip after flyTo completes
      }
    }
  };

  const RISK_TAILWIND: Record<Risk, string> = {
    critical: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.65)]",
    warning: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]",
    ok: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.65)]",
  };

  return (
    <>
      <PageHeader
        title="Карта рисков"
        subtitle="Западно-Казахстанская область · оперативный мониторинг"
        right={
          <div className="relative w-[280px] max-w-[28vw]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              placeholder="Поиск по названию или БИН..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {showSuggestions && filteredMarkers.length > 0 && (
              <div className="absolute top-full left-0 mt-2 min-w-[320px] w-full rounded-xl border border-border bg-surface p-1.5 shadow-2xl z-50 max-h-64 overflow-y-auto">
                {filteredMarkers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMarker(m)}
                    className="flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="flex w-full items-center gap-2 overflow-hidden">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${RISK_TAILWIND[m.risk]}`} />
                      <span className="truncate text-sm font-medium text-heading">{m.name}</span>
                    </div>
                    <span className="text-[11px] text-subtle font-mono pl-4">{m.bin}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="relative h-[calc(100vh-92px)] w-full overflow-hidden">
        <div id="risk-map" className="absolute inset-0 cyber-grid z-0" />
      </div>
    </>
  );
}
