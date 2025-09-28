import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of, from } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    console.log('AuthGuard - canActivate called for:', state.url);

    return this.afAuth.authState.pipe(
      take(1),
      switchMap(user => {
        console.log('AuthGuard - User state:', !!user);
        if (user) {
          // Check if user is admin
          if (this.authService.isAdmin(user.email || '')) {
            console.log('AuthGuard - Admin user, allowing access to:', state.url);
            return of(true);
          }

          // For regular users, check if they are approved
          return from(this.authService.isUserApproved(user.uid)).pipe(
            switchMap(async (approvalStatus) => {
              if (approvalStatus.approved) {
                console.log('AuthGuard - User approved, allowing access to:', state.url);
                return true;
              } else {
                console.log('AuthGuard - User not approved, signing out and redirecting');

                // Sign out the user
                await this.afAuth.signOut();

                // Show appropriate message
                const toast = await this.toastController.create({
                  message: approvalStatus.message,
                  duration: 5000,
                  color: approvalStatus.pending ? 'warning' : 'danger',
                  position: 'top'
                });
                await toast.present();

                // Redirect to login
                this.router.navigate(['/login'], {
                  queryParams: { returnUrl: state.url }
                });
                return false;
              }
            })
          );
        } else {
          console.log('AuthGuard - User not authenticated, redirecting to login');
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return of(false);
        }
      }),
      catchError(error => {
        console.error('AuthGuard - Error:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
