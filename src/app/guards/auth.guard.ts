import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    console.log('AuthGuard - canActivate called for:', state.url);
    
    return this.afAuth.authState.pipe(
      take(1),
      map(user => {
        console.log('AuthGuard - User state:', !!user);
        if (user) {
          console.log('AuthGuard - User authenticated, allowing access to:', state.url);
          return true;
        } else {
          console.log('AuthGuard - User not authenticated, redirecting to login');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
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
