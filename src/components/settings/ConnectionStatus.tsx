import { Badge } from "@/components/ui";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <Badge variant={isConnected ? "green" : "error"}>
        <span className={`connection-status-dot ${isConnected ? "connected" : "disconnected"}`} />
        {isConnected ? "Connected" : "Not connected"}
      </Badge>
    </div>
  );
}
