// src/app/AspectStage9x16.tsx
import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';

const RATIO = 9 / 16;

type Props = {
	children: React.ReactNode;
	background?: string; // 스테이지 내부 배경색 (기본 연한 회색)
};

export default function AspectStage9x16({ children, background = '#f6f7fb' }: Props) {
	const [box, setBox] = useState<{ w: number; h: number } | null>(null);
	const [stage, setStage] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

	const onLayout = (e: LayoutChangeEvent) => {
		const { width: W, height: H } = e.nativeEvent.layout;
		let w = W, h = H;

		if (W / H > RATIO) {
			h = H;
			w = Math.floor(H * RATIO);
		} else {
			w = W;
			h = Math.floor(W / RATIO);
		}
		setBox({ w: W, h: H });
		setStage({ w, h });
	};

	return (
		<View style={[styles.outer, { backgroundColor: background }]} onLayout={onLayout}>
			{box && (
				<View style={[styles.stage, { width: stage.w, height: stage.h, backgroundColor: background }]}>
					{children}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	outer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	stage: {
		overflow: 'hidden'
	}
});