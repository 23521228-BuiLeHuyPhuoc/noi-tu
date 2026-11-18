// Cho phép app dùng code chung trong ../shared và tối ưu mạnh dung lượng bundle Web/Mobile
process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH ??= '1';
process.env.EXPO_UNSTABLE_TREE_SHAKING ??= '1';

const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];

const iconPackSrcPath = path.resolve(__dirname, 'src/iconPack.generated.ts');
const fluentPublicDir = path.resolve(__dirname, 'public/fluent');
const webIconPackOutDir = path.resolve(__dirname, 'src/shims');
const webIconPackPath = path.join(webIconPackOutDir, 'iconPack.web.generated.js');
let lastBuiltMtime = -1;

/**
 * Tách 7MB SVG Fluent 3D ra thành các file tĩnh `/fluent/<key>.svg` trên CDN (tải lười khi hiển thị),
 * giữ bundle JS trên Web chỉ còn ~60KB bảng tra thay vì 7.1MB chuỗi SVG nội tuyến.
 */
function ensureWebIconPack() {
  if (!fs.existsSync(iconPackSrcPath)) return null;
  const stat = fs.statSync(iconPackSrcPath);
  if (stat.mtimeMs === lastBuiltMtime && fs.existsSync(webIconPackPath)) {
    return webIconPackPath;
  }
  const rawTs = fs.readFileSync(iconPackSrcPath, 'utf8');
  const runnable = rawTs
    .replace(/export\s+interface\s+VectorDef\s*\{[\s\S]*?\}/, '')
    .replace(/export\s+const\s+(\w+)\s*:[^=]+=/g, 'exports.$1 =');
  const sandbox = { exports: {} };
  vm.runInNewContext(runnable, sandbox);
  const { FLUENT_ICONS = {}, GAME_ICONS = {}, EMOJI_TO_FLUENT = {} } = sandbox.exports;

  fs.mkdirSync(fluentPublicDir, { recursive: true });
  fs.mkdirSync(webIconPackOutDir, { recursive: true });

  const slimFluent = {};
  for (const [key, def] of Object.entries(FLUENT_ICONS)) {
    const svgFile = path.join(fluentPublicDir, `${key}.svg`);
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${def.v}">${def.b}</svg>`;
    if (!fs.existsSync(svgFile) || fs.statSync(svgFile).size !== Buffer.byteLength(svgContent)) {
      fs.writeFileSync(svgFile, svgContent, 'utf8');
    }
    slimFluent[key] = { v: def.v, b: '', u: `/fluent/${key}.svg` };
  }

  const esmOut = [
    '// Tự động sinh từ iconPack.generated.ts cho Web build',
    `export const FLUENT_ICONS = ${JSON.stringify(slimFluent)};`,
    `export const GAME_ICONS = ${JSON.stringify(GAME_ICONS)};`,
    `export const EMOJI_TO_FLUENT = ${JSON.stringify(EMOJI_TO_FLUENT)};`,
    '',
  ].join('\n');
  fs.writeFileSync(webIconPackPath, esmOut, 'utf8');
  lastBuiltMtime = stat.mtimeMs;
  return webIconPackPath;
}

// Sinh sẵn `public/fluent/*.svg` ngay lúc nạp cấu hình để `expo export` copy trọn vẹn sang `dist/fluent/`
ensureWebIconPack();

const prevGetTransformOptions = config.transformer?.getTransformOptions;
config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
    const base = prevGetTransformOptions
      ? await prevGetTransformOptions(entryPoints, options, getDependenciesOf)
      : {};
    return {
      ...base,
      transform: {
        ...base?.transform,
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    };
  },
};

const dicebearShim = path.resolve(__dirname, 'src/shims/dicebearCollection.js');
const webFontsShim = path.resolve(__dirname, 'src/shims/webFonts.js');
const prevResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === '@dicebear/collection') {
      return { filePath: dicebearShim, type: 'sourceFile' };
    }
    if (platform === 'web' && moduleName === '@expo-google-fonts/be-vietnam-pro') {
      return { filePath: webFontsShim, type: 'sourceFile' };
    }
    if (platform === 'web' && (moduleName === '../iconPack.generated' || moduleName === './iconPack.generated' || moduleName.endsWith('/iconPack.generated'))) {
      const slim = ensureWebIconPack();
      if (slim) return { filePath: slim, type: 'sourceFile' };
    }
    if (prevResolveRequest) {
      return prevResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
