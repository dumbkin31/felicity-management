// Predefined interests/tags for participants
export const PREDEFINED_INTERESTS = [
  "Technology",
  "Sports",
  "Cultural",
  "Academic",
  "Entrepreneurship",
  "Arts & Design",
  "Music",
  "Dance",
  "Coding",
  "Robotics",
  "Gaming",
  "Debate",
  "Photography",
  "Community Service",
  "Fitness",
  "Cooking",
  "Reading",
  "Travel",
  "Innovation",
  "Business",
];

export const isValidInterest = (interest) => {
  return PREDEFINED_INTERESTS.includes(interest);
};
