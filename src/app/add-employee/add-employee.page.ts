import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EmployeeService, Employee } from '../services/employee.service';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-add-employee',
  templateUrl: './add-employee.page.html',
  styleUrls: ['./add-employee.page.scss'],
  standalone: false,
})
export class AddEmployeePage implements OnInit {
  employee: Employee = {
    name: '',
    position: '',
    department: '',
    email: '',
  };

  constructor(
    private employeeService: EmployeeService, 
    private router: Router,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('AddEmployeePage initialized');
    // Check authentication status
    this.authService.user$.subscribe(user => {
      console.log('Current user in add-employee:', user);
      if (!user) {
        console.warn('No user authenticated in add-employee page');
      }
    });
  }

  async addEmployee() {
    console.log('=== Starting addEmployee process ===');
    
    // Enhanced validation
    const validationErrors = this.validateEmployee();
    if (validationErrors.length > 0) {
      console.log('Validation failed:', validationErrors);
      const toast = await this.toastController.create({
        message: validationErrors.join('. '),
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Check authentication status first
    try {
      const user = await this.authService.getCurrentUser();
      console.log('Current user status:', user);
      
      if (!user) {
        console.error('No user authenticated');
        const toast = await this.toastController.create({
          message: 'You must be logged in to add employees. Please log in and try again.',
          duration: 3000,
          color: 'warning'
        });
        await toast.present();
        this.router.navigate(['/login']);
        return;
      }
    } catch (authError) {
      console.error('Authentication check failed:', authError);
    }

    try {
      console.log('Attempting to add employee:', this.employee);
      await this.employeeService.addEmployee(this.employee);
      
      console.log('Employee added successfully');
      const toast = await this.toastController.create({
        message: 'Employee added successfully!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      
      // Clear the form after successful submission
      this.resetForm();
      
      this.router.navigate(['/employee-list']);
    } catch (error) {
      console.error('=== Error adding employee ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      
      let errorMessage = 'Error adding employee. Please try again.';
      
      // More specific error handling
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        // Check for specific Firebase/Firestore errors
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. Please check your authentication status.';
        } else if (error.message.includes('not-found')) {
          errorMessage = 'Database not found. Please check your Firebase configuration.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('quota-exceeded')) {
          errorMessage = 'Database quota exceeded. Please try again later.';
        } else if (error.message.includes('unauthenticated')) {
          errorMessage = 'Authentication required. Please log in again.';
        }
      }
      
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  private validateEmployee(): string[] {
    const errors: string[] = [];

    // Check if all fields are filled
    if (!this.employee.name || this.employee.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (this.employee.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!this.employee.position || this.employee.position.trim().length === 0) {
      errors.push('Position is required');
    }

    if (!this.employee.department || this.employee.department.trim().length === 0) {
      errors.push('Department is required');
    }

    if (!this.employee.email || this.employee.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.employee.email)) {
      errors.push('Please enter a valid email address');
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private resetForm() {
    this.employee = {
      name: '',
      position: '',
      department: '',
      email: '',
    };
  }

  // Helper method to add a sample employee for testing
  fillSampleData() {
    this.employee = {
      name: 'John Doe',
      position: 'Software Developer',
      department: 'IT',
      email: 'john.doe@company.com'
    };
  }

  // Test Firestore connection
  async testConnection() {
    const isConnected = await this.employeeService.testConnection();
    const toast = await this.toastController.create({
      message: isConnected ? 'Firestore connection successful!' : 'Firestore connection failed!',
      duration: 3000,
      color: isConnected ? 'success' : 'danger'
    });
    await toast.present();
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }
}
