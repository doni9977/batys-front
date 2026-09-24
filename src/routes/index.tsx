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
  lat: number;
  lng: number;
};



const RISK_COLOR: Record<Risk, string> = {
  critical: "critical",
  warning: "warning",
  ok: "ok",
};

const CLINIC_COORDS: Record<string, {lat: number, lng: number}> = {
  'Филиал по Западно-Казахстанской области НАО «ФСМС»': { lat: 51.21852, lng: 51.38549 },
  'ГКП на праве хозяйственного ведения "Городская поликлиника №1" управления здравоохранения акимата Западно-Казахстанской области': { lat: 51.2110, lng: 51.3820 },
  'ГКП "Городская поликлиника №2" на праве хозяйственного ведения управления здравоохранения акимата Западно-Казахстанской области': { lat: 51.2155, lng: 51.4005 },
  'Акционерное общество "Талап"': { lat: 51.2446, lng: 51.4130 },
  'ТОО "Uniserv Medical Center"': { lat: 51.2012, lng: 51.3503 },
};

const clinicCoordinates = (clinicName: string) => {
  // Реальные координаты из интернета (для клиник)
  if (CLINIC_COORDS[clinicName]) {
    return CLINIC_COORDS[clinicName];
  }

  // Для нерезидентов: если в продакшене у вас будет Яндекс.Карты API, здесь можно
  // запрашивать геокодинг по row.LegalAddress. 
  // Пока генерируем статические, но "разбросанные" точки по Уральску на основе БИН/названия.
  const seed = clinicName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const lat = 51.2133 + ((seed % 100) / 100 - 0.5) * 0.08;
  const lng = 51.3767 + (((seed * 7) % 100) / 100 - 0.5) * 0.08;
  return { lat, lng };
};

const buildMarkersFromRegistry = (subjects: RegistrySubject[]): MarkerData[] => {
  return subjects.map((subject, index) => {
    const totalAmount = Number(subject.total_amount || 0);
    const totalCount = Number(subject.total_risks || 0);
    
    let riskLevel: Risk = "ok";
    if (totalCount > 0) riskLevel = "warning";
    if (totalAmount > 1000000 || totalCount > 10) riskLevel = "critical";

    const coords = clinicCoordinates(subject.clinic_name);

    return {
      id: `${subject.clinic_name}-${index}`,
      name: subject.clinic_name,
      bin: subject.bin || "—",
      district: subject.district || "—",
      risk: riskLevel,
      note: `Нарушений: ${totalCount}. Сумма ущерба: ${totalAmount.toLocaleString()} ₸`,
      lat: coords.lat,
      lng: coords.lng,
    };
  });
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
  const { domain } = useDomainMeta();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

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
          setMarkers(buildMarkersFromRegistry(data.subjects));
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

      L.tileLayer(tileUrl, { 
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
    };
  }, []);

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
          <div className="relative w-[280px] max-w-[28vw]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              placeholder="Поиск по названию ТОО или БИН..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        }
      />

      <div className="relative h-[calc(100vh-92px)] w-full overflow-hidden">
        <div id="risk-map" className="absolute inset-0 cyber-grid z-0" />

      </div>
    </>
  );
}
