import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { ClayCard } from './ClayCard';

interface ClayModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
  transparent?: boolean;
}

const { height: screenHeight } = Dimensions.get('window');

export const ClayModal: React.FC<ClayModalProps> = ({
  visible,
  onClose,
  children,
  animationType = 'fade',
  transparent = true
}) => {
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <SafeAreaView style={styles.modalContainer}>
          <ClayCard style={styles.modalCard}>
            {children}
          </ClayCard>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    maxHeight: screenHeight * 0.8,
    width: '90%',
    maxWidth: 400,
  },
  modalCard: {
    padding: 20,
    maxHeight: '100%',
    borderRadius: 12,
  },
});