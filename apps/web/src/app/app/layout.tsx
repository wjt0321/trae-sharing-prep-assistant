import { AuthGuard } from "@/components/AuthGuard";
import { WorkspaceProvider } from "@/lib/workspace";
import { TopBar } from "@/components/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WorkspaceProvider>
        <div className="flex min-h-screen flex-col bg-canvas">
          <TopBar />
          <div className="flex-1">{children}</div>
        </div>
      </WorkspaceProvider>
    </AuthGuard>
  );
}
