import { Image } from 'react-native';

/**
 * require(...)로 모듈 아이디를 받아서, 번들된 에셋의 URI를 얻고 텍스트를 읽는다.
 */
export async function readAssetText(moduleId: number): Promise<string> {
	const src = Image.resolveAssetSource(moduleId);
	if (!src?.uri) throw new Error('Failed to resolve asset uri');
	const res = await fetch(src.uri);
	return await res.text();
}
