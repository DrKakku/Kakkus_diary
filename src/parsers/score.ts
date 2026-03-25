/**
 * Score Parser
 * Renders numeric scores out of 10
 */

import { MetadataParser } from "./index";

const scoreParser: MetadataParser = {
  key: "score",
  priority: 9,

  validate: (value: any): boolean => {
    if (typeof value !== "number") return false;
    return value >= 0 && value <= 10;
  },

  render: (value: number): string => {
    return `${value}/10`;
  },
};

export default scoreParser;
