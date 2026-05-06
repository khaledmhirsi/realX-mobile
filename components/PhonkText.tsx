import React from 'react';
import { Text, TextProps } from 'react-native';
import { Typography } from '../constants/Typography';

export default function PhonkText({ children, style, ...props }: TextProps) {
  return (
    <Text
      style={[{ fontFamily: Typography.hanson.bold }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
