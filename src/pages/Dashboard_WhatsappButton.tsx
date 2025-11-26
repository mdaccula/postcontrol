import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatWhatsappNumber } from "@/lib/phoneUtils";

interface DashboardWhatsappButtonProps {
  isMasterAdmin: boolean;
  isAgencyAdmin: boolean;
  masterWhatsapp: string;
  agencyWhatsapp: string;
}

export const DashboardWhatsappButton = ({
  isMasterAdmin,
  isAgencyAdmin,
  masterWhatsapp,
  agencyWhatsapp,
}: DashboardWhatsappButtonProps) => {
  // Lógica hierárquica
  const getWhatsappNumber = (): string | null => {
    // Master admin não vê botão
    if (isMasterAdmin) return null;
    
    // Agency admin vê número do master
    if (isAgencyAdmin) {
      return masterWhatsapp || null;
    }
    
    // Promotores veem número da agência
    return agencyWhatsapp || null;
  };

  const displayNumber = getWhatsappNumber();

  if (!displayNumber) return null;

  const handleClick = () => {
    const formattedNumber = formatWhatsappNumber(displayNumber);
    window.open(`https://wa.me/${formattedNumber}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-8 right-8 z-50"
    >
      <Button
        onClick={handleClick}
        size="lg"
        className="rounded-full h-16 w-16 shadow-lg bg-green-500 hover:bg-green-600"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    </motion.div>
  );
};
