import { CHARACTER_BACKGROUND_OPTIONS } from "@/lib/character-backgrounds";

type CharacterBackgroundPickerProps = {
  value: string;
  onChange(value: string): void;
};

export function CharacterBackgroundPicker({ value, onChange }: CharacterBackgroundPickerProps) {
  return (
    <fieldset className="character-background-picker">
      <legend>캐릭터 배경</legend>
      <div>
        {CHARACTER_BACKGROUND_OPTIONS.map((option) => (
          <button
            aria-label={`${option.label} 배경`}
            aria-pressed={value === option.color}
            className={value === option.color ? "selected" : ""}
            key={option.id}
            type="button"
            onClick={() => onChange(option.color)}
          >
            <span style={{ backgroundColor: option.color }} />
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
