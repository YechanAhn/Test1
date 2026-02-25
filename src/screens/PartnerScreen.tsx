// ============================================
// 파트너 연결 화면
// 초대 코드를 통해 부부 캘린더를 공유합니다.
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useCalendarStore } from '../hooks/useCalendarStore';

const PartnerScreen: React.FC = () => {
  const { currentUser, partner, sharedCalendar } = useCalendarStore();
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  /** 새 공유 캘린더 생성 */
  const handleCreateCalendar = async () => {
    setIsCreating(true);
    try {
      // CalendarService.createSharedCalendar() 호출
      Alert.alert(
        '캘린더 생성 완료',
        '초대 코드를 파트너에게 공유해주세요!',
      );
    } finally {
      setIsCreating(false);
    }
  };

  /** 초대 코드로 참여 */
  const handleJoinCalendar = async () => {
    if (inviteCodeInput.length !== 6) {
      Alert.alert('오류', '6자리 초대 코드를 입력해주세요.');
      return;
    }

    try {
      // CalendarService.joinCalendarByInviteCode() 호출
      Alert.alert('연결 완료', '파트너와 캘린더가 공유됩니다!');
    } catch {
      Alert.alert('오류', '유효하지 않은 초대 코드입니다.');
    }
  };

  // 이미 파트너가 연결된 경우
  if (partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.connectedContainer}>
          <View style={styles.avatarPair}>
            <View style={[styles.avatar, styles.myAvatar]}>
              <Text style={styles.avatarText}>
                {currentUser?.displayName?.[0] || '나'}
              </Text>
            </View>
            <View style={styles.heartContainer}>
              <Text style={styles.heartText}>{'<3'}</Text>
            </View>
            <View style={[styles.avatar, styles.partnerAvatar]}>
              <Text style={styles.avatarText}>
                {partner.displayName?.[0] || '?'}
              </Text>
            </View>
          </View>
          <Text style={styles.connectedTitle}>
            {partner.displayName}님과 연결됨
          </Text>
          <Text style={styles.connectedSubtext}>
            캘린더를 함께 공유하고 있습니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 파트너 미연결 상태
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>파트너 연결</Text>
        <Text style={styles.headerSubtitle}>
          부부가 함께 사용할 공유 캘린더를 만들어보세요
        </Text>
      </View>

      {/* 옵션 1: 캘린더 생성 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>새 공유 캘린더 만들기</Text>
        <Text style={styles.sectionDesc}>
          캘린더를 만들고 초대 코드를 파트너에게 보내주세요
        </Text>

        {sharedCalendar ? (
          <View style={styles.codeDisplay}>
            <Text style={styles.codeLabel}>초대 코드</Text>
            <Text style={styles.codeText}>{sharedCalendar.inviteCode}</Text>
            <Text style={styles.codeHint}>이 코드를 파트너에게 알려주세요</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateCalendar}
            disabled={isCreating}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? '생성 중...' : '캘린더 만들기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 구분선 */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>또는</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* 옵션 2: 초대 코드 입력 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>초대 코드로 참여하기</Text>
        <Text style={styles.sectionDesc}>
          파트너에게 받은 6자리 코드를 입력하세요
        </Text>
        <View style={styles.codeInputRow}>
          <TextInput
            style={styles.codeInput}
            value={inviteCodeInput}
            onChangeText={(text) => setInviteCodeInput(text.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor="#B2BEC3"
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinCalendar}
          >
            <Text style={styles.joinButtonText}>참여</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  codeDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 6,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4A90D9',
    letterSpacing: 6,
  },
  codeHint: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dividerText: {
    fontSize: 13,
    color: '#B2BEC3',
    marginHorizontal: 12,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: '#2D3436',
  },
  joinButton: {
    backgroundColor: '#2D3436',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // 연결 완료 상태
  connectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avatarPair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatar: {
    backgroundColor: '#4A90D9',
  },
  partnerAvatar: {
    backgroundColor: '#FF6B6B',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heartContainer: {
    marginHorizontal: 12,
  },
  heartText: {
    fontSize: 20,
    color: '#FF6B6B',
  },
  connectedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 6,
  },
  connectedSubtext: {
    fontSize: 14,
    color: '#636E72',
  },
});

export default PartnerScreen;
