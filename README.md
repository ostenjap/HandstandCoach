# Handstand Coach App

## Animation System Overview

The custom stick figure animations displayed inside the `DrillBottomSheet` are fully built using React Native's native `Animated` API. This setup provides smooth, 60fps animations entirely on the native UI thread without relying on external libraries like Lottie or GIFs (except for specific static asset overrides like the wrist rocking sequence).

### How it Works:

1. **The Shared Animation Value:**
   A single, continuous value (`formAnim`) oscillates between `0` and `1` using `Animated.loop` and `Animated.sequence` with a duration of 2000ms.

2. **Interpolation:**
   Depending on the active drill step, this continuous `0` to `1` value is fed into `.interpolate()` functions to calculate specific geometric transforms. For instance:
   * **Breathing / Micro-Wobble:** Interpolates between `-2deg` and `2deg` rotation to simulate human balance corrections on the wall.
   * **Push-Ups:** Interpolates the Y-axis translation from `0` to `16` to make the stick figure bend and dip.
   * **Bailing / Cartwheels:** Interpolates rotation up to `-90deg` over keyframes `[0, 0.8, 1]` to simulate an accelerated drop curve.

3. **Rendering:**
   The stick figures are constructed out of simple `<Animated.View>` primitive lines and nodes. By passing the interpolated values directly into the `transform: [{ translateY: ... }, { rotate: ... }]` style properties, the native layer calculates the movement without communicating back-and-forth across the React JS bridge.
