import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$ = this.afAuth.authState;

  constructor(private afAuth: AngularFireAuth, private firestore: AngularFirestore, private router: Router) {}

  logout() {
    return this.afAuth.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  getCurrentUser() {
    return this.afAuth.currentUser;
  }

  getUserProfile(): Observable<any> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          // Get user profile from main users collection (this is the primary source)
          return this.firestore.collection('users').doc(user.uid).valueChanges();
        } else {
          return new Observable(observer => observer.next(null));
        }
      })
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user)
    );
  }

  // Admin role checking functionality
  isAdmin(email: string): boolean {
    const adminEmails = [
      'admin@josenianlink.com',
      'administrator@josenianlink.com',
      'admin@usjr.edu.ph'
    ];
    return adminEmails.includes(email.toLowerCase());
  }

  // Check if current user is admin
  checkUserRole(): Observable<{ isAdmin: boolean; userProfile: any }> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          const isAdmin = this.isAdmin(user.email || '');
          if (isAdmin) {
            // For admin users, return basic profile info
            return new Observable<{ isAdmin: boolean; userProfile: any }>(observer => 
              observer.next({ 
                isAdmin: true, 
                userProfile: { 
                  fullName: 'Administrator', 
                  email: user.email,
                  role: 'admin' 
                } 
              })
            );
          } else {
            // For regular users, get full profile from Firestore
            return this.firestore.collection('users').doc(user.uid).valueChanges().pipe(
              map(profile => ({ isAdmin: false, userProfile: profile }))
            );
          }
        } else {
          return new Observable<{ isAdmin: boolean; userProfile: any }>(observer => 
            observer.next({ isAdmin: false, userProfile: null })
          );
        }
      })
    );
  }

  // Check if user is approved (exists in users collection)
  async isUserApproved(uid: string): Promise<{ approved: boolean; pending: boolean; message: string }> {
    try {
      // Check if user exists in approved users collection
      const userDoc = await this.firestore.collection('users').doc(uid).get().toPromise();

      if (userDoc && userDoc.exists) {
        return { approved: true, pending: false, message: 'User is approved' };
      }

      // Check if user is pending approval
      const pendingDoc = await this.firestore.collection('registry-approval').doc(uid).get().toPromise();

      if (pendingDoc && pendingDoc.exists) {
        return { approved: false, pending: true, message: 'Account is pending admin approval' };
      }

      // User doesn't exist in either collection
      return { approved: false, pending: false, message: 'Account not found' };

    } catch (error) {
      console.error('Error checking user approval status:', error);
      return { approved: false, pending: false, message: 'Error checking account status' };
    }
  }

  // Get all registered users for featured alumni
  getAllUsers(): Observable<any[]> {
    return this.firestore.collection('users').valueChanges();
  }

  // Get all users from main users collection (since lastname subcollections are dynamic)
  getAllUsersByProgram(): Observable<any[]> {
    return this.firestore.collection('users', ref =>
      ref.where('role', '==', 'user')
    ).valueChanges({ idField: 'uid' });
  }

  // Get users by specific program from main users collection
  getUsersByProgram(program: string): Observable<any[]> {
    return this.firestore.collection('users', ref =>
      ref.where('program', '==', program)
         .where('role', '==', 'user')
    ).valueChanges({ idField: 'uid' });
  }

  // Update user profile
  async updateUserProfile(profileData: any): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      // Get current user profile to determine program and lastname
      const currentProfile = await this.firestore.collection('users').doc(user.uid).get().toPromise();
      const userData = currentProfile?.data() as any;

      // Update main users collection
      await this.firestore.collection('users').doc(user.uid).update(profileData);

      // If user has a program and lastname, also update program document subcollection
      if (userData && userData.program && userData.lastName) {
        const program = userData.program;
        const lastName = userData.lastName;
        try {
          await this.firestore.collection('users').doc(program).collection(lastName).doc(user.uid).update(profileData);
          console.log(`Profile updated in both users/${user.uid} and users/${program}/${lastName}/${user.uid}`);
        } catch (error) {
          console.log(`Could not update users/${program}/${lastName} subcollection, profile updated in main users collection only`);
        }
      }
    } else {
      throw new Error('No authenticated user found');
    }
  }

  // Get current user ID
  async getCurrentUserId(): Promise<string> {
    const user = await this.afAuth.currentUser;
    if (user) {
      return user.uid;
    } else {
      throw new Error('No authenticated user found');
    }
  }

  // Create a new post
  async createPost(postData: any): Promise<any> {
    console.log('Creating post with data:', postData); // Debug log
    const result = await this.firestore.collection('posts').add(postData);
    console.log('Post created with ID:', result.id); // Debug log
    return result;
  }

  // Get user posts
  getUserPosts(): Observable<any[]> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        console.log('Current user for posts:', user); // Debug log
        if (user) {
          console.log('Querying posts for user ID:', user.uid); // Debug log
          // Try without orderBy first to avoid index issues
          return this.firestore.collection('posts', ref =>
            ref.where('authorId', '==', user.uid)
          ).valueChanges({ idField: 'id' }) as Observable<any[]>;
        } else {
          console.log('No authenticated user found'); // Debug log
          return new Observable<any[]>(observer => observer.next([]));
        }
      })
    );
  }

  // Get all posts (for feed)
  getAllPosts(): Observable<any[]> {
    return this.firestore.collection('posts', ref =>
      ref.orderBy('timestamp', 'desc')
    ).valueChanges({ idField: 'id' }) as Observable<any[]>;
  }

  // Add employment history using occupation collection
  async addEmploymentHistory(jobData: any): Promise<any> {
    console.log('Adding employment data to occupation collection:', jobData);

    const user = await this.afAuth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user found');
    }

    console.log('Current user:', user.uid);

    try {
      if (jobData.type === 'current') {
        // Handle current occupation
        await this.addCurrentOccupation(user.uid, jobData);
      } else {
        // Handle past occupation
        await this.addPastOccupation(user.uid, jobData);
      }

      console.log('Employment data saved successfully to occupation collection');
      return { success: true };
    } catch (error) {
      console.error('Error saving employment data:', error);
      throw error;
    }
  }

  // Add current occupation (move existing current to past if exists)
  private async addCurrentOccupation(userId: string, jobData: any): Promise<void> {
    const currentDocRef = this.firestore.collection('occupation').doc('current');

    // Get existing current occupation
    const currentDoc = await currentDocRef.get().toPromise();

    if (currentDoc && currentDoc.exists) {
      const existingData = currentDoc.data() as { [key: string]: any };

      // Check if there's existing current occupation for this user
      if (existingData && existingData[userId]) {
        console.log('Moving existing current occupation to past');
        // Move existing current to past
        const existingCurrentJob = existingData[userId];
        existingCurrentJob.movedToPastAt = new Date();
        await this.addPastOccupation(userId, existingCurrentJob);
      }
    }

    // Clean jobData to remove any undefined values
    const cleanJobData = this.removeUndefinedValues(jobData);

    // Add new current occupation
    await currentDocRef.set({
      [userId]: cleanJobData
    }, { merge: true });
  }

  // Add past occupation
  private async addPastOccupation(userId: string, jobData: any): Promise<void> {
    const pastDocRef = this.firestore.collection('occupation').doc('past');

    // Get existing past occupations
    const pastDoc = await pastDocRef.get().toPromise();
    let pastJobs: any[] = [];

    if (pastDoc && pastDoc.exists) {
      const existingData = pastDoc.data() as { [key: string]: any };
      if (existingData && existingData[userId]) {
        pastJobs = Array.isArray(existingData[userId]) ? existingData[userId] : [existingData[userId]];
      }
    }

    // Clean jobData to remove any undefined values
    const cleanJobData = this.removeUndefinedValues(jobData);

    // Add new past job to the array
    pastJobs.push(cleanJobData);

    // Update past document
    await pastDocRef.set({
      [userId]: pastJobs
    }, { merge: true });
  }

  // Helper method to remove undefined values from objects
  private removeUndefinedValues(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }



  // Get user employment history from occupation collection
  getUserEmploymentHistory(): Observable<any[]> {
    return this.afAuth.authState.pipe(
      switchMap(user => {
        console.log('Current user for occupation data:', user);
        if (user) {
          console.log('Querying occupation data for user ID:', user.uid);

          // Combine current and past occupations
          const currentObs = this.firestore.collection('occupation').doc('current').valueChanges();
          const pastObs = this.firestore.collection('occupation').doc('past').valueChanges();

          return new Observable<any[]>(observer => {
            let currentJobs: any[] = [];
            let pastJobs: any[] = [];
            let currentLoaded = false;
            let pastLoaded = false;

            const emitCombined = () => {
              if (currentLoaded && pastLoaded) {
                const allJobs = [
                  ...currentJobs.map(job => ({ ...job, type: 'current' })),
                  ...pastJobs.map(job => ({ ...job, type: 'past' }))
                ];
                observer.next(allJobs);
              }
            };

            currentObs.subscribe(currentData => {
              currentJobs = [];
              const typedCurrentData = currentData as { [key: string]: any };
              if (typedCurrentData && typedCurrentData[user.uid]) {
                currentJobs = [typedCurrentData[user.uid]];
              }
              currentLoaded = true;
              emitCombined();
            });

            pastObs.subscribe(pastData => {
              pastJobs = [];
              const typedPastData = pastData as { [key: string]: any };
              if (typedPastData && typedPastData[user.uid]) {
                pastJobs = Array.isArray(typedPastData[user.uid]) ? typedPastData[user.uid] : [typedPastData[user.uid]];
              }
              pastLoaded = true;
              emitCombined();
            });
          });
        } else {
          console.log('No authenticated user found for occupation data');
          return new Observable<any[]>(observer => observer.next([]));
        }
      })
    );
  }

  // Update post
  async updatePost(postId: string, updateData: any): Promise<void> {
    console.log('Updating post:', postId, updateData); // Debug log
    await this.firestore.collection('posts').doc(postId).update(updateData);
    console.log('Post updated successfully'); // Debug log
  }

  // Delete post
  async deletePost(postId: string): Promise<void> {
    console.log('Deleting post:', postId); // Debug log
    await this.firestore.collection('posts').doc(postId).delete();
    console.log('Post deleted successfully'); // Debug log
  }

  // Update employment history
  async updateEmploymentHistory(oldJobData: any, newJobData: any): Promise<void> {
    console.log('Updating employment history:', oldJobData, newJobData);

    // First delete the old job
    await this.deleteEmploymentHistory(oldJobData);

    // Then add the new job data
    await this.addEmploymentHistory(newJobData);

    console.log('Employment history updated successfully');
  }

  // Delete employment history
  async deleteEmploymentHistory(jobData: any): Promise<void> {
    console.log('Deleting employment history:', jobData);

    const user = await this.afAuth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    if (jobData.type === 'current') {
      // Delete from current document
      const currentDocRef = this.firestore.collection('occupation').doc('current');
      const currentDoc = await currentDocRef.get().toPromise();

      if (currentDoc && currentDoc.exists) {
        const existingData = currentDoc.data() as { [key: string]: any };
        if (existingData && existingData[user.uid]) {
          delete existingData[user.uid];
          await currentDocRef.set(existingData);
        }
      }
    } else {
      // Delete from past document
      const pastDocRef = this.firestore.collection('occupation').doc('past');
      const pastDoc = await pastDocRef.get().toPromise();

      if (pastDoc && pastDoc.exists) {
        const existingData = pastDoc.data() as { [key: string]: any };
        if (existingData && existingData[user.uid]) {
          let pastJobs = Array.isArray(existingData[user.uid]) ? existingData[user.uid] : [existingData[user.uid]];

          // Remove the specific job by comparing key fields
          pastJobs = pastJobs.filter((job: any) =>
            !(job.companyName === jobData.companyName &&
              job.position === jobData.position &&
              job.startDate === jobData.startDate)
          );

          if (pastJobs.length > 0) {
            await pastDocRef.set({
              [user.uid]: pastJobs
            }, { merge: true });
          } else {
            // Remove user's entry if no past jobs left
            delete existingData[user.uid];
            await pastDocRef.set(existingData);
          }
        }
      }
    }

    console.log('Employment history deleted successfully');
  }

  // Admin method to get any user's employment history
  getEmploymentHistoryByUserId(userId: string): Observable<any[]> {
    console.log('Admin - Getting employment history for user:', userId);

    // Combine current and past occupations for specific user
    const currentObs = this.firestore.collection('occupation').doc('current').valueChanges();
    const pastObs = this.firestore.collection('occupation').doc('past').valueChanges();

    return new Observable<any[]>(observer => {
      let currentJobs: any[] = [];
      let pastJobs: any[] = [];
      let currentLoaded = false;
      let pastLoaded = false;

      const emitCombined = () => {
        if (currentLoaded && pastLoaded) {
          const allJobs = [
            ...currentJobs.map(job => ({ ...job, type: 'current' })),
            ...pastJobs.map(job => ({ ...job, type: 'past' }))
          ];
          observer.next(allJobs);
        }
      };

      currentObs.subscribe(currentData => {
        currentJobs = [];
        const typedCurrentData = currentData as { [key: string]: any };
        if (typedCurrentData && typedCurrentData[userId]) {
          currentJobs = [typedCurrentData[userId]];
        }
        currentLoaded = true;
        emitCombined();
      });

      pastObs.subscribe(pastData => {
        pastJobs = [];
        const typedPastData = pastData as { [key: string]: any };
        if (typedPastData && typedPastData[userId]) {
          pastJobs = Array.isArray(typedPastData[userId]) ? typedPastData[userId] : [typedPastData[userId]];
        }
        pastLoaded = true;
        emitCombined();
      });
    });
  }

  // Admin method to get user profile by ID
  getUserProfileById(userId: string): Observable<any> {
    return this.firestore.collection('users').doc(userId).valueChanges();
  }

  // Test method to verify Firebase connection
  async testFirebaseConnection(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      console.log('Test - Current user:', user?.uid);

      if (user) {
        const testData = {
          type: 'current',
          companyName: 'Test Company',
          position: 'Test Position',
          startDate: 'Test Date',
          endDate: '',
          address: 'Test Address',
          contactNumber: 'Test Phone',
          email: 'test@test.com'
        };

        console.log('Test - Attempting to save test employment data:', testData);
        await this.addEmploymentHistory(testData);
        console.log('Test - Employment data saved successfully');

        // Clean up test data
        await this.deleteEmploymentHistory(testData);
        console.log('Test - Test data cleaned up');
      } else {
        console.error('Test - No user authenticated');
      }
    } catch (error) {
      console.error('Test - Firebase connection error:', error);
    }
  }
}
