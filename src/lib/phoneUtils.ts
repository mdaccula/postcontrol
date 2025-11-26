/**
 * Utilitários para formatação de números WhatsApp
 */

/**
 * Formata número WhatsApp com DDI 55 para links wa.me
 * @param number - Número com ou sem DDI
 * @returns Número limpo com DDI 55
 */
export const formatWhatsappNumber = (number: string): string => {
  // Remove tudo que não é número
  const clean = number.replace(/\D/g, '');
  
  // Se já tem 55 no início, retorna limpo
  if (clean.startsWith('55')) {
    return clean;
  }
  
  // Se não tem, adiciona DDI 55
  return `55${clean}`;
};

/**
 * Formata número para exibição visual (remove DDI)
 * @param number - Número com ou sem DDI
 * @returns Número formatado como (DD) NNNNN-NNNN
 */
export const formatPhoneDisplay = (number: string): string => {
  const clean = number.replace(/\D/g, '');
  
  // Remove DDI se existir para exibição
  const withoutDDI = clean.startsWith('55') ? clean.slice(2) : clean;
  
  // Formata como (DD) NNNNN-NNNN
  if (withoutDDI.length === 11) {
    return `(${withoutDDI.slice(0,2)}) ${withoutDDI.slice(2,7)}-${withoutDDI.slice(7)}`;
  }
  
  // Formata como (DD) NNNN-NNNN (caso seja número fixo)
  if (withoutDDI.length === 10) {
    return `(${withoutDDI.slice(0,2)}) ${withoutDDI.slice(2,6)}-${withoutDDI.slice(6)}`;
  }
  
  return withoutDDI;
};

/**
 * Compartilha mensagem via WhatsApp
 * Usa Web Share API quando disponível, fallback para wa.me
 * @param message - Mensagem a ser compartilhada
 * @param phoneNumber - Número opcional (quando informado, abre conversa direta)
 * @returns Promise<boolean>
 */
export const shareViaWhatsApp = async (
  message: string, 
  phoneNumber?: string
): Promise<boolean> => {
  // Se tem número, usar formato direto (sempre funciona)
  if (phoneNumber) {
    const formattedNumber = formatWhatsappNumber(phoneNumber);
    window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`, '_blank');
    return true;
  }
  
  // Sem número: tentar Web Share API primeiro (mais confiável)
  if (navigator.share) {
    try {
      await navigator.share({
        text: message,
      });
      return true;
    } catch (error) {
      // Usuário cancelou ou não suportado
      console.log('Web Share não disponível, usando fallback wa.me');
    }
  }
  
  // Fallback: wa.me sem número
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  return true;
};
