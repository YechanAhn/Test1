// ============================================
// 설정 화면
// 알림, 권한, 자동 감지 설정
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useCalendarStore } from '../hooks/useCalendarStore';

const SettingsScreen: React.FC = () => {
  const { notificationSettings, setNotificationSettings, currentUser } = useCalendarStore();

  // 권한 상태 (실제로는 네이티브 모듈에서 확인)
  const [smsPermission, setSmsPermission] = useState(false);
  const [notificationListenerPermission, setNotificationListenerPermission] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
        </View>

        {/* 프로필 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {currentUser?.displayName?.[0] || '?'}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>
                {currentUser?.displayName || '로그인 필요'}
              </Text>
              <Text style={styles.profileEmail}>
                {currentUser?.email || ''}
              </Text>
            </View>
          </View>
        </View>

        {/* 자동 감지 권한 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>일정 자동 감지</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>SMS 읽기 권한</Text>
              <Text style={styles.settingDesc}>
                문자 메시지에서 일정을 자동으로 감지합니다
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                smsPermission && styles.permissionGranted,
              ]}
              onPress={() => setSmsPermission(!smsPermission)}
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  smsPermission && styles.permissionGrantedText,
                ]}
              >
                {smsPermission ? '허용됨' : '허용하기'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>알림 접근 권한</Text>
              <Text style={styles.settingDesc}>
                카카오톡 알림에서 일정을 자동으로 감지합니다
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                notificationListenerPermission && styles.permissionGranted,
              ]}
              onPress={() =>
                setNotificationListenerPermission(!notificationListenerPermission)
              }
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  notificationListenerPermission && styles.permissionGrantedText,
                ]}
              >
                {notificationListenerPermission ? '허용됨' : '허용하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 알림 설정 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>파트너 알림</Text>
              <Text style={styles.settingDesc}>
                새 일정이 추가되면 파트너에게 알림을 보냅니다
              </Text>
            </View>
            <Switch
              value={notificationSettings.partnerNotify}
              onValueChange={(value) =>
                setNotificationSettings({ partnerNotify: value })
              }
              trackColor={{ false: '#DFE6E9', true: '#4A90D9' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>자동 확인</Text>
              <Text style={styles.settingDesc}>
                신뢰도가 높은 일정은 자동으로 캘린더에 추가합니다
              </Text>
            </View>
            <Switch
              value={notificationSettings.autoConfirm}
              onValueChange={(value) =>
                setNotificationSettings({ autoConfirm: value })
              }
              trackColor={{ false: '#DFE6E9', true: '#4A90D9' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* 리마인더 시간 설정 */}
          <View style={styles.reminderSection}>
            <Text style={styles.settingLabel}>일정 리마인더</Text>
            <View style={styles.reminderOptions}>
              {[10, 30, 60, 120].map((minutes) => {
                const isSelected = notificationSettings.beforeMinutes.includes(minutes);
                const label = minutes >= 60 ? `${minutes / 60}시간 전` : `${minutes}분 전`;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.reminderChip,
                      isSelected && styles.reminderChipSelected,
                    ]}
                    onPress={() => {
                      const updated = isSelected
                        ? notificationSettings.beforeMinutes.filter((m) => m !== minutes)
                        : [...notificationSettings.beforeMinutes, minutes];
                      setNotificationSettings({ beforeMinutes: updated });
                    }}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        isSelected && styles.reminderChipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 정보 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>개인정보 처리방침</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>서비스 이용약관</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow}>
            <Text style={styles.infoLabel}>오픈소스 라이선스</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B2BEC3',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3436',
  },
  profileEmail: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  settingDesc: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  permissionButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  permissionGranted: {
    backgroundColor: '#E8F4FD',
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  permissionGrantedText: {
    color: '#4A90D9',
  },
  reminderSection: {
    paddingVertical: 12,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  reminderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  reminderChipSelected: {
    backgroundColor: '#4A90D9',
  },
  reminderChipText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  reminderChipTextSelected: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  infoLabel: {
    fontSize: 15,
    color: '#2D3436',
  },
  infoValue: {
    fontSize: 15,
    color: '#B2BEC3',
  },
  logoutButton: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

export default SettingsScreen;
