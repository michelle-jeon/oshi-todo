import { Eye, Gem, Scissors, Shirt } from "lucide-react";
import type { SVGProps } from "react";
import type { HumanLayerCategory } from "@/lib/character-assets";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CustomLineIcon({
  children,
  size = 20,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function BodyIcon(props: IconProps) {
  return (
    <CustomLineIcon {...props}>
      <circle cx="12" cy="4.5" r="2.5" />
      <path d="M8.4 8h7.2c1.2 0 2.1.6 2.8 1.6l2.4 3.5c.7 1 .5 2.3-.5 3-.9.6-2.1.4-2.8-.4L16 14v6.2c0 1-.8 1.8-1.8 1.8S12.4 21.2 12.4 20v-4h-.8v4c0 1.2-.8 2-1.8 2S8 21.2 8 20.2V14l-1.5 1.7c-.7.8-1.9 1-2.8.4-1-.7-1.2-2-.5-3l2.4-3.5C6.3 8.6 7.2 8 8.4 8Z" />
    </CustomLineIcon>
  );
}

function ShoesIcon(props: IconProps) {
  return (
    <CustomLineIcon {...props}>
      <path d="M3 15.5c0-2.2 1.3-4.1 3.4-4.8l4.5-1.4L14.4 6l2 1.8c1.2 1.1 2.9 1.7 4.6 1.5V18H4.5C3.7 18 3 17.3 3 16.5v-1Z" />
      <path d="M3 15h18M11.6 8.8l1.3 1.7M14 7.3l1.3 1.7" />
    </CustomLineIcon>
  );
}

function BottomIcon(props: IconProps) {
  return (
    <CustomLineIcon {...props}>
      <path d="M6 4h12v3H6zM6 7c-1.2 3-1.8 6.5-2 13h6l2-7 2 7h6c-.2-6.5-.8-10-2-13M12 7v4" />
    </CustomLineIcon>
  );
}

function MouthIcon(props: IconProps) {
  return (
    <CustomLineIcon {...props}>
      <path d="M3 12c3.2-3.2 5.7-5 9-2.5 3.3-2.5 5.8-.7 9 2.5-2.7 3.7-5.8 5.5-9 5.5S5.7 15.7 3 12Z" />
      <path d="M3.5 12h17" />
    </CustomLineIcon>
  );
}

export function CharacterCategoryIcon({
  category,
  size = 20
}: {
  category: HumanLayerCategory;
  size?: number;
}) {
  if (category === "body") return <BodyIcon size={size} />;
  if (category === "shoes") return <ShoesIcon size={size} />;
  if (category === "bottom") return <BottomIcon size={size} />;
  if (category === "mouth") return <MouthIcon size={size} />;
  if (category === "top") return <Shirt size={size} />;
  if (category === "hair") return <Scissors size={size} />;
  if (category === "eyes") return <Eye size={size} />;

  return <Gem size={size} />;
}
