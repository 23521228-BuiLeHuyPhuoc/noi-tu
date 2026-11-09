import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from './src/useGame';
import { HomeScreen } from './src/screens/HomeScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { colors } from './src/ui';

// Trên web, vùng tai thỏ/thanh home đã được xử lý bằng CSS env(safe-area-inset-*) trong public/index.html
const Screen = Platform.OS === 'web' ? View : SafeAreaView;

export default function App() {
  const game = useGame();
  const { room } = game;

  return (
    <SafeAreaProvider>
      <Screen style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        {room && game.status !== 'online' && (
          <View style={{ backgroundColor: colors.danger, padding: 6 }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Đang kết nối lại…</Text>
          </View>
        )}
        {!room ? (
          <HomeScreen game={game} />
        ) : room.phase === 'lobby' ? (
          <LobbyScreen game={game} room={room} />
        ) : room.phase === 'playing' ? (
          <GameScreen game={game} room={room} />
        ) : (
          <ResultScreen game={game} room={room} />
        )}
      </Screen>
    </SafeAreaProvider>
  );
}
