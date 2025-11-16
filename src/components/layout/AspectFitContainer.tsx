import React, { ReactNode, useState } from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';

type Props = {
  /** [width, height] 비율. 기본 9:16 */
  ratio?: [number, number];
  /** 바깥(스크린)에 주는 좌우 여백 dp */
  outerGutter?: number;
  /** 배경색 (박스 밖 영역) */
  backgroundColor?: string;
  /** 중앙 9:16 박스의 사이즈를 인자로 받아 children 렌더 */
  children: (size: { width: number; height: number }) => ReactNode;
};

export default function AspectFitContainer({
  ratio = [9, 16],
  outerGutter = 0,
  backgroundColor = '#f6f7fb',
  children,
}: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // 좌우 gutter만 제외해서 사용
    setBox({ w: Math.max(0, width - outerGutter * 2), h: height });
  };

  const [rw, rh] = ratio;
  const want = rw / rh;

  let stageW = 0;
  let stageH = 0;

  if (box.w > 0 && box.h > 0) {
    const have = box.w / box.h;
    if (have > want) {
      // 가로가 더 넓다 → 높이에 맞추고 가로를 줄임
      stageH = box.h;
      stageW = Math.floor(stageH * want);
    } else {
      // 세로가 더 길다 → 가로에 맞추고 세로를 줄임
      stageW = box.w;
      stageH = Math.floor(stageW / want);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor, paddingHorizontal: outerGutter }]} onLayout={onLayout}>
      {stageW > 0 && stageH > 0 && (
        <View style={{ width: stageW, height: stageH }}>{children({ width: stageW, height: stageH })}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
