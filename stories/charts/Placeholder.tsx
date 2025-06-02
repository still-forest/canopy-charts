import { Text } from "@still-forest/canopy";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta<typeof Text> = {
  title: "Charts/Placeholder",
  component: Text,
  tags: ["autodocs"],
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Text>Hello</Text>,
};
