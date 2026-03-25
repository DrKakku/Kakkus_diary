/**
 * Status Parser
 * Renders status field with uppercase formatting
 * Valid values: draft | final | idea
 */

import { MetadataParser } from "./index";

const validStatuses = ["draft", "final", "idea"];

const statusParser: MetadataParser = {
  key: "status",
  priority: 8,

  validate: (value: any): boolean => {
    if (typeof value !== "string") return false;
    return validStatuses.includes(value.toLowerCase());
  },

  render: (value: string): string => {
    return `[${value.toUpperCase()}]`;
  },
};

export default statusParser;
