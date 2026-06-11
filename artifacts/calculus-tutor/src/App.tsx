import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Setup, { type SessionConfig } from "@/pages/Setup";
import Chat from "@/pages/Chat";
import { useEffect } from "react";

const queryClient = new QueryClient();

function App() {
  const [session, setSession] = useState<SessionConfig | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {session ? (
          <Chat
            config={session}
            onReset={() => setSession(null)}
          />
        ) : (
          <Setup onStart={setSession} />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
