// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

module.exports = (async () => {
	const defaultConfig = await getDefaultConfig(__dirname);
	const { assetExts, sourceExts } = defaultConfig.resolver;

	return mergeConfig(defaultConfig, {
		transformer: {
			babelTransformerPath: require.resolve('react-native-svg-transformer')
		},
		resolver: {
			// 1) 기본 assetExts에서 svg만 빼고
			// 2) .sudoku 확장자를 asset으로 추가
			assetExts: assetExts.filter(ext => ext !== 'svg').concat(['sudoku']),
			// svg를 소스 확장자로 추가(react-native-svg-transformer)
			sourceExts: [...sourceExts, 'svg']
		}
	});
})();
