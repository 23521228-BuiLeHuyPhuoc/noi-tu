import { Suspense, lazy } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
} from '@expo-google-fonts/be-vietnam-pro';
import { useGame } from './src/useGame';
import { HomeScreen } from './src/screens/HomeScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { ShakeProvider } from './src/components/Fun';
import { FxStyles } from './src/components/FxStyles';
import { WalletNoticeLayer } from './src/components/Wallet';
import { C } from './src/theme';
import { FeedProvider, T } from './src/ui';
import { KeyboardFrame } from './src/components/KeyboardFrame';
import { UiIcon } from './src/components/Icons';

// Tách chunk (code-splitting) cho toàn bộ 15 màn chơi để giảm dung lượng JS khởi động trên di động!
const WordChainScreen = lazy(() =>
  import('./src/screens/WordChainScreen').then((m) => ({ default: m.WordChainScreen })),
);
const BauCuaScreen = lazy(() =>
  import('./src/screens/BauCuaScreen').then((m) => ({ default: m.BauCuaScreen })),
);
const TyPhuScreen = lazy(() =>
  import('./src/screens/TyPhuScreen').then((m) => ({ default: m.TyPhuScreen })),
);
const MaSoiScreen = lazy(() =>
  import('./src/screens/MaSoiScreen').then((m) => ({ default: m.MaSoiScreen })),
);
const GianDiepScreen = lazy(() =>
  import('./src/screens/GianDiepScreen').then((m) => ({ default: m.GianDiepScreen })),
);
const VeDoanScreen = lazy(() =>
  import('./src/screens/VeDoanScreen').then((m) => ({ default: m.VeDoanScreen })),
);
const BomTuScreen = lazy(() =>
  import('./src/screens/BomTuScreen').then((m) => ({ default: m.BomTuScreen })),
);
const DoVuiScreen = lazy(() =>
  import('./src/screens/DoVuiScreen').then((m) => ({ default: m.DoVuiScreen })),
);
const CaSauScreen = lazy(() =>
  import('./src/screens/CaSauScreen').then((m) => ({ default: m.CaSauScreen })),
);
const BoomOnlineScreen = lazy(() =>
  import('./src/screens/BoomOnlineScreen').then((m) => ({ default: m.BoomOnlineScreen })),
);
const UnoMercyScreen = lazy(() =>
  import('./src/screens/UnoMercyScreen').then((m) => ({ default: m.UnoMercyScreen })),
);
const LotoScreen = lazy(() =>
  import('./src/screens/LotoScreen').then((m) => ({ default: m.LotoScreen })),
);
const CaroScreen = lazy(() =>
  import('./src/screens/CaroScreen').then((m) => ({ default: m.CaroScreen })),
);
const CroakSquadScreen = lazy(() =>
  import('./src/screens/CroakSquadScreen').then((m) => ({ default: m.CroakSquadScreen })),
);

const Screen = Platform.OS === 'web' ? View : SafeAreaView;

export default function App() {
  useFonts({
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    BeVietnamPro_900Black,
  });

  const game = useGame();
  const { room } = game;

  let body;
  if (!room) body = <HomeScreen game={game} />;
  else if (room.phase === 'lobby') body = <LobbyScreen game={game} room={room} />;
  else if (room.phase === 'finished' && room.result) body = <ResultScreen game={game} room={room} />;
  else if (room.game?.type === 'baucua') body = <BauCuaScreen game={game} room={room} />;
  else if (room.game?.type === 'typhu') body = <TyPhuScreen game={game} room={room} />;
  else if (room.game?.type === 'masoi') body = <MaSoiScreen game={game} room={room} />;
  else if (room.game?.type === 'giandiep') body = <GianDiepScreen game={game} room={room} />;
  else if (room.game?.type === 've_doan') body = <VeDoanScreen game={game} room={room} />;
  else if (room.game?.type === 'bom_tu') body = <BomTuScreen game={game} room={room} />;
  else if (room.game?.type === 'do_vui') body = <DoVuiScreen game={game} room={room} />;
  else if (room.game?.type === 'ca_sau') body = <CaSauScreen game={game} room={room} />;
  else if (room.game?.type === 'boom_online') body = <BoomOnlineScreen game={game} />;
  else if (room.game?.type === 'uno_mercy') body = <UnoMercyScreen game={game} />;
  else if (room.game?.type === 'loto') body = <LotoScreen game={game} room={room} />;
  else if (room.game?.type === 'caro') body = <CaroScreen game={game} room={room} />;
  else if (room.game?.type === 'croaksquad') body = <CroakSquadScreen game={game} room={room} />;
  else if (room.game?.type === 'wordchain' || room.game?.type === 'wordchain_en') body = <WordChainScreen game={game} room={room} />;
  else body = <HomeScreen game={game} />;

  return (
    <SafeAreaProvider>
      <FxStyles />
      <Screen style={styles.root}>
        <StatusBar style="light" />
        <KeyboardFrame>
          <FeedProvider>
            <ShakeProvider>
              {room && game.status !== 'online' && (
                <View style={styles.offline}>
                  <UiIcon name="RefreshCw" size={14} color={C.gold} />
                  <T style={styles.offlineText}>Mất kết nối, đang nối lại…</T>
                </View>
              )}
              <Suspense
                fallback={
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={C.gold} />
                  </View>
                }
              >
                {body}
              </Suspense>
              <WalletNoticeLayer game={game} />
            </ShakeProvider>
          </FeedProvider>
        </KeyboardFrame>
      </Screen>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.son },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.son },
  offline: {
    backgroundColor: C.ink,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offlineText: { color: C.gold, textAlign: 'center', fontWeight: '700', fontSize: 13 },
});
