import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  containerLight: {
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listTitleLight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  listTitleDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },

  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollView: {
    marginTop: 5,
    flex: 1,
  },
  recordingItem: {
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 30,
  },
  recordingMetadataItem: {
    fontSize: 12,
    color: '#666',
  },
  recordingName: {
    fontSize: 20,
    marginTop: 4,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    padding: 10,
    borderRadius: 25,
  },
  recordButtonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.6,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FF5252',
    marginBottom: 10,
  },
  recordingActive: {
    backgroundColor: '#FF1744',
  },
  recordingStatusText: {
    fontSize: 16,
    color: '#666',
  },
});

export default styles;
