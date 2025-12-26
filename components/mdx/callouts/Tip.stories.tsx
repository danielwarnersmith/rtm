import type { Meta, StoryObj } from '@storybook/react';
import { Tip } from './Tip';

const meta = {
  title: 'MDX Components/Tip',
  component: Tip,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    children: {
      control: false,
      description: 'The tip content (can include paragraphs, lists, links, etc.)',
      table: {
        type: { summary: 'ReactNode' },
      },
    },
  },
} satisfies Meta<typeof Tip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p>
        This is a helpful tip that provides additional information about using the device.
      </p>
    ),
  },
};

export const WithList: Story = {
  args: {
    children: (
      <>
        <p>Here are some useful tips:</p>
        <ul>
          <li>First tip item</li>
          <li>Second tip item</li>
          <li>Third tip item with more detailed information</li>
        </ul>
      </>
    ),
  },
};

export const WithMultipleParagraphs: Story = {
  args: {
    children: (
      <>
        <p>
          This tip contains multiple paragraphs to demonstrate how longer content is displayed.
        </p>
        <p>
          The second paragraph provides additional context and information that complements the first paragraph.
        </p>
      </>
    ),
  },
};

