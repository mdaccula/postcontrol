import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import * as z from "zod";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AntiSpamField } from "./AntiSpamField";

const formSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  gender: z.enum(["feminino", "masculino", "outro"], {
    required_error: "Selecione seu sexo",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface GuestListFormProps {
  eventId: string;
  dateId: string;
  agencyPhone?: string;
  whatsappLink?: string;
  eventName: string;
  onSuccess: (registrationId: string, data: FormData) => void;
  onFormStart: () => void;
  onGenderChange?: (gender: string) => void;
}

export const GuestListForm = ({
  eventId,
  dateId,
  agencyPhone,
  whatsappLink,
  eventName,
  onSuccess,
  onFormStart,
  onGenderChange,
}: GuestListFormProps) => {
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const selectedGender = watch("gender");

  const handleFormStart = () => {
    if (!hasStarted) {
      setHasStarted(true);
      onFormStart();
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Capturar UTM params da URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = {
        source: urlParams.get('utm_source') || undefined,
        medium: urlParams.get('utm_medium') || undefined,
        campaign: urlParams.get('utm_campaign') || undefined,
      };

      // Chamar edge function de validação
      const { data: result, error } = await supabase.functions.invoke(
        'validate-guest-registration',
        {
          body: {
            email: data.email,
            honeypot,
            eventId,
            dateId,
            fullName: data.fullName,
            gender: data.gender,
            utmParams,
          },
        }
      );

      if (error) throw error;

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.isBotSuspected) {
        toast.error("Atividade suspeita detectada.");
        return;
      }

      if (result.isDisposable) {
        toast.error("Use um email válido, não temporário.");
        return;
      }

      if (result.isDuplicate) {
        toast.warning("Você já está cadastrado neste evento!");
        return;
      }

      // Sucesso!
      toast.success("Inscrição realizada com sucesso! 🎉");
      onSuccess(result.registration.id, data);

    } catch (error: any) {
      console.error('Erro ao enviar inscrição:', error);
      toast.error("Erro ao processar inscrição. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateDivulgadorMessage = () => {
    const message = `Olá, vim pelo lista do ${eventName} e queria ser um divulgador da agência! 🎉`;
    return encodeURIComponent(message);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campo Honeypot (invisível) */}
      <AntiSpamField value={honeypot} onChange={setHoneypot} />

      {/* Nome Completo */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo *</Label>
        <Input
          id="fullName"
          {...register("fullName")}
          placeholder="Seu nome completo"
          onFocus={handleFormStart}
          disabled={isSubmitting}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="seu@email.com"
          onFocus={handleFormStart}
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Sexo */}
      <div className="space-y-3">
        <Label>Sexo *</Label>
        <RadioGroup
          onValueChange={(value) => {
            register("gender").onChange({ target: { value } });
            handleFormStart();
            onGenderChange?.(value);
          }}
          disabled={isSubmitting}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="feminino" id="feminino" />
            <Label htmlFor="feminino" className="font-normal cursor-pointer">
              💃 Feminino
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="masculino" id="masculino" />
            <Label htmlFor="masculino" className="font-normal cursor-pointer">
              🕺 Masculino
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="outro" id="outro" />
            <Label htmlFor="outro" className="font-normal cursor-pointer">
              🌈 Outro
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          * Pessoas LGBTQIA+ serão consideradas na lista masculina para fins de precificação
        </p>
        {errors.gender && (
          <p className="text-sm text-destructive">{errors.gender.message}</p>
        )}
      </div>

      {/* Botões WhatsApp */}
      {(whatsappLink || agencyPhone) && (
        <div className="space-y-3 pt-4 border-t">
          {whatsappLink && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.open(whatsappLink, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Grupo da Agência no WhatsApp
            </Button>
          )}

          {agencyPhone && (
            <Button
              type="button"
              variant="secondary"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              onClick={() => 
                window.open(
                  `https://wa.me/${agencyPhone.replace(/\D/g, '')}?text=${generateDivulgadorMessage()}`,
                  '_blank'
                )
              }
            >
              🌟 Quer ser um divulgador e ter cortesia?
            </Button>
          )}
        </div>
      )}

      {/* Botão Submit */}
      <Button
        type="submit"
        className="w-full h-12 text-lg font-semibold"
        disabled={isSubmitting || !selectedGender || !dateId}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            ✅ Garantir Minha Vaga
          </>
        )}
      </Button>
    </form>
  );
};