import type { Meta, StoryObj } from '@storybook/react';
import { Knob } from './Knob';

const meta = {
  title: 'MDX Components/Knob',
  component: Knob,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'The knob name to display (e.g., TRACK LEVEL, DATA ENTRY)',
      table: {
        type: { summary: 'string' },
      },
    },
  },
} satisfies Meta<typeof Knob>;

export default meta;
type Story = StoryObj<typeof Knob>;

export const Default: Story = {
  args: {
    children: 'TRACK LEVEL',
  },
};

export const DataEntry: Story = {
  args: {
    children: 'DATA ENTRY',
  },
};

export const InContext: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <p>
        Turn the <Knob>TRACK LEVEL</Knob> knob to adjust the volume. Use the <Knob>DATA ENTRY</Knob> knob to fine-tune parameter values.
      </p>
    </div>
  ),
};

