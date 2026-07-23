import type { ButtonHTMLAttributes, ComponentType, SVGProps } from 'react';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick: () => void;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  iconOnly?: boolean;
}
