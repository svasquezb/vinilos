import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _userEmail: string = '';
  private _userRole: string = '';
  private _isLoggedIn: boolean = false;

  constructor() {}

  get userEmail(): string {
    return this._userEmail;
  }

  get userRole(): string {
    return this._userRole;
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  login(email: string, role: string) {
    this._userEmail = email;
    this._userRole = role;
    this._isLoggedIn = true;
  }

  logout() {
    this._userEmail = '';
    this._userRole = '';
    this._isLoggedIn = false;
  }

  isAuthenticated(): boolean {
    return this._isLoggedIn;
  }

  getUserRole(): string {
    return this._userRole;
  }
}