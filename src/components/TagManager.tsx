import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface TagManagerProps {
  submissionId: string;
  existingTags?: string[];
  onTagsChange?: () => void;
}

const TAG_OPTIONS = [
  { name: "Urgente", color: "bg-red-500 hover:bg-red-600" },
  { name: "Revisar", color: "bg-yellow-500 hover:bg-yellow-600" },
  { name: "Excelente", color: "bg-green-500 hover:bg-green-600" },
  { name: "Atenção", color: "bg-orange-500 hover:bg-orange-600" },
];

export const TagManager = ({ submissionId, existingTags = [], onTagsChange }: TagManagerProps) => {
  const [tags, setTags] = useState<string[]>(existingTags);

  useEffect(() => {
    loadTags();
  }, [submissionId]);

  const loadTags = async () => {
    const { data } = await supabase
      .from("submission_tags")
      .select("tag_name")
      .eq("submission_id", submissionId);

    if (data) {
      setTags(data.map((t) => t.tag_name));
    }
  };

  const addTag = async (tagName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("submission_tags").insert({
      submission_id: submissionId,
      tag_name: tagName,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro ao adicionar tag");
    } else {
      await loadTags();
      onTagsChange?.();
      toast.success("Tag adicionada");
    }
  };

  const removeTag = async (tagName: string) => {
    const { error } = await supabase
      .from("submission_tags")
      .delete()
      .eq("submission_id", submissionId)
      .eq("tag_name", tagName);

    if (error) {
      toast.error("Erro ao remover tag");
    } else {
      await loadTags();
      onTagsChange?.();
      toast.success("Tag removida");
    }
  };

  const getTagColor = (tagName: string) => {
    return TAG_OPTIONS.find((t) => t.name === tagName)?.color || "bg-gray-500";
  };

  const availableTags = TAG_OPTIONS.filter((t) => !tags.includes(t.name));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((tag) => (
        <Badge
          key={tag}
          className={`${getTagColor(tag)} text-white flex items-center gap-1`}
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {availableTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1">
              <Plus className="h-3 w-3" />
              Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableTags.map((tag) => (
              <DropdownMenuItem key={tag.name} onClick={() => addTag(tag.name)}>
                <Badge className={`${tag.color} text-white`}>{tag.name}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
