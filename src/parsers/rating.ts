/**
 * Rating Parser
 * Renders numeric ratings as star symbols
 * scales: 1-5 stars
 */

import { MetadataParser } from "./index";

const ratingParser: MetadataParser = {
  key: "rating",
  priority: 10,

  validate: (value: any): boolean => {
    if (typeof value !== "number") return false;
    return value >= 1 && value <= 5;
  },

  render: (value: number): string => {
    const stars = "★".repeat(value);
    const emptyStars = "☆".repeat(5 - value);
    return `${stars}${emptyStars}`;
  },
};

export default ratingParser;
