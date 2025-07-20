import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import VerifyReportComponent from './VerifyReportComponent';

// Example usage of VerifyReportComponent
const VerifyReportExample: React.FC = () => {
  // These would typically come from navigation params or props
  const courtId = "court123"; // Example court ID
  const reportId = "report456"; // Example report ID

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Your other report details UI would go here */}
        
        {/* The verification component */}
        <VerifyReportComponent 
          courtId={courtId}
          reportId={reportId}
        />
        
        {/* Any other UI elements */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 20,
  },
});

export default VerifyReportExample; 