/**
 * Submission Service
 * Handles all submission-related data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Submission,
  SubmissionInsert,
  SubmissionUpdate,
  SubmissionWithRelations,
  SubmissionFilters,
  ServiceResponse,
  PaginatedResponse,
  SubmissionComment,
  SubmissionCommentInsert,
  SubmissionTag,
  SubmissionTagInsert,
} from '@/types/api';

/**
 * Fetches submissions with optional filters and pagination
 * @param filters - Optional filters for submissions
 * @returns Paginated list of submissions with relations
 */
export async function getSubmissions(
  filters: SubmissionFilters = {}
): Promise<PaginatedResponse<SubmissionWithRelations>> {
  try {
    const {
      eventId,
      status,
      postType,      // 🆕 SPRINT 2
      searchTerm,    // 🆕 SPRINT 2
      userId,
      agencyId,
      page = 1,
      itemsPerPage = 10,
    } = filters;

    console.log('🔍 [Backend] Filtros aplicados:', { eventId, status, postType, searchTerm, agencyId, page });

  // 🆕 CORREÇÃO #2: Se houver busca por nome/email/instagram, buscar user_ids primeiro
  let userIdsFromSearch: string[] | null = null;
  if (searchTerm && searchTerm.trim()) {
    const search = `%${searchTerm.trim()}%`;
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${search},email.ilike.${search},instagram.ilike.${search}`);
    
    if (matchingProfiles && matchingProfiles.length > 0) {
      userIdsFromSearch = matchingProfiles.map(p => p.id);
      console.log('🔍 [Search] Encontrados', userIdsFromSearch.length, 'perfis correspondentes');
    } else {
      // Se não encontrou nenhum perfil, retornar vazio
      console.log('🔍 [Search] Nenhum perfil encontrado para:', searchTerm);
      return { data: [], count: 0, error: null };
    }
  }

  let query = supabase
    .from('submissions')
    .select(
      `
      *,
      posts(id, post_number, deadline, event_id, post_type)
    `,
      { count: 'exact' }
    );

    // Apply filters
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    // 🆕 SPRINT 2: Filtro por tipo de post (usar submission_type da tabela submissions)
    if (postType && postType !== 'all') {
      query = query.eq('submission_type', postType);
    }
    // 🆕 CORREÇÃO #2: Aplicar filtro de user_ids da busca
    if (userIdsFromSearch) {
      query = query.in('user_id', userIdsFromSearch);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    // Apply pagination
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    query = query.range(from, to);

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return {
      data: [],
      count: null,
      error: error as Error,
    };
  }
}

/**
 * 🆕 SPRINT 2: Busca contadores agregados de submissões por evento
 * @param agencyId - ID da agência para filtrar (opcional)
 * @returns Record com event_id como chave e contagem como valor
 */
export async function getSubmissionCountsByEvent(
  agencyId?: string
): Promise<Record<string, number>> {
  try {
    console.log('📊 [Backend] Buscando contadores por evento, agencyId:', agencyId);

    let query = supabase
      .from('submissions')
      .select('post_id, posts!inner(event_id, agency_id)');

    if (agencyId) {
      query = query.eq('posts.agency_id', agencyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar contadores por evento:', error);
      throw error;
    }

    // Agregar contagens por evento
    const counts: Record<string, number> = {};
    data?.forEach((submission: any) => {
      const eventId = submission.posts?.event_id;
      if (eventId) {
        counts[eventId] = (counts[eventId] || 0) + 1;
      }
    });

    console.log('✅ [Backend] Contadores por evento:', counts);
    return counts;
  } catch (error) {
    console.error('❌ Erro na função getSubmissionCountsByEvent:', error);
    return {};
  }
}

/**
 * 🆕 SPRINT 2: Busca contadores agregados de submissões por post
 * @param agencyId - ID da agência para filtrar (opcional)
 * @returns Record com post_id como chave e contagem como valor
 */
export async function getSubmissionCountsByPost(
  agencyId?: string
): Promise<Record<string, number>> {
  try {
    console.log('📊 [Backend] Buscando contadores por post (otimizado), agencyId:', agencyId);

    // ✅ CORREÇÃO #1: Query direta sem JOINs - apenas os dados necessários
    let query = supabase
      .from('submissions')
      .select('post_id');

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar contadores por post:', error);
      throw error;
    }

    console.log(`✅ [Backend] ${data?.length || 0} submissões encontradas`);

    // Agregar contagens localmente (muito mais rápido que no DB)
    const counts: Record<string, number> = {};
    data?.forEach((submission: any) => {
      const postId = submission.post_id;
      if (postId) {
        counts[postId] = (counts[postId] || 0) + 1;
      }
    });

    console.log(`✅ [Backend] ${Object.keys(counts).length} posts com submissões`);
    return counts;
  } catch (error) {
    console.error('❌ Erro na função getSubmissionCountsByPost:', error);
    return {};
  }
}

/**
 * Fetches a single submission by ID with relations
 * @param id - Submission ID
 * @returns Submission with relations
 */
export async function getSubmissionById(
  id: string
): Promise<ServiceResponse<SubmissionWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select(
        `
        *,
        posts(id, post_number, deadline, event_id)
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching submission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Creates a new submission
 * @param submission - Submission data
 * @returns Created submission
 */
export async function createSubmission(
  submission: SubmissionInsert
): Promise<ServiceResponse<Submission>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert(submission)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error creating submission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates a submission
 * @param id - Submission ID
 * @param updates - Partial submission data
 * @returns Updated submission
 */
export async function updateSubmission(
  id: string,
  updates: SubmissionUpdate
): Promise<ServiceResponse<Submission>> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error updating submission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Updates submission status (approve/reject)
 * @param id - Submission ID
 * @param status - New status
 * @param approvedBy - User ID of approver
 * @param rejectionReason - Optional rejection reason
 * @returns Updated submission
 */
export async function updateSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  approvedBy?: string,
  rejectionReason?: string
): Promise<ServiceResponse<Submission>> {
  try {
    const updates: SubmissionUpdate = {
      status,
      approved_by: approvedBy,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      rejection_reason: rejectionReason,
    };

    return await updateSubmission(id, updates);
  } catch (error) {
    console.error('Error updating submission status:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * 🔴 FASE 1: Bulk update submission status
 * Atualiza múltiplas submissões em uma única query SQL
 * @param ids - Array de IDs de submissões
 * @param status - Novo status
 * @param approvedBy - ID do aprovador
 * @returns Array de submissões atualizadas
 */
export async function bulkUpdateSubmissionStatus(
  ids: string[],
  status: 'approved' | 'rejected' | 'pending',
  approvedBy?: string,
  rejectionReason?: string
): Promise<ServiceResponse<Submission[]>> {
  try {
    if (ids.length === 0) {
      return {
        data: [],
        error: null,
      };
    }

    const updates: SubmissionUpdate = {
      status,
      approved_by: approvedBy,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      rejection_reason: rejectionReason,
    };

    console.log(`🚀 [Bulk Update] Atualizando ${ids.length} submissões em massa...`);
    console.time('⏱️ [Performance] Bulk Update');

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .in('id', ids)
      .select();

    console.timeEnd('⏱️ [Performance] Bulk Update');

    if (error) throw error;

    console.log(`✅ [Bulk Update] ${data?.length || 0} submissões atualizadas`);

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    console.error('❌ [Bulk Update] Erro:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a submission
 * @param id - Submission ID
 * @returns Success status
 */
export async function deleteSubmission(
  id: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting submission:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches comments for a submission
 * @param submissionId - Submission ID
 * @returns List of comments
 */
export async function getSubmissionComments(
  submissionId: string
): Promise<ServiceResponse<SubmissionComment[]>> {
  try {
    const { data, error } = await supabase
      .from('submission_comments')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      data: data as SubmissionComment[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching submission comments:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Adds a comment to a submission
 * @param comment - Comment data
 * @returns Created comment
 */
export async function addSubmissionComment(
  comment: SubmissionCommentInsert
): Promise<ServiceResponse<SubmissionComment>> {
  try {
    const { data, error } = await supabase
      .from('submission_comments')
      .insert(comment)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error adding submission comment:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Fetches tags for a submission
 * @param submissionId - Submission ID
 * @returns List of tags
 */
export async function getSubmissionTags(
  submissionId: string
): Promise<ServiceResponse<SubmissionTag[]>> {
  try {
    const { data, error } = await supabase
      .from('submission_tags')
      .select('*')
      .eq('submission_id', submissionId);

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching submission tags:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Adds a tag to a submission
 * @param tag - Tag data
 * @returns Created tag
 */
export async function addSubmissionTag(
  tag: SubmissionTagInsert
): Promise<ServiceResponse<SubmissionTag>> {
  try {
    const { data, error } = await supabase
      .from('submission_tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error adding submission tag:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Removes a tag from a submission
 * @param tagId - Tag ID
 * @returns Success status
 */
export async function removeSubmissionTag(
  tagId: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase
      .from('submission_tags')
      .delete()
      .eq('id', tagId);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error removing submission tag:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets submission statistics for a user
 * @param userId - User ID
 * @returns Stats object
 */
export async function getUserSubmissionStats(userId: string): Promise<
  ServiceResponse<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('status')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      approved: data.filter((s) => s.status === 'approved').length,
      rejected: data.filter((s) => s.status === 'rejected').length,
      pending: data.filter((s) => s.status === 'pending').length,
    };

    return {
      data: stats,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user submission stats:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
