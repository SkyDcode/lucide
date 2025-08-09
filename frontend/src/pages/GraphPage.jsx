// frontend/src/pages/GraphPage.jsx
import NetworkGraph from "@/modules/graph/components/NetworkGraph";

export default function GraphPage({ folderId }) {
  return (
    <div className="p-4">
      <NetworkGraph mode="folder" folderId={folderId} includeIsolated={false} depth={2} />
    </div>
  );
}
