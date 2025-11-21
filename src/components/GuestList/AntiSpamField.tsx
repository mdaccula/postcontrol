import { Input } from "@/components/ui/input";

interface AntiSpamFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Campo honeypot invisível para detectar bots
 * Bots geralmente preenchem todos os campos, incluindo os invisíveis
 */
export const AntiSpamField = ({ value, onChange }: AntiSpamFieldProps) => {
  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: '-9999px', 
        width: '1px', 
        height: '1px',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <Input
        type="text"
        name="website"
        id="website"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        placeholder="Leave this field empty"
      />
    </div>
  );
};