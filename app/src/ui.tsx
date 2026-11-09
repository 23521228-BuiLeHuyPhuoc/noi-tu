import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

export const colors = {
  bg: '#FFF8EE',
  card: '#FFFFFF',
  text: '#2B2118',
  muted: '#8A7B6C',
  primary: '#E8590C',
  primaryDark: '#C2410C',
  ok: '#2F9E44',
  danger: '#E03131',
  border: '#EADFCF',
};

export function Button({
  title, variant = 'primary', disabled, ...rest
}: PressableProps & { title: string; variant?: 'primary' | 'ghost' }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' ? styles.ghost : styles.primary,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
      ]}
      {...rest}
    >
      <Text style={[styles.btnText, variant === 'ghost' && { color: colors.primaryDark }]}>{title}</Text>
    </Pressable>
  );
}

export const common = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  label: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: 15 },
  muted: { color: colors.muted, fontSize: 15 },
});

const styles = StyleSheet.create({
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
