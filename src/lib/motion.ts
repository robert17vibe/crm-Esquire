export const durations = {
  instant: 0.075,
  fast:    0.15,
  base:    0.2,
  slow:    0.3,
  slower:  0.5,
}

export const easings = {
  swift:  [0.16, 1, 0.3, 1] as [number, number, number, number],
  smooth: [0.4, 0, 0.2, 1]  as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
}

export const transitions = {
  default: { duration: durations.base, ease: easings.swift },
  fast:    { duration: durations.fast, ease: easings.smooth },
  smooth:  { duration: durations.slow, ease: easings.smooth },
  bounce:  { duration: durations.slow, ease: easings.bounce },
}

export const motionPresets = {
  fadeIn: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    transition: transitions.default,
  },
  slideUp: {
    initial:    { opacity: 0, y: 8 },
    animate:    { opacity: 1, y: 0 },
    transition: transitions.default,
  },
  scaleIn: {
    initial:    { opacity: 0, scale: 0.96 },
    animate:    { opacity: 1, scale: 1 },
    transition: transitions.default,
  },
  listItem: (i: number) => ({
    initial:    { opacity: 0, y: 6 },
    animate:    { opacity: 1, y: 0 },
    transition: { ...transitions.default, delay: i * 0.04 },
  }),
}
