import { RoleInterface } from '../roles/roles.interface'; // Import the Role interface

export interface UserInterface {
  _id: string;
  email: string;
  password: string;
  role: RoleInterface; 
  
}
