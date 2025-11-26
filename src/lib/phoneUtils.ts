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
