import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AIInsightsProps {
  eventId: string;
  userId: string;
}

export const AIInsights = ({ eventId, userId }: AIInsightsProps) => {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getPrediction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-goal-prediction", {
        body: { eventId, userId },
      });

      if (error) throw error;
      setPrediction(data);
    } catch (error) {
      console.error("Error getting prediction:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPrediction();
  }, [eventId, userId]);

  if (!prediction && !loading) return null;

  return (
    <Card className="p-6 bg-gradient-secondary text-white">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="h-6 w-6" />
        <h3 className="font-bold text-lg">Insights com IA</h3>
        <Sparkles className="h-4 w-4 ml-auto animate-pulse" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Probabilidade de Sucesso</span>
            </div>
            <div className="text-3xl font-bold">{prediction.probability}%</div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${prediction.probability}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-white rounded-full h-2"
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">💡 Sugestões para Melhorar:</h4>
            <ul className="space-y-2">
              {prediction.suggestions?.map((suggestion: string, index: number) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm bg-white/10 p-2 rounded"
                >
                  <span className="text-yellow-300">✓</span>
                  <span>{suggestion}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={getPrediction}
            className="w-full mt-4"
          >
            Atualizar Previsão
          </Button>
        </motion.div>
      )}
    </Card>
  );
};
