import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { money } from '../theme';

interface Props {
  visible: boolean;
  amount: number;
  currency: string;
  onComplete: (paid: boolean) => void;
}

export default function PaymentModal({ visible, amount, currency, onComplete }: Props) {
  const [processing, setProcessing] = useState(false);

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
        <View style={styles.card}>
          <Text style={styles.title}>Pay {money(amount, currency)}</Text>
          <TouchableOpacity style={styles.pay} onPress={handlePay} disabled={processing}>
            {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>Confirm Payment</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => onComplete(false)} disabled={processing}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  pay: { backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  payText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#374151', fontWeight: '700', fontSize: 16 },
});

