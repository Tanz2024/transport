import React from 'react';
import Lottie from 'lottie-react';

interface LottieIconProps {
  animationData: object;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

const LottieIcon: React.FC<LottieIconProps> = ({
  animationData,
  width = 40,
  height = 40,
  loop = true,
  style = {},
  ariaLabel = 'icon',
}) => (
  <Lottie
    animationData={animationData}
    loop={loop}
    autoplay
    style={{ width, height, ...style }}
    aria-label={ariaLabel}
  />
);

export default LottieIcon;
