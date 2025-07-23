import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageUploadStatus, AIVerificationError } from '../types';

interface AIVerificationStatusProps {
  status: ImageUploadStatus;
  onRetry?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
}

export const AIVerificationStatusComponent: React.FC<AIVerificationStatusProps> = ({
  status,
  onRetry,
  onCancel,
  showDetails = false,
}) => {
  const getStatusColor = (phase: ImageUploadStatus['phase']): string => {
    switch (phase) {
      case 'uploading': return '#007AFF';
      case 'analyzing': return '#FF9500';
      case 'verified': return '#4CAF50';
      case 'failed': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusIcon = (phase: ImageUploadStatus['phase']): keyof typeof Ionicons.glyphMap => {
    switch (phase) {
      case 'uploading': return 'cloud-upload-outline';
      case 'analyzing': return 'scan-outline';
      case 'verified': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      default: return 'help-circle-outline';
    }
  };

  const getStatusTitle = (phase: ImageUploadStatus['phase']): string => {
    switch (phase) {
      case 'uploading': return 'Uploading Image...';
      case 'analyzing': return 'AI Analyzing Image...';
      case 'verified': return 'Verification Complete!';
      case 'failed': return 'Verification Failed';
      default: return 'Processing...';
    }
  };

  const renderProgressBar = () => {
    if (status.phase === 'verified' || status.phase === 'failed') {
      return null;
    }

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${status.progress}%`,
                backgroundColor: getStatusColor(status.phase)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{Math.round(status.progress)}%</Text>
      </View>
    );
  };

  const renderErrorDetails = () => {
    if (status.phase !== 'failed' || !status.error) {
      return null;
    }

    const error = status.error;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error Details:</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        
        {error.code === 'RATE_LIMIT' && error.retryAfter && (
          <Text style={styles.errorHint}>
            Please wait {Math.ceil(error.retryAfter / 60)} minutes before trying again.
          </Text>
        )}
        
        {error.code === 'NETWORK_ERROR' && (
          <Text style={styles.errorHint}>
            Check your internet connection and try again.
          </Text>
        )}
        
        {error.code === 'INVALID_IMAGE' && (
          <Text style={styles.errorHint}>
            Please ensure the image clearly shows a basketball court.
          </Text>
        )}
      </View>
    );
  };

  const renderVerificationDetails = () => {
    if (status.phase !== 'verified' || !status.aiVerification || !showDetails) {
      return null;
    }

    const verification = status.aiVerification;
    
    return (
      <View style={styles.verificationContainer}>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence:</Text>
          <Text style={[
            styles.confidenceValue,
            { color: verification.confidence >= 80 ? '#4CAF50' : verification.confidence >= 60 ? '#FF9500' : '#FF3B30' }
          ]}>
            {verification.confidence}%
          </Text>
        </View>
        
        {verification.feedback && (
          <Text style={styles.feedbackText}>{verification.feedback}</Text>
        )}
        
        {showDetails && verification.reasoning && (
          <View style={styles.reasoningContainer}>
            <Text style={styles.reasoningLabel}>AI Analysis:</Text>
            <Text style={styles.reasoningText}>{verification.reasoning}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => {
    if (status.phase === 'uploading' || status.phase === 'analyzing') {
      return (
        <View style={styles.actionContainer}>
          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (status.phase === 'failed' && status.error?.retryable && onRetry) {
      return (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh-outline" size={16} color="#007AFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor(status.phase) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {status.phase === 'uploading' || status.phase === 'analyzing' ? (
            <ActivityIndicator size="small" color={getStatusColor(status.phase)} />
          ) : (
            <Ionicons 
              name={getStatusIcon(status.phase)} 
              size={24} 
              color={getStatusColor(status.phase)} 
            />
          )}
          <Text style={[styles.title, { color: getStatusColor(status.phase) }]}>
            {getStatusTitle(status.phase)}
          </Text>
        </View>
      </View>

      {/* Message */}
      <Text style={styles.message}>{status.message}</Text>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Verification Details */}
      {renderVerificationDetails()}

      {/* Error Details */}
      {renderErrorDetails()}

      {/* Action Buttons */}
      {renderActionButtons()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  verificationContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  confidenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reasoningContainer: {
    borderTopWidth: 1,
    borderTopColor: '#D4E7D4',
    paddingTop: 8,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  errorContainer: {
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#D70015',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
}); 