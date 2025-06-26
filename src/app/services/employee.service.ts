import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

export interface Employee {
  id?: string;
  name: string;
  position: string;
  department: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private employeesCollection: AngularFirestoreCollection<Employee>;

  constructor(private firestore: AngularFirestore) {
    this.employeesCollection = this.firestore.collection('employees');
  }

  // Create an employee
  async addEmployee(employee: Employee): Promise<void> {
    try {
      console.log('Attempting to add employee:', employee);
      const id = this.firestore.createId();
      console.log('Generated ID:', id);
      
      const employeeData = { ...employee, id };
      console.log('Employee data to save:', employeeData);
      
      const result = await this.employeesCollection.doc(id).set(employeeData);
      console.log('Employee added successfully', result);
    } catch (error) {
      console.error('Detailed error in addEmployee:', error);
      throw error;
    }
  }

  // Get all employees
  getEmployees(): Observable<Employee[]> {
    return this.employeesCollection.valueChanges();
  }

  // Get a single employee by id
  getEmployee(id: string): Observable<Employee | undefined> {
    return this.employeesCollection.doc<Employee>(id).valueChanges();
  }

  // Update an employee
  updateEmployee(id: string, employee: Employee): Promise<void> {
    return this.employeesCollection.doc(id).update(employee);
  }

  // Delete an employee
  deleteEmployee(id: string): Promise<void> {
    return this.employeesCollection.doc(id).delete();
  }

  // Test Firestore connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Firestore connection...');
      
      // Simple test - try to get collection reference and check if it exists
      console.log('Creating test document reference...');
      const testDoc = this.employeesCollection.doc('test');
      
      // Try a simple read operation
      const snapshot = await testDoc.get().toPromise();
      console.log('Test completed successfully. Document exists:', snapshot?.exists);
      
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  }
}
