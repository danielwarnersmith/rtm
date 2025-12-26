import type { Meta, StoryObj } from '@storybook/react';
import { Param } from './Param';

const meta = {
  title: 'MDX Components/Param',
  component: Param,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Param>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'VOL',
  },
};

export const Frequency: Story = {
  args: {
    children: 'FREQ',
  },
};

export const Decay: Story = {
  args: {
    children: 'DECAY',
  },
};

export const InContext: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div className="prose dark:prose-invert max-w-none">
      <p>
        Adjust the <Param>VOL</Param> parameter to control volume. 
        Use <Param>FREQ</Param> to set the frequency and <Param>DECAY</Param> to adjust the decay time.
      </p>
    </div>
  ),
};

