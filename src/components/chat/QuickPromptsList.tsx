'use client';

interface QuickPromptsListProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

export default function QuickPromptsList({ prompts, onSelect }: QuickPromptsListProps) {
  return (
    <div className="space-y-2">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect(prompt)}
          className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors text-sm text-foreground"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
