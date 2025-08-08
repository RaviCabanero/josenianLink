import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
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

  // Get all registered users for featured alumni
  getAllUsers(): Observable<any[]> {
    return this.firestore.collection('users').valueChanges();
  }
}
