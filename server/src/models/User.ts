import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email?: string;
  password: string;
  key?: string | null; // Legacy field for v1.0 compatibility
  token?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>; // eslint-disable-line no-unused-vars
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: false, // Made optional for v1.0 compatibility
      minlength: 6
    },
    key: {
      type: String,
      required: false, // Legacy field for v1.0 password format
      select: false // Don't include by default
    },
    token: {
      type: String,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).password;
        delete (ret as any).token;
        return ret;
      }
    }
  }
);

// Index for performance (name and token already have unique/sparse which creates indexes)
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified and exists
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Legacy v1.0 password hashing function
function encodePasswordV1(password: string): string {
  const md5 = crypto.createHash('md5');
  return md5.update(password + '.time.js').digest('base64');
}

// Compare password method - supports both v1.0 (MD5) and v2.0 (bcrypt) formats
// Returns an object indicating success and whether an upgrade is needed
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // Debug logging
  console.log('comparePassword called with:', {
    candidatePassword: candidatePassword ? '[PROVIDED]' : '[MISSING]',
    storedPassword: this.password ? '[EXISTS]' : '[MISSING]',
    storedKey: this.key ? '[EXISTS]' : '[MISSING]',
    passwordLength: this.password ? this.password.length : 0,
    keyLength: this.key ? this.key.length : 0
  });
  
  // Validate inputs
  if (!candidatePassword) {
    console.error('comparePassword: candidatePassword is missing');
    return false;
  }
  
  // Try v2.0 bcrypt format first (new format)
  if (this.password) {
    try {
      const isValidBcrypt = await bcrypt.compare(candidatePassword, this.password);
      if (isValidBcrypt) {
        console.log('Password validated using bcrypt (v2.0)');
        return true;
      }
    } catch (error) {
      console.error('bcrypt comparison error:', error);
    }
  }
  
  // Try v1.0 MD5 format (legacy format)
  if (this.key) {
    try {
      const hashedCandidate = encodePasswordV1(candidatePassword);
      const isValidMD5 = hashedCandidate === this.key;
      if (isValidMD5) {
        console.log('Password validated using MD5 (v1.0 legacy) - UPGRADE REQUIRED');
        
        // Automatically upgrade to bcrypt format
        console.log('Auto-upgrading password to bcrypt format...');
        console.log('User before upgrade:', {
          name: this.name,
          hasPassword: !!this.password,
          hasKey: !!this.key,
          keyLength: this.key ? this.key.length : 0
        });
        
        try {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
          this.password = await bcrypt.hash(candidatePassword, saltRounds);
          this.key = null; // Clear legacy field
          
          console.log('About to save user with new password...');
          await this.save();
          
          console.log('Password successfully upgraded to bcrypt');
          console.log('User after upgrade:', {
            name: this.name,
            hasPassword: !!this.password,
            hasKey: !!this.key,
            passwordLength: this.password ? this.password.length : 0
          });
          
        } catch (upgradeError) {
          console.error('Failed to upgrade password:', upgradeError);
          console.error('Error details:', {
            name: (upgradeError as Error).name,
            message: (upgradeError as Error).message,
            stack: (upgradeError as Error).stack
          });
          // Still return true since the password was valid, but log the upgrade failure
        }
        
        return true;
      }
    } catch (error) {
      console.error('MD5 comparison error:', error);
    }
  }
  
  console.error('Password validation failed: no valid password or key found');
  return false;
};

export const User = mongoose.model<IUser>('User', userSchema);