import type { Meta, StoryObj } from '@storybook/react';
import { LED } from './LED';

const meta = {
  title: 'MDX Components/LED',
  component: LED,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof LED>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'PATTERN PAGE',
  },
};

export const Octave: Story = {
  args: {
    children: 'OCTAVE',
  },
};

export const Pattern: Story = {
  args: {
    children: 'PATTERN',
  },
};

export const InContext: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <p>
        The <LED>PATTERN PAGE</LED> LED indicates which page you&apos;re viewing. 
        Use the <LED>OCTAVE</LED> LED to see the current octave setting.
      </p>
    </div>
  ),
};

