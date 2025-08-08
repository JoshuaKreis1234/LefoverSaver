import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { money, palettes, useTheme } from '@/theme';

interface Props {
  visible: boolean;
  amount: number;
  currency: string;
  onComplete: (paid: boolean) => void;
  lightColor?: string;
  darkColor?: string;
}

export default function PaymentModal({
  visible,
  amount,
  currency,
  onComplete,
  lightColor,
  darkColor,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const { colors } = useTheme();

  const handlePay = async () => {
    setProcessing(true);
    try {
      // simulate async payment flow
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onComplete(true);
    } catch {
      onComplete(false);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ThemedView
          style={styles.card}
          lightColor={lightColor ?? palettes.light.card}
          darkColor={darkColor ?? palettes.dark.card}
        >
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Pay {money(amount, currency)}
          </ThemedText>
          <TouchableOpacity
            style={[styles.pay, { backgroundColor: colors.primary }]}
            onPress={handlePay}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <ThemedText style={[styles.payText, { color: colors.card }]}>Confirm Payment</ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => onComplete(false)} disabled={processing}>
            <ThemedText style={[styles.cancelText, { color: colors.text }]}>Cancel</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  pay: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  payText: { fontWeight: '700', fontSize: 16 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontWeight: '700', fontSize: 16 },
});

