import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, FileText } from 'lucide-react';
import { sb } from '@/lib/supabaseSafe';
import { useToast } from '@/hooks/use-toast';
import { formatPostName } from '@/lib/postNameFormatter';

interface Post {
  id: string;
  post_number: number;
  post_type: string;
  deadline: string;
  event_id: string;
  created_at: string;
  events: {
    id: string;
    title: string;
    is_active: boolean;
    agency_id: string;
    agencies: {
      name: string;
    };
  };
}

export const MasterPostsManager = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventStatusFilter, setEventStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [agencies, setAgencies] = useState<any[]>([]);

  useEffect(() => {
    loadAgencies();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [eventStatusFilter, selectedAgency]);

  const loadAgencies = async () => {
    const { data, error } = await sb
      .from('agencies')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading agencies:', error);
      return;
    }

    setAgencies(data || []);
  };

  const loadPosts = async () => {
    setLoading(true);

    let query = sb
      .from('posts')
      .select(`
        *,
        events!inner (
          id,
          title,
          is_active,
          agency_id,
          agencies!inner (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Filtrar por status do evento
    if (eventStatusFilter !== 'all') {
      query = query.eq('events.is_active', eventStatusFilter === 'active');
    }

    // Filtrar por agência
    if (selectedAgency !== 'all') {
      query = query.eq('events.agency_id', selectedAgency);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as postagens.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setPosts(data || []);
    setLoading(false);
  };

  const getSubmissionCount = async (postId: string) => {
    const { count } = await sb
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    return count || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando postagens...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerenciar Postagens
        </CardTitle>
        <CardDescription>
          Visualize todas as postagens criadas em eventos de todas as agências
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status do Evento</Label>
            <Select
              value={eventStatusFilter}
              onValueChange={(value: 'active' | 'inactive' | 'all') => setEventStatusFilter(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">✅ Eventos Ativos</SelectItem>
                <SelectItem value="inactive">⏸️ Eventos Inativos</SelectItem>
                <SelectItem value="all">📋 Todos os Eventos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Agência</Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Agências</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contador */}
        <div className="text-sm text-muted-foreground">
          Total: {posts.length} postage{posts.length === 1 ? 'm' : 'ns'}
        </div>

        {/* Tabela */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Postagem</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Status do Evento</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma postagem encontrada
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      {formatPostName(post.post_type, post.post_number)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {post.events.title}
                      </div>
                    </TableCell>
                    <TableCell>{post.events.agencies.name}</TableCell>
                    <TableCell>
                      <Badge variant={post.events.is_active ? 'default' : 'secondary'}>
                        {post.events.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(post.deadline).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
