import React from 'react';

export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  paddingX?: number;
  paddingY?: number;
  skipTopPadding?: boolean;
  skipBottomPadding?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  positionRelative?: boolean;
}

declare const Container: React.ForwardRefExoticComponent<
  ContainerProps & React.RefAttributes<HTMLDivElement>
>;

export default Container;
