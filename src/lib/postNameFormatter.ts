/**
 * Formata o nome da postagem baseado no tipo e número
 * @param postType - Tipo da postagem (selecao_perfil, sale, divulgacao)
 * @param postNumber - Número da postagem
 * @param eventPurpose - Propósito do evento (opcional)
 * @returns Nome formatado da postagem
 */
export const formatPostName = (
  postType: string | null, 
  postNumber: number, 
  eventPurpose?: string
): string => {
  // Se for seleção de perfil
  if (postType === 'selecao_perfil' || eventPurpose === 'selecao_perfil') {
    return `Seleção #${postNumber}`;
  }
  
  // Se for comprovante de venda
  if (postType === 'sale') {
    return 'Comprovante de Venda';
  }
  
  // Padrão: Postagem #X
  return `Postagem #${postNumber}`;
};
