import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Trophy, Plus, Pencil, Trash2, Copy, Send, ClipboardCheck } from 'lucide-react';
import { formatPostName } from '@/lib/postNameFormatter';

/**
 * Componente da lista de eventos e posts
 * Memoizado para performance
 */

interface AdminEventListProps {
  events: any[];
  posts: any[];
  eventActiveFilter: string;
  postEventFilter: string;
  submissionsByEvent: Record<string, number>;
  isReadOnly: boolean;
  
  // Ações de eventos
  onCreateEvent: () => void;
  onEditEvent: (event: any) => void;
  onDeleteEvent: (eventId: string) => void;
  onDuplicateEvent: (event: any) => void;
  onCreatePost: (event: any) => void;
  
  // Ações de posts
  onEditPost: (post: any) => void;
  onDeletePost: (postId: string) => void;
  
  // Filtros
  onEventActiveFilterChange: (value: string) => void;
  onPostEventFilterChange: (value: string) => void;
}

const AdminEventListComponent = ({
  events,
  posts,
  eventActiveFilter,
  postEventFilter,
  submissionsByEvent,
  isReadOnly,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onCreatePost,
  onEditPost,
  onDeletePost,
  onEventActiveFilterChange,
  onPostEventFilterChange,
}: AdminEventListProps) => {
  // Filtrar eventos por status ativo/inativo
  const filteredEvents = eventActiveFilter === 'all' 
    ? events 
    : eventActiveFilter === 'active'
      ? events.filter(e => e.is_active === true)
      : events.filter(e => e.is_active === false);

  // Filtrar posts por evento
  const filteredPosts = postEventFilter === 'all'
    ? posts
    : posts.filter(p => p.event_id === postEventFilter);

  return (
    <div className="space-y-6">
      {/* Header com botão de criar evento */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Eventos e Postagens</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredEvents.length} evento{filteredEvents.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={onCreateEvent} disabled={isReadOnly}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {/* Filtro de eventos ativos/inativos */}
      <div className="flex gap-2">
        <Select value={eventActiveFilter} onValueChange={onEventActiveFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar eventos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Eventos</SelectItem>
            <SelectItem value="active">Somente Ativos</SelectItem>
            <SelectItem value="inactive">Somente Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Eventos */}
      {filteredEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum evento encontrado</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredEvents.map((event) => {
            const eventPosts = posts.filter(p => p.event_id === event.id);
            const submissionsCount = submissionsByEvent[event.id] || 0;
            
            // ✅ Verificar se evento é de análise manual (sem metas definidas)
            const isManualReview = (!event.required_posts || event.required_posts === 0) && 
                                   (!event.required_sales || event.required_sales === 0) &&
                                   (!event.numero_de_vagas || event.numero_de_vagas === 0);
            
            return (
              <Card key={event.id} className="p-6">
                {/* Header do evento */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{event.title}</h3>
                      <Badge variant={event.is_active ? 'default' : 'secondary'}>
                        {event.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {isManualReview && (
                        <Badge variant="outline" className="border-purple-500 text-purple-700 dark:text-purple-400">
                          <ClipboardCheck className="w-3 h-3 mr-1" />
                          Análise Manual
                        </Badge>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditEvent(event)}
                      disabled={isReadOnly}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicateEvent(event)}
                      disabled={isReadOnly}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-destructive hover:text-destructive"
                      disabled={isReadOnly}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Estatísticas do evento */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="text-sm font-medium">
                        {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Posts</p>
                      <p className="text-sm font-medium">{eventPosts.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Submissões</p>
                      <p className="text-sm font-medium">{submissionsCount}</p>
                    </div>
                  </div>
                </div>
                
                {/* ✅ Aviso de análise manual */}
                {isManualReview && (
                  <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <ClipboardCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-purple-700 dark:text-purple-300">
                        <p className="font-semibold">Evento de Análise Manual</p>
                        <p className="text-purple-600 dark:text-purple-400 mt-1">
                          Este evento não possui metas automáticas configuradas. Analise as submissões manualmente na aba "Submissões".
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão de criar post */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreatePost(event)}
                    disabled={isReadOnly}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Postagem
                  </Button>
                </div>

                {/* Lista de Posts do evento */}
                {eventPosts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Postagens ({eventPosts.length})
                    </h4>
                    <div className="grid gap-3">
                      {eventPosts
                        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                        .map((post) => (
                          <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold">
                                  {formatPostName(post.post_type, post.post_number)}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Prazo: {new Date(post.deadline).toLocaleString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditPost(post)}
                                  disabled={isReadOnly}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeletePost(post.id)}
                                  className="text-destructive hover:text-destructive"
                                  disabled={isReadOnly}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Filtro e Lista de Posts (se necessário visualização separada) */}
      {posts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Todas as Postagens</h2>
          <Select value={postEventFilter} onValueChange={onPostEventFilterChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Postagens</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            {filteredPosts.length} postage{filteredPosts.length === 1 ? 'm' : 'ns'}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminEventList = memo(AdminEventListComponent);
