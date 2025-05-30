import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { auth } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';

export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Singa</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          console.log('pressed')
          try {
            await signOut(auth);
            console.log('Signed out successfully')
            router.push('/');
            console.log('Signed out successfully and router')
          } catch (error: any) {
            alert('Error signing out: ' + error.message);
          }
        }}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  button: {
    backgroundColor: '#cc0000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// import { StyleSheet, SafeAreaView, Text, View } from 'react-native';

// export default function TabTwoScreen() {
//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.title}>DataBase</Text>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   separator: {
//     marginVertical: 30,
//     height: 1,
//     width: '80%',
//   },
// });
