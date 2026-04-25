import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";

function DeckHeatmap({ reports }) {
  const map = useMap();

  const heatmapData = useMemo(() => {
    return reports
      ?.filter(
        (report) =>
          report.location &&
          typeof report.location.lat === "number" &&
          typeof report.location.lng === "number"
      )
      .map((report) => ({
        position: [report.location.lng, report.location.lat],
        weight: 1,
      })) || [];
  }, [reports]);

  useEffect(() => {
    if (!map) return;

    const overlay = new GoogleMapsOverlay({
      layers: [
        new HeatmapLayer({
          id: "reports-heatmap",
          data: heatmapData,
          getPosition: (d) => d.position,
          getWeight: (d) => d.weight,
          radiusPixels: 60,
        }),
      ],
    });

    overlay.setMap(map);

    return () => overlay.setMap(null);
  }, [map, heatmapData]);

  return null;
}

function ReportsHeatmap({ reports }) {
  return (
    <div
      style={{
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={{ lat: 22.7196, lng: 75.8577 }}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <DeckHeatmap reports={reports} />
        </Map>
      </APIProvider>
    </div>
  );
}

export default ReportsHeatmap;