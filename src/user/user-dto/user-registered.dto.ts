import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class UserRegistered {
  userName: string = '';
  readonly email: string = '';
  password: string = '';

  @IsNotEmpty()
  @IsString()
  @IsNumber()
  readonly option: number = 0; // Dodaj pole option, które będzie przechowywać wybraną opcję przez użytkownika
}
