import type { Meta, StoryObj } from '@storybook/react';
import { Warning } from './Warning';

const meta = {
  title: 'MDX Components/Warning',
  component: Warning,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    children: {
      control: false,
      description: 'The warning content (can include paragraphs, lists, links, etc.)',
      table: {
        type: { summary: 'ReactNode' },
      },
    },
  },
} satisfies Meta<typeof Warning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p>
        This is an important warning that requires your attention. Please read carefully before proceeding.
      </p>
    ),
  },
};

export const WithList: Story = {
  args: {
    children: (
      <>
        <p>Warning: The following issues may occur:</p>
        <ul>
          <li>Data loss if not saved properly</li>
          <li>Unexpected behavior with certain settings</li>
          <li>Potential system instability</li>
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
          <strong>Important:</strong> This operation can&apos;t be undone.
        </p>
        <p>
          Make sure you have backed up all important data before continuing. 
          Any unsaved changes will be lost.
        </p>
      </>
    ),
  },
};

export const WithLink: Story = {
  args: {
    children: (
      <p>
        This feature is experimental. See the <a href="#documentation">documentation</a> for more details.
      </p>
    ),
  },
};

