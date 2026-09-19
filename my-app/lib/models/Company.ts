import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ICompany extends Document {
  name: string;
  email: string;
  password?: string;
  logo?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  createdByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CompanySchema: Schema<ICompany> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    logo: { type: String, default: '' },
    website: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdByAdmin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CompanySchema.pre<ICompany>('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

CompanySchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema, 'companies');

export default Company;
