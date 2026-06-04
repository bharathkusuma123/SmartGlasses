// src/services/DatabaseService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CapturedPhoto } from '../native/HeyCyanTypes';

// You can replace this with your actual backend API
const API_URL = 'https://your-backend-api.com/photos'; // Replace with your actual API

export class DatabaseService {
  
  // Save photo locally
  static async savePhoto(photo: CapturedPhoto): Promise<void> {
    try {
      const photos = await this.getPhotos();
      photos.unshift(photo);
      await AsyncStorage.setItem('captured_photos', JSON.stringify(photos));
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  }

  // Get all photos from local storage
  static async getPhotos(): Promise<CapturedPhoto[]> {
    try {
      const photosJson = await AsyncStorage.getItem('captured_photos');
      return photosJson ? JSON.parse(photosJson) : [];
    } catch (error) {
      console.error('Error getting photos:', error);
      return [];
    }
  }

  // Mark photo as synced
  static async markPhotoSynced(photoId: string): Promise<void> {
    try {
      const photos = await this.getPhotos();
      const updatedPhotos = photos.map(p => 
        p.id === photoId ? { ...p, synced: true } : p
      );
      await AsyncStorage.setItem('captured_photos', JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('Error marking photo synced:', error);
    }
  }

  // Delete photo
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      const photos = await this.getPhotos();
      const filteredPhotos = photos.filter(p => p.id !== photoId);
      await AsyncStorage.setItem('captured_photos', JSON.stringify(filteredPhotos));
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  }

  // Upload photo to server/database
  static async uploadPhoto(photo: CapturedPhoto): Promise<boolean> {
    try {
      // Method 1: Upload to your backend server
      const formData = new FormData();
      formData.append('photo_id', photo.id);
      formData.append('timestamp', photo.timestamp.toString());
      
      // Convert base64 to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      formData.append('photo', blob, `photo_${photo.id}.jpg`);
      
      const uploadResponse = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (uploadResponse.ok) {
        // Mark as synced in local storage
        await this.markPhotoSynced(photo.id);
        return true;
      }
      
      return false;
      
      // Method 2: If you just want to save base64 directly to database
      // const dbResponse = await fetch(API_URL, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     id: photo.id,
      //     image_base64: photo.base64,
      //     timestamp: photo.timestamp,
      //   }),
      // });
      // return dbResponse.ok;
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      return false;
    }
  }

  // Upload multiple photos
  static async uploadMultiplePhotos(photos: CapturedPhoto[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const photo of photos) {
      const uploaded = await this.uploadPhoto(photo);
      if (uploaded) {
        success++;
      } else {
        failed++;
      }
    }
    
    return { success, failed };
  }
}