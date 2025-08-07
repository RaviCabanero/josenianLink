import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private afAuth: AngularFireAuth, 
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    console.log('AdminGuard - canActivate called for:', state.url);
    
    return this.afAuth.authState.pipe(
      take(1),
      switchMap(user => {
        if (user) {
          const isAdmin = this.authService.isAdmin(user.email || '');
          console.log('AdminGuard - User authenticated, is admin:', isAdmin);
          
          if (isAdmin) {
            console.log('AdminGuard - Admin user, allowing access to:', state.url);
            return of(true);
          } else {
            console.log('AdminGuard - Regular user, redirecting to home');
            this.router.navigate(['/home']);
            return of(false);
          }
        } else {
          console.log('AdminGuard - User not authenticated, redirecting to login');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return of(false);
        }
      }),
      catchError(error => {
        console.error('AdminGuard - Error:', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
