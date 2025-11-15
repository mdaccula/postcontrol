import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

export const PWAUpdatePrompt = () => {
  const { updateAvailable, applyUpdate } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm max-w-sm animate-in slide-in-from-bottom-5">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent transition-colors"
        aria-label="Dispensar"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-full bg-primary/10">
          <RefreshCw className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">
            Nova versão disponível
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Uma atualização do aplicativo está pronta para ser instalada.
          </p>
          
          <Button 
            onClick={applyUpdate}
            size="sm"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar agora
          </Button>
        </div>
      </div>
    </Card>
  );
};
