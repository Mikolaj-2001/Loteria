import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  @IsNotEmpty()
  @IsString()
  userName!: string;

  @Prop({ required: true, unique: true })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string;

  @Prop({ required: true, unique: true })
  @IsNotEmpty()
  @IsString()
  password!: string;

  @Prop()
  encryptionKey?: string; /* Klucz szyfrujący dane wprowadzane przez użytkownika */
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') && !this.isModified('email')) {
    return next();
  }

  function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomSequenceOfSymbols(length: any): any {
    const sequence =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn$%##uvwxyz012345678552@!#$9';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += sequence.charAt(Math.floor(Math.random() * sequence.length));
    }
    return result;
  }

  try {
    const randomEncryptingKey = randomSequenceOfSymbols(randomNumber(12, 14));

    // Szyfruj prawdziwe dane użytkownika z losowym kluczem
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(randomEncryptingKey, 'utf-8'),
      Buffer.alloc(16, 0),
    );
    const encryptedPassword = Buffer.concat([cipher.update(this.password, 'utf-8'), cipher.final()]).toString('hex');
    const encryptedEmail = crypto.createHash('sha256')
      .update(this.email + randomEncryptingKey)
      .digest('hex');

    this.password = encryptedPassword;
    this.email = encryptedEmail;
    this.encryptionKey = randomEncryptingKey;

    if (
      typeof encryptedEmail === 'string' &&
      encryptedEmail.length > 0 &&
      typeof encryptedPassword === 'string' &&
      encryptedPassword.length > 0 &&
      typeof randomEncryptingKey === 'string' &&
      randomEncryptingKey.length > 0 &&
      /* Sprawdzanie czy dane zaszyfrowane spełniają wymogi */
      /[a-zA-Z]/.test(encryptedPassword) &&
      /[0-9]/.test(encryptedPassword)
    ) {
      next();
    } else {
      next(new Error('Błąd podczas szyfrowania danych'));
    }
  } catch (error) {
    next(new Error('Błąd podczas szyfrowania danych'));
  }
});

UserSchema.methods.getDecryptedEmail = function () {
  return crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(this.encryptionKey, 'utf-8'),
    Buffer.alloc(16, 0),
  ).update(Buffer.from(this.email, 'hex')).toString('utf-8');
};

UserSchema.methods.getDecryptedPassword = function () {
  return bcrypt.compareSync(this.password, this.encryptionKey);
};
