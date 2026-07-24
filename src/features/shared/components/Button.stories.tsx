import type { Meta, StoryObj } from '@storybook/react-vite';
import { BellIcon } from '@heroicons/react/24/outline';
import Button from './Button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: {
    icon: BellIcon,
    label: 'Notify me',
    onClick: () => undefined,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IconOnly: Story = {
  args: {
    iconOnly: true,
    label: 'Notifications',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
