import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from './src/useGame';
import { HomeScreen } from './src/screens/HomeScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { WordChainScreen } from './src/screens/WordChainScreen';
import { LudoScreen } from './src/screens/LudoScreen';
import { BauCuaScreen } from './src/screens/BauCuaScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { ShakeProvider } from './src/components/Fun';
import { C } from './src/theme';
import { FeedProvider, T } from './src/ui';

// Trên web, vùng tai thỏ/thanh home đã được xử lý bằng CSS env(safe-area-inset-*) trong public/index.html
const Screen = Platform.OS === 'web' ? View : SafeAreaView;

export default function App() {
  const game = useGame();
  const { room } = game;

  let body;
  if (!room) body = <HomeScreen game={game} />;
  else if (room.phase === 'lobby') body = <LobbyScreen game={game} room={room} />;
  else if (room.phase === 'finished' && room.result) body = <ResultScreen game={game} room={room} />;
  else if (room.game?.type === 'ludo') body = <LudoScreen game={game} room={room} />;
  else if (room.game?.type === 'baucua') body = <BauCuaScreen game={game} room={room} />;
  else if (room.game?.type === 'wordchain') body = <WordChainScreen game={game} room={room} />;
  else body = <HomeScreen game={game} />;

  return (
    <SafeAreaProvider>
      <Screen style={styles.root}>
        <StatusBar style="light" />
        <FeedProvider>
          <ShakeProvider>
            {room && game.status !== 'online' && (
              <View style={styles.offline}>
                <T style={styles.offlineText}>Mất kết nối, đang nối lại…</T>
              </View>
            )}
            {body}
          </ShakeProvider>
        </FeedProvider>
      </Screen>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.son },
  offline: { backgroundColor: C.ink, padding: 6 },
  offlineText: { color: C.gold, textAlign: 'center', fontWeight: '700', fontSize: 14 },
});
