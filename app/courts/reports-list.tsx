import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../src/services/FirebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { VerifyReportComponent } from '../../src/components';

const { width: screenWidth } = Dimensions.get('window');

interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

interface Report {
  id: string;
  courtId: string;
  courtName: string;
  description: string;
  user: string;
  userName: string;
  reportedAt: any;
  imageCount: number;
  photoUrls?: string[];
  status: 'open' | 'investigating' | 'resolved';
}

interface Verification {
  id: string;
  verifierId: string;
  photoUrl: string;
  timestamp: any;
  aiVerified: boolean;
}

export default function ReportsListScreen() {
  const params = useLocalSearchParams();
  const [court, setCourt] = useState<Court | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingReportId, setVerifyingReportId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<{ [reportId: string]: Verification[] }>({});
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedReportPhotos, setSelectedReportPhotos] = useState<Verification[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [reportPhotoModalVisible, setReportPhotoModalVisible] = useState(false);
  const [selectedReportPhotoUrls, setSelectedReportPhotoUrls] = useState<string[]>([]);
  const [selectedReportPhotoIndex, setSelectedReportPhotoIndex] = useState(0);

  useEffect(() => {
    initializeReports();
  }, []);

  const initializeReports = async () => {
    try {
      if (params.courtData) {
        const courtData = JSON.parse(params.courtData as string) as Court;
        setCourt(courtData);
        loadCourtReports(courtData.place_id);
      }
    } catch (error) {
      console.error('Error initializing reports:', error);
    }
  };

  const loadCourtReports = (courtId: string) => {
    try {
      const reportsRef = collection(db, 'basketballCourts', courtId, 'reports');
      const reportsQuery = query(reportsRef, orderBy('reportedAt', 'desc'));

      const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
        const reportsData: Report[] = [];
        snapshot.forEach((doc) => {
          reportsData.push({
            id: doc.id,
            ...doc.data(),
          } as Report);
        });
        setReports(reportsData);
        
        // Load verifications for each report
        reportsData.forEach(report => {
          loadReportVerifications(courtId, report.id);
        });
        
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error fetching reports:', error);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up reports listener:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReportVerifications = (courtId: string, reportId: string) => {
    try {
      const verificationsRef = collection(db, 'basketballCourts', courtId, 'reports', reportId, 'verifications');
      const verificationsQuery = query(verificationsRef, orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(verificationsQuery, (snapshot) => {
        const verificationsData: Verification[] = [];
        snapshot.forEach((doc) => {
          verificationsData.push({
            id: doc.id,
            ...doc.data(),
          } as Verification);
        });
        
        setVerifications(prev => ({
          ...prev,
          [reportId]: verificationsData
        }));
      }, (error) => {
        console.error('Error fetching verifications:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up verifications listener:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (court) {
      loadCourtReports(court.place_id);
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF6B6B';
      case 'investigating': return '#FFA726';
      case 'resolved': return '#4CAF50';
      default: return '#666';
    }
  };

  const getReportStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'investigating': return 'Investigating';
      case 'resolved': return 'Resolved';
      default: return 'Unknown';
    }
  };

  const getReportStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return 'alert-circle';
      case 'investigating': return 'search-circle';
      case 'resolved': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const formatReportDate = (reportedAt: any) => {
    if (!reportedAt) return 'Unknown date';

    try {
      const date = reportedAt.toDate ? reportedAt.toDate() : new Date(reportedAt);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInDays < 7) {
        return `${Math.floor(diffInDays)}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getFullReportDate = (reportedAt: any) => {
    if (!reportedAt) return 'Unknown date';

    try {
      const date = reportedAt.toDate ? reportedAt.toDate() : new Date(reportedAt);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const formatVerificationDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown time';
    }
  };

  const openPhotoModal = (reportPhotos: Verification[], startIndex: number = 0) => {
    setSelectedReportPhotos(reportPhotos);
    setSelectedPhotoIndex(startIndex);
    setPhotoModalVisible(true);
  };

  const closePhotoModal = () => {
    setPhotoModalVisible(false);
    setSelectedReportPhotos([]);
    setSelectedPhotoIndex(0);
  };

  const openReportPhotoModal = (photoUrls: string[], startIndex: number = 0) => {
    setSelectedReportPhotoUrls(photoUrls);
    setSelectedReportPhotoIndex(startIndex);
    setReportPhotoModalVisible(true);
  };

  const closeReportPhotoModal = () => {
    setReportPhotoModalVisible(false);
    setSelectedReportPhotoUrls([]);
    setSelectedReportPhotoIndex(0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Court Reports</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Court Reports</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Court Info */}
      {court && (
        <View style={styles.courtInfoCard}>
          <Text style={styles.courtName}>{court.name}</Text>
          <Text style={styles.courtAddress}>{court.address}</Text>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Reports Count */}
        <View style={styles.reportsHeader}>
          <Text style={styles.reportsCount}>
            {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
          </Text>
          <Text style={styles.sortIndicator}>
            <Ionicons name="time-outline" size={14} color="#666" />
            {' '}Sorted by most recent
          </Text>
        </View>

        {/* Add Report Button */}
        <View style={styles.addReportSection}>
          <TouchableOpacity 
            style={styles.addReportButton}
            onPress={() => {
              router.push({
                pathname: '/courts/report-page' as any,
                params: {
                  courtData: JSON.stringify(court)
                }
              });
            }}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.addReportButtonText}>Report an Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Reports List */}
        {reports.length > 0 ? (
          <View style={styles.reportsContainer}>
            {reports.map((report, index) => (
              <View key={report.id} style={styles.reportCard}>
                {/* Report Header */}
                <View style={styles.reportHeader}>
                  <View style={styles.reportStatusContainer}>
                    <Ionicons 
                      name={getReportStatusIcon(report.status)} 
                      size={20} 
                      color={getReportStatusColor(report.status)} 
                    />
                    <Text style={[styles.reportStatus, { color: getReportStatusColor(report.status) }]}>
                      {getReportStatusText(report.status)}
                    </Text>
                  </View>
                  <Text style={styles.reportDate}>
                    {formatReportDate(report.reportedAt)}
                  </Text>
                </View>

                {/* Report Description */}
                <Text style={styles.reportDescription}>{report.description}</Text>

                {/* Report Photos */}
                {report.photoUrls && report.photoUrls.length > 0 && (
                  <View style={styles.reportPhotosSection}>
                    <View style={styles.reportPhotosHeader}>
                      <Ionicons name="images-outline" size={16} color="#666" />
                      <Text style={styles.reportPhotosTitle}>
                        Report Photos ({report.photoUrls.length})
                      </Text>
                    </View>
                    
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.reportPhotos}
                      contentContainerStyle={styles.reportPhotosContainer}
                    >
                      {report.photoUrls.map((photoUrl, photoIndex) => (
                        <TouchableOpacity
                          key={photoIndex}
                          style={styles.reportPhotoContainer}
                          onPress={() => openReportPhotoModal(report.photoUrls!, photoIndex)}
                        >
                          <Image 
                            source={{ uri: photoUrl }} 
                            style={styles.reportPhoto}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <Ionicons name="expand-outline" size={16} color="white" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Report Details */}
                <View style={styles.reportDetails}>
                  <Text style={styles.reportFullDate}>
                    Reported on {getFullReportDate(report.reportedAt)}
                  </Text>
                </View>

                {/* Report Footer */}
                <View style={styles.reportFooter}>
                  <View style={styles.reportUser}>
                    <Ionicons name="person-circle-outline" size={16} color="#666" />
                    <Text style={styles.reportUserName}>Reported by {report.userName}</Text>
                  </View>
                  {report.imageCount > 0 && (
                    <View style={styles.reportImages}>
                      <Ionicons name="camera-outline" size={16} color="#666" />
                      <Text style={styles.reportImageCount}>
                        {report.imageCount} photo{report.imageCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Verification Photos */}
                {verifications[report.id] && verifications[report.id].length > 0 && (
                  <View style={styles.verificationsSection}>
                    <View style={styles.verificationsHeader}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                      <Text style={styles.verificationsTitle}>
                        {verifications[report.id].length} Verification{verifications[report.id].length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.verificationsPhotos}
                      contentContainerStyle={styles.verificationsPhotosContainer}
                    >
                      {verifications[report.id].map((verification, photoIndex) => (
                        <TouchableOpacity
                          key={verification.id}
                          style={styles.verificationPhotoContainer}
                          onPress={() => openPhotoModal(verifications[report.id], photoIndex)}
                        >
                          <Image 
                            source={{ uri: verification.photoUrl }} 
                            style={styles.verificationPhoto}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <Ionicons name="expand-outline" size={16} color="white" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Verification Button */}
                {report.status === 'open' && (
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={() => setVerifyingReportId(verifyingReportId === report.id ? null : report.id)}
                  >
                    <Ionicons 
                      name={verifyingReportId === report.id ? "close-outline" : "camera-outline"} 
                      size={18} 
                      color="#007AFF" 
                    />
                    <Text style={styles.verifyButtonText}>
                      {verifyingReportId === report.id ? "Cancel Verification" : "Verify This Report"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Verification Component */}
                {verifyingReportId === report.id && court && (
                  <View style={styles.verificationContainer}>
                    <VerifyReportComponent 
                      courtId={court.place_id}
                      reportId={report.id}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noReportsContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
            <Text style={styles.noReportsTitle}>No Reports Found</Text>
            <Text style={styles.noReportsSubtext}>
              This court has no reported issues. Great news for players!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePhotoModal} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedPhotoIndex + 1} of {selectedReportPhotos.length}
            </Text>
          </View>
          
          <FlatList
            data={selectedReportPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setSelectedPhotoIndex(index);
            }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.modalPhotoContainer}>
                <Image 
                  source={{ uri: item.photoUrl }} 
                  style={styles.modalPhoto}
                  resizeMode="contain"
                />
                <View style={styles.photoCaption}>
                  <Text style={styles.photoCaptionText}>
                    Verified on {formatVerificationDate(item.timestamp)}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Report Photo Modal */}
      <Modal
        visible={reportPhotoModalVisible}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={closeReportPhotoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeReportPhotoModal} style={styles.modalCloseButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedReportPhotoIndex + 1} of {selectedReportPhotoUrls.length}
            </Text>
          </View>
          
          <FlatList
            data={selectedReportPhotoUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedReportPhotoIndex}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setSelectedReportPhotoIndex(index);
            }}
            keyExtractor={(item, index) => `report-photo-${index}`}
            renderItem={({ item }) => (
              <View style={styles.modalPhotoContainer}>
                <Image 
                  source={{ uri: item }} 
                  style={styles.modalPhoto}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  courtInfoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  courtName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  courtAddress: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  reportsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sortIndicator: {
    fontSize: 12,
    color: '#666',
    alignItems: 'center',
  },
  addReportSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addReportButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addReportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportsContainer: {
    paddingHorizontal: 16,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
  },
  reportDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  reportPhotosSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  reportPhotosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportPhotosTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 6,
  },
  reportPhotos: {
    marginTop: 4,
  },
  reportPhotosContainer: {
    paddingRight: 16,
  },
  reportPhotoContainer: {
    marginRight: 8,
    position: 'relative',
  },
  reportPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  reportDetails: {
    marginBottom: 12,
  },
  reportFullDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportUserName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  reportImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportImageCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  verifyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  verificationContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16,
  },
  noReportsContainer: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noReportsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noReportsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Verification Photos Styles
  verificationsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  verificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verificationsTitle: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  verificationsPhotos: {
    marginTop: 4,
  },
  verificationsPhotosContainer: {
    paddingRight: 16,
  },
  verificationPhotoContainer: {
    marginRight: 8,
    position: 'relative',
  },
  verificationPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalPhotoContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPhoto: {
    width: screenWidth - 40,
    height: '70%',
  },
  photoCaption: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 12,
  },
  photoCaptionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
}); 