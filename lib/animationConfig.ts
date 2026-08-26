export const softSpring = {
  type: "spring" as const,
  stiffness: 180,
  damping: 24,
  mass: 0.85,
};

export const softEase = [0.22, 1, 0.36, 1] as const;

export const factTransition = {
  duration: 0.3,
  ease: softEase,
};
