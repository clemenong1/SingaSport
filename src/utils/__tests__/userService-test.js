// Mock Firebase before importing userService
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(() => 'increment_value'),
}));

jest.mock('../../services/FirebaseConfig', () => ({
  db: {},
}));

// Import after mocking
import { userService } from '../userService';

describe('UserService Points System', () => {
  let mockDoc, mockGetDoc, mockSetDoc, mockUpdateDoc, mockIncrement;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked functions
    const firestore = require('firebase/firestore');
    mockDoc = firestore.doc;
    mockGetDoc = firestore.getDoc;
    mockSetDoc = firestore.setDoc;
    mockUpdateDoc = firestore.updateDoc;
    mockIncrement = firestore.increment;
    
    // Setup default return values
    mockDoc.mockReturnValue('mock-doc-ref');
  });

  test('createUserProfile should initialize points to 0', async () => {
    mockSetDoc.mockResolvedValue();

    const profileData = {
      username: 'testuser',
      email: 'test@example.com',
      country: 'Singapore',
    };

    await userService.createUserProfile('test-uid', profileData);

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'test-uid');
    expect(mockSetDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        points: 0,
        username: 'testuser',
        email: 'test@example.com',
        country: 'Singapore',
        uid: 'test-uid',
      })
    );
  });

  test('awardPoints should call updateDoc with increment when user exists', async () => {
    mockUpdateDoc.mockResolvedValue();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ points: 50 })
    });

    await userService.awardPoints('test-uid', 10);

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'test-uid');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        points: 'increment_value',
      })
    );
  });

  test('awardPoints should create profile and award points when user does not exist', async () => {
    mockUpdateDoc.mockResolvedValue();
    mockGetDoc.mockResolvedValue({
      exists: () => false
    });

    // Mock console.log to prevent "Cannot log after tests are done" error
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    await userService.awardPoints('test-uid', 10);
    
    consoleSpy.mockRestore();

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', 'test-uid');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        points: 10,
      })
    );
  });

  test('awardPointsForReport should award 20 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForReport('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 20);
  });

  test('awardPointsForVerification should award 15 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForVerification('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 15);
  });

  test('awardPointsForGameCreation should award 10 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForGameCreation('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 10);
  });

  test('awardPointsForGameJoining should award 5 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForGameJoining('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 5);
  });
}); 