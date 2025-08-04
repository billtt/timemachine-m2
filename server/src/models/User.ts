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
  _passwordAlreadyHashed?: boolean; // Internal flag to prevent double-hashing
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
  
  // Skip hashing if password is already hashed (during manual upgrades)
  if (this._passwordAlreadyHashed) {
    delete this._passwordAlreadyHashed; // Clear the flag
    return next();
  }
  
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
  // Validate inputs
  if (!candidatePassword) {
    return false;
  }
  
  // Try v2.0 bcrypt format first (new format)
  if (this.password) {
    try {
      const isValidBcrypt = await bcrypt.compare(candidatePassword, this.password);
      if (isValidBcrypt) {
        return true;
      }
    } catch (error) {
      // bcrypt comparison failed, continue to legacy check
    }
  }
  
  // Try v1.0 MD5 format (legacy format)
  if (this.key) {
    try {
      const hashedCandidate = encodePasswordV1(candidatePassword);
      const isValidMD5 = hashedCandidate === this.key;
      if (isValidMD5) {
        // Automatically upgrade to bcrypt format
        try {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
          this.password = await bcrypt.hash(candidatePassword, saltRounds);
          this.key = null; // Clear legacy field
          
          // Set flag to prevent double-hashing in pre-save hook
          this._passwordAlreadyHashed = true;
          
          await this.save();
        } catch (upgradeError) {
          // Still return true since the password was valid, but upgrade failed
        }
        
        return true;
      }
    } catch (error) {
      // MD5 comparison failed, continue
    }
  }
  
  return false;
};

export const User = mongoose.model<IUser>('User', userSchema);