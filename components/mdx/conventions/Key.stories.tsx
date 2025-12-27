import type { Meta, StoryObj } from '@storybook/react';
import { Key } from './Key';

const meta = {
  title: 'MDX Components/Key',
  component: Key,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Key>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'FUNC',
  },
};

export const Play: Story = {
  args: {
    children: 'PLAY',
  },
};

export const Trigger: Story = {
  args: {
    children: 'TRIG 1-16',
  },
};

export const InContext: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <p>
        Press the <Key>FUNC</Key> key to access function mode, then use <Key>TRIG 1</Key> through <Key>TRIG 16</Key> to select different functions.
      </p>
    </div>
  ),
};

