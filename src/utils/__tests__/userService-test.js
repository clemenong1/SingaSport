import { userService } from '../userService';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(() => 'increment_value'),
}));

jest.mock('../FirebaseConfig', () => ({
  db: {},
}));

describe('UserService Points System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createUserProfile should initialize points to 0', async () => {
    const mockSetDoc = require('firebase/firestore').setDoc;
    mockSetDoc.mockResolvedValue();

    const profileData = {
      username: 'testuser',
      email: 'test@example.com',
      country: 'Singapore',
    };

    await userService.createUserProfile('test-uid', profileData);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        points: 0,
        username: 'testuser',
        email: 'test@example.com',
        country: 'Singapore',
      })
    );
  });

  test('awardPoints should call updateDoc with increment', async () => {
    const mockUpdateDoc = require('firebase/firestore').updateDoc;
    mockUpdateDoc.mockResolvedValue();

    await userService.awardPoints('test-uid', 10);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        points: 'increment_value',
      })
    );
  });

  test('awardPointsForReport should award 10 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForReport('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 10);
  });

  test('awardPointsForVerification should award 10 points', async () => {
    const mockAwardPoints = jest.spyOn(userService, 'awardPoints');
    mockAwardPoints.mockResolvedValue(true);

    await userService.awardPointsForVerification('test-uid');

    expect(mockAwardPoints).toHaveBeenCalledWith('test-uid', 10);
  });
}); 