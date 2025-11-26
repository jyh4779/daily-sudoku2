import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

type IconProps = {
    color?: string;
    size?: number;
};

export const HomeIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M3 9.5L12 2.5L21 9.5V20.5C21 21.0523 20.5523 21.5 20 21.5H15V14.5H9V21.5H4C3.44772 21.5 3 21.0523 3 20.5V9.5Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const DailyIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M3 9H21"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M3 15H21"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M9 3V21"
            stroke={color}
            strokeWidth="2"
        />
        <Path
            d="M15 3V21"
            stroke={color}
            strokeWidth="2"
        />
    </Svg>
);

export const RecordsIcon: React.FC<IconProps> = ({ color = '#000', size = 24 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 20V10"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 20V4"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M6 20V14"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
